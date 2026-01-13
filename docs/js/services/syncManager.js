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

    normalizeWord(word) {
        return String(word || '').trim().toLowerCase();
    }

    normalizeSentence(sentence) {
        return String(sentence || '')
            .replace(/\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    parseSentencesToList(sentences) {
        const raw = String(sentences || '').trim();
        if (!raw) return [];

        if (raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map(s => this.normalizeSentence(s)).filter(Boolean);
                }
            } catch (e) {
            }
        }

        const parts = raw.split(/\n+/).map(s => this.normalizeSentence(s)).filter(Boolean);
        if (parts.length > 0) return parts;
        return [this.normalizeSentence(raw)].filter(Boolean);
    }

    buildCanonicalSentencesJson(sentences) {
        const list = this.parseSentencesToList(sentences);
        const seen = new Set();
        const result = [];
        for (const s of list) {
            const key = s.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(s);
        }
        return result.length > 0 ? JSON.stringify(result) : '';
    }

    /**
     * Full bidirectional sync
     */
    async syncData() {
        if (this.isSyncing) {
            console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;
        console.log('Starting data sync...');

        try {
            // Ensure logged in
            await appwriteService.loginAnonymously();

            // Clean up duplicates first
            await db.cleanupDuplicates();

            // Push local changes first to avoid server overwriting recent edits
            await this.syncClientToServer();

            // Then pull from server to update new/remote data
            await this.syncServerToClient();

            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
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

            const localVocabs = await db.getAllVocabularies();
            const byAppwriteId = new Map();
            const byWord = new Map();

            for (const v of localVocabs) {
                if (v.appwriteDocumentId) {
                    byAppwriteId.set(v.appwriteDocumentId, v);
                }
                const key = this.normalizeWord(v.word);
                if (!byWord.has(key)) {
                    byWord.set(key, v);
                }
            }

            for (const serverVocab of serverVocabs) {
                await this.mergeVocabularyFromServer(serverVocab, { byAppwriteId, byWord });
            }
        } catch (error) {
            console.error('Server to client sync failed:', error);
        }
    }

    /**
     * Merge a single vocabulary from server
     * Server schema: word, sentences, vietnamese, createdAt, lastStudiedAt, etc.
     */
    async mergeVocabularyFromServer(serverVocab, indexes = null) {
        try {
            const serverWord = String(serverVocab.word || '').trim();
            const serverWordKey = this.normalizeWord(serverWord);
            const serverAppwriteId = serverVocab.$id;

            let localVocab = null;
            if (indexes?.byAppwriteId && serverAppwriteId) {
                localVocab = indexes.byAppwriteId.get(serverAppwriteId) || null;
            }
            if (!localVocab && indexes?.byWord) {
                localVocab = indexes.byWord.get(serverWordKey) || null;
            }
            if (!localVocab) {
                const localVocabs = await db.getAllVocabularies();
                localVocab = localVocabs.find(v => v.appwriteDocumentId === serverAppwriteId)
                    || localVocabs.find(v => this.normalizeWord(v.word) === serverWordKey)
                    || null;
            }

            // Parse server values (they are stored as strings)
            const serverTotalAttempts = parseInt(serverVocab.totalAttempts) || 0;
            const serverCorrectAttempts = parseInt(serverVocab.correctAttempts) || 0;
            const serverMemoryScore = parseFloat(serverVocab.memoryScore) || 0;
            const serverLastStudiedAt = parseInt(serverVocab.lastStudiedAt) || 0;
            const serverCreatedAt = parseInt(serverVocab.createdAt) || Date.now();

            if (localVocab) {
                const localLastStudiedAt = parseInt(localVocab.lastStudiedAt) || 0;
                const shouldApplyServerContent = serverLastStudiedAt > localLastStudiedAt;

                // Merge with max values
                const mergedTotalAttempts = Math.max(localVocab.totalAttempts || 0, serverTotalAttempts);
                const mergedCorrectAttempts = Math.max(localVocab.correctAttempts || 0, serverCorrectAttempts);
                const mergedLastStudiedAt = Math.max(localVocab.lastStudiedAt || 0, serverLastStudiedAt);
                const mergedMemoryScore = Math.max(localVocab.memoryScore || 0, serverMemoryScore);

                localVocab.appwriteDocumentId = serverAppwriteId;

                if (shouldApplyServerContent) {
                    localVocab.word = serverWord;
                    localVocab.category = serverVocab.category || localVocab.category || 'GENERAL';
                }

                localVocab.totalAttempts = mergedTotalAttempts;
                localVocab.correctAttempts = mergedCorrectAttempts;
                localVocab.memoryScore = mergedMemoryScore;
                localVocab.lastStudiedAt = mergedLastStudiedAt;

                await db.updateVocabulary(localVocab);

                // Replace local examples with server data ONLY if server is newer
                if (shouldApplyServerContent && serverVocab.sentences) {
                    await this.replaceExamplesFromServer(
                        localVocab.id,
                        serverVocab.sentences,
                        serverVocab.vietnamese,
                        serverVocab.grammar
                    );
                }
            } else {
                // Create new local vocabulary
                const newVocab = {
                    word: serverWord,
                    createdAt: serverCreatedAt,
                    lastStudiedAt: serverLastStudiedAt,
                    priorityScore: parseInt(serverVocab.priorityScore) || 0,
                    category: serverVocab.category || 'GENERAL',
                    totalAttempts: serverTotalAttempts,
                    correctAttempts: serverCorrectAttempts,
                    memoryScore: serverMemoryScore,
                    last10Attempts: '[]',
                    appwriteDocumentId: serverAppwriteId
                };

                const newId = await db.insertVocabulary(newVocab);

                if (serverVocab.sentences) {
                    await this.replaceExamplesFromServer(
                        newId,
                        serverVocab.sentences,
                        serverVocab.vietnamese,
                        serverVocab.grammar
                    );
                }
            }
        } catch (error) {
            console.error('Error merging vocabulary:', serverVocab.word, error);
        }
    }

    /**
     * Replace local examples with server data (flat structure)
     */
    async replaceExamplesFromServer(vocabularyId, sentences, vietnamese, grammar) {
        await db.deleteExamplesByVocabularyId(vocabularyId);
        const canonicalSentences = this.buildCanonicalSentencesJson(sentences);
        if (!canonicalSentences) return;

        await db.insertExample({
            vocabularyId,
            sentences: canonicalSentences,
            vietnamese: vietnamese || '',
            grammar: grammar || '',
            createdAt: Date.now()
        });
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
                await appwriteService.updateVocabulary(
                    vocabulary.appwriteDocumentId,
                    vocabulary,
                    examples
                );
            } else {
                // Check if document already exists on server by word
                // This prevents duplicate documents when editing locally before first sync
                const existingDocs = await appwriteService.listVocabularies([
                    Appwrite.Query.equal('word', vocabulary.word)
                ]);

                if (existingDocs.length > 0) {
                    const existingDoc = existingDocs[0];
                    console.log(`Found existing document for word "${vocabulary.word}": ${existingDoc.$id}`);

                    // Link local vocabulary to existing document
                    vocabulary.appwriteDocumentId = existingDoc.$id;
                    await db.updateVocabulary(vocabulary);

                    // Update the existing document with new data
                    await appwriteService.updateVocabulary(
                        existingDoc.$id,
                        vocabulary,
                        examples
                    );
                } else {
                    // Create new document
                    const response = await appwriteService.createVocabulary(vocabulary, examples);

                    // Update local with appwriteDocumentId
                    vocabulary.appwriteDocumentId = response.$id;
                    await db.updateVocabulary(vocabulary);
                }
            }

            // Sync updated word list to extension storage
            await appwriteService.syncWordsToExtension();
        } catch (error) {
            console.error('Error syncing vocabulary to server:', vocabulary.word, error);
        }
    }

    /**
     * Sync single vocabulary immediately
     */
    async syncSingleVocabulary(vocabularyId) {
        try {
            const vocabWithExamples = await db.getVocabularyWithExamples(vocabularyId);
            if (!vocabWithExamples) return;

            await appwriteService.loginAnonymously();
            await this.syncVocabularyToServer(
                vocabWithExamples.vocabulary,
                vocabWithExamples.examples
            );
        } catch (error) {
            console.error('Error syncing single vocabulary:', error);
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
