/**
 * Database Service - IndexedDB wrapper for local storage
 * Tương đương với Room Database trong Android
 */
class Database {
    constructor() {
        this.dbName = 'vocabulary_database';
        this.dbVersion = 9;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create vocabularies store
                if (!db.objectStoreNames.contains('vocabularies')) {
                    const vocabStore = db.createObjectStore('vocabularies', { keyPath: 'id', autoIncrement: true });
                    vocabStore.createIndex('word', 'word', { unique: false });
                    vocabStore.createIndex('memoryScore', 'memoryScore', { unique: false });
                    vocabStore.createIndex('appwriteDocumentId', 'appwriteDocumentId', { unique: false });
                }

                // Create examples store
                if (!db.objectStoreNames.contains('examples')) {
                    const exampleStore = db.createObjectStore('examples', { keyPath: 'id', autoIncrement: true });
                    exampleStore.createIndex('vocabularyId', 'vocabularyId', { unique: false });
                    exampleStore.createIndex('appwriteDocumentId', 'appwriteDocumentId', { unique: false });
                }
            };
        });
    }

    // ==================== VOCABULARY OPERATIONS ====================

    /**
     * Get all vocabularies
     */
    async getAllVocabularies() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies'], 'readonly');
            const store = transaction.objectStore('vocabularies');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get vocabulary by ID
     */
    async getVocabularyById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies'], 'readonly');
            const store = transaction.objectStore('vocabularies');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get vocabulary by word
     */
    async getVocabularyByWord(word) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies'], 'readonly');
            const store = transaction.objectStore('vocabularies');
            const index = store.index('word');
            const request = index.get(word);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get vocabulary by Appwrite document ID
     */
    async getVocabularyByAppwriteDocumentId(appwriteDocumentId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies'], 'readonly');
            const store = transaction.objectStore('vocabularies');
            const index = store.index('appwriteDocumentId');
            const request = index.get(appwriteDocumentId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Insert vocabulary
     */
    async insertVocabulary(vocabulary) {
        return new Promise((resolve, reject) => {
            console.log('📝 [DB] insertVocabulary - raw input:', vocabulary);
            const transaction = this.db.transaction(['vocabularies'], 'readwrite');
            const store = transaction.objectStore('vocabularies');

            const vocabData = {
                ...vocabulary,
                createdAt: vocabulary.createdAt || Date.now(),
                lastStudiedAt: vocabulary.lastStudiedAt || Date.now(),
                priorityScore: vocabulary.priorityScore || 0,
                category: vocabulary.category || 'GENERAL',
                totalAttempts: vocabulary.totalAttempts || 0,
                correctAttempts: vocabulary.correctAttempts || 0,
                memoryScore: vocabulary.memoryScore || 0,
                last10Attempts: vocabulary.last10Attempts || '[]',
                appwriteDocumentId: vocabulary.appwriteDocumentId || null
            };

            // Remove id if undefined to let autoIncrement work
            if (!vocabData.id) {
                delete vocabData.id;
            }

            console.log('📝 [DB] insertVocabulary - final data:', vocabData);
            const request = store.add(vocabData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update vocabulary
     */
    async updateVocabulary(vocabulary) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies'], 'readwrite');
            const store = transaction.objectStore('vocabularies');
            const request = store.put(vocabulary);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete vocabulary
     */
    async deleteVocabulary(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vocabularies', 'examples'], 'readwrite');

            // Delete vocabulary
            const vocabStore = transaction.objectStore('vocabularies');
            vocabStore.delete(id);

            // Delete associated examples
            const exampleStore = transaction.objectStore('examples');
            const index = exampleStore.index('vocabularyId');
            const request = index.openCursor(IDBKeyRange.only(id));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Update learning stats
     */
    async updateLearningStats(id, isCorrect, exampleId = null) {
        const vocab = await this.getVocabularyById(id);
        if (!vocab) return;

        vocab.totalAttempts = (vocab.totalAttempts || 0) + 1;
        if (isCorrect) {
            vocab.correctAttempts = (vocab.correctAttempts || 0) + 1;
        }
        vocab.memoryScore = vocab.correctAttempts / vocab.totalAttempts;

        // Update last 10 attempts
        let last10 = [];
        try {
            last10 = JSON.parse(vocab.last10Attempts || '[]');
        } catch (e) {
            last10 = [];
        }
        last10.push(isCorrect);
        if (last10.length > 10) {
            last10 = last10.slice(-10);
        }
        vocab.last10Attempts = JSON.stringify(last10);

        if (exampleId !== null && exampleId !== undefined) {
            let exampleStats = {};
            try {
                exampleStats = JSON.parse(vocab.exampleStats || '{}');
            } catch (e) {
                exampleStats = {};
            }

            const key = String(exampleId);
            const stats = exampleStats[key] || { totalAttempts: 0, correctAttempts: 0 };
            stats.totalAttempts += 1;
            if (isCorrect) {
                stats.correctAttempts += 1;
            }
            exampleStats[key] = stats;
            vocab.exampleStats = JSON.stringify(exampleStats);
        }

        vocab.lastStudiedAt = Date.now();

        await this.updateVocabulary(vocab);
        return vocab;
    }

    /**
     * Calculate effective memory score with time decay
     * Score decreases over time if not studied (exponential decay)
     * @param {Object} vocab - Vocabulary object
     * @returns {number} - Effective score (0-1)
     */
    calculateEffectiveScore(vocab) {
        const memoryScore = vocab.memoryScore || 0;
        const lastStudied = vocab.lastStudiedAt || vocab.createdAt || Date.now();
        const daysSinceLastStudy = (Date.now() - lastStudied) / (1000 * 60 * 60 * 24);

        // Exponential decay factor: giảm dần theo thời gian nhưng không bao giờ về 0
        const HALF_LIFE_DAYS = 0.83;
        const decayFactor = Math.exp(-daysSinceLastStudy / HALF_LIFE_DAYS);

        const effectiveScore = memoryScore * decayFactor;

        return effectiveScore;
    }

    /**
     * Get vocabularies sorted by effective memory score (lowest first)
     * Uses time decay: scores decrease over time if not studied
     */
    async getVocabulariesByLowestMemoryScore(limit = 30, excludeIds = [], category = null) {
        const allVocabs = await this.getAllVocabularies();

        // Calculate effective score for each vocab
        const vocabsWithEffectiveScore = allVocabs.map(v => ({
            ...v,
            effectiveScore: this.calculateEffectiveScore(v)
        }));

        return vocabsWithEffectiveScore
            .filter(v => !excludeIds.includes(v.id))
            .filter(v => !category || (v.category || 'GENERAL') === category)
            .sort((a, b) => a.effectiveScore - b.effectiveScore)  // Lowest first
            .slice(0, limit);
    }

    /**
     * Get mixed queue vocabularies: 70% new words + 30% review words
     * Phương án 1: Queue hỗn hợp để cân bằng học mới và ôn cũ
     *
     * @param {number} queueSize - Total queue size (default 30)
     * @param {Array} excludeIds - IDs to exclude
     * @param {string} category - Category filter
     * @returns {Array} - Mixed vocabularies (new + review)
     */
    async getMixedQueueVocabularies(queueSize = 30, excludeIds = [], category = null) {
        const allVocabs = await this.getAllVocabularies();

        // Calculate effective score for all
        const vocabsWithScore = allVocabs
            .map(v => ({
                ...v,
                effectiveScore: this.calculateEffectiveScore(v),
                daysSinceLastStudy: (Date.now() - (v.lastStudiedAt || v.createdAt || Date.now())) / (1000 * 60 * 60 * 24)
            }))
            .filter(v => !excludeIds.includes(v.id))
            .filter(v => !category || (v.category || 'GENERAL') === category);

        // Split into NEW and REVIEW groups
        const NEW_WORDS = vocabsWithScore.filter(v => {
            const last10 = Database.getLast10AttemptsList(v);
            const correctCount = last10.filter(x => x === true).length;
            // New = chưa master (< 7/10)
            return last10.length < 10 || correctCount < 7;
        });

        const REVIEW_WORDS = vocabsWithScore.filter(v => {
            const last10 = Database.getLast10AttemptsList(v);
            const correctCount = last10.filter(x => x === true).length;
            // Review = đã master (>= 7/10) VÀ lâu không học
            return last10.length >= 10 && correctCount >= 7 && v.daysSinceLastStudy > 1;
        });

        // Calculate sizes: 70% new, 30% review
        const reviewSize = Math.min(
            Math.floor(queueSize * 0.3),  // 30% = 9 từ
            REVIEW_WORDS.length
        );
        const newSize = Math.min(
            queueSize - reviewSize,
            NEW_WORDS.length
        );

        // Sort and select
        const selectedNew = NEW_WORDS
            .sort((a, b) => a.effectiveScore - b.effectiveScore)
            .slice(0, newSize);

        // Sort review by priority: daysSince × (1 - memoryScore)
        const selectedReview = REVIEW_WORDS
            .map(v => ({
                ...v,
                reviewPriority: v.daysSinceLastStudy * (1 - v.memoryScore)
            }))
            .sort((a, b) => b.reviewPriority - a.reviewPriority)  // Highest priority first
            .slice(0, reviewSize);

        console.log(`📊 [Mixed Queue] New: ${selectedNew.length}, Review: ${selectedReview.length}`);

        // Combine and return
        return [...selectedNew, ...selectedReview];
    }

    /**
     * Shuffle array with interleaved pattern
     * Pattern: high score, low score, high score, low score...
     * Example: words at positions 1,3,5... are highest scores
     *          words at positions 2,4,6... are lowest scores
     * This creates better memory retention by alternating difficulty
     */
    shuffleInterleavedByMemoryScore(vocabs) {
        if (vocabs.length === 0) return [];

        // Sort by memory score
        const sorted = [...vocabs].sort((a, b) => (a.memoryScore || 0) - (b.memoryScore || 0));

        // Split into two groups
        const halfIndex = Math.ceil(sorted.length / 2);
        const lowScoreGroup = sorted.slice(0, halfIndex);  // Lowest scores (hardest words)
        const highScoreGroup = sorted.slice(halfIndex);     // Highest scores (easiest words)

        // Shuffle each group for variety
        this.shuffleArray(lowScoreGroup);
        this.shuffleArray(highScoreGroup);

        // Interleave: odd positions get high scores, even positions get low scores
        const result = [];
        const maxLength = Math.max(lowScoreGroup.length, highScoreGroup.length);

        for (let i = 0; i < maxLength; i++) {
            // Odd positions (1, 3, 5...) - easier words (high memory score)
            if (i < highScoreGroup.length) {
                result.push(highScoreGroup[i]);
            }
            // Even positions (2, 4, 6...) - harder words (low memory score)
            if (i < lowScoreGroup.length) {
                result.push(lowScoreGroup[i]);
            }
        }

        return result;
    }

    /**
     * Fisher-Yates shuffle algorithm
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get random vocabulary
     */
    async getRandomVocabulary() {
        const allVocabs = await this.getAllVocabularies();
        if (allVocabs.length === 0) return null;
        return allVocabs[Math.floor(Math.random() * allVocabs.length)];
    }

    // ==================== EXAMPLE OPERATIONS ====================

    /**
     * Get examples by vocabulary ID
     */
    async getExamplesByVocabularyId(vocabularyId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readonly');
            const store = transaction.objectStore('examples');
            const index = store.index('vocabularyId');
            const request = index.getAll(vocabularyId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get example by ID
     */
    async getExampleById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readonly');
            const store = transaction.objectStore('examples');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Insert example
     */
    async insertExample(example) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readwrite');
            const store = transaction.objectStore('examples');

            const exampleData = {
                ...example,
                createdAt: example.createdAt || Date.now(),
                appwriteDocumentId: example.appwriteDocumentId || null
            };

            if (!exampleData.id) {
                delete exampleData.id;
            }

            const request = store.add(exampleData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update example
     */
    async updateExample(example) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readwrite');
            const store = transaction.objectStore('examples');
            const request = store.put(example);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete example
     */
    async deleteExample(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readwrite');
            const store = transaction.objectStore('examples');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete examples by vocabulary ID
     */
    async deleteExamplesByVocabularyId(vocabularyId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readwrite');
            const store = transaction.objectStore('examples');
            const index = store.index('vocabularyId');
            const request = index.openCursor(IDBKeyRange.only(vocabularyId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get all examples
     */
    async getAllExamples() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['examples'], 'readonly');
            const store = transaction.objectStore('examples');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== VOCABULARY WITH EXAMPLES ====================

    /**
     * Get vocabulary with examples
     */
    async getVocabularyWithExamples(id) {
        const vocabulary = await this.getVocabularyById(id);
        if (!vocabulary) return null;

        const examples = await this.getExamplesByVocabularyId(id);
        return { vocabulary, examples };
    }

    /**
     * Get all vocabularies with examples
     */
    async getAllVocabulariesWithExamples() {
        const vocabularies = await this.getAllVocabularies();
        const result = [];

        for (const vocab of vocabularies) {
            const examples = await this.getExamplesByVocabularyId(vocab.id);
            result.push({ vocabulary: vocab, examples });
        }

        return result;
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Helper methods for vocabulary stats
     */
    static getLast10AttemptsList(vocab) {
        try {
            return JSON.parse(vocab.last10Attempts || '[]');
        } catch (e) {
            return [];
        }
    }

    static getLast10CorrectCount(vocab) {
        const list = Database.getLast10AttemptsList(vocab);
        return list.filter(x => x === true).length;
    }

    static getLast10Percentage(vocab) {
        const list = Database.getLast10AttemptsList(vocab);
        if (list.length === 0) return 0;
        return (list.filter(x => x === true).length / list.length) * 100;
    }

    /**
     * Check if vocabulary has passed (70%+ accuracy with at least 10 total attempts)
     */
    static hasPassed(vocab, numExamples = 1) {
        const totalAttempts = vocab.totalAttempts || 0;
        const correctAttempts = vocab.correctAttempts || 0;
        const memoryScore = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

        // 70%+ accuracy with at least 10 attempts
        return totalAttempts >= 10 && memoryScore >= 70;
    }

    /**
     * Check if vocabulary is mastered based on examples count
     * Async version that loads examples count
     */
    async isVocabularyMastered(vocabId) {
        const vocabWithExamples = await this.getVocabularyWithExamples(vocabId);
        if (!vocabWithExamples) return false;

        const numExamples = vocabWithExamples.examples.length;
        return Database.hasPassed(vocabWithExamples.vocabulary, numExamples);
    }

    /**
     * Clean up duplicates
     */
    async cleanupDuplicates() {
        const allVocabs = await this.getAllVocabularies();
        const wordMap = new Map();
        const duplicatesToDelete = [];

        for (const vocab of allVocabs) {
            const normalizedWord = vocab.word.toLowerCase().trim();
            if (wordMap.has(normalizedWord)) {
                // Keep the one with more attempts
                const existing = wordMap.get(normalizedWord);
                if ((vocab.totalAttempts || 0) > (existing.totalAttempts || 0)) {
                    duplicatesToDelete.push(existing.id);
                    wordMap.set(normalizedWord, vocab);
                } else {
                    duplicatesToDelete.push(vocab.id);
                }
            } else {
                wordMap.set(normalizedWord, vocab);
            }
        }

        for (const id of duplicatesToDelete) {
            await this.deleteVocabulary(id);
        }

        console.log(`Cleaned up ${duplicatesToDelete.length} duplicate vocabularies`);
        return duplicatesToDelete.length;
    }
}

// Global database instance
const db = new Database();
