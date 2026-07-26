package com.example.specialenglishlearningapp.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.Example
import com.example.specialenglishlearningapp.data.Vocabulary
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.utils.SyncManager
import com.example.specialenglishlearningapp.utils.LearningProgressManager
import com.example.specialenglishlearningapp.utils.ExampleUtils
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

sealed class AddVocabularyResult {
    object Success : AddVocabularyResult()
    data class Duplicate(val word: String) : AddVocabularyResult()
}

data class CategoryStats(
    val total: Int,
    val learned: Int
)

class EditViewModel(application: Application) : AndroidViewModel(application) {
    private val database: AppDatabase = AppDatabase.getDatabase(application)
    private val syncManager: SyncManager = SyncManager(application.applicationContext, database)

    private val _allVocabularies = MutableLiveData<List<VocabularyWithExamples>>(emptyList())
    private val _vocabularies = MutableLiveData<List<VocabularyWithExamples>>(emptyList())
    val vocabularies: LiveData<List<VocabularyWithExamples>> = _vocabularies

    private val _syncStatus = MutableLiveData<String>()
    val syncStatus: LiveData<String> = _syncStatus

    private val _addVocabularyStatus = MutableLiveData<AddVocabularyResult>()
    val addVocabularyStatus: LiveData<AddVocabularyResult> = _addVocabularyStatus

    private val _categoryStatsMap = MutableLiveData<Map<String, CategoryStats>>(emptyMap())
    val categoryStatsMap: LiveData<Map<String, CategoryStats>> = _categoryStatsMap

    private var currentCategoryFilter: String? = null // null = All, "GENERAL", "TOEIC"
    private var currentSearchQuery: String = ""
    private var currentPage: Int = 1
    private val pageSize: Int = 10

    init {
        viewModelScope.launch {
            database.vocabularyWithExamplesDao().getAllVocabulariesWithExamples().collect { list ->
                Logger.d("VM Loaded ${list.size} vocabularies")
                _allVocabularies.postValue(list)
                applyFilters() // Apply current filters
                loadCategoryStats() // Load stats when data changes
            }
        }
    }

    private suspend fun loadCategoryStats() {
        val statsMap = mutableMapOf<String, CategoryStats>()

        // VSTEP (General tab) = VSTEP + GENERAL
        val vstepTotal = database.vocabularyDao().countByCategory("VSTEP") + database.vocabularyDao().countByCategory("GENERAL")
        val vstepLearned = database.vocabularyDao().countLearnedByCategory("VSTEP") + database.vocabularyDao().countLearnedByCategory("GENERAL")
        statsMap["VSTEP"] = CategoryStats(vstepTotal, vstepLearned)

        val writingTotal = database.vocabularyDao().countByCategory("WRITING")
        val writingLearned = database.vocabularyDao().countLearnedByCategory("WRITING")
        statsMap["WRITING"] = CategoryStats(writingTotal, writingLearned)

        val mobileTotal = database.vocabularyDao().countByCategory("TECHNICAL_MOBILE") + database.vocabularyDao().countByCategory("MOBILE")
        val mobileLearned = database.vocabularyDao().countLearnedByCategory("TECHNICAL_MOBILE") + database.vocabularyDao().countLearnedByCategory("MOBILE")
        statsMap["TECHNICAL_MOBILE"] = CategoryStats(mobileTotal, mobileLearned)

        val webTotal = database.vocabularyDao().countByCategory("TECHNICAL_WEB") + database.vocabularyDao().countByCategory("WEB") + database.vocabularyDao().countByCategory("TECHNICAL_BACKEND") + database.vocabularyDao().countByCategory("BACKEND") + database.vocabularyDao().countByCategory("TECHNICAL")
        val webLearned = database.vocabularyDao().countLearnedByCategory("TECHNICAL_WEB") + database.vocabularyDao().countLearnedByCategory("WEB") + database.vocabularyDao().countLearnedByCategory("TECHNICAL_BACKEND") + database.vocabularyDao().countLearnedByCategory("BACKEND") + database.vocabularyDao().countLearnedByCategory("TECHNICAL")
        statsMap["TECHNICAL_WEB"] = CategoryStats(webTotal, webLearned)

        // Stats for "ALL"
        val allTotal = database.vocabularyDao().countAll()
        val allLearned = database.vocabularyDao().countAllLearned()
        statsMap["ALL"] = CategoryStats(allTotal, allLearned)

        _categoryStatsMap.postValue(statsMap)
    }

    private fun matchesCategory(vocabCategory: String, filter: String): Boolean =
        when (filter) {
            "VSTEP" -> vocabCategory == "VSTEP" || vocabCategory == "GENERAL"
            "TECHNICAL_MOBILE", "MOBILE" -> vocabCategory == "TECHNICAL_MOBILE" || vocabCategory == "MOBILE"
            "TECHNICAL_WEB", "WEB" -> vocabCategory == "TECHNICAL_WEB" || vocabCategory == "WEB" || vocabCategory == "TECHNICAL_BACKEND" || vocabCategory == "BACKEND" || vocabCategory == "TECHNICAL"
            else -> vocabCategory == filter
        }

    fun filterByCategory(category: String?) {
        currentCategoryFilter = category
        currentPage = 1
        applyFilters()
    }

    private fun applyFilters() {
        val allVocabs = _allVocabularies.value ?: emptyList()

        // First filter by category
        val categoryFiltered = if (currentCategoryFilter != null) {
            allVocabs.filter { matchesCategory(it.vocabulary.category, currentCategoryFilter!!) }
        } else {
            allVocabs
        }

        // Then filter by search query
        val filtered = if (currentSearchQuery.isBlank()) {
            // No search: apply pagination (show newest first, paginated)
            categoryFiltered.take(currentPage * pageSize)
        } else {
            // Searching: bypass pagination, show all matching results
            categoryFiltered.filter { vocab ->
                fuzzyMatch(vocab.vocabulary.word, currentSearchQuery) ||
                vocab.examples.any { example ->
                    fuzzyMatch(example.sentences, currentSearchQuery) ||
                    fuzzyMatch(example.vietnamese ?: "", currentSearchQuery)
                }
            }.sortedByDescending { vocab ->
                when {
                    vocab.vocabulary.word.equals(currentSearchQuery, ignoreCase = true) -> 1000
                    vocab.vocabulary.word.contains(currentSearchQuery, ignoreCase = true) -> 500
                    else -> fuzzyScore(vocab.vocabulary.word, currentSearchQuery)
                }
            }
        }

        _vocabularies.postValue(filtered)
    }

    fun searchVocabularies(query: String) {
        currentSearchQuery = query
        currentPage = 1
        applyFilters()
    }

    fun loadNextPage() {
        val allVocabs = _allVocabularies.value ?: return
        val categoryFiltered = if (currentCategoryFilter != null) {
            allVocabs.filter { matchesCategory(it.vocabulary.category, currentCategoryFilter!!) }
        } else {
            allVocabs
        }
        // Only load more if not searching and there are more items
        if (currentSearchQuery.isBlank() && currentPage * pageSize < categoryFiltered.size) {
            currentPage++
            applyFilters()
        }
    }

    private fun fuzzyMatch(text: String, query: String): Boolean {
        if (text.contains(query, ignoreCase = true)) return true

        // Fuzzy matching: check if all characters in query appear in order in text
        val textLower = text.lowercase()
        val queryLower = query.lowercase()
        var queryIndex = 0

        for (char in textLower) {
            if (queryIndex < queryLower.length && char == queryLower[queryIndex]) {
                queryIndex++
            }
        }

        return queryIndex == queryLower.length
    }

    private fun fuzzyScore(text: String, query: String): Int {
        // Calculate fuzzy match score (higher is better)
        val textLower = text.lowercase()
        val queryLower = query.lowercase()
        var score = 0
        var queryIndex = 0
        var lastMatchIndex = -1

        for ((index, char) in textLower.withIndex()) {
            if (queryIndex < queryLower.length && char == queryLower[queryIndex]) {
                // Consecutive matches get bonus points
                if (index == lastMatchIndex + 1) {
                    score += 10
                } else {
                    score += 5
                }
                lastMatchIndex = index
                queryIndex++
            }
        }

        // Bonus for matching at the start
        if (textLower.startsWith(queryLower.first())) {
            score += 20
        }

        return score
    }

    fun addVocabulary(word: String, examplesCombined: List<String>, category: String = "GENERAL", vocabularyGrammar: String? = null) {
        viewModelScope.launch {
            // Kiểm tra từ đã tồn tại chưa (case-insensitive)
            val existingVocab = database.vocabularyDao().getVocabularyByWord(word)
            if (existingVocab != null) {
                Logger.d("Vocabulary already exists: $word")
                _addVocabularyStatus.postValue(AddVocabularyResult.Duplicate(word))
                return@launch
            }

            // Thêm từ mới
            val vid = database.vocabularyDao().insertVocabulary(
                Vocabulary(
                    word = word,
                    category = category,
                    grammar = vocabularyGrammar
                )
            )
            val normalizedExamples = examplesCombined.mapNotNull { combined ->
                val parts = combined.split("||")
                val enJson = parts.getOrNull(0)?.trim().orEmpty()
                val vi = parts.getOrNull(1)?.trim().orEmpty()
                val grammar = parts.getOrNull(2)?.trim().orEmpty()
                val enList = ExampleUtils.jsonToSentences(enJson).map { it.trim() }.filter { it.isNotEmpty() }.distinct()
                if (enList.isEmpty()) null else Triple(ExampleUtils.sentencesToJson(enList), vi, grammar)
            }.distinct()
            normalizedExamples.forEach { (sentencesJson, vi, grammar) ->
                database.exampleDao().insertExample(
                    Example(
                        vocabularyId = vid,
                        sentences = sentencesJson,
                        vietnamese = vi.ifEmpty { null },
                        grammar = grammar.ifEmpty { null }
                    )
                )
            }
            Logger.d("Successfully added new vocabulary: $word with category: $category, vocabGrammar: ${vocabularyGrammar != null}")
            _addVocabularyStatus.postValue(AddVocabularyResult.Success)

            // Immediately sync to server
            Logger.d("🔄 Syncing new vocabulary to server immediately...")
            syncManager.syncSingleVocabularyToServer(vid)
        }
    }

    fun updateVocabulary(vocabularyId: Long, word: String, examplesCombined: List<String>, category: String = "GENERAL", vocabularyGrammar: String? = null) {
        viewModelScope.launch {
            // Fetch existing vocabulary to preserve statistics
            val existingVocab = database.vocabularyDao().getVocabularyById(vocabularyId)
            
            val vocabToUpdate = if (existingVocab != null) {
                existingVocab.copy(
                    word = word, 
                    category = category, 
                    grammar = vocabularyGrammar
                )
            } else {
                // Fallback if not found (shouldn't happen usually)
                Vocabulary(
                    id = vocabularyId, 
                    word = word, 
                    category = category, 
                    grammar = vocabularyGrammar
                )
            }
            
            database.vocabularyDao().updateVocabulary(vocabToUpdate)
            database.exampleDao().deleteExamplesByVocabularyId(vocabularyId)
            val normalizedExamples = examplesCombined.mapNotNull { combined ->
                val parts = combined.split("||")
                val enJson = parts.getOrNull(0)?.trim().orEmpty()
                val vi = parts.getOrNull(1)?.trim().orEmpty()
                val grammar = parts.getOrNull(2)?.trim().orEmpty()
                val enList = ExampleUtils.jsonToSentences(enJson).map { it.trim() }.filter { it.isNotEmpty() }.distinct()
                if (enList.isEmpty()) null else Triple(ExampleUtils.sentencesToJson(enList), vi, grammar)
            }.distinct()
            normalizedExamples.forEach { (sentencesJson, vi, grammar) ->
                database.exampleDao().insertExample(
                    Example(
                        vocabularyId = vocabularyId,
                        sentences = sentencesJson,
                        vietnamese = vi.ifEmpty { null },
                        grammar = grammar.ifEmpty { null }
                    )
                )
            }

            // Immediately sync to server
            Logger.d("🔄 Syncing updated vocabulary to server immediately...")
            syncManager.syncSingleVocabularyToServer(vocabularyId)
        }
    }

    fun deleteVocabulary(vwe: VocabularyWithExamples) {
        viewModelScope.launch {
            val result = syncManager.deleteVocabulary(vwe.vocabulary)
            result.onSuccess {
                Logger.d("Successfully deleted vocabulary: ${vwe.vocabulary.word}")
            }.onFailure {
                Logger.e("Failed to delete vocabulary: ${it.message}")
                // Fallback: delete locally only
                database.vocabularyDao().deleteVocabulary(vwe.vocabulary)
            }
        }
    }

    fun syncData() {
        _syncStatus.postValue("Đang đồng bộ hóa dữ liệu...") // Loading state
        viewModelScope.launch {
            Logger.d("🔄 [EditViewModel] Starting full sync...")

            // 1. Sync vocabularies
            val vocabResult = syncManager.syncData()

            // 2. Sync learning progress
            val progressResult = LearningProgressManager.syncToAppwrite(getApplication())

            // Combine results
            if (vocabResult.isSuccess && progressResult.isSuccess) {
                Logger.d("✅ [EditViewModel] Full sync successful!")
                _syncStatus.postValue("✅ Đồng bộ hóa thành công!\n📚 Từ vựng + 📊 Tiến độ học tập")
            } else {
                val errors = mutableListOf<String>()
                vocabResult.onFailure { errors.add("Từ vựng: ${it.message}") }
                progressResult.onFailure { errors.add("Tiến độ: ${it.message}") }

                Logger.e("❌ [EditViewModel] Sync failed: ${errors.joinToString(", ")}")
                _syncStatus.postValue("⚠️ Đồng bộ hóa thất bại:\n${errors.joinToString("\n")}")
            }
        }
    }

    /**
     * Clean up duplicate vocabularies in local database
     * This is called automatically on first load
     */
    fun cleanupDuplicates() {
        viewModelScope.launch {
            Logger.d("🧹 [EditViewModel] Cleaning up duplicate vocabularies...")
            try {
                syncManager.cleanupDuplicatesOnly()
                Logger.d("✅ [EditViewModel] Duplicate cleanup successful!")
            } catch (e: Exception) {
                Logger.e("❌ [EditViewModel] Duplicate cleanup failed: ${e.message}", e)
            }
        }
    }
}

