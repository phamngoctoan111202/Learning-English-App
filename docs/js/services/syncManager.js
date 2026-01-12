/**
 * Sync Manager - Bidirectional sync between local IndexedDB and Appwrite
 * Tương đương với SyncManager trong Android
 *
 * Note: Appwrite collection uses flat structure:
 * - word, sentences, vietnamese (not nested examples array)
 */
class SyncManager {
    constructor() {
        this.isSyncing = false;
    }

    /**
     * Full bidirectional sync
     */
    async syncData() {
        if (this.isSyncing) {
            return;
        }

        this.isSyncing = true;
        console.log('[EDIT_FLOW] Starting background sync...');

        try {
            // Ensure logged in
            await appwriteService.loginAnonymously();

            // Clean up duplicates first
            await db.cleanupDuplicates();

            // Sync from server to client
            await this.syncServerToClient();

            // Sync from client to server
            await this.syncClientToServer();
        } catch (error) {
            console.error('[EDIT_FLOW] Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync from Appwrite to local IndexedDB
     */
    async syncServerToClient() {
        console.log('Syncing server to client...');

        try {
            const serverVocabs = await appwriteService.listVocabularies();
            console.log(`Found ${serverVocabs.length} vocabularies on server`);

            for (const serverVocab of serverVocabs) {
                await this.mergeVocabularyFromServer(serverVocab);
            }
        } catch (error) {
            console.error('Server to client sync failed:', error);
        }
    }

    /**
     * Merge a single vocabulary from server
     * Server schema: word, sentences, vietnamese, createdAt, lastStudiedAt, etc.
     */
    async mergeVocabularyFromServer(serverVocab) {
        try {
            // Find local vocabulary with matching appwriteDocumentId
            const localVocabs = await db.getAllVocabularies();
            let localVocab = localVocabs.find(v => v.appwriteDocumentId === serverVocab.$id);

            // Also check by word if not found by documentId
            if (!localVocab) {
                localVocab = localVocabs.find(v =>
                    v.word.toLowerCase().trim() === serverVocab.word.toLowerCase().trim()
                );
            }

            // Parse server values (they are stored as strings)
            const serverTotalAttempts = parseInt(serverVocab.totalAttempts) || 0;
            const serverCorrectAttempts = parseInt(serverVocab.correctAttempts) || 0;
            const serverMemoryScore = parseFloat(serverVocab.memoryScore) || 0;
            const serverLastStudiedAt = parseInt(serverVocab.lastStudiedAt) || 0;
            const serverCreatedAt = parseInt(serverVocab.createdAt) || Date.now();

            if (localVocab) {
                // Merge with max values (same logic as Android)
                const mergedTotalAttempts = Math.max(localVocab.totalAttempts || 0, serverTotalAttempts);
                const mergedCorrectAttempts = Math.max(localVocab.correctAttempts || 0, serverCorrectAttempts);
                const mergedLastStudiedAt = Math.max(localVocab.lastStudiedAt || 0, serverLastStudiedAt);
                const mergedMemoryScore = Math.max(localVocab.memoryScore || 0, serverMemoryScore);

                // Update local with merged data
                localVocab.word = serverVocab.word;
                localVocab.appwriteDocumentId = serverVocab.$id;
                localVocab.category = serverVocab.category || localVocab.category || 'GENERAL';
                localVocab.totalAttempts = mergedTotalAttempts;
                localVocab.correctAttempts = mergedCorrectAttempts;
                localVocab.memoryScore = mergedMemoryScore;
                localVocab.lastStudiedAt = mergedLastStudiedAt;

                await db.updateVocabulary(localVocab);

                // Sync example from server (flat structure: sentences, vietnamese, grammar)
                if (serverVocab.sentences) {
                    await this.syncExampleFromServer(localVocab.id, serverVocab.sentences, serverVocab.vietnamese, serverVocab.grammar);
                }
            } else {
                // Create new local vocabulary
                const newVocab = {
                    word: serverVocab.word,
                    createdAt: serverCreatedAt,
                    lastStudiedAt: serverLastStudiedAt,
                    priorityScore: parseInt(serverVocab.priorityScore) || 0,
                    category: serverVocab.category || 'GENERAL',
                    totalAttempts: serverTotalAttempts,
                    correctAttempts: serverCorrectAttempts,
                    memoryScore: serverMemoryScore,
                    last10Attempts: '[]',
                    appwriteDocumentId: serverVocab.$id
                };

                const newId = await db.insertVocabulary(newVocab);

                // Create example from server data (flat structure)
                if (serverVocab.sentences) {
                    await db.insertExample({
                        vocabularyId: newId,
                        sentences: serverVocab.sentences,
                        vietnamese: serverVocab.vietnamese || '',
                        grammar: serverVocab.grammar || '',
                        createdAt: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error('Error merging vocabulary:', serverVocab.word, error);
        }
    }

    /**
     * Sync example from server (flat structure)
     */
    async syncExampleFromServer(vocabularyId, sentences, vietnamese, grammar) {
        // Check if example already exists
        const existingExamples = await db.getExamplesByVocabularyId(vocabularyId);

        // Check if this exact example already exists
        const exists = existingExamples.some(ex =>
            ex.sentences.toLowerCase() === sentences.toLowerCase()
        );

        if (!exists && sentences) {
            console.log('[EDIT_FLOW] Syncing example from server (inserting new):', { vocabularyId, sentences });
            await db.insertExample({
                vocabularyId,
                sentences: sentences,
                vietnamese: vietnamese || '',
                grammar: grammar || '',
                createdAt: Date.now()
            });
        } else {
            console.log('[EDIT_FLOW] Example already exists, skipping:', { vocabularyId, sentences });
        }
    }

    /**
     * Sync from local IndexedDB to Appwrite
     */
    async syncClientToServer() {
        console.log('Syncing client to server...');

        try {
            const localVocabs = await db.getAllVocabulariesWithExamples();
            console.log(`Found ${localVocabs.length} vocabularies locally`);

            for (const { vocabulary, examples } of localVocabs) {
                await this.syncVocabularyToServer(vocabulary, examples);
            }
        } catch (error) {
            console.error('Client to server sync failed:', error);
        }
    }

    /**
     * Sync a single vocabulary to server
     */
    async syncVocabularyToServer(vocabulary, examples) {
        try {
            if (vocabulary.appwriteDocumentId) {
                // Update existing document
                console.log('[EDIT_FLOW] Updating existing document on server:', vocabulary.appwriteDocumentId);
                await appwriteService.updateVocabulary(
                    vocabulary.appwriteDocumentId,
                    vocabulary,
                    examples
                );
            } else {
                // Create new document
                console.log('[EDIT_FLOW] Creating new document on server');
                const response = await appwriteService.createVocabulary(vocabulary, examples);

                // Update local with appwriteDocumentId
                vocabulary.appwriteDocumentId = response.$id;
                await db.updateVocabulary(vocabulary);
            }

            // Sync updated word list to extension storage
            await appwriteService.syncWordsToExtension();
        } catch (error) {
            console.error('[EDIT_FLOW] Error syncing vocabulary to server:', vocabulary.word, error);
        }
    }

    /**
     * Sync single vocabulary immediately
     */
    async syncSingleVocabulary(vocabularyId) {
        try {
            console.log('[EDIT_FLOW] syncSingleVocabulary called for ID:', vocabularyId);
            const vocabWithExamples = await db.getVocabularyWithExamples(vocabularyId);
            if (!vocabWithExamples) {
                console.log('[EDIT_FLOW] Vocabulary not found for sync');
                return;
            }

            await appwriteService.loginAnonymously();
            await this.syncVocabularyToServer(
                vocabWithExamples.vocabulary,
                vocabWithExamples.examples
            );
        } catch (error) {
            console.error('[EDIT_FLOW] Error syncing single vocabulary:', error);
        }
    }

    /**
     * Delete vocabulary from server
     */
    async deleteVocabularyFromServer(appwriteDocumentId) {
        if (!appwriteDocumentId) return;

        try {
            await appwriteService.loginAnonymously();
            await appwriteService.deleteVocabulary(appwriteDocumentId);
        } catch (error) {
            console.error('Error deleting vocabulary from server:', error);
        }
    }
}

// Global sync manager instance
const syncManager = new SyncManager();
