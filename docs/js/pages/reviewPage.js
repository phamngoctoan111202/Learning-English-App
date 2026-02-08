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

                <!-- Popular Topics Card -->
                <div class="card" style="grid-column: 1 / -1; background: #FFF3E0;">
                    <div style="font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #E65100;">
                        🔥 Popular Topics (VSTEP - không cần học từ trước)
                    </div>

                    <!-- Task Type Selector -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Loại bài</div>
                        <div style="display: flex; gap: 16px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="popular-task-type" value="speaking" checked>
                                <span>🗣️ Speaking</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="popular-task-type" value="writing">
                                <span>✍️ Writing</span>
                            </label>
                        </div>
                    </div>

                    <!-- Topic Selector -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Chủ đề VSTEP</div>
                        <select id="popular-topic" style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px;">
                            <option value="education">Education & Learning</option>
                            <option value="technology">Technology & Innovation</option>
                            <option value="environment">Environment & Climate</option>
                            <option value="health">Health & Lifestyle</option>
                            <option value="work">Work & Career</option>
                            <option value="society">Society & Culture</option>
                            <option value="travel">Travel & Tourism</option>
                            <option value="media">Media & Communication</option>
                            <option value="family">Family & Relationships</option>
                            <option value="economy">Economy & Business</option>
                        </select>
                    </div>

                    <!-- Your Ideas Input -->
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Ý tưởng của bạn (tùy chọn)</div>
                        <textarea id="popular-ideas" style="width: 100%; min-height: 80px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" placeholder="Ví dụ: Tôi muốn nói về việc học online có lợi ích như tiết kiệm thời gian, chi phí, và linh hoạt về địa điểm..."></textarea>
                    </div>

                    <!-- Generated Prompt -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Prompt (copy sang AI)</div>
                        <textarea id="popular-prompt" style="width: 100%; min-height: 120px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" readonly></textarea>
                    </div>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 8px;">
                        <button id="popular-generate-btn" class="primary-btn" style="flex: 1;">
                            🔥 Tạo prompt Popular Topic
                        </button>
                        <button id="popular-copy-btn" class="secondary-btn" style="flex: 1;">
                            📋 Copy prompt
                        </button>
                    </div>
                </div>

                <div class="card" style="grid-column: 1 / -1;">
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Độ dài đoạn văn</div>
                            <select id="review-length" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc;">
                                <option value="30">Ngắn · khoảng 30 câu</option>
                                <option value="50" selected>Vừa · khoảng 50 câu</option>
                                <option value="70">Dài · khoảng 60-70 câu</option>
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

        // Popular Topics listeners
        const popularGenerateBtn = document.getElementById('popular-generate-btn');
        if (popularGenerateBtn) {
            popularGenerateBtn.addEventListener('click', () => {
                this.generatePopularPrompt();
            });
        }

        const popularCopyBtn = document.getElementById('popular-copy-btn');
        if (popularCopyBtn) {
            popularCopyBtn.addEventListener('click', () => {
                this.copyPopularPrompt();
            });
        }

        const popularTaskTypeRadios = document.querySelectorAll('input[name="popular-task-type"]');
        popularTaskTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.generatePopularPrompt();
            });
        });

        const popularTopicSelect = document.getElementById('popular-topic');
        if (popularTopicSelect) {
            popularTopicSelect.addEventListener('change', () => {
                this.generatePopularPrompt();
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

    async generatePopularPrompt() {
        const promptTextarea = document.getElementById('popular-prompt');
        if (!promptTextarea) return;

        // Get selected task type
        const taskTypeRadio = document.querySelector('input[name="popular-task-type"]:checked');
        const taskType = taskTypeRadio ? taskTypeRadio.value : 'speaking';

        // Get selected topic
        const topicSelect = document.getElementById('popular-topic');
        const topicValue = topicSelect ? topicSelect.value : 'education';
        const topicText = topicSelect ? topicSelect.options[topicSelect.selectedIndex].text : 'Education & Learning';

        // Get user's ideas
        const ideasTextarea = document.getElementById('popular-ideas');
        const userIdeas = ideasTextarea ? ideasTextarea.value.trim() : '';

        // Get all vocabularies from POPULAR_TOPICS category (no need to be learned)
        const allVocabs = await db.getAllVocabularies();
        const popularTopicVocabs = allVocabs.filter(v => (v.category || 'GENERAL') === 'POPULAR_TOPICS');
        const words = popularTopicVocabs
            .map(v => v.word)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        // Process word list for synonyms
        const { processedWords, synonymGroups } = this.processWordList(words);

        // Topic-specific prompts
        const topicDescriptions = {
            'education': 'education, learning methods, online/offline classes, studying abroad, educational technology',
            'technology': 'technology, innovation, artificial intelligence, social media, digital transformation',
            'environment': 'environment, climate change, sustainability, pollution, conservation',
            'health': 'health, fitness, nutrition, mental health, healthcare systems',
            'work': 'work, career development, work-life balance, remote work, job satisfaction',
            'society': 'society, culture, traditions, social issues, community',
            'travel': 'travel, tourism, cultural exchange, vacation, exploring new places',
            'media': 'media, communication, news, entertainment, advertising',
            'family': 'family, relationships, parenting, generation gap, friendship',
            'economy': 'economy, business, entrepreneurship, financial planning, market trends'
        };

        const topicDesc = topicDescriptions[topicValue] || topicText;

        // Build vocabulary section
        let vocabularySection = '';
        if (processedWords.length > 0) {
            const wordsListText = processedWords.join(', ');
            vocabularySection = `\n**VOCABULARY BANK (use naturally if appropriate):**\n${wordsListText}\n`;

            if (synonymGroups.length > 0) {
                const synonymLines = synonymGroups.map(group => `- ${group.join(' / ')}`).join('\n');
                vocabularySection += `\n**SYNONYM/ALTERNATIVE GROUPS:**\n${synonymLines}\n`;
            }
        }

        // Build the prompt
        let promptText = '';

        if (taskType === 'speaking') {
            promptText = `You are an experienced VSTEP Speaking examiner helping a B2/B2+ level student prepare for the VSTEP Speaking test.

**TOPIC:** ${topicText}

**TASK:** Create a realistic VSTEP Part 3 speaking question about ${topicDesc}.
${vocabularySection}
${userIdeas ? `**STUDENT'S IDEAS/PERSPECTIVE:**\n${userIdeas}\n` : ''}
**CRITICAL REQUIREMENTS:**
1. **COHERENCE & LOGIC FIRST**: The answer should flow naturally with clear connections between ideas. Prioritize logical structure over vocabulary complexity.
2. **EASY TO REMEMBER**: Use simple, memorable reasoning and examples that are realistic and relatable.
3. **NATURAL LANGUAGE**: Write as a real person would speak - don't force complex vocabulary. Use B2 level naturally.
4. **VOCABULARY USAGE**: Use words from the vocabulary bank naturally where they fit. DO NOT force them - skip any word that makes the answer awkward.
5. **CLEAR STRUCTURE**:
   - Introduction: Direct answer to the question
   - Main points (2-3 ideas): Each with explanation and example
   - Conclusion: Brief summary or personal reflection

**OUTPUT FORMAT:**

**Question:**
[VSTEP Part 3 question about the topic]

**Sample Answer (Speaking - about 2 minutes):**
[Write a natural, coherent speaking answer that:
- Uses conversational language
- Has clear idea progression
- Includes real-life examples
- Sounds like authentic speech, not written text
- Incorporates vocabulary bank words naturally (bold them: **word**)
- Length: approximately 200-250 words]

**Vocabulary Used:**
[List which words from the vocabulary bank were used and why they fit naturally]`;

        } else {
            // Writing
            promptText = `You are an experienced VSTEP Writing examiner helping a B2/B2+ level student prepare for the VSTEP Writing test.

**TOPIC:** ${topicText}

**TASK:** Create a realistic VSTEP Task 2 essay question about ${topicDesc}.
${vocabularySection}
${userIdeas ? `**STUDENT'S IDEAS/PERSPECTIVE:**\n${userIdeas}\n` : ''}
**CRITICAL REQUIREMENTS:**
1. **COHERENCE & LOGIC FIRST**: The essay should have clear paragraph structure and logical flow. Prioritize well-connected ideas over vocabulary complexity.
2. **EASY TO REMEMBER**: Use straightforward arguments and memorable examples that are realistic.
3. **NATURAL LANGUAGE**: Write with clear, precise B2 level language. Don't force advanced vocabulary unnaturally.
4. **VOCABULARY USAGE**: Use words from the vocabulary bank naturally where they fit. DO NOT force them - skip any word that makes the essay awkward.
5. **CLEAR STRUCTURE**:
   - Introduction: Paraphrase topic + thesis statement
   - Body paragraphs (2): Each with topic sentence, explanation, example
   - Conclusion: Summarize main points + personal opinion

**OUTPUT FORMAT:**

**Essay Question:**
[VSTEP Task 2 question about the topic]
[Give your opinion / Discuss both views / Advantages & Disadvantages]
Write at least 250 words.

**Sample Essay:**
[Write a coherent, well-structured essay that:
- Has clear paragraph organization
- Uses topic sentences effectively
- Develops ideas logically
- Includes relevant examples
- Maintains consistent argumentation
- Incorporates vocabulary bank words naturally (bold them: **word**)
- Length: approximately 280-320 words]

**Vocabulary Used:**
[List which words from the vocabulary bank were used and explain how they enhanced the essay]`;
        }

        promptTextarea.value = promptText;
    },

    copyPopularPrompt() {
        const promptTextarea = document.getElementById('popular-prompt');
        if (!promptTextarea || !promptTextarea.value) {
            App.showToast('Chưa có prompt để copy!');
            return;
        }

        // Use modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(promptTextarea.value)
                .then(() => {
                    App.showToast('Đã copy prompt Popular Topic!');
                })
                .catch(() => {
                    // Fallback to old method
                    promptTextarea.select();
                    document.execCommand('copy');
                    App.showToast('Đã copy prompt Popular Topic!');
                });
        } else {
            // Fallback for older browsers
            promptTextarea.select();
            document.execCommand('copy');
            App.showToast('Đã copy prompt Popular Topic!');
        }
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
