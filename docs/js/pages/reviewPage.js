const ReviewPage = {
    selectedCategory: localStorage.getItem('reviewpage_filter_category') || 'GENERAL',
    masteredVocabs: [],

    render() {
        const mainContent = document.getElementById('main-content');
        const savedCategory = this.selectedCategory;

        mainContent.innerHTML = `
            <div class="learn-container">
                <div class="card" style="grid-column: 1 / -1; padding: 16px; background: #f5f5f5;">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <strong>📚 Chọn nhóm từ để ôn bằng đoạn văn</strong>
                    </div>
                    <div class="category-filter">
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="GENERAL" ${savedCategory === 'GENERAL' ? 'checked' : ''}>
                            <span>General <span class="category-count-pill" data-category-count="GENERAL"></span></span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="TOEIC" ${savedCategory === 'TOEIC' ? 'checked' : ''}>
                            <span>TOEIC <span class="category-count-pill" data-category-count="TOEIC"></span></span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="VSTEP" ${savedCategory === 'VSTEP' ? 'checked' : ''}>
                            <span>VSTEP <span class="category-count-pill" data-category-count="VSTEP"></span></span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="SPEAKING" ${savedCategory === 'SPEAKING' ? 'checked' : ''}>
                            <span>SPEAKING <span class="category-count-pill" data-category-count="SPEAKING"></span></span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="WRITING" ${savedCategory === 'WRITING' ? 'checked' : ''}>
                            <span>WRITING <span class="category-count-pill" data-category-count="WRITING"></span></span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="review-category-filter" value="POPULAR_TOPICS" ${savedCategory === 'POPULAR_TOPICS' ? 'checked' : ''}>
                            <span>Popular topics <span class="category-count-pill" data-category-count="POPULAR_TOPICS"></span></span>
                        </label>
                    </div>
                </div>

                <div class="card" style="grid-column: 1 / -1;">
                    <div style="margin-bottom: 8px; font-size: 14px;">
                        <strong>⭐ Các từ đã master (độ nhớ ≥ 7/10)</strong>
                    </div>
                    <div id="review-words-count" style="font-size: 13px; color: #666; margin-bottom: 8px;"></div>
                    <div id="review-words-list" style="min-height: 48px; border-radius: 8px; border: 1px solid #e0e0e0; padding: 8px;"></div>
                </div>

                <div class="card" style="grid-column: 1 / -1;">
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Độ dài đoạn văn</div>
                            <select id="review-length" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc;">
                                <option value="3">Ngắn · khoảng 3 câu</option>
                                <option value="5" selected>Vừa · khoảng 5 câu</option>
                                <option value="8">Dài · khoảng 8 câu</option>
                            </select>
                        </div>
                    </div>
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">
                        Prompt để tạo đoạn văn (copy sang AI để luyện viết)
                    </div>
                    <textarea id="review-prompt" style="width: 100%; min-height: 140px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" readonly></textarea>
                    <button id="review-generate-btn" class="primary-btn" style="margin-top: 10px;">
                        ✨ Tạo prompt
                    </button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadData();
    },

    async updateCategoryCounts() {
        try {
            const allVocabs = await db.getAllVocabularies();
            const counts = {};

            for (const vocab of (allVocabs || [])) {
                const category = vocab?.category || 'GENERAL';
                counts[category] = (counts[category] || 0) + 1;
            }

            document.querySelectorAll('[data-category-count]').forEach(el => {
                const category = el.dataset.categoryCount;
                const count = counts[category] || 0;
                el.textContent = String(count);
                el.title = `${count} từ`;
            });
        } catch (error) {
            console.error('Error updating category counts:', error);
        }
    },

    setupEventListeners() {
        const categoryRadios = document.querySelectorAll('input[name="review-category-filter"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', e => {
                this.onCategoryChanged(e.target.value);
            });
        });

        const generateBtn = document.getElementById('review-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generatePrompt();
            });
        }

        const lengthSelect = document.getElementById('review-length');
        if (lengthSelect) {
            lengthSelect.addEventListener('change', () => {
                this.generatePrompt();
            });
        }
    },

    async onCategoryChanged(category) {
        this.selectedCategory = category;
        localStorage.setItem('reviewpage_filter_category', category);
        await this.loadData();
    },

    async loadData() {
        const listContainer = document.getElementById('review-words-list');
        if (listContainer) {
            App.showLoading(listContainer);
        }

        await this.updateCategoryCounts();

        this.masteredVocabs = await this.loadMasteredVocabs();
        this.renderWords();
        this.generatePrompt();
    },

    async loadMasteredVocabs() {
        const allVocabs = await db.getAllVocabularies();
        const filtered = allVocabs.filter(v => (v.category || 'GENERAL') === this.selectedCategory);

        // Filter mastered words (70%+ accuracy with at least 10 total attempts)
        return filtered.filter(vocab => {
            const totalAttempts = vocab.totalAttempts || 0;
            const correctAttempts = vocab.correctAttempts || 0;
            const memoryScore = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
            return totalAttempts >= 10 && memoryScore >= 70;
        });
    },

    renderWords() {
        const listContainer = document.getElementById('review-words-list');
        const countLabel = document.getElementById('review-words-count');
        if (!listContainer || !countLabel) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            countLabel.textContent = '(0 từ đã đạt 7/10 trong nhóm này)';
            listContainer.innerHTML = '<div style="font-size: 13px; color: #777;">Hãy luyện thêm ở tab Learn để đạt 7/10, sau đó quay lại đây để ôn bằng đoạn văn.</div>';
            return;
        }

        const words = this.masteredVocabs
            .map(v => v.word)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        countLabel.textContent = `(${words.length} từ)`;

        listContainer.innerHTML = words
            .map(w => `<span style="display:inline-block; padding:4px 10px; border-radius:999px; background:#e3f2fd; color:#1565c0; font-size:13px; margin:2px;">${this.escapeHtml(w)}</span>`)
            .join(' ');
    },

    generatePrompt() {
        const promptTextarea = document.getElementById('review-prompt');
        if (!promptTextarea) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            promptTextarea.value = 'Chưa có từ nào đạt 7/10 trong nhóm này để tạo prompt. Hãy luyện thêm ở tab Learn.';
            return;
        }

        const words = this.masteredVocabs
            .map(v => v.word)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        const lengthSelect = document.getElementById('review-length');
        const lengthValue = lengthSelect ? parseInt(lengthSelect.value || '5', 10) : 5;

        const categoryLabel = (() => {
            switch (this.selectedCategory) {
                case 'VSTEP':
                    return 'VSTEP';
                case 'TOEIC':
                    return 'TOEIC';
                case 'GENERAL':
                    return 'general English';
                case 'SPEAKING':
                    return 'speaking practice';
                case 'WRITING':
                    return 'writing practice';
                case 'POPULAR_TOPICS':
                    return 'popular topics';
                default:
                    return this.selectedCategory;
            }
        })();

        const wordsListText = words.join(', ');

        const promptText =
            'You are an English teacher helping a learner review previously mastered vocabulary for the ' +
            categoryLabel +
            ' exam.\n' +
            'Write one coherent English paragraph of about ' +
            lengthValue +
            ' sentences that tells a connected story or describes a related scenario.\n\n' +
            'CRITICAL REQUIREMENTS:\n' +
            '1. You MUST use ALL of these words at least once: ' +
            wordsListText +
            '\n' +
            '2. Try to use as MANY of these words as possible MULTIPLE TIMES if it fits naturally.\n' +
            '3. The paragraph must tell a coherent story - all sentences should connect logically.\n' +
            '4. Use clear, everyday language suitable for an intermediate learner.\n' +
            '5. Bold or highlight each target vocabulary word when used (e.g., **word**).\n\n' +
            'Only output the English paragraph, nothing else.';

        promptTextarea.value = promptText;
    },

    cleanup() {
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
