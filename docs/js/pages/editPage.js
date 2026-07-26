/**
 * Edit Page - Vocabulary management page
 * Tương đương với EditFragment trong Android
 *
 * Speaking/Writing part info is stored in localStorage (key: 'vocab_parts')
 * as { [vocabId]: 'PART1'|'PART2'|'PART3' }
 * DB category remains SPEAKING or WRITING unchanged.
 */
const EditPage = {
    vocabularies: [],
    filteredVocabularies: [],
    currentEditId: null,
    selectedCategory: localStorage.getItem('editpage_filter_category') || 'ALL',
    searchQuery: '',

    // Virtual categories that map to DB categories + part filter
    VIRTUAL_SPEAKING: ['SPEAKING_PART1', 'SPEAKING_PART2', 'SPEAKING_PART3'],
    VIRTUAL_WRITING: ['WRITING_PART1', 'WRITING_PART2'],

    // localStorage key for parts map
    PARTS_KEY: 'vocab_parts',

    getPartsMap() {
        try {
            return JSON.parse(localStorage.getItem(this.PARTS_KEY) || '{}');
        } catch {
            return {};
        }
    },

    setVocabPart(vocabId, part) {
        const map = this.getPartsMap();
        if (part) {
            map[String(vocabId)] = part;
        } else {
            delete map[String(vocabId)];
        }
        localStorage.setItem(this.PARTS_KEY, JSON.stringify(map));
    },

    getVocabPart(vocabId) {
        return this.getPartsMap()[String(vocabId)] || null;
    },

    /**
     * Render the edit page
     */
    render() {
        const mainContent = document.getElementById('main-content');
        const savedCategory = this.selectedCategory;

        mainContent.innerHTML = `
            <div class="search-container" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <input type="text" class="search-input" id="search-input"
                           placeholder="Search vocabularies..." style="flex: 1; min-width: 220px;">
                    <div style="display: flex; gap: 10px;">
                        <button id="bulk-import-header-btn" class="primary-btn" style="background: #009688; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,150,136,0.3);">
                            <i class="fas fa-file-import"></i> Nhập hàng loạt
                        </button>
                        <button id="add-vocab-header-btn" class="primary-btn" style="background: var(--primary-color); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                            <i class="fas fa-plus"></i> Thêm từ vựng
                        </button>
                    </div>
                </div>
                <div class="category-filter">
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="ALL" ${savedCategory === 'ALL' ? 'checked' : ''}>
                        <span>All <span class="category-count-pill" data-category-count="ALL"></span></span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="VSTEP" ${savedCategory === 'VSTEP' ? 'checked' : ''}>
                        <span>General <span class="category-count-pill" data-category-count="VSTEP"></span></span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="WRITING" ${savedCategory === 'WRITING' ? 'checked' : ''}>
                        <span>Writing <span class="category-count-pill" data-category-count="WRITING"></span></span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="TECHNICAL_MOBILE" ${savedCategory === 'TECHNICAL_MOBILE' ? 'checked' : ''}>
                        <span>Mobile <span class="category-count-pill" data-category-count="TECHNICAL_MOBILE"></span></span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="TECHNICAL_WEB" ${savedCategory === 'TECHNICAL_WEB' ? 'checked' : ''}>
                        <span>Web <span class="category-count-pill" data-category-count="TECHNICAL_WEB"></span></span>
                    </label>
                </div>
            </div>
            <div class="vocabulary-list" id="vocabulary-list">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading vocabularies...</p>
                </div>
            </div>
            <div class="fab-container" style="position: fixed; bottom: 30px; right: 30px; display: flex; flex-direction: column; gap: 12px; z-index: 100;">
                <button class="fab" id="bulk-vocab-fab" title="Nhập hàng loạt (Bulk Import)" style="position: relative; bottom: auto; right: auto; background: #009688;">
                    <i class="fas fa-file-import"></i>
                </button>
                <button class="fab" id="add-vocab-fab" title="Thêm từ vựng mới" style="position: relative; bottom: auto; right: auto;">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;

        this.setupEventListeners();
        this.loadVocabularies();
    },

    updateCategoryCounts() {
        const partsMap = this.getPartsMap();
        const counts = {
            ALL: this.vocabularies.length
        };

        for (const item of (this.vocabularies || [])) {
            const category = item?.vocabulary?.category || 'GENERAL';
            counts[category] = (counts[category] || 0) + 1;
            // VSTEP (General tab) = VSTEP + GENERAL
            if (category === 'VSTEP' || category === 'GENERAL') counts['VSTEP'] = (counts['VSTEP'] || 0) + 1;
        }

        document.querySelectorAll('[data-category-count]').forEach(el => {
            const category = el.dataset.categoryCount;
            const count = counts[category] || 0;
            el.textContent = String(count);
            el.title = `${count} từ`;
        });
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.applyFilters();
            });
        }

        // Category filter
        const categoryRadios = document.querySelectorAll('input[name="category-filter"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                // Save to localStorage
                localStorage.setItem('editpage_filter_category', this.selectedCategory);
                this.applyFilters();
            });
        });

        // Add vocabulary buttons (Header & FAB)
        const fab = document.getElementById('add-vocab-fab');
        const headerAddBtn = document.getElementById('add-vocab-header-btn');
        [fab, headerAddBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.showAddDialog());
        });

        // Bulk import buttons (Header & FAB)
        const bulkFab = document.getElementById('bulk-vocab-fab');
        const headerBulkBtn = document.getElementById('bulk-import-header-btn');
        [bulkFab, headerBulkBtn].forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.showBulkImportDialog());
        });

        // Dialog events
        this.setupAddDialogEvents();
        this.setupEditDialogEvents();
        this.setupBulkDialogEvents();
    },

    /**
     * Load vocabularies from database
     */
    async loadVocabularies() {
        try {
            const vocabsWithExamples = await db.getAllVocabulariesWithExamples();
            this.vocabularies = vocabsWithExamples.sort((a, b) =>
                b.vocabulary.createdAt - a.vocabulary.createdAt
            );
            this.updateCategoryCounts();
            // Apply filters instead of just copying all vocabularies
            this.applyFilters();
        } catch (error) {
            console.error('Error loading vocabularies:', error);
            this.showError('Failed to load vocabularies');
        }
    },

    /**
     * Apply filters (category + search)
     */
    applyFilters() {
        let filtered = [...this.vocabularies];
        const partsMap = this.getPartsMap();

        // Apply category filter
        if (this.selectedCategory !== 'ALL') {
            const sel = this.selectedCategory;
            // Check if it's a virtual speaking/writing part filter
            if (sel.startsWith('SPEAKING_') || sel.startsWith('WRITING_')) {
                const [baseCategory, part] = sel.split('_PART');
                const partKey = `PART${part}`;
                filtered = filtered.filter(({ vocabulary }) => {
                    const category = vocabulary.category || 'GENERAL';
                    if (category !== baseCategory) return false;
                    const vocabPart = partsMap[String(vocabulary.id)] || 'PART1';
                    return vocabPart === partKey;
                });
            } else {
                filtered = filtered.filter(({ vocabulary }) => {
                    const category = vocabulary.category || 'GENERAL';
                    if (sel === 'VSTEP') return category === 'VSTEP' || category === 'GENERAL';
                    return category === sel;
                });
            }
        }

        // Apply search filter
        if (this.searchQuery && this.searchQuery.trim() !== '') {
            const normalizedQuery = this.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(({ vocabulary, examples }) => {
                // Search in word
                if (vocabulary.word.toLowerCase().includes(normalizedQuery)) {
                    return true;
                }

                // Search in examples
                for (const example of examples) {
                    if (example.sentences?.toLowerCase().includes(normalizedQuery)) {
                        return true;
                    }
                    if (example.vietnamese?.toLowerCase().includes(normalizedQuery)) {
                        return true;
                    }
                }

                return false;
            });
        }

        this.filteredVocabularies = filtered;
        this.renderVocabularyList();
    },

    /**
     * Render vocabulary list
     */
    renderVocabularyList() {
        const listContainer = document.getElementById('vocabulary-list');
        const partsMap = this.getPartsMap();

        if (this.filteredVocabularies.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <p>No vocabularies found</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.filteredVocabularies.map(({ vocabulary, examples }) => {
            const category = vocabulary.category || 'GENERAL';
            const part = (category === 'SPEAKING' || category === 'WRITING')
                ? (partsMap[String(vocabulary.id)] || 'PART1')
                : null;

            let categoryClass, categoryLabel;
            if (category === 'WRITING') {
                categoryClass = 'category-badge-writing';
                categoryLabel = 'Writing';
            } else if (category === 'TECHNICAL_MOBILE' || category === 'MOBILE') {
                categoryClass = 'category-badge-technical_mobile';
                categoryLabel = 'Mobile';
            } else if (category === 'TECHNICAL_WEB' || category === 'WEB' || category === 'TECHNICAL_BACKEND' || category === 'BACKEND' || category === 'TECHNICAL') {
                categoryClass = 'category-badge-technical_web';
                categoryLabel = 'Web';
            } else {
                categoryClass = 'category-badge-general';
                categoryLabel = 'General';
            }

            return `
                <div class="vocab-item" data-id="${vocabulary.id}">
                    <div class="vocab-info">
                        <div class="vocab-word">
                            ${this.escapeHtml(vocabulary.word)}
                            <span class="category-badge ${categoryClass}">${categoryLabel}</span>
                        </div>
                        <div class="vocab-stats">
                            ${examples.length} example(s) |
                            Memory: ${vocabulary.correctAttempts || 0}/${vocabulary.totalAttempts || 0}
                        </div>
                    </div>
                    <div class="vocab-actions">
                        <button class="edit-btn" data-id="${vocabulary.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-item-btn" data-id="${vocabulary.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click event listeners
        listContainer.querySelectorAll('.vocab-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.vocab-actions')) return;
                const id = parseInt(item.dataset.id);
                this.showEditDialog(id);
            });
        });

        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.showEditDialog(id);
            });
        });

        listContainer.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                this.confirmDelete(id);
            });
        });
    },

    // ==================== ADD DIALOG ====================

    setupAddDialogEvents() {
        const dialog = document.getElementById('add-vocab-dialog');

        // Close button
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            this.hideAddDialog();
        });

        // Cancel button
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            this.hideAddDialog();
        });

        // Save button
        dialog.querySelector('.save-btn').addEventListener('click', () => {
            this.saveNewVocabulary();
        });

        // Add example button
        document.getElementById('add-example-btn').addEventListener('click', () => {
            this.addExampleField('examples-list');
        });

        // Speak button
        dialog.querySelector('.speak-btn').addEventListener('click', () => {
            const word = document.getElementById('vocab-word').value;
            if (word) ttsService.speakWord(word);
        });

        // Category change -> show/hide part selectors
        dialog.querySelectorAll('input[name="vocab-category"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this._updateAddPartVisibility(e.target.value);
            });
        });

        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideAddDialog();
            }
        });
    },

    _updateAddPartVisibility(category) {
        const speakingGroup = document.getElementById('speaking-part-group');
        const writingGroup = document.getElementById('writing-part-group');
        if (category === 'SPEAKING') {
            speakingGroup.classList.remove('hidden');
            writingGroup.classList.add('hidden');
        } else if (category === 'WRITING') {
            writingGroup.classList.remove('hidden');
            speakingGroup.classList.add('hidden');
        } else {
            speakingGroup.classList.add('hidden');
            writingGroup.classList.add('hidden');
        }
    },

    _updateEditPartVisibility(category) {
        const speakingGroup = document.getElementById('edit-speaking-part-group');
        const writingGroup = document.getElementById('edit-writing-part-group');
        if (category === 'SPEAKING') {
            speakingGroup.classList.remove('hidden');
            writingGroup.classList.add('hidden');
        } else if (category === 'WRITING') {
            writingGroup.classList.remove('hidden');
            speakingGroup.classList.add('hidden');
        } else {
            speakingGroup.classList.add('hidden');
            writingGroup.classList.add('hidden');
        }
    },

    showAddDialog() {
        const dialog = document.getElementById('add-vocab-dialog');
        document.getElementById('vocab-word').value = '';
        document.getElementById('examples-list').innerHTML = '';

        // Reset category to VSTEP (General)
        const generalRadio = dialog.querySelector('input[name="vocab-category"][value="VSTEP"]');
        if (generalRadio) generalRadio.checked = true;

        // Add initial example field
        this.addExampleField('examples-list');

        dialog.classList.remove('hidden');
    },

    hideAddDialog() {
        const dialog = document.getElementById('add-vocab-dialog');
        dialog.classList.add('hidden');
    },

    async saveNewVocabulary() {
        const word = document.getElementById('vocab-word').value.trim();

        // Get selected category
        const category = document.querySelector('input[name="vocab-category"]:checked').value;

        if (!word) {
            App.showToast('Please enter a word', 'error');
            return;
        }

        // Collect examples
        const examples = this.collectExamples('examples-list');

        if (examples.length === 0) {
            App.showToast('Please add at least one example', 'error');
            return;
        }

        try {
            // Check for duplicate
            const existing = await db.getVocabularyByWord(word);
            if (existing) {
                App.showToast('This word already exists', 'error');
                return;
            }

            // Insert vocabulary (DB stores SPEAKING or WRITING, not the part)
            const vocabId = await db.insertVocabulary({
                word: word,
                category: category,
                createdAt: Date.now(),
                lastStudiedAt: Date.now()
            });

            // Insert examples
            for (const example of examples) {
                await db.insertExample({
                    vocabularyId: vocabId,
                    sentences: example.sentences,
                    vietnamese: example.vietnamese,
                    grammar: example.grammar,
                    createdAt: Date.now()
                });
            }

            // Sync to server - wait for sync to complete
            await syncManager.syncSingleVocabulary(vocabId);

            this.hideAddDialog();
            App.showToast('Vocabulary added successfully', 'success');
            await this.loadVocabularies();
        } catch (error) {
            console.error('Error saving vocabulary:', error);
            App.showToast('Failed to save vocabulary', 'error');
        }
    },

    // ==================== EDIT DIALOG ====================

    setupEditDialogEvents() {
        const dialog = document.getElementById('edit-vocab-dialog');

        // Close button
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            this.hideEditDialog();
        });

        // Cancel button
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            this.hideEditDialog();
        });

        // Save button
        dialog.querySelector('.save-btn').addEventListener('click', () => {
            this.saveEditedVocabulary();
        });

        // Delete button
        dialog.querySelector('.delete-btn').addEventListener('click', () => {
            this.confirmDelete(this.currentEditId);
            this.hideEditDialog();
        });

        // Add example button
        document.getElementById('edit-add-example-btn').addEventListener('click', () => {
            this.addExampleField('edit-examples-list');
        });

        // Speak button
        dialog.querySelector('.speak-btn').addEventListener('click', () => {
            const word = document.getElementById('edit-vocab-word').value;
            if (word) ttsService.speakWord(word);
        });

        // Category change -> show/hide part selectors
        dialog.querySelectorAll('input[name="edit-vocab-category"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this._updateEditPartVisibility(e.target.value);
            });
        });

        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideEditDialog();
            }
        });
    },

    async showEditDialog(id) {
        this.currentEditId = id;

        const vocabWithExamples = await db.getVocabularyWithExamples(id);

        if (!vocabWithExamples) {
            App.showToast('Vocabulary not found', 'error');
            return;
        }

        const { vocabulary, examples } = vocabWithExamples;

        document.getElementById('edit-vocab-word').value = vocabulary.word;

        // Set category radio button
        let effectiveCategory = 'VSTEP';
        if (vocabulary.category === 'WRITING') {
            effectiveCategory = 'WRITING';
        } else if (vocabulary.category === 'TECHNICAL_MOBILE' || vocabulary.category === 'MOBILE') {
            effectiveCategory = 'TECHNICAL_MOBILE';
        } else if (vocabulary.category === 'TECHNICAL_WEB' || vocabulary.category === 'WEB' || vocabulary.category === 'TECHNICAL_BACKEND' || vocabulary.category === 'BACKEND' || vocabulary.category === 'TECHNICAL') {
            effectiveCategory = 'TECHNICAL_WEB';
        }
        const categoryRadio = document.querySelector(`input[name="edit-vocab-category"][value="${effectiveCategory}"]`);
        if (categoryRadio) categoryRadio.checked = true;

        const examplesList = document.getElementById('edit-examples-list');
        examplesList.innerHTML = '';

        if (examples.length === 0) {
            this.addExampleField('edit-examples-list');
        } else {
            for (const example of examples) {
                this.addExampleField('edit-examples-list', example.sentences, example.vietnamese, example.grammar, example.id);
            }
        }

        const dialog = document.getElementById('edit-vocab-dialog');
        dialog.classList.remove('hidden');
    },

    hideEditDialog() {
        const dialog = document.getElementById('edit-vocab-dialog');
        dialog.classList.add('hidden');
        this.currentEditId = null;
    },

    async saveEditedVocabulary() {
        if (!this.currentEditId) return;

        const word = document.getElementById('edit-vocab-word').value.trim();

        // Get selected category
        const category = document.querySelector('input[name="edit-vocab-category"]:checked').value;

        if (!word) {
            App.showToast('Please enter a word', 'error');
            return;
        }

        const examples = this.collectExamples('edit-examples-list');

        if (examples.length === 0) {
            App.showToast('Please add at least one example', 'error');
            return;
        }

        try {
            // Get existing vocabulary
            const existing = await db.getVocabularyById(this.currentEditId);
            if (!existing) {
                App.showToast('Vocabulary not found', 'error');
                return;
            }

            // Update vocabulary (DB stores SPEAKING or WRITING)
            existing.word = word;
            existing.category = category;
            existing.lastStudiedAt = Date.now();
            await db.updateVocabulary(existing);

            // Update existing examples and insert new ones
            for (const example of examples) {
                if (example.id) {
                    // Update existing example
                    const existingExample = await db.getExampleById(example.id);
                    if (existingExample) {
                        existingExample.sentences = example.sentences;
                        existingExample.vietnamese = example.vietnamese;
                        existingExample.grammar = example.grammar;
                        await db.updateExample(existingExample);
                    }
                } else {
                    // Insert new example
                    await db.insertExample({
                        vocabularyId: this.currentEditId,
                        sentences: example.sentences,
                        vietnamese: example.vietnamese,
                        grammar: example.grammar,
                        createdAt: Date.now()
                    });
                }
            }

            // Sync to server - wait for sync to complete
            await syncManager.syncSingleVocabulary(this.currentEditId);

            this.hideEditDialog();
            App.showToast('Vocabulary updated successfully', 'success');
            await this.loadVocabularies();
        } catch (error) {
            console.error('Error updating vocabulary:', error);
            App.showToast('Failed to update vocabulary', 'error');
        }
    },

    // ==================== DELETE ====================

    async confirmDelete(id) {
        const vocabWithExamples = await db.getVocabularyWithExamples(id);
        if (!vocabWithExamples) return;

        const { vocabulary } = vocabWithExamples;

        if (confirm(`Delete "${vocabulary.word}"?`)) {
            await this.deleteVocabulary(vocabulary);
        }
    },

    async deleteVocabulary(vocabulary) {
        try {
            // Delete from server first
            if (vocabulary.appwriteDocumentId) {
                await syncManager.deleteVocabularyFromServer(vocabulary.appwriteDocumentId);
            }

            // Delete from local database
            await db.deleteVocabulary(vocabulary.id);

            // Clean up part info from localStorage
            this.setVocabPart(vocabulary.id, null);

            App.showToast('Vocabulary deleted', 'success');
            await this.loadVocabularies();
        } catch (error) {
            console.error('Error deleting vocabulary:', error);
            App.showToast('Failed to delete vocabulary', 'error');
        }
    },

    // ==================== HELPER METHODS ====================

    addExampleField(containerId, sentences = '', vietnamese = '', grammar = '', exampleId = null) {
        const container = document.getElementById(containerId);
        const index = container.children.length + 1;

        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        if (exampleId) exampleItem.dataset.exampleId = exampleId;
        exampleItem.innerHTML = `
            <label>Example ${index}</label>
            <textarea class="example-sentences" placeholder="English sentences (one per line)">${this.escapeHtml(sentences)}</textarea>
            <textarea class="example-vietnamese" placeholder="Vietnamese translation" rows="2">${this.escapeHtml(vietnamese)}</textarea>
            <textarea class="example-grammar" placeholder="Grammar explanation (optional)" rows="3">${this.escapeHtml(grammar)}</textarea>
            <button class="remove-example-btn" type="button">
                <i class="fas fa-times"></i> Remove
            </button>
        `;

        exampleItem.querySelector('.remove-example-btn').addEventListener('click', async () => {
            const id = exampleItem.dataset.exampleId;
            if (id) {
                try {
                    await db.deleteExample(Number(id));
                    if (this.currentEditId) {
                        await syncManager.syncSingleVocabulary(this.currentEditId);
                    }
                } catch (error) {
                    console.error('Error deleting example:', error);
                    App.showToast('Failed to delete example', 'error');
                    return;
                }
            }
            exampleItem.remove();
            this.renumberExamples(containerId);
        });

        container.appendChild(exampleItem);
    },

    renumberExamples(containerId) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.example-item').forEach((item, index) => {
            item.querySelector('label').textContent = `Example ${index + 1}`;
        });
    },

    collectExamples(containerId) {
        const container = document.getElementById(containerId);
        const examples = [];

        container.querySelectorAll('.example-item').forEach((item) => {
            const sentences = item.querySelector('.example-sentences').value.trim();
            const vietnamese = item.querySelector('.example-vietnamese').value.trim();
            const grammar = item.querySelector('.example-grammar').value.trim();
            const exampleId = item.dataset.exampleId ? Number(item.dataset.exampleId) : null;

            if (sentences) {
                examples.push({ id: exampleId, sentences, vietnamese, grammar });
            }
        });

        return examples;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showError(message) {
        const listContainer = document.getElementById('vocabulary-list');
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    },

    // ==================== BULK IMPORT DIALOG ====================

    setupBulkDialogEvents() {
        const dialog = document.getElementById('bulk-import-dialog');
        if (!dialog) return;

        // Close button
        const closeBtn = dialog.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideBulkImportDialog());
        }

        // Cancel button
        const cancelBtn = dialog.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideBulkImportDialog());
        }

        // Save / Import button
        const saveBtn = document.getElementById('bulk-import-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.importBulkData());
        }

        // Preset buttons
        const loadMobileBtn = document.getElementById('bulk-load-mobile');
        if (loadMobileBtn) {
            loadMobileBtn.addEventListener('click', () => this.loadPresetData('MOBILE'));
        }

        const loadWebBtn = document.getElementById('bulk-load-web');
        if (loadWebBtn) {
            loadWebBtn.addEventListener('click', () => this.loadPresetData('WEB'));
        }

        const clearBtn = document.getElementById('bulk-clear-input');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const textarea = document.getElementById('bulk-import-textarea');
                if (textarea) textarea.value = '';
            });
        }

        // Click overlay to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideBulkImportDialog();
            }
        });
    },

    showBulkImportDialog() {
        const dialog = document.getElementById('bulk-import-dialog');
        if (!dialog) return;

        const textarea = document.getElementById('bulk-import-textarea');
        if (textarea && !textarea.value.trim()) {
            this.loadPresetData('MOBILE');
        }

        dialog.classList.remove('hidden');
    },

    hideBulkImportDialog() {
        const dialog = document.getElementById('bulk-import-dialog');
        if (dialog) dialog.classList.add('hidden');
    },

    loadPresetData(presetType) {
        const textarea = document.getElementById('bulk-import-textarea');
        if (!textarea) return;

        if (presetType === 'MOBILE') {
            textarea.value = [
                'Activity | An activity represents a single screen with a user interface in Android. | Component activity đại diện cho một màn hình đơn với UI trong Android. | Noun - Core Android application component for UI screens.',
                'Fragment | A fragment represents a reusable portion of a user interface in an activity. | Fragment đại diện cho một phần UI có thể tái sử dụng trong một activity. | Noun - Modular UI block within an Android activity.',
                'State | State management ensures UI components automatically react to data changes. | Quản lý state đảm bảo các UI component tự động phản ứng với thay đổi dữ liệu. | Noun - Current data status driving UI representation.',
                'Composable | Composable functions declare UI elements declaratively in Jetpack Compose. | Các hàm composable khai báo phần tử UI theo phong cách khai báo trong Compose. | Noun - Building block function in modern Android UI toolkit.',
                'Lifecycle | Understanding the component lifecycle prevents memory leaks and crashes. | Hiểu rõ vòng đời của component giúp tránh rò rỉ bộ nhớ và crash app. | Noun - Series of states a component passes through from creation to destruction.'
            ].join('\n');

            const mobileRadio = document.querySelector('input[name="bulk-category"][value="TECHNICAL_MOBILE"]');
            if (mobileRadio) mobileRadio.checked = true;
        } else if (presetType === 'WEB') {
            textarea.value = [
                'DOM | The Document Object Model represents the web page structure as a logical tree. | Mô hình đối tượng tài liệu biểu diễn cấu trúc trang web dạng cây logic. | Noun - Programming interface for HTML documents.',
                'Component | A reusable component encapsulates markup, styles, and state behavior. | Component có thể tái sử dụng đóng gói cấu trúc, kiểu dáng và hành vi. | Noun - Modular building block in modern web frameworks.',
                'Hydration | Client-side hydration attaches event listeners to server-rendered HTML. | Hydration phía client gắn các trình lắng nghe sự kiện vào HTML được render từ server. | Noun - Process of adding interactivity to static HTML.',
                'SSR | Server-side rendering renders web pages on the server before sending to the browser. | Render phía server tạo ra trang web trên server trước khi gửi tới trình duyệt. | Noun - Method of generating HTML on the server.',
                'Responsive | Responsive web design ensures optimal viewing experience across device sizes. | Thiết kế web tương thích đảm bảo trải nghiệm hiển thị tối ưu trên mọi màn hình. | Adjective - Adapting layout dynamically to screen size.'
            ].join('\n');

            const webRadio = document.querySelector('input[name="bulk-category"][value="TECHNICAL_WEB"]');
            if (webRadio) webRadio.checked = true;
        }
    },

    async importBulkData() {
        const textarea = document.getElementById('bulk-import-textarea');
        const rawContent = textarea ? textarea.value.trim() : '';

        if (!rawContent) {
            App.showToast('Please enter or select batch data to import', 'error');
            return;
        }

        const categoryRadio = document.querySelector('input[name="bulk-category"]:checked');
        const defaultCategory = categoryRadio ? categoryRadio.value : 'TECHNICAL_MOBILE';

        const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let importedCount = 0;
        let skippedCount = 0;

        for (const line of lines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length < 2) continue;

            const word = parts[0];
            const sentence = parts[1] || '';
            const vietnamese = parts[2] || '';
            const grammar = parts[3] || '';

            if (!word) continue;

            try {
                let vocab = await db.getVocabularyByWord(word);
                let vocabId;

                if (!vocab) {
                    vocabId = await db.insertVocabulary({
                        word: word,
                        category: defaultCategory,
                        createdAt: Date.now(),
                        lastStudiedAt: Date.now()
                    });
                } else {
                    vocabId = vocab.id;
                }

                if (sentence) {
                    await db.insertExample({
                        vocabularyId: vocabId,
                        sentences: sentence,
                        vietnamese: vietnamese,
                        grammar: grammar,
                        createdAt: Date.now()
                    });
                }

                await syncManager.syncSingleVocabulary(vocabId);
                importedCount++;
            } catch (err) {
                console.error(`Error importing word ${word}:`, err);
                skippedCount++;
            }
        }

        this.hideBulkImportDialog();
        App.showToast(`Imported ${importedCount} item(s) successfully!`, 'success');
        await this.loadVocabularies();
    }
};
