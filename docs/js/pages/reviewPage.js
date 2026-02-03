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
                        <strong>⭐ Các từ đã học (số lần học ≥ 1)</strong>
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

        // Filter learned words (at least 1 attempt)
        return filtered.filter(vocab => {
            const totalAttempts = vocab.totalAttempts || 0;
            return totalAttempts >= 1;
        });
    },

    renderWords() {
        const listContainer = document.getElementById('review-words-list');
        const countLabel = document.getElementById('review-words-count');
        if (!listContainer || !countLabel) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            countLabel.textContent = '(0 từ đã học trong nhóm này)';
            listContainer.innerHTML = '<div style="font-size: 13px; color: #777;">Hãy học ít nhất 1 lần ở tab Learn, sau đó quay lại đây để ôn bằng đoạn văn.</div>';
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

    processWordList(words) {
        const processedWords = [];
        const synonymGroups = [];

        for (const word of words) {
            if (word.includes(' vs ')) {
                const parts = word.split(' vs ').map(p => p.trim()).filter(Boolean);
                processedWords.push(...parts);
                if (parts.length >= 2) {
                    synonymGroups.push(parts);
                }
            } else {
                processedWords.push(word);
            }
        }

        return { processedWords, synonymGroups };
    },

    generatePrompt() {
        const promptTextarea = document.getElementById('review-prompt');
        if (!promptTextarea) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            promptTextarea.value = 'Chưa có từ nào trong nhóm này để tạo prompt. Hãy học ít nhất 1 lần ở tab Learn.';
            return;
        }

        const words = this.masteredVocabs
            .map(v => v.word)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        const { processedWords, synonymGroups } = this.processWordList(words);

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

        const wordsListText = processedWords.join(', ');

        let synonymSection = '';
        if (synonymGroups.length > 0) {
            const synonymLines = synonymGroups.map(group => `- ${group.join(' / ')}`).join('\n');
            synonymSection = `\n**SYNONYM/ALTERNATIVE GROUPS (can write as word1/word2):**\n${synonymLines}\n`;
        }

        const promptText =
            'You are an English teacher helping a learner review previously learned vocabulary for the ' +
            categoryLabel +
            ' exam.\n\n' +
            '**TASK:** Write one coherent English paragraph of about ' +
            lengthValue +
            ' sentences at CEFR B2/B2+ reading level, followed by 10 multiple-choice comprehension questions.\n\n' +
            '**VOCABULARY TO USE:**\n' +
            wordsListText +
            synonymSection +
            '\n**CRITICAL REQUIREMENTS (in order of priority):**\n' +
            '1. COHERENCE FIRST: The paragraph MUST read naturally and make logical sense. Every sentence should connect smoothly to the next.\n' +
            '2. MEANINGFUL CONTENT: Tell a realistic story or describe a plausible scenario. The content should be interesting and make sense in real life.\n' +
            '3. DO NOT FORCE WORDS: Only use vocabulary that fits naturally. SKIP any word that would make the paragraph awkward, illogical, or unnatural.\n' +
            '4. B2/B2+ LEVEL: Use appropriate grammar structures (conditionals, passive voice, relative clauses) and maintain readability for upper-intermediate learners.\n' +
            '5. For synonym pairs (e.g., hamper/prevent), you may write "hamper/prevent" to show both alternatives.\n' +
            '6. Bold each target vocabulary word when used (e.g., **word** or **word1/word2**).\n\n' +
            '**OUTPUT FORMAT:**\n\n' +
            '**Paragraph:**\n[Your paragraph here]\n\n' +
            '**Words used:** [list words actually used]\n' +
            '**Words skipped:** [list words that didn\'t fit naturally, or "None" if all used]\n\n' +
            '**Comprehension Questions (10 MCQs about the paragraph content):**\n' +
            '1. [Question]\n' +
            '   A) ...\n' +
            '   B) ...\n' +
            '   C) ...\n' +
            '   D) ...\n\n' +
            '[Continue for questions 2-10]\n\n' +
            '---\n' +
            '**Answer Key (hidden below):**\n' +
            '1. [letter] | 2. [letter] | 3. [letter] | 4. [letter] | 5. [letter] | 6. [letter] | 7. [letter] | 8. [letter] | 9. [letter] | 10. [letter]';

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
