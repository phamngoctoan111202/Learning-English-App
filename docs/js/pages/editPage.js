/**
 * Edit Page - Vocabulary management page
 * Tương đương với EditFragment trong Android
 */
const EditPage = {
    vocabularies: [],
    filteredVocabularies: [],
    currentEditId: null,
    selectedCategory: localStorage.getItem('editpage_filter_category') || 'ALL',
    searchQuery: '',

    /**
     * Render the edit page
     */
    render() {
        const mainContent = document.getElementById('main-content');
        const savedCategory = this.selectedCategory;

        mainContent.innerHTML = `
            <div class="search-container">
                <input type="text" class="search-input" id="search-input"
                       placeholder="Search vocabularies...">
                <div class="category-filter">
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="ALL" ${savedCategory === 'ALL' ? 'checked' : ''}>
                        <span>All</span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="GENERAL" ${savedCategory === 'GENERAL' ? 'checked' : ''}>
                        <span>General</span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="TOEIC" ${savedCategory === 'TOEIC' ? 'checked' : ''}>
                        <span>TOEIC</span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="VSTEP" ${savedCategory === 'VSTEP' ? 'checked' : ''}>
                        <span>VSTEP</span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="SPEAKING" ${savedCategory === 'SPEAKING' ? 'checked' : ''}>
                        <span>SPEAKING</span>
                    </label>
                    <label class="filter-radio">
                        <input type="radio" name="category-filter" value="WRITING" ${savedCategory === 'WRITING' ? 'checked' : ''}>
                        <span>WRITING</span>
                    </label>
                </div>
            </div>
            <div class="vocabulary-list" id="vocabulary-list">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading vocabularies...</p>
                </div>
            </div>
            <button class="fab" id="add-vocab-fab">
                <i class="fas fa-plus"></i>
            </button>
        `;

        this.setupEventListeners();
        this.loadVocabularies();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.applyFilters();
        });

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

        // FAB button
        const fab = document.getElementById('add-vocab-fab');
        fab.addEventListener('click', () => {
            this.showAddDialog();
        });

        // Add dialog events
        this.setupAddDialogEvents();
        this.setupEditDialogEvents();
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

        // Apply category filter
        if (this.selectedCategory !== 'ALL') {
            filtered = filtered.filter(({ vocabulary }) => {
                const category = vocabulary.category || 'GENERAL';
                return category === this.selectedCategory;
            });
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
            const categoryClass =
                category === 'TOEIC'
                    ? 'category-badge-toeic'
                    : category === 'VSTEP'
                        ? 'category-badge-vstep'
                        : category === 'SPEAKING'
                            ? 'category-badge-speaking'
                            : category === 'WRITING'
                                ? 'category-badge-writing'
                                : 'category-badge-general';
            const categoryLabel =
                category === 'TOEIC'
                    ? 'TOEIC'
                    : category === 'VSTEP'
                        ? 'VSTEP'
                        : category === 'SPEAKING'
                            ? 'SPEAKING'
                            : category === 'WRITING'
                                ? 'WRITING'
                                : 'General';

            return `
                <div class="vocab-item" data-id="${vocabulary.id}">
                    <div class="vocab-info">
                        <div class="vocab-word">
                            ${this.escapeHtml(vocabulary.word)}
                            <span class="category-badge ${categoryClass}">${categoryLabel}</span>
                        </div>
                        <div class="vocab-stats">
                            ${examples.length} example(s) |
                            Memory: ${Math.round((vocabulary.memoryScore || 0) * 100)}% |
                            Last 10: ${Database.getLast10CorrectCount(vocabulary)}/10
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

        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.hideAddDialog();
            }
        });
    },

    showAddDialog() {
        const dialog = document.getElementById('add-vocab-dialog');
        document.getElementById('vocab-word').value = '';
        document.getElementById('examples-list').innerHTML = '';

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

            // Insert vocabulary
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
        const categoryRadio = document.querySelector(`input[name="edit-vocab-category"][value="${vocabulary.category || 'GENERAL'}"]`);
        if (categoryRadio) {
            categoryRadio.checked = true;
        }

        const examplesList = document.getElementById('edit-examples-list');
        examplesList.innerHTML = '';

        if (examples.length === 0) {
            this.addExampleField('edit-examples-list');
        } else {
            for (const example of examples) {
                this.addExampleField('edit-examples-list', example.sentences, example.vietnamese, example.grammar);
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

            // Update vocabulary
            existing.word = word;
            existing.category = category;
            existing.lastStudiedAt = Date.now();
            await db.updateVocabulary(existing);

            // Delete old examples and insert new ones
            await db.deleteExamplesByVocabularyId(this.currentEditId);

            for (const example of examples) {
                await db.insertExample({
                    vocabularyId: this.currentEditId,
                    sentences: example.sentences,
                    vietnamese: example.vietnamese,
                    grammar: example.grammar,
                    createdAt: Date.now()
                });
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

            App.showToast('Vocabulary deleted', 'success');
            await this.loadVocabularies();
        } catch (error) {
            console.error('Error deleting vocabulary:', error);
            App.showToast('Failed to delete vocabulary', 'error');
        }
    },

    // ==================== HELPER METHODS ====================

    addExampleField(containerId, sentences = '', vietnamese = '', grammar = '') {
        const container = document.getElementById(containerId);
        const index = container.children.length + 1;

        const exampleItem = document.createElement('div');
        exampleItem.className = 'example-item';
        exampleItem.innerHTML = `
            <label>Example ${index}</label>
            <textarea class="example-sentences" placeholder="English sentences (one per line)">${this.escapeHtml(sentences)}</textarea>
            <textarea class="example-vietnamese" placeholder="Vietnamese translation" rows="2">${this.escapeHtml(vietnamese)}</textarea>
            <textarea class="example-grammar" placeholder="Grammar explanation (optional)" rows="3">${this.escapeHtml(grammar)}</textarea>
            <button class="remove-example-btn" type="button">
                <i class="fas fa-times"></i> Remove
            </button>
        `;

        exampleItem.querySelector('.remove-example-btn').addEventListener('click', () => {
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

        container.querySelectorAll('.example-item').forEach(item => {
            const sentences = item.querySelector('.example-sentences').value.trim();
            const vietnamese = item.querySelector('.example-vietnamese').value.trim();
            const grammar = item.querySelector('.example-grammar').value.trim();

            if (sentences) {
                examples.push({ sentences, vietnamese, grammar });
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
    }
};
