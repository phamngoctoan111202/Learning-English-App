package com.example.specialenglishlearningapp.utils

import android.content.Context
import com.example.specialenglishlearningapp.constants.AppwriteConfig
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.Example
import com.example.specialenglishlearningapp.data.Vocabulary
import com.example.specialenglishlearningapp.utils.ExampleUtils
import io.appwrite.ID
import io.appwrite.Query
import io.appwrite.models.Document
import io.appwrite.models.DocumentList
import io.appwrite.services.Databases
import io.appwrite.exceptions.AppwriteException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

class SyncManager(context: Context, private val database: AppDatabase) {

    private val appwriteHelper = AppwriteHelper.getInstance(context)
    private val databases: Databases = appwriteHelper.databases

    private val databaseId = AppwriteConfig.DATABASE_ID
    private val vocabularyCollectionId = AppwriteConfig.VOCABULARY_COLLECTION_ID

    private fun normalizeWordKey(word: String?): String {
        return word.orEmpty().trim().lowercase()
    }

    private fun normalizeCategory(value: String?): String {
        return when (value?.trim()?.uppercase()) {
            "TOEIC" -> "TOEIC"
            "VSTEP" -> "VSTEP"
            "SPEAKING" -> "SPEAKING"
            "WRITING" -> "WRITING"
            "POPULAR_TOPICS", "POPULAR TOPICS" -> "POPULAR_TOPICS"
            else -> "GENERAL"
        }
    }

    private fun normalizeSentenceForKey(sentence: String): String {
        return sentence.trim().replace(Regex("\\s+"), " ").lowercase()
    }

    private fun exampleKey(sentencesJson: String, vietnamese: String?, grammar: String?): String {
        val normalizedSentences = ExampleUtils.jsonToSentences(sentencesJson)
            .map { normalizeSentenceForKey(it) }
            .filter { it.isNotEmpty() }
            .sorted()
        val viKey = normalizeSentenceForKey(vietnamese.orEmpty())
        val grammarKey = normalizeSentenceForKey(grammar.orEmpty())
        return normalizedSentences.joinToString("|") + "||" + viKey + "||" + grammarKey
    }

    suspend fun syncData(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("Starting sync with anonymous authentication...")

            // 0. Ensure authentication
            ensureAuthentication()

            // 1. Ensure database and collections exist
            ensureDatabaseAndCollectionsExist()

            // 2. Remove duplicates from local database
            removeDuplicatesFromLocalDatabase()

            // 3. Fetch data from Appwrite
            val appwriteData = fetchAppwriteData()

            // 4. Sync Appwrite -> Room
            syncAppwriteToRoom(appwriteData)

            // 5. Sync Room -> Appwrite
            syncRoomToAppwrite()

            Logger.d("Sync completed successfully!")
            Result.success(Unit)
        } catch (e: AppwriteException) {
            Logger.e("Appwrite sync error: ${e.message}", e)
            Result.failure(e)
        } catch (e: Exception) {
            Logger.e("General sync error: ${e.message}", e)
            Result.failure(e)
        }
    }

    private suspend fun ensureAuthentication() {
        try {
            // Check if user is already logged in
            val currentUser = appwriteHelper.getCurrentUser()
            if (currentUser != null) {
                Logger.d("User already authenticated: ${currentUser.id}")
                return
            }

            // Login anonymously
            Logger.d("No user session found, logging in anonymously...")
            val session = appwriteHelper.loginAnonymously()
            Logger.d("Anonymous login successful: ${session.userId}")
        } catch (e: AppwriteException) {
            Logger.e("Authentication failed: ${e.message}", e)
            throw e
        }
    }

    private suspend fun ensureDatabaseAndCollectionsExist() {
        Logger.d("Checking if database and collections exist...")
        Logger.d("Database ID: $databaseId")
        Logger.d("Vocabulary Collection ID: $vocabularyCollectionId")
        Logger.d("Note: Please ensure these are created manually in Appwrite Console")
    }

    /**
     * Remove duplicate vocabularies from local database.
     * Keep the first occurrence (oldest) and merge examples from duplicates.
     */
    private suspend fun removeDuplicatesFromLocalDatabase() {
        Logger.d("Checking for duplicate vocabularies...")
        val vocabularyDao = database.vocabularyDao()
        val exampleDao = database.exampleDao()

        // Get all vocabularies
        val allVocabularies = vocabularyDao.getAllVocabularies().first()

        for (vocab in allVocabularies) {
            val trimmedWord = vocab.word.trim()
            if (trimmedWord != vocab.word) {
                vocabularyDao.updateVocabulary(vocab.copy(word = trimmedWord))
            }
        }

        // Group by word (case-insensitive)
        val groupedByWord = allVocabularies.groupBy { normalizeWordKey(it.word) }

        var duplicatesRemoved = 0
        var examplesMerged = 0

        for ((word, vocabularies) in groupedByWord) {
            if (vocabularies.size > 1) {
                Logger.d("Found ${vocabularies.size} duplicates for word: $word")

                // Sort by creation date (keep oldest)
                val sorted = vocabularies.sortedBy { it.createdAt }
                val keepVocab = sorted.first()
                val duplicates = sorted.drop(1)

                Logger.d("Keeping vocabulary ID ${keepVocab.id}, removing ${duplicates.size} duplicates")

                // Merge examples from duplicates to the kept vocabulary
                val existingExamples = exampleDao.getExamplesByVocabularyIdSync(keepVocab.id)
                val existingExampleKeys = existingExamples
                    .map { exampleKey(it.sentences, it.vietnamese, it.grammar) }
                    .toMutableSet()

                for (duplicate in duplicates) {
                    // Get examples from duplicate
                    val duplicateExamples = exampleDao.getExamplesByVocabularyIdSync(duplicate.id)

                    // Transfer examples to kept vocabulary
                    for (example in duplicateExamples) {
                        val key = exampleKey(example.sentences, example.vietnamese, example.grammar)
                        val isDuplicateExample = existingExampleKeys.contains(key)

                        if (!isDuplicateExample) {
                            exampleDao.insertExample(
                                example.copy(
                                    id = 0, // Auto-generate new ID
                                    vocabularyId = keepVocab.id
                                )
                            )
                            examplesMerged++
                            existingExampleKeys.add(key)
                        }
                    }

                    // Delete duplicate vocabulary (examples will be deleted by cascade)
                    vocabularyDao.deleteVocabulary(duplicate)
                    duplicatesRemoved++
                }
            }
        }

        if (duplicatesRemoved > 0) {
            Logger.d("✅ Removed $duplicatesRemoved duplicate vocabularies and merged $examplesMerged examples")
        } else {
            Logger.d("✅ No duplicate vocabularies found")
        }
    }

    private suspend fun fetchAppwriteData(): List<Document<Map<String, Any>>> {
        return databases.listDocuments(
            databaseId = databaseId,
            collectionId = vocabularyCollectionId,
            queries = listOf(Query.limit(100))
        ).documents
    }

    private suspend fun syncAppwriteToRoom(appwriteData: List<Document<Map<String, Any>>>) {
        val vocabularyDao = database.vocabularyDao()
        val exampleDao = database.exampleDao()

        // Build maps for both appwriteDocumentId AND word lookup
        val allLocalVocabs = vocabularyDao.getAllVocabularies().first()
        val existingRoomVocabByAppwriteId = allLocalVocabs.associateBy { it.appwriteDocumentId }
        val existingRoomVocabByWord = allLocalVocabs.associateBy { normalizeWordKey(it.word) }

        // Group Appwrite documents by word to detect duplicates on server
        val appwriteDataByWord = appwriteData.groupBy { normalizeWordKey(it.data["word"] as String?) }

        // Track which documents to delete from Appwrite (duplicates)
        val documentsToDeleteFromAppwrite = mutableListOf<String>()

        for ((word, docs) in appwriteDataByWord) {
            // Handle duplicate documents on Appwrite for the same word
            if (docs.size > 1) {
                Logger.d("⚠️ Found ${docs.size} duplicate documents on Appwrite for word: '$word'")

                // Sort by createdAt to keep the oldest
                val sortedDocs = docs.sortedBy {
                    (it.data["createdAt"] as String?)?.toLongOrNull() ?: Long.MAX_VALUE
                }
                val keepDoc = sortedDocs.first()
                val duplicateDocs = sortedDocs.drop(1)

                Logger.d("  → Keeping document ${keepDoc.id}, marking ${duplicateDocs.size} for deletion")

                // Mark duplicates for deletion
                duplicateDocs.forEach { doc ->
                    documentsToDeleteFromAppwrite.add(doc.id)
                    Logger.d("  → Will delete duplicate: ${doc.id}")
                }

                // Process only the kept document
                processAppwriteDocument(keepDoc, existingRoomVocabByAppwriteId, existingRoomVocabByWord, vocabularyDao, exampleDao)
            } else {
                // Single document for this word
                processAppwriteDocument(docs.first(), existingRoomVocabByAppwriteId, existingRoomVocabByWord, vocabularyDao, exampleDao)
            }
        }

        // Delete duplicate documents from Appwrite
        if (documentsToDeleteFromAppwrite.isNotEmpty()) {
            Logger.d("🗑️ Deleting ${documentsToDeleteFromAppwrite.size} duplicate documents from Appwrite...")
            for (docId in documentsToDeleteFromAppwrite) {
                try {
                    databases.deleteDocument(
                        databaseId = databaseId,
                        collectionId = vocabularyCollectionId,
                        documentId = docId
                    )
                    Logger.d("  ✅ Deleted duplicate document: $docId")
                } catch (e: AppwriteException) {
                    Logger.w("  ⚠️ Failed to delete duplicate document $docId: ${e.message}")
                }
            }
            Logger.d("✅ Appwrite cleanup completed")
        }
    }

    /**
     * Process a single Appwrite document and sync it to Room
     */
    private suspend fun processAppwriteDocument(
        appwriteDoc: Document<Map<String, Any>>,
        existingRoomVocabByAppwriteId: Map<String?, Vocabulary>,
        existingRoomVocabByWord: Map<String, Vocabulary>,
        vocabularyDao: com.example.specialenglishlearningapp.data.VocabularyDao,
        exampleDao: com.example.specialenglishlearningapp.data.ExampleDao
    ) {
        val data = appwriteDoc.data
        val appwriteId = appwriteDoc.id
        val word = (data["word"] as String).trim()

        // Check if vocabulary exists by appwriteDocumentId OR by word
        val roomVocabById = existingRoomVocabByAppwriteId[appwriteId]
        val roomVocabByWord = existingRoomVocabByWord[normalizeWordKey(word)]

        when {
            // Case 1: Found by appwriteDocumentId - normal update
            roomVocabById != null -> {
                Logger.d("Vocabulary exists by ID: $word (${appwriteId}), merging with max values")
                mergeAndUpdateVocabulary(data, roomVocabById, vocabularyDao, appwriteId)
            }

            // Case 2: Found by word but different appwriteDocumentId - update the link
            roomVocabByWord != null -> {
                Logger.d("⚠️ Vocabulary exists by word: $word, but different Appwrite ID")
                Logger.d("   Local appwriteId: ${roomVocabByWord.appwriteDocumentId}, Server appwriteId: $appwriteId")

                if (roomVocabByWord.appwriteDocumentId == null) {
                    // Local vocab has no appwrite ID, link it to this document
                    Logger.d("   → Linking local vocabulary to Appwrite document")
                    mergeAndUpdateVocabulary(data, roomVocabByWord, vocabularyDao, appwriteId)
                } else {
                    // Local vocab already linked to a different appwrite ID
                    // This means we have a duplicate on Appwrite
                    // Merge data and keep local appwriteDocumentId
                    Logger.d("   → Merging data but keeping local appwriteDocumentId: ${roomVocabByWord.appwriteDocumentId}")
                    mergeAndUpdateVocabulary(data, roomVocabByWord, vocabularyDao, roomVocabByWord.appwriteDocumentId)
                }
            }

            // Case 3: New vocabulary - insert
            else -> {
                Logger.d("Adding new vocabulary from server: $word")
                insertNewVocabularyFromServer(data, appwriteId, vocabularyDao, exampleDao)
            }
        }
    }

    /**
     * Merge server data with local vocabulary and update
     */
    private suspend fun mergeAndUpdateVocabulary(
        serverData: Map<String, Any>,
        localVocab: Vocabulary,
        vocabularyDao: com.example.specialenglishlearningapp.data.VocabularyDao,
        appwriteIdToSet: String?
    ) {
        val serverTotalAttempts = (serverData["totalAttempts"] as String?)?.toIntOrNull() ?: 0
        val serverCorrectAttempts = (serverData["correctAttempts"] as String?)?.toIntOrNull() ?: 0
        val serverLastStudiedAt = (serverData["lastStudiedAt"] as String?)?.toLongOrNull() ?: 0L
        val serverMemoryScore = (serverData["memoryScore"] as String?)?.toFloatOrNull() ?: 0.0f
        val serverLast10Attempts = (serverData["last10Attempts"] as String?) ?: "[]"

        // Take maximum values
        val mergedTotalAttempts = maxOf(localVocab.totalAttempts, serverTotalAttempts)
        val mergedCorrectAttempts = maxOf(localVocab.correctAttempts, serverCorrectAttempts)
        val mergedLastStudiedAt = maxOf(localVocab.lastStudiedAt, serverLastStudiedAt)
        val mergedMemoryScore = maxOf(localVocab.memoryScore, serverMemoryScore)

        // Merge last10Attempts: use the one with more data, or server if local is empty
        val mergedLast10Attempts = mergeLast10Attempts(localVocab.last10Attempts, serverLast10Attempts, serverLastStudiedAt > localVocab.lastStudiedAt)

        Logger.d("Merging: local(total=${localVocab.totalAttempts}, correct=${localVocab.correctAttempts}) + server(total=$serverTotalAttempts, correct=$serverCorrectAttempts) = merged(total=$mergedTotalAttempts, correct=$mergedCorrectAttempts)")

        // Update local vocabulary with merged values
        val updatedVocab = localVocab.copy(
            totalAttempts = mergedTotalAttempts,
            correctAttempts = mergedCorrectAttempts,
            lastStudiedAt = mergedLastStudiedAt,
            memoryScore = mergedMemoryScore,
            last10Attempts = mergedLast10Attempts,
            appwriteDocumentId = appwriteIdToSet
        )
        vocabularyDao.updateVocabulary(updatedVocab)
    }

    /**
     * Insert new vocabulary from server
     */
    private suspend fun insertNewVocabularyFromServer(
        data: Map<String, Any>,
        appwriteId: String,
        vocabularyDao: com.example.specialenglishlearningapp.data.VocabularyDao,
        exampleDao: com.example.specialenglishlearningapp.data.ExampleDao
    ) {
        // Create vocabulary
        val vocabulary = Vocabulary(
            word = (data["word"] as String).trim(),
            createdAt = (data["createdAt"] as String?)?.toLongOrNull() ?: System.currentTimeMillis(),
            lastStudiedAt = (data["lastStudiedAt"] as String?)?.toLongOrNull() ?: 0L,
            priorityScore = (data["priorityScore"] as String?)?.toIntOrNull() ?: 0,
            appwriteDocumentId = appwriteId,
            category = normalizeCategory(data["category"] as String?),
            totalAttempts = (data["totalAttempts"] as String?)?.toIntOrNull() ?: 0,
            correctAttempts = (data["correctAttempts"] as String?)?.toIntOrNull() ?: 0,
            memoryScore = (data["memoryScore"] as String?)?.toFloatOrNull() ?: 0.0f,
            last10Attempts = (data["last10Attempts"] as String?) ?: "[]"
        )

        // Insert new vocabulary
        val newVocabId = vocabularyDao.insertVocabulary(vocabulary)

        // Create example if provided
        val sentences = data["sentences"] as String?
        val vietnamese = data["vietnamese"] as String?
        val grammar = data["grammar"] as String?
        Logger.d("Processing example data - sentences: '$sentences', vietnamese: '$vietnamese', grammar: '$grammar'")

        if (!sentences.isNullOrEmpty()) {
            // Ensure sentences is in proper JSON format
            val formattedSentences = formatSentencesForStorage(sentences)
            Logger.d("Formatted sentences: '$formattedSentences'")

            val example = Example(
                vocabularyId = newVocabId,
                sentences = formattedSentences,
                vietnamese = vietnamese,
                grammar = grammar,
                createdAt = (data["createdAt"] as String?)?.toLongOrNull() ?: System.currentTimeMillis(),
                appwriteDocumentId = null
            )
            exampleDao.insertExample(example)
            Logger.d("Successfully created example for vocabulary: ${data["word"]}")
        } else {
            Logger.d("No sentences data found for vocabulary: ${data["word"]}")
        }
    }

    private suspend fun syncRoomToAppwrite() {
        val vocabularyDao = database.vocabularyDao()
        val exampleDao = database.exampleDao()

        val roomVocabularies = vocabularyDao.getAllVocabularies().first()

        for (roomVocab in roomVocabularies) {
            if (roomVocab.appwriteDocumentId == null) {
                // Create new vocabulary on server
                Logger.d("Syncing new vocabulary to server: ${roomVocab.word}")

                // Get the first example for this vocabulary
                val examples = exampleDao.getExamplesByVocabularyId(roomVocab.id).first()
                val firstExample = examples.firstOrNull()

                val data = mutableMapOf<String, Any>(
                    "word" to roomVocab.word,
                    "createdAt" to roomVocab.createdAt.toString(),
                    "lastStudiedAt" to roomVocab.lastStudiedAt.toString(),
                    "priorityScore" to roomVocab.priorityScore.toString(),
                    "category" to roomVocab.category,
                    "totalAttempts" to roomVocab.totalAttempts.toString(),
                    "correctAttempts" to roomVocab.correctAttempts.toString(),
                    "memoryScore" to roomVocab.memoryScore.toString(),
                    "last10Attempts" to roomVocab.last10Attempts
                )

                // Add example data if available
                if (firstExample != null) {
                    data["sentences"] = firstExample.sentences
                    if (!firstExample.vietnamese.isNullOrEmpty()) {
                        data["vietnamese"] = firstExample.vietnamese
                    }
                    if (!firstExample.grammar.isNullOrEmpty()) {
                        data["grammar"] = firstExample.grammar
                    }
                }

                // Create new document in Appwrite
                val document = databases.createDocument(
                    databaseId = databaseId,
                    collectionId = vocabularyCollectionId,
                    documentId = ID.unique(),
                    data = data
                )
                // Update Room with Appwrite Document ID
                vocabularyDao.updateVocabulary(roomVocab.copy(appwriteDocumentId = document.id))
            } else {
                // Update existing vocabulary on server with max values
                Logger.d("Updating vocabulary on server: ${roomVocab.word}")

                try {
                    // Fetch current data from server
                    val serverDoc = databases.getDocument(
                        databaseId = databaseId,
                        collectionId = vocabularyCollectionId,
                        documentId = roomVocab.appwriteDocumentId
                    )

                    val serverData = serverDoc.data
                    val serverTotalAttempts = (serverData["totalAttempts"] as String?)?.toIntOrNull() ?: 0
                    val serverCorrectAttempts = (serverData["correctAttempts"] as String?)?.toIntOrNull() ?: 0
                    val serverLastStudiedAt = (serverData["lastStudiedAt"] as String?)?.toLongOrNull() ?: 0L
                    val serverMemoryScore = (serverData["memoryScore"] as String?)?.toFloatOrNull() ?: 0.0f

                    // Calculate max values
                    val mergedTotalAttempts = maxOf(roomVocab.totalAttempts, serverTotalAttempts)
                    val mergedCorrectAttempts = maxOf(roomVocab.correctAttempts, serverCorrectAttempts)
                    val mergedLastStudiedAt = maxOf(roomVocab.lastStudiedAt, serverLastStudiedAt)
                    val mergedMemoryScore = maxOf(roomVocab.memoryScore, serverMemoryScore)

                    // Only update if there are changes
                    if (mergedTotalAttempts != serverTotalAttempts ||
                        mergedCorrectAttempts != serverCorrectAttempts ||
                        mergedLastStudiedAt != serverLastStudiedAt ||
                        mergedMemoryScore != serverMemoryScore) {

                        Logger.d("Updating server: local(total=${roomVocab.totalAttempts}, correct=${roomVocab.correctAttempts}) + server(total=$serverTotalAttempts, correct=$serverCorrectAttempts) = merged(total=$mergedTotalAttempts, correct=$mergedCorrectAttempts)")

                        // Get the first example for this vocabulary
                        val examples = exampleDao.getExamplesByVocabularyId(roomVocab.id).first()
                        val firstExample = examples.firstOrNull()

                        val data = mutableMapOf<String, Any>(
                            "word" to roomVocab.word,
                            "createdAt" to roomVocab.createdAt.toString(),
                            "lastStudiedAt" to mergedLastStudiedAt.toString(),
                            "priorityScore" to roomVocab.priorityScore.toString(),
                            "category" to roomVocab.category,
                            "totalAttempts" to mergedTotalAttempts.toString(),
                            "correctAttempts" to mergedCorrectAttempts.toString(),
                            "memoryScore" to mergedMemoryScore.toString(),
                            "last10Attempts" to roomVocab.last10Attempts
                        )

                        // Add example data if available
                        if (firstExample != null) {
                            data["sentences"] = firstExample.sentences
                            if (!firstExample.vietnamese.isNullOrEmpty()) {
                                data["vietnamese"] = firstExample.vietnamese
                            }
                            if (!firstExample.grammar.isNullOrEmpty()) {
                                data["grammar"] = firstExample.grammar
                            }
                        }

                        // Update document on server
                        databases.updateDocument(
                            databaseId = databaseId,
                            collectionId = vocabularyCollectionId,
                            documentId = roomVocab.appwriteDocumentId,
                            data = data
                        )

                        // Update local if server had higher values
                        if (mergedTotalAttempts != roomVocab.totalAttempts ||
                            mergedCorrectAttempts != roomVocab.correctAttempts ||
                            mergedLastStudiedAt != roomVocab.lastStudiedAt ||
                            mergedMemoryScore != roomVocab.memoryScore) {
                            vocabularyDao.updateVocabulary(
                                roomVocab.copy(
                                    totalAttempts = mergedTotalAttempts,
                                    correctAttempts = mergedCorrectAttempts,
                                    lastStudiedAt = mergedLastStudiedAt,
                                    memoryScore = mergedMemoryScore
                                )
                            )
                        }
                    } else {
                        Logger.d("No changes needed for: ${roomVocab.word}")
                    }
                } catch (e: AppwriteException) {
                    Logger.w("Failed to update vocabulary on server: ${e.message}")
                    // Continue with next vocabulary
                }
            }
        }
    }

    /**
     * Clean up duplicates only (without syncing to Appwrite)
     * Useful for first-time cleanup or manual cleanup
     */
    suspend fun cleanupDuplicatesOnly() = withContext(Dispatchers.IO) {
        removeDuplicatesFromLocalDatabase()
    }

    suspend fun deleteVocabulary(vocabulary: Vocabulary): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("Deleting vocabulary: ${vocabulary.word}")
            
            // 0. Ensure authentication
            ensureAuthentication()

            val vocabularyDao = database.vocabularyDao()
            val exampleDao = database.exampleDao()

            // 1. Delete from Appwrite if it has an Appwrite ID
            if (vocabulary.appwriteDocumentId != null) {
                try {
                    databases.deleteDocument(
                        databaseId = databaseId,
                        collectionId = vocabularyCollectionId,
                        documentId = vocabulary.appwriteDocumentId
                    )
                    Logger.d("Deleted from Appwrite: ${vocabulary.appwriteDocumentId}")
                } catch (e: AppwriteException) {
                    Logger.w("Failed to delete from Appwrite: ${e.message}")
                    // Continue with local deletion even if remote fails
                }
            }

            // 2. Delete associated examples from Room
            val examples = exampleDao.getExamplesByVocabularyId(vocabulary.id).first()
            for (example in examples) {
                exampleDao.deleteExample(example)
            }

            // 3. Delete vocabulary from Room
            vocabularyDao.deleteVocabulary(vocabulary)
            
            Logger.d("Successfully deleted vocabulary: ${vocabulary.word}")
            Result.success(Unit)
        } catch (e: Exception) {
            Logger.e("Failed to delete vocabulary: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Merge last10Attempts from local and server
     * Strategy: Use the one that has more attempts, or server if lastStudied is newer
     */
    private fun mergeLast10Attempts(localLast10: String, serverLast10: String, serverIsNewer: Boolean): String {
        try {
            val localList = org.json.JSONArray(localLast10)
            val serverList = org.json.JSONArray(serverLast10)

            // If one is empty, use the other
            if (localList.length() == 0 && serverList.length() > 0) return serverLast10
            if (serverList.length() == 0 && localList.length() > 0) return localLast10

            // If server has more or equal attempts AND is newer, use server
            if (serverList.length() >= localList.length() && serverIsNewer) {
                return serverLast10
            }

            // Otherwise use the one with more attempts
            return if (serverList.length() > localList.length()) serverLast10 else localLast10
        } catch (e: Exception) {
            Logger.w("Error merging last10Attempts: ${e.message}")
            // Return whichever is not empty
            return if (localLast10 != "[]") localLast10 else serverLast10
        }
    }

    /**
     * Format sentences data to ensure it's in proper JSON format for storage
     * Handles both single sentences and JSON arrays
     */
    private fun formatSentencesForStorage(sentences: String): String {
        return try {
            // First try to parse as JSON to see if it's already formatted
            val parsed = ExampleUtils.jsonToSentences(sentences)
            if (parsed.isNotEmpty()) {
                // Already in JSON format, return as is
                sentences
            } else {
                // Not in JSON format, treat as single sentence and convert to JSON
                ExampleUtils.sentencesToJson(listOf(sentences.trim()))
            }
        } catch (e: Exception) {
            // If parsing fails, treat as single sentence and convert to JSON
            Logger.d("Treating sentences as single sentence: $sentences")
            ExampleUtils.sentencesToJson(listOf(sentences.trim()))
        }
    }

    suspend fun syncSingleVocabularyToServer(vocabularyId: Long): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("🔄 Syncing single vocabulary to server: ID=$vocabularyId")

            // Ensure authentication
            ensureAuthentication()

            val vocabularyDao = database.vocabularyDao()
            val exampleDao = database.exampleDao()

            // Get vocabulary with examples
            val vocab = vocabularyDao.getVocabularyByIdSync(vocabularyId) ?: run {
                Logger.e("Vocabulary not found: $vocabularyId")
                return@withContext Result.failure(Exception("Vocabulary not found"))
            }

            val examples = exampleDao.getExamplesByVocabularyIdSync(vocabularyId)

            // Prepare examples data for Appwrite
            val examplesJson = examples.map { example ->
                mapOf(
                    "sentences" to example.sentences,
                    "vietnamese" to (example.vietnamese ?: ""),
                    "grammar" to (example.grammar ?: "")
                )
            }

            val data = mapOf(
                "word" to vocab.word,
                "createdAt" to vocab.createdAt.toString(),
                "lastStudiedAt" to vocab.lastStudiedAt.toString(),
                "priorityScore" to vocab.priorityScore.toString(),
                "category" to vocab.category,
                "totalAttempts" to vocab.totalAttempts.toString(),
                "correctAttempts" to vocab.correctAttempts.toString(),
                "memoryScore" to vocab.memoryScore.toString(),
                "examples" to examplesJson.toString()
            )

            if (vocab.appwriteDocumentId != null) {
                Logger.d("  → Updating existing document: ${vocab.appwriteDocumentId}")
                databases.updateDocument(
                    databaseId = databaseId,
                    collectionId = vocabularyCollectionId,
                    documentId = vocab.appwriteDocumentId,
                    data = data
                )
            } else {
                Logger.d("  → No Appwrite ID, checking for existing document by word: ${vocab.word}")
                val existingDocs = databases.listDocuments(
                    databaseId = databaseId,
                    collectionId = vocabularyCollectionId,
                    queries = listOf(Query.equal("word", vocab.word))
                )

                val targetDocumentId = if (existingDocs.total > 0 && existingDocs.documents.isNotEmpty()) {
                    val existingDocId = existingDocs.documents.first().id
                    Logger.d("  → Found existing document for word '${vocab.word}', reusing ID: $existingDocId")
                    databases.updateDocument(
                        databaseId = databaseId,
                        collectionId = vocabularyCollectionId,
                        documentId = existingDocId,
                        data = data
                    )
                    vocabularyDao.updateVocabulary(vocab.copy(appwriteDocumentId = existingDocId))
                    existingDocId
                } else {
                    Logger.d("  → Creating new document")
                    val document = databases.createDocument(
                        databaseId = databaseId,
                        collectionId = vocabularyCollectionId,
                        documentId = ID.unique(),
                        data = data
                    )
                    vocabularyDao.updateVocabulary(vocab.copy(appwriteDocumentId = document.id))
                    Logger.d("  → Linked local vocabulary to Appwrite document: ${document.id}")
                    document.id
                }

                Logger.d("  → Synced vocabulary '${vocab.word}' with Appwrite ID: $targetDocumentId")
            }

            Logger.d("✅ Single vocabulary synced successfully")
            Result.success(Unit)
        } catch (e: AppwriteException) {
            Logger.e("Failed to sync single vocabulary: ${e.message}", e)
            Result.failure(e)
        } catch (e: Exception) {
            Logger.e("Failed to sync single vocabulary: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Immediately sync vocabulary deletion to Appwrite server
     */
    suspend fun syncVocabularyDeletionToServer(appwriteDocumentId: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("🗑️ Syncing deletion to server: Document ID=$appwriteDocumentId")

            // Ensure authentication
            ensureAuthentication()

            // Delete from Appwrite
            databases.deleteDocument(
                databaseId = databaseId,
                collectionId = vocabularyCollectionId,
                documentId = appwriteDocumentId
            )

            Logger.d("✅ Vocabulary deleted from server successfully")
            Result.success(Unit)
        } catch (e: AppwriteException) {
            Logger.e("Failed to delete vocabulary from server: ${e.message}", e)
            Result.failure(e)
        } catch (e: Exception) {
            Logger.e("Failed to delete vocabulary from server: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Pull all data from server to local (for app startup sync)
     */
    suspend fun syncServerToClient(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("📥 Syncing server data to client (app startup)...")

            // Ensure authentication
            ensureAuthentication()

            // Fetch data from Appwrite
            val appwriteData = fetchAppwriteData()
            Logger.d("  → Fetched ${appwriteData.size} items from server")

            // Sync to Room
            syncAppwriteToRoom(appwriteData)

            Logger.d("✅ Server to client sync completed")
            Result.success(Unit)
        } catch (e: AppwriteException) {
            Logger.e("Failed to sync server to client: ${e.message}", e)
            Result.failure(e)
        } catch (e: Exception) {
            Logger.e("Failed to sync server to client: ${e.message}", e)
            Result.failure(e)
        }
    }
}
