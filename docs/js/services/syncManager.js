/**
 * Sync Manager - Đồng bộ dữ liệu giữa Local IndexedDB và Appwrite Server
 *
 * NGUYÊN TẮC ĐƠN GIẢN:
 * 1. Server là nguồn sự thật (source of truth)
 * 2. Pull: Lấy từ server → ghi đè local (merge stats)
 * 3. Push: Đẩy local chưa có trên server → lên server
 * 4. Mọi thứ đồng bộ tuần tự, không song song
 */
class SyncManager {
    constructor() {
        this.isSyncing = false;
    }

    // ==================== MAIN SYNC ====================

    /**
     * Đồng bộ toàn bộ: Pull trước, Push sau
     */
    async syncAll() {
        if (this.isSyncing) {
            console.log('[Sync] Đang sync, bỏ qua');
            return { success: false, reason: 'already_syncing' };
        }

        this.isSyncing = true;
        console.log('[Sync] ========== BẮT ĐẦU ĐỒNG BỘ ==========');

        try {
            // 1. Đăng nhập
            await appwriteService.ensureLoggedIn();

            // 2. Pull từ server
            const pullResult = await this.pullFromServer();
            console.log('[Sync] Pull xong:', pullResult);

            // 3. Push lên server
            const pushResult = await this.pushToServer();
            console.log('[Sync] Push xong:', pushResult);

            console.log('[Sync] ========== ĐỒNG BỘ HOÀN TẤT ==========');
            return { success: true, pull: pullResult, push: pushResult };

        } catch (error) {
            console.error('[Sync] Lỗi:', error);
            return { success: false, error: error.message };

        } finally {
            this.isSyncing = false;
        }
    }

    // Alias cho syncAll
    async syncData() {
        return this.syncAll();
    }

    // ==================== PULL FROM SERVER ====================

    /**
     * Lấy toàn bộ từ server về local
     * Server thắng - local được merge stats
     */
    async pullFromServer() {
        console.log('[Pull] Bắt đầu pull từ server...');

        // 1. Lấy tất cả từ server
        const serverList = await appwriteService.getAllVocabularies();
        console.log(`[Pull] Server có ${serverList.length} từ`);

        if (serverList.length === 0) {
            return { updated: 0, created: 0 };
        }

        // 2. Lấy tất cả từ local
        const localList = await db.getAllVocabularies();
        console.log(`[Pull] Local có ${localList.length} từ`);

        // 3. Tạo map local theo word (lowercase)
        const localByWord = new Map();
        for (const v of localList) {
            const key = String(v.word || '').trim().toLowerCase();
            if (key) {
                localByWord.set(key, v);
            }
        }

        // 4. Xử lý từng từ server
        let updated = 0;
        let created = 0;

        for (const serverVocab of serverList) {
            const word = String(serverVocab.word || '').trim();
            const wordKey = word.toLowerCase();

            if (!wordKey) continue;

            const localVocab = localByWord.get(wordKey);

            if (localVocab) {
                // Đã có local → Merge và cập nhật
                await this.mergeAndUpdateLocal(localVocab, serverVocab);
                updated++;
            } else {
                // Chưa có local → Tạo mới
                await this.createLocalFromServer(serverVocab);
                created++;
            }
        }

        console.log(`[Pull] Cập nhật: ${updated}, Tạo mới: ${created}`);
        return { updated, created };
    }

    /**
     * Merge server vocab vào local vocab đã tồn tại
     */
    async mergeAndUpdateLocal(localVocab, serverVocab) {
        // Lấy giá trị từ server
        const serverWord = String(serverVocab.word || '').trim();
        const serverCategory = serverVocab.category || 'GENERAL';
        const serverLastStudied = parseInt(serverVocab.lastStudiedAt) || 0;
        const serverTotalAttempts = parseInt(serverVocab.totalAttempts) || 0;
        const serverCorrectAttempts = parseInt(serverVocab.correctAttempts) || 0;
        const serverMemoryScore = parseFloat(serverVocab.memoryScore) || 0;
        const serverLast10 = serverVocab.last10Attempts || '[]';
        const serverSentences = serverVocab.sentences || '';
        const serverVietnamese = serverVocab.vietnamese || '';
        const serverGrammar = serverVocab.grammar || '';

        // Lấy giá trị local
        const localLastStudied = parseInt(localVocab.lastStudiedAt) || 0;
        const localTotalAttempts = parseInt(localVocab.totalAttempts) || 0;
        const localCorrectAttempts = parseInt(localVocab.correctAttempts) || 0;
        const localMemoryScore = parseFloat(localVocab.memoryScore) || 0;

        // Merge: Lấy giá trị MAX (ai học nhiều hơn thì lấy)
        localVocab.word = serverWord;  // Server quyết định spelling
        localVocab.category = serverCategory;  // Server quyết định category
        localVocab.appwriteDocumentId = serverVocab.$id;

        // Merge stats: lấy max
        localVocab.totalAttempts = Math.max(localTotalAttempts, serverTotalAttempts);
        localVocab.correctAttempts = Math.max(localCorrectAttempts, serverCorrectAttempts);
        localVocab.memoryScore = Math.max(localMemoryScore, serverMemoryScore);
        localVocab.lastStudiedAt = Math.max(localLastStudied, serverLastStudied);

        // Merge last10Attempts: lấy cái dài hơn
        localVocab.last10Attempts = this.mergeLast10(localVocab.last10Attempts, serverLast10);

        // Cập nhật vocabulary
        await db.updateVocabulary(localVocab);

        // Cập nhật examples từ server
        if (serverSentences) {
            await this.updateLocalExamples(localVocab.id, serverSentences, serverVietnamese, serverGrammar);
        }
    }

    /**
     * Tạo local vocab mới từ server vocab
     */
    async createLocalFromServer(serverVocab) {
        const newVocab = {
            word: String(serverVocab.word || '').trim(),
            category: serverVocab.category || 'GENERAL',
            createdAt: parseInt(serverVocab.createdAt) || Date.now(),
            lastStudiedAt: parseInt(serverVocab.lastStudiedAt) || 0,
            priorityScore: parseInt(serverVocab.priorityScore) || 0,
            totalAttempts: parseInt(serverVocab.totalAttempts) || 0,
            correctAttempts: parseInt(serverVocab.correctAttempts) || 0,
            memoryScore: parseFloat(serverVocab.memoryScore) || 0,
            last10Attempts: serverVocab.last10Attempts || '[]',
            appwriteDocumentId: serverVocab.$id
        };

        const newId = await db.insertVocabulary(newVocab);

        // Tạo examples
        const sentences = serverVocab.sentences || '';
        if (sentences) {
            await this.updateLocalExamples(newId, sentences, serverVocab.vietnamese || '', serverVocab.grammar || '');
        }

        console.log(`[Pull] + Tạo mới: "${newVocab.word}"`);
    }

    /**
     * Cập nhật examples local từ server sentences
     */
    async updateLocalExamples(vocabularyId, sentencesStr, vietnamese, grammar) {
        // Xóa examples cũ
        await db.deleteExamplesByVocabularyId(vocabularyId);

        // Parse sentences
        const sentences = this.parseSentences(sentencesStr);
        if (sentences.length === 0) return;

        // Tạo example mới (gom tất cả sentences vào 1 example)
        await db.insertExample({
            vocabularyId: vocabularyId,
            sentences: JSON.stringify(sentences),
            vietnamese: vietnamese || '',
            grammar: grammar || '',
            createdAt: Date.now()
        });
    }

    // ==================== PUSH TO SERVER ====================

    /**
     * Đẩy từ local chưa có trên server lên server
     */
    async pushToServer() {
        console.log('[Push] Bắt đầu push lên server...');

        // 1. Lấy tất cả local vocab + examples
        const localList = await db.getAllVocabulariesWithExamples();
        console.log(`[Push] Local có ${localList.length} từ`);

        let created = 0;
        let updated = 0;

        for (const { vocabulary, examples } of localList) {
            const word = String(vocabulary.word || '').trim();
            if (!word) continue;

            if (vocabulary.appwriteDocumentId) {
                // Đã có trên server → Update
                await this.updateServerVocab(vocabulary, examples);
                updated++;
            } else {
                // Chưa có → Kiểm tra xem server có chưa
                const existingOnServer = await appwriteService.findVocabularyByWord(word);

                if (existingOnServer) {
                    // Server đã có → Link và update
                    vocabulary.appwriteDocumentId = existingOnServer.$id;
                    await db.updateVocabulary(vocabulary);
                    await this.updateServerVocab(vocabulary, examples);
                    updated++;
                } else {
                    // Server chưa có → Tạo mới
                    await this.createServerVocab(vocabulary, examples);
                    created++;
                }
            }
        }

        console.log(`[Push] Cập nhật: ${updated}, Tạo mới: ${created}`);
        return { updated, created };
    }

    /**
     * Tạo vocab mới trên server
     */
    async createServerVocab(vocabulary, examples) {
        const sentences = this.buildSentencesFromExamples(examples);
        const firstExample = examples[0] || {};

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: sentences,
            vietnamese: firstExample.vietnamese || '',
            grammar: firstExample.grammar || '',
            createdAt: String(vocabulary.createdAt || Date.now()),
            lastStudiedAt: String(vocabulary.lastStudiedAt || 0),
            priorityScore: String(vocabulary.priorityScore || 0),
            category: vocabulary.category || 'GENERAL',
            totalAttempts: String(vocabulary.totalAttempts || 0),
            correctAttempts: String(vocabulary.correctAttempts || 0),
            memoryScore: String(vocabulary.memoryScore || 0),
            last10Attempts: vocabulary.last10Attempts || '[]'
        };

        const response = await appwriteService.createVocabularyDoc(data);

        // Lưu appwriteDocumentId vào local
        vocabulary.appwriteDocumentId = response.$id;
        await db.updateVocabulary(vocabulary);

        console.log(`[Push] + Tạo mới: "${vocabulary.word}"`);
    }

    /**
     * Cập nhật vocab đã có trên server
     */
    async updateServerVocab(vocabulary, examples) {
        const sentences = this.buildSentencesFromExamples(examples);
        const firstExample = examples[0] || {};

        const data = {
            word: String(vocabulary.word || '').trim(),
            sentences: sentences,
            vietnamese: firstExample.vietnamese || '',
            grammar: firstExample.grammar || '',
            lastStudiedAt: String(vocabulary.lastStudiedAt || 0),
            priorityScore: String(vocabulary.priorityScore || 0),
            category: vocabulary.category || 'GENERAL',
            totalAttempts: String(vocabulary.totalAttempts || 0),
            correctAttempts: String(vocabulary.correctAttempts || 0),
            memoryScore: String(vocabulary.memoryScore || 0),
            last10Attempts: vocabulary.last10Attempts || '[]'
        };

        await appwriteService.updateVocabularyDoc(vocabulary.appwriteDocumentId, data);
    }

    // ==================== SINGLE VOCAB SYNC ====================

    /**
     * Sync một vocab ngay lập tức (khi thêm/sửa)
     */
    async syncSingleVocabulary(vocabularyId) {
        try {
            await appwriteService.ensureLoggedIn();

            const data = await db.getVocabularyWithExamples(vocabularyId);
            if (!data) {
                console.warn('[Sync] Không tìm thấy vocab:', vocabularyId);
                return;
            }

            const { vocabulary, examples } = data;

            if (vocabulary.appwriteDocumentId) {
                await this.updateServerVocab(vocabulary, examples);
            } else {
                // Kiểm tra server có chưa
                const word = String(vocabulary.word || '').trim();
                const existingOnServer = await appwriteService.findVocabularyByWord(word);

                if (existingOnServer) {
                    vocabulary.appwriteDocumentId = existingOnServer.$id;
                    await db.updateVocabulary(vocabulary);
                    await this.updateServerVocab(vocabulary, examples);
                } else {
                    await this.createServerVocab(vocabulary, examples);
                }
            }

            console.log(`[Sync] Đã sync: "${vocabulary.word}"`);

        } catch (error) {
            console.error('[Sync] Lỗi sync single:', error);
        }
    }

    // ==================== DELETE ====================

    /**
     * Xóa vocab khỏi server
     */
    async deleteVocabularyFromServer(appwriteDocumentId) {
        if (!appwriteDocumentId) return;

        try {
            await appwriteService.ensureLoggedIn();
            await appwriteService.deleteVocabularyDoc(appwriteDocumentId);
            console.log('[Delete] Đã xóa trên server:', appwriteDocumentId);
        } catch (error) {
            console.error('[Delete] Lỗi:', error);
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Parse sentences string thành array
     */
    parseSentences(str) {
        const raw = String(str || '').trim();
        if (!raw) return [];

        // Thử parse JSON array
        if (raw.startsWith('[')) {
            try {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    return arr.map(s => this.normalizeSentence(s)).filter(Boolean);
                }
            } catch (e) {
                // Không phải JSON, xử lý như text
            }
        }

        // Split theo newline
        return raw.split(/\n+/).map(s => this.normalizeSentence(s)).filter(Boolean);
    }

    /**
     * Normalize sentence
     */
    normalizeSentence(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Build sentences JSON từ examples array
     */
    buildSentencesFromExamples(examples) {
        if (!Array.isArray(examples) || examples.length === 0) {
            return '';
        }

        const seen = new Set();
        const result = [];

        for (const ex of examples) {
            if (!ex || !ex.sentences) continue;

            const sentences = this.parseSentences(ex.sentences);
            for (const s of sentences) {
                const key = s.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push(s);
                }
            }
        }

        if (result.length === 0) return '';

        // Giới hạn độ dài
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
     * Merge last10Attempts - lấy cái dài hơn
     */
    mergeLast10(localJson, serverJson) {
        try {
            const localArr = JSON.parse(localJson || '[]');
            const serverArr = JSON.parse(serverJson || '[]');
            return serverArr.length >= localArr.length ? serverJson : localJson;
        } catch (e) {
            return serverJson || localJson || '[]';
        }
    }
}

// Global instance
const syncManager = new SyncManager();
