/**
 * Appwrite Service - Using official Appwrite SDK
 * Tương đương với AppwriteHelper trong Android
 *
 * Appwrite collection schema:
 * - word: string
 * - sentences: string (JSON array or single sentence)
 * - vietnamese: string (optional)
 * - grammar: string (optional)
 * - createdAt: string
 * - lastStudiedAt: string
 * - priorityScore: string
 * - totalAttempts: string
 * - correctAttempts: string
 * - memoryScore: string
 * - last10Attempts: string (JSON array of booleans for tracking mastery)
 */
class AppwriteService {
    constructor() {
        // Appwrite Configuration
        this.projectId = '68cf65390012ceaa2085';
        this.endpoint = 'https://fra.cloud.appwrite.io/v1';
        this.databaseId = '68cfb8c900053dca6f90';
        this.vocabularyCollectionId = 'vocabularies';
        this.learningProgressCollectionId = 'learning_progress';

        // Initialize Appwrite SDK
        this.client = new Appwrite.Client();
        this.client
            .setEndpoint(this.endpoint)
            .setProject(this.projectId);

        this.account = new Appwrite.Account(this.client);
        this.databases = new Appwrite.Databases(this.client);

        this.userId = null;
    }

    /**
     * Login anonymously
     */
    async loginAnonymously() {
        try {
            // Check if already logged in
            try {
                const user = await this.account.get();
                this.userId = user.$id;
                console.log('Already logged in as:', this.userId);
                return user;
            } catch (e) {
                // Not logged in, create anonymous session
            }

            // Create anonymous session
            await this.account.createAnonymousSession();

            // Get user info
            const user = await this.account.get();
            this.userId = user.$id;
            console.log('Logged in anonymously as:', this.userId);

            return user;
        } catch (error) {
            console.error('Anonymous login failed:', error);
            throw error;
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        return this.account.get();
    }

    // ==================== VOCABULARY OPERATIONS ====================

    normalizeSentence(sentence) {
        return String(sentence || '')
            .replace(/\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    buildSentencesFromExamples(examples) {
        const seen = new Set();
        const allSentences = [];

        if (Array.isArray(examples)) {
            for (const example of examples) {
                if (!example || !example.sentences) continue;

                const raw = String(example.sentences).trim();
                if (!raw) continue;

                if (raw.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            for (const s of parsed) {
                                const sentence = this.normalizeSentence(s);
                                const key = sentence.toLowerCase();
                                if (sentence.length > 0 && !seen.has(key)) {
                                    seen.add(key);
                                    allSentences.push(sentence);
                                }
                            }
                            continue;
                        }
                    } catch (e) {
                    }
                }

                const parts = raw.split(/\n+/);
                for (const part of parts) {
                    const sentence = this.normalizeSentence(part);
                    const key = sentence.toLowerCase();
                    if (sentence.length > 0 && !seen.has(key)) {
                        seen.add(key);
                        allSentences.push(sentence);
                    }
                }
            }
        }

        if (allSentences.length === 0) {
            return '';
        }

        const MAX_LENGTH = 950;
        const result = [];
        for (const sentence of allSentences) {
            const candidate = [...result, sentence];
            const json = JSON.stringify(candidate);
            if (json.length > MAX_LENGTH) {
                break;
            }
            result.push(sentence);
        }

        return JSON.stringify(result);
    }

    /**
     * List all vocabularies from Appwrite
     */
    async listVocabularies(queries = []) {
        try {
            const finalQueries = [
                Appwrite.Query.limit(1000),
                ...queries
            ];

            const response = await this.databases.listDocuments(
                this.databaseId,
                this.vocabularyCollectionId,
                finalQueries
            );
            return response.documents || [];
        } catch (error) {
            console.error('Error listing vocabularies:', error);
            return [];
        }
    }

    /**
     * Get vocabulary document by ID
     */
    async getVocabulary(documentId) {
        return this.databases.getDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId
        );
    }

    /**
     * Create vocabulary in Appwrite
     * Note: Appwrite collection uses flat structure with sentences/vietnamese/grammar fields
     */
    async createVocabulary(vocabulary, examples) {
        const documentId = Appwrite.ID.unique();
        const firstExample = Array.isArray(examples) && examples.length > 0
            ? examples[0]
            : { sentences: '', vietnamese: '', grammar: '' };
        const sentencesJson = this.buildSentencesFromExamples(examples);

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: sentencesJson || firstExample.sentences || '',
            vietnamese: firstExample.vietnamese || '',
            grammar: firstExample.grammar || '',
            createdAt: String(vocabulary.createdAt || Date.now()),
            lastStudiedAt: String(vocabulary.lastStudiedAt || Date.now()),
            priorityScore: String(vocabulary.priorityScore || 0),
            category: vocabulary.category || 'GENERAL',
            totalAttempts: String(vocabulary.totalAttempts || 0),
            correctAttempts: String(vocabulary.correctAttempts || 0),
            memoryScore: String(vocabulary.memoryScore || 0),
            last10Attempts: vocabulary.last10Attempts || '[]'
        };

        return this.databases.createDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId,
            data
        );
    }

    /**
     * Update vocabulary in Appwrite
     */
    async updateVocabulary(documentId, vocabulary, examples) {
        const firstExample = Array.isArray(examples) && examples.length > 0
            ? examples[0]
            : { sentences: '', vietnamese: '', grammar: '' };
        const sentencesJson = this.buildSentencesFromExamples(examples);

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: sentencesJson || firstExample.sentences || '',
            vietnamese: firstExample.vietnamese || '',
            grammar: firstExample.grammar || '',
            lastStudiedAt: String(vocabulary.lastStudiedAt || Date.now()),
            priorityScore: String(vocabulary.priorityScore || 0),
            category: vocabulary.category || 'GENERAL',
            totalAttempts: String(vocabulary.totalAttempts || 0),
            correctAttempts: String(vocabulary.correctAttempts || 0),
            memoryScore: String(vocabulary.memoryScore || 0),
            last10Attempts: vocabulary.last10Attempts || '[]'
        };

        return this.databases.updateDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId,
            data
        );
    }

    /**
     * Delete vocabulary from Appwrite
     */
    async deleteVocabulary(documentId) {
        return this.databases.deleteDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId
        );
    }

    // ==================== LEARNING PROGRESS ====================

    /**
     * Get learning progress
     */
    async getLearningProgress() {
        try {
            const documentId = 'user_learning_progress';
            return await this.databases.getDocument(
                this.databaseId,
                this.learningProgressCollectionId,
                documentId
            );
        } catch (error) {
            // Document not found, return null
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create or update learning progress
     */
    async saveLearningProgress(progress) {
        const documentId = 'user_learning_progress';

        // FIXED: Remove userId - collection only has startTime, wordsLearned, lastUpdated
        // Handle null/undefined startTime by using current time
        const startTime = progress.startTime || Date.now();
        const wordsLearned = progress.wordsLearned || 0;

        const data = {
            startTime: startTime.toString(),
            wordsLearned: wordsLearned.toString(),
            lastUpdated: Date.now().toString()
        };

        console.log('[AppwriteService] Saving progress:', data);

        try {
            // Try to update existing document
            const result = await this.databases.updateDocument(
                this.databaseId,
                this.learningProgressCollectionId,
                documentId,
                data
            );
            console.log('[AppwriteService] ✅ Update successful');
            return result;
        } catch (error) {
            // Document doesn't exist, create it
            if (error.code === 404) {
                console.log('[AppwriteService] Document not found, creating...');
                const result = await this.databases.createDocument(
                    this.databaseId,
                    this.learningProgressCollectionId,
                    documentId,
                    data
                );
                console.log('[AppwriteService] ✅ Create successful');
                return result;
            }
            console.error('[AppwriteService] ❌ Error:', error.message);
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Test connection
     */
    async testConnection() {
        try {
            await this.account.get();
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Sync all vocabulary words to Chrome Extension storage
     * This allows the extension to check if words exist without querying Appwrite
     */
    async syncWordsToExtension() {
        console.log('[Appwrite Sync] Syncing vocabulary words to extension storage...');

        // Check if chrome.storage is available
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            console.log('[Appwrite Sync] Chrome storage API not available (not a Chrome extension)');
            return { success: false, reason: 'Not an extension' };
        }

        // Fetch all vocabularies
        const vocabularies = await this.listVocabularies();
        console.log('[Appwrite Sync] Fetched', vocabularies.length, 'vocabularies');

        // Extract word list (only the words, not full documents)
        const wordsList = vocabularies.map(vocab => vocab.word).filter(word => word);
        console.log('[Appwrite Sync] Extracted', wordsList.length, 'words');

        // Save to chrome.storage.local
        const SAVED_WORDS_STORAGE_KEY = 'saved_words_list';
        await chrome.storage.local.set({ [SAVED_WORDS_STORAGE_KEY]: wordsList });

        console.log('[Appwrite Sync] ✅ Successfully synced', wordsList.length, 'words to extension storage');
        return { success: true, count: wordsList.length };
    }
}

// Global Appwrite service instance
const appwriteService = new AppwriteService();
