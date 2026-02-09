/**
 * Appwrite Service - API đơn giản để giao tiếp với Appwrite Server
 *
 * NGUYÊN TẮC:
 * 1. Methods đơn giản, rõ ràng - mỗi method làm 1 việc
 * 2. Không xử lý logic phức tạp - chỉ gọi API
 * 3. Trả về dữ liệu thô từ Appwrite
 */
class AppwriteService {
    constructor() {
        // Config
        this.projectId = '68cf65390012ceaa2085';
        this.endpoint = 'https://fra.cloud.appwrite.io/v1';
        this.databaseId = '68cfb8c900053dca6f90';
        this.vocabularyCollectionId = 'vocabularies';
        this.learningProgressCollectionId = 'learning_progress';

        // SDK
        this.client = new Appwrite.Client();
        this.client.setEndpoint(this.endpoint).setProject(this.projectId);

        this.account = new Appwrite.Account(this.client);
        this.databases = new Appwrite.Databases(this.client);

        this.userId = null;
        this.isLoggedIn = false;
    }

    // ==================== AUTH ====================

    /**
     * Đảm bảo đã đăng nhập
     */
    async ensureLoggedIn() {
        if (this.isLoggedIn) return;

        try {
            // Kiểm tra session hiện tại
            const user = await this.account.get();
            this.userId = user.$id;
            this.isLoggedIn = true;
            console.log('[Appwrite] Đã đăng nhập:', this.userId);
        } catch (e) {
            // Chưa đăng nhập → tạo anonymous session
            await this.account.createAnonymousSession();
            const user = await this.account.get();
            this.userId = user.$id;
            this.isLoggedIn = true;
            console.log('[Appwrite] Đăng nhập anonymous:', this.userId);
        }
    }

    // Alias cho compatibility
    async loginAnonymously() {
        return this.ensureLoggedIn();
    }

    // ==================== VOCABULARY - READ ====================

    /**
     * Lấy tất cả vocabularies từ server (có pagination)
     * Appwrite giới hạn 100 documents/request, dùng cursor để lấy hết
     */
    async getAllVocabularies() {
        const PAGE_SIZE = 100;
        const allDocuments = [];
        let lastId = null;
        let hasMore = true;

        console.log('[Appwrite] Bắt đầu lấy tất cả vocabularies...');

        try {
            while (hasMore) {
                const queries = [
                    Appwrite.Query.limit(PAGE_SIZE),
                    Appwrite.Query.orderAsc('$id')  // Sắp xếp theo ID để pagination ổn định
                ];

                // Nếu có lastId, lấy từ sau document đó
                if (lastId) {
                    queries.push(Appwrite.Query.cursorAfter(lastId));
                }

                const response = await this.databases.listDocuments(
                    this.databaseId,
                    this.vocabularyCollectionId,
                    queries
                );

                const docs = response.documents || [];
                allDocuments.push(...docs);

                console.log(`[Appwrite] Đã lấy ${allDocuments.length} từ...`);

                // Kiểm tra còn data không
                if (docs.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    lastId = docs[docs.length - 1].$id;
                }
            }

            console.log(`[Appwrite] Tổng cộng: ${allDocuments.length} từ`);
            return allDocuments;

        } catch (error) {
            console.error('[Appwrite] Lỗi getAllVocabularies:', error);
            return allDocuments; // Trả về những gì đã lấy được
        }
    }

    // Alias cho compatibility
    async listVocabularies(queries = []) {
        // Nếu không có query đặc biệt, dùng getAllVocabularies với pagination
        if (queries.length === 0) {
            return this.getAllVocabularies();
        }

        // Nếu có query, chỉ lấy 1 page (cho các trường hợp tìm kiếm cụ thể)
        try {
            const finalQueries = [Appwrite.Query.limit(100), ...queries];
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.vocabularyCollectionId,
                finalQueries
            );
            return response.documents || [];
        } catch (error) {
            console.error('[Appwrite] Lỗi listVocabularies:', error);
            return [];
        }
    }

    /**
     * Tìm vocabulary theo word
     */
    async findVocabularyByWord(word) {
        try {
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.vocabularyCollectionId,
                [
                    Appwrite.Query.equal('word', String(word || '').trim()),
                    Appwrite.Query.limit(1)
                ]
            );
            return response.documents[0] || null;
        } catch (error) {
            console.error('[Appwrite] Lỗi findVocabularyByWord:', error);
            return null;
        }
    }

    /**
     * Lấy vocabulary theo ID
     */
    async getVocabularyById(documentId) {
        try {
            return await this.databases.getDocument(
                this.databaseId,
                this.vocabularyCollectionId,
                documentId
            );
        } catch (error) {
            console.error('[Appwrite] Lỗi getVocabularyById:', error);
            return null;
        }
    }

    // Alias
    async getVocabulary(documentId) {
        return this.getVocabularyById(documentId);
    }

    // ==================== VOCABULARY - WRITE ====================

    /**
     * Tạo vocabulary mới
     */
    async createVocabularyDoc(data) {
        const documentId = Appwrite.ID.unique();
        return this.databases.createDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId,
            data
        );
    }

    // Alias cho compatibility
    async createVocabulary(vocabulary, examples) {
        const firstExample = Array.isArray(examples) && examples.length > 0
            ? examples[0]
            : { sentences: '', vietnamese: '', grammar: '' };

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: this.buildSentencesJson(examples),
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

        return this.createVocabularyDoc(data);
    }

    /**
     * Cập nhật vocabulary
     */
    async updateVocabularyDoc(documentId, data) {
        return this.databases.updateDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId,
            data
        );
    }

    // Alias cho compatibility
    async updateVocabulary(documentId, vocabulary, examples) {
        const firstExample = Array.isArray(examples) && examples.length > 0
            ? examples[0]
            : { sentences: '', vietnamese: '', grammar: '' };

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: this.buildSentencesJson(examples),
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

        return this.updateVocabularyDoc(documentId, data);
    }

    /**
     * Xóa vocabulary
     */
    async deleteVocabularyDoc(documentId) {
        return this.databases.deleteDocument(
            this.databaseId,
            this.vocabularyCollectionId,
            documentId
        );
    }

    // Alias
    async deleteVocabulary(documentId) {
        return this.deleteVocabularyDoc(documentId);
    }

    // ==================== LEARNING PROGRESS ====================

    /**
     * Lấy learning progress
     */
    async getLearningProgress() {
        try {
            return await this.databases.getDocument(
                this.databaseId,
                this.learningProgressCollectionId,
                'user_learning_progress'
            );
        } catch (error) {
            if (error.code === 404) return null;
            throw error;
        }
    }

    /**
     * Lưu learning progress
     */
    async saveLearningProgress(progress) {
        const documentId = 'user_learning_progress';
        const data = {
            startTime: String(progress.startTime || Date.now()),
            wordsLearned: String(progress.wordsLearned || 0),
            lastUpdated: String(Date.now())
        };

        try {
            return await this.databases.updateDocument(
                this.databaseId,
                this.learningProgressCollectionId,
                documentId,
                data
            );
        } catch (error) {
            if (error.code === 404) {
                return await this.databases.createDocument(
                    this.databaseId,
                    this.learningProgressCollectionId,
                    documentId,
                    data
                );
            }
            throw error;
        }
    }

    // ==================== HELPER ====================

    /**
     * Build sentences JSON từ examples
     */
    buildSentencesJson(examples) {
        if (!Array.isArray(examples) || examples.length === 0) {
            return '';
        }

        const seen = new Set();
        const result = [];

        for (const ex of examples) {
            if (!ex || !ex.sentences) continue;

            const raw = String(ex.sentences).trim();
            if (!raw) continue;

            // Parse sentences
            let sentences = [];
            if (raw.startsWith('[')) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        sentences = parsed;
                    }
                } catch (e) {
                    sentences = raw.split(/\n+/);
                }
            } else {
                sentences = raw.split(/\n+/);
            }

            // Add unique sentences
            for (const s of sentences) {
                const normalized = String(s || '').replace(/\s+/g, ' ').trim();
                const key = normalized.toLowerCase();
                if (normalized && !seen.has(key)) {
                    seen.add(key);
                    result.push(normalized);
                }
            }
        }

        if (result.length === 0) return '';

        // Truncate if too long
        const MAX_LENGTH = 950;
        const truncated = [];
        for (const s of result) {
            const candidate = [...truncated, s];
            if (JSON.stringify(candidate).length > MAX_LENGTH) break;
            truncated.push(s);
        }

        return truncated.length > 0 ? JSON.stringify(truncated) : '';
    }

    /**
     * Test connection
     */
    async testConnection() {
        try {
            await this.account.get();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        return this.account.get();
    }

    /**
     * Sync words to Chrome Extension (nếu có)
     */
    async syncWordsToExtension() {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return { success: false, reason: 'Not an extension' };
        }

        try {
            const vocabularies = await this.getAllVocabularies();
            const wordsList = vocabularies.map(v => v.word).filter(Boolean);
            await chrome.storage.local.set({ saved_words_list: wordsList });
            return { success: true, count: wordsList.length };
        } catch (error) {
            console.error('[Appwrite] Lỗi syncWordsToExtension:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance
const appwriteService = new AppwriteService();
