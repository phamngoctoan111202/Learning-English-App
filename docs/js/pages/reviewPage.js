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
                        <strong>⭐ Từ vựng trong nhóm</strong>
                    </div>
                    <div id="review-words-count" style="font-size: 13px; color: #666; margin-bottom: 8px;"></div>
                    <div id="review-words-list" style="min-height: 48px; border-radius: 8px; border: 1px solid #e0e0e0; padding: 8px;"></div>
                </div>

                <div class="card" style="grid-column: 1 / -1; background: #FFF3E0; border: 2px solid #FF9800;">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <strong style="font-size: 16px; color: #E65100;">🔥 Popular Topics (VSTEP - không cần học từ trước)</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">Ưu tiên mạch lạc & dễ nhớ, không ép nhồi từ vựng</div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
                        <!-- Length -->
                        <div>
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Độ dài đoạn văn</div>
                            <select id="review-length" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc;">
                                <option value="30">Ngắn · khoảng 30 câu</option>
                                <option value="50" selected>Vừa · khoảng 50 câu</option>
                                <option value="70">Dài · khoảng 60-70 câu</option>
                            </select>
                        </div>

                        <!-- Task Type -->
                        <div>
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Loại bài</div>
                            <div style="display: flex; gap: 12px;">
                                <label style="cursor: pointer;">
                                    <input type="radio" name="popular-task-type" value="speaking" checked>
                                    🗣️ Speaking
                                </label>
                                <label style="cursor: pointer;">
                                    <input type="radio" name="popular-task-type" value="writing">
                                    ✍️ Writing
                                </label>
                            </div>
                        </div>

                        <!-- Topic Selector -->
                        <div style="flex: 1; min-width: 220px;">
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Chủ đề VSTEP</div>
                            <input type="text" id="popular-topic-select" list="popular-topic-list"
                                style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%;"
                                placeholder="Nhập chủ đề hoặc chọn gợi ý..."
                                value="education, learning methods, online/offline classes, studying abroad, educational technology">
                            <datalist id="popular-topic-list">
                                <option value="education, learning methods, online/offline classes, studying abroad, educational technology">
                                <option value="technology, innovation, AI, digital devices, internet, social media impact">
                                <option value="environment, climate change, pollution, conservation, sustainable development">
                                <option value="health, lifestyle, diet, exercise, mental health, work-life balance">
                                <option value="work, career, job market, remote work, skills development, entrepreneurship">
                                <option value="society, culture, traditions, generation gap, urbanization, globalization">
                                <option value="travel, tourism, cultural exchange, local experiences, ecotourism">
                                <option value="media, communication, news, advertising, social media influence, fake news">
                                <option value="family, relationships, parenting, marriage, generation gap, family values">
                                <option value="economy, business, employment, consumer behavior, startups, globalization">
                            </datalist>
                        </div>
                    </div>

                    <!-- User Ideas -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Ý tưởng của bạn (tùy chọn)</div>
                        <textarea id="popular-user-ideas" style="width: 100%; min-height: 60px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" placeholder="Ví dụ: Tôi muốn nói về lợi ích học online như tiết kiệm thời gian, linh hoạt giờ giấc, có thể học lại bài..."></textarea>
                    </div>

                    <!-- Vocabulary preview -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Từ vựng trong kho</div>
                        <div id="popular-vocab-preview" style="min-height: 40px; border-radius: 8px; border: 1px solid #e0e0e0; padding: 8px; background: white; font-size: 13px; color: #666;"></div>
                    </div>

                    <!-- Generated Prompt -->
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Prompt để tạo đoạn văn (copy sang AI để luyện viết)</div>
                    <textarea id="popular-prompt" style="width: 100%; min-height: 200px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" readonly></textarea>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button id="popular-generate-btn" class="primary-btn" style="background: #FF9800;">
                            🔥 Tạo prompt
                        </button>
                        <button id="popular-copy-btn" class="secondary-btn" style="border-color: #FF9800; color: #E65100;">
                            📋 Copy prompt
                        </button>
                    </div>
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

        const lengthSelect = document.getElementById('review-length');
        if (lengthSelect) {
            lengthSelect.addEventListener('change', () => {
                this.generatePopularTopicPrompt();
            });
        }

        const popularGenerateBtn = document.getElementById('popular-generate-btn');
        if (popularGenerateBtn) {
            popularGenerateBtn.addEventListener('click', () => {
                this.generatePopularTopicPrompt();
            });
        }

        const popularCopyBtn = document.getElementById('popular-copy-btn');
        if (popularCopyBtn) {
            popularCopyBtn.addEventListener('click', () => {
                const prompt = document.getElementById('popular-prompt')?.value;
                if (prompt) {
                    navigator.clipboard.writeText(prompt).then(() => {
                        popularCopyBtn.textContent = '✅ Đã copy!';
                        setTimeout(() => {
                            popularCopyBtn.textContent = '📋 Copy prompt';
                        }, 2000);
                    });
                }
            });
        }

        // Load popular vocab preview on page load
        this.loadPopularVocabPreview();
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
        this.loadPopularVocabPreview();
        this.generatePopularTopicPrompt();
    },

    async loadMasteredVocabs() {
        const allVocabs = await db.getAllVocabularies();
        return allVocabs.filter(v => (v.category || 'GENERAL') === this.selectedCategory);
    },

    renderWords() {
        const listContainer = document.getElementById('review-words-list');
        const countLabel = document.getElementById('review-words-count');
        if (!listContainer || !countLabel) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            countLabel.textContent = '(0 từ trong nhóm này)';
            listContainer.innerHTML = '<div style="font-size: 13px; color: #777;">Chưa có từ vựng nào trong nhóm này.</div>';
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

    cleanup() {
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ==================== POPULAR TOPICS ====================

    async loadPopularVocabPreview() {
        const previewContainer = document.getElementById('popular-vocab-preview');
        if (!previewContainer) return;

        try {
            const words = (this.masteredVocabs || []).map(v => v.word).filter(Boolean).sort((a, b) => a.localeCompare(b));

            if (words.length === 0) {
                previewContainer.innerHTML = '<span style="color: #999;">Chưa có từ nào trong nhóm này.</span>';
            } else {
                previewContainer.innerHTML = words
                    .map(w => `<span style="display:inline-block; padding:3px 8px; border-radius:999px; background:#FFE0B2; color:#E65100; font-size:12px; margin:2px;">${this.escapeHtml(w)}</span>`)
                    .join(' ');
            }
        } catch (error) {
            console.error('Error loading vocab preview:', error);
            previewContainer.innerHTML = '<span style="color: #d32f2f;">Lỗi tải từ vựng</span>';
        }
    },

    async generatePopularTopicPrompt() {
        const promptTextarea = document.getElementById('popular-prompt');
        if (!promptTextarea) return;

        const topicInput = document.getElementById('popular-topic-select');
        const topic = topicInput ? topicInput.value.trim() || 'education' : 'education';

        const userIdeasTextarea = document.getElementById('popular-user-ideas');
        const userIdeas = userIdeasTextarea ? userIdeasTextarea.value.trim() : '';

        const lengthSelect = document.getElementById('review-length');
        const lengthValue = lengthSelect ? parseInt(lengthSelect.value || '50', 10) : 50;

        const words = (this.masteredVocabs || []).map(v => v.word).filter(Boolean);

        const prompt = this.buildPopularTopicPrompt(topic, words, userIdeas, lengthValue);
        promptTextarea.value = prompt;
    },

    buildPopularTopicPrompt(topic, words, userIdeas, lengthValue = 50) {
        const topicDescription = topic;

        // Task-specific instructions
        const taskInstruction = `Write one coherent English reading passage of about ${lengthValue} sentences (approximately 500 words) at CEFR B2/B2+ level, followed by 20 multiple-choice comprehension questions.`;

        const roleDescription = 'You are an English teacher helping a B2/B2+ level student review vocabulary through a reading passage.';

        // Process words for synonym groups
        const { processedWords, synonymGroups } = this.processWordList(words);

        // Build vocabulary section
        let vocabSection = '';
        if (processedWords.length > 0) {
            vocabSection = `\n**VOCABULARY BANK (use naturally where they fit, DO NOT force):**\n${processedWords.join(', ')}\n`;

            if (synonymGroups.length > 0) {
                const synonymLines = synonymGroups.map(group => `- ${group.join(' / ')}`).join('\n');
                vocabSection += `\n**SYNONYM/ALTERNATIVE GROUPS:**\n${synonymLines}\n`;
            }

            vocabSection += `\nNOTE: Only use words that fit naturally. It's better to skip a word than force it awkwardly. The goal is a coherent, memorable answer.\n`;
        }

        // Build user ideas section
        let ideasSection = '';
        if (userIdeas) {
            ideasSection = `\n**USER'S IDEAS TO INCORPORATE:**\n${userIdeas}\n\nPlease build upon these ideas and structure them coherently.\n`;
        }

        // Output format
        const outputFormat = `**OUTPUT FORMAT:**

**Passage:**
[Your reading passage here — approximately 500 words, bold every vocabulary bank word when used (e.g., **word** or **word1/word2**)]

**Comprehension Questions (20 MCQs about the passage content):**
1. [Question]
   A) ...
   B) ...
   C) ...
   D) ...

[Continue for questions 2-20]

---
**Answer Key (hidden below):**
1. [letter] | 2. [letter] | 3. [letter] | 4. [letter] | 5. [letter] | 6. [letter] | 7. [letter] | 8. [letter] | 9. [letter] | 10. [letter] | 11. [letter] | 12. [letter] | 13. [letter] | 14. [letter] | 15. [letter] | 16. [letter] | 17. [letter] | 18. [letter] | 19. [letter] | 20. [letter]`;

        return `${roleDescription}

**TOPIC:** ${topicDescription}

**TASK:** ${taskInstruction}
${ideasSection}${vocabSection}
**CRITICAL REQUIREMENTS (in order of priority):**
1. **COHERENCE FIRST**: The passage MUST read naturally and make logical sense. Every sentence should connect smoothly to the next.
2. **MEANINGFUL CONTENT**: Tell a realistic story or describe a plausible scenario related to the topic. The content should be interesting and make sense in real life.
3. **DO NOT FORCE WORDS**: Only use vocabulary that fits naturally. SKIP any word that would make the passage awkward, illogical, or unnatural.
4. **B2/B2+ LEVEL**: Use appropriate grammar structures (conditionals, passive voice, relative clauses) and maintain readability for upper-intermediate learners.
5. **BOLD VOCABULARY**: Bold every word from the vocabulary bank when used (e.g., **word** or **word1/word2**). Only bold words from the vocabulary bank, not other words.

${outputFormat}`;
    }
};
