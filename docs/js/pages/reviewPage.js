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

                <!-- Popular Topics Section -->
                <div class="card" style="grid-column: 1 / -1; background: #FFF3E0; border: 2px solid #FF9800;">
                    <div style="text-align: center; margin-bottom: 16px;">
                        <strong style="font-size: 16px; color: #E65100;">🔥 Popular Topics (VSTEP - không cần học từ trước)</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">Ưu tiên mạch lạc & dễ nhớ, không ép nhồi từ vựng</div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
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
                        <div>
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Chủ đề VSTEP</div>
                            <select id="popular-topic-select" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc;">
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
                    </div>

                    <!-- User Ideas -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Ý tưởng của bạn (tùy chọn)</div>
                        <textarea id="popular-user-ideas" style="width: 100%; min-height: 60px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" placeholder="Ví dụ: Tôi muốn nói về lợi ích học online như tiết kiệm thời gian, linh hoạt giờ giấc, có thể học lại bài..."></textarea>
                    </div>

                    <!-- Vocabulary preview -->
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Từ vựng trong kho Popular Topics</div>
                        <div id="popular-vocab-preview" style="min-height: 40px; border-radius: 8px; border: 1px solid #e0e0e0; padding: 8px; background: white; font-size: 13px; color: #666;"></div>
                    </div>

                    <!-- Generated Prompt -->
                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">Prompt</div>
                    <textarea id="popular-prompt" style="width: 100%; min-height: 200px; border-radius: 8px; border: 1px solid #ccc; padding: 10px; font-size: 14px; resize: vertical;" readonly></textarea>

                    <!-- Buttons -->
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button id="popular-generate-btn" class="primary-btn" style="background: #FF9800;">
                            🔥 Tạo prompt Popular Topic
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

        // Popular Topics event listeners
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
        this.generatePrompt();
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

    generatePrompt() {
        const promptTextarea = document.getElementById('review-prompt');
        if (!promptTextarea) return;

        if (!this.masteredVocabs || this.masteredVocabs.length === 0) {
            promptTextarea.value = 'Chưa có từ nào trong nhóm này để tạo prompt.';
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
            ' sentences (approximately 500 words) at CEFR B2/B2+ reading level, followed by 20 multiple-choice comprehension questions.\n\n' +
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
            '**Comprehension Questions (20 MCQs about the paragraph content):**\n' +
            '1. [Question]\n' +
            '   A) ...\n' +
            '   B) ...\n' +
            '   C) ...\n' +
            '   D) ...\n\n' +
            '[Continue for questions 2-20]\n\n' +
            '---\n' +
            '**Answer Key (hidden below):**\n' +
            '1. [letter] | 2. [letter] | 3. [letter] | 4. [letter] | 5. [letter] | 6. [letter] | 7. [letter] | 8. [letter] | 9. [letter] | 10. [letter] | 11. [letter] | 12. [letter] | 13. [letter] | 14. [letter] | 15. [letter] | 16. [letter] | 17. [letter] | 18. [letter] | 19. [letter] | 20. [letter]';

        promptTextarea.value = promptText;
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
            const allVocabs = await db.getAllVocabularies();
            const popularVocabs = allVocabs.filter(v => v.category === 'POPULAR_TOPICS');
            const words = popularVocabs.map(v => v.word).filter(Boolean).sort((a, b) => a.localeCompare(b));

            if (words.length === 0) {
                previewContainer.innerHTML = '<span style="color: #999;">Chưa có từ nào. Thêm từ vào category "Popular Topics" ở tab Edit.</span>';
            } else {
                previewContainer.innerHTML = words
                    .map(w => `<span style="display:inline-block; padding:3px 8px; border-radius:999px; background:#FFE0B2; color:#E65100; font-size:12px; margin:2px;">${this.escapeHtml(w)}</span>`)
                    .join(' ');
            }
        } catch (error) {
            console.error('Error loading popular vocab preview:', error);
            previewContainer.innerHTML = '<span style="color: #d32f2f;">Lỗi tải từ vựng</span>';
        }
    },

    async generatePopularTopicPrompt() {
        const promptTextarea = document.getElementById('popular-prompt');
        if (!promptTextarea) return;

        // Get task type
        const taskTypeRadio = document.querySelector('input[name="popular-task-type"]:checked');
        const taskType = taskTypeRadio ? taskTypeRadio.value : 'speaking';

        // Get topic
        const topicSelect = document.getElementById('popular-topic-select');
        const topic = topicSelect ? topicSelect.value : 'education';

        // Get user ideas
        const userIdeasTextarea = document.getElementById('popular-user-ideas');
        const userIdeas = userIdeasTextarea ? userIdeasTextarea.value.trim() : '';

        // Get ALL words from POPULAR_TOPICS (no learning required)
        const allVocabs = await db.getAllVocabularies();
        const popularVocabs = allVocabs.filter(v => v.category === 'POPULAR_TOPICS');
        const words = popularVocabs.map(v => v.word).filter(Boolean);

        // Build prompt
        const prompt = this.buildPopularTopicPrompt(taskType, topic, words, userIdeas);
        promptTextarea.value = prompt;
    },

    buildPopularTopicPrompt(taskType, topic, words, userIdeas) {
        const topicDescriptions = {
            education: 'education, learning methods, online/offline classes, studying abroad, educational technology',
            technology: 'technology, innovation, AI, digital devices, internet, social media impact',
            environment: 'environment, climate change, pollution, conservation, sustainable development',
            health: 'health, lifestyle, diet, exercise, mental health, work-life balance',
            work: 'work, career, job market, remote work, skills development, entrepreneurship',
            society: 'society, culture, traditions, generation gap, urbanization, globalization',
            travel: 'travel, tourism, cultural exchange, local experiences, ecotourism',
            media: 'media, communication, news, advertising, social media influence, fake news',
            family: 'family, relationships, parenting, marriage, generation gap, family values',
            economy: 'economy, business, employment, consumer behavior, startups, globalization'
        };

        const topicDescription = topicDescriptions[topic] || topic;

        // Task-specific instructions
        const isSpeaking = taskType === 'speaking';
        const taskInstruction = isSpeaking
            ? 'Create a realistic VSTEP Speaking Part 3 question and provide a model spoken answer (about 2 minutes, 200-250 words).'
            : 'Create a realistic VSTEP Writing Task 2 question and provide a model essay (about 250-300 words).';

        const roleDescription = isSpeaking
            ? 'You are an experienced VSTEP Speaking examiner helping a B2/B2+ level student prepare for the VSTEP Speaking test.'
            : 'You are an experienced VSTEP Writing examiner helping a B2/B2+ level student prepare for the VSTEP Writing test.';

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

        // Output format based on task type
        const outputFormat = isSpeaking
            ? `**OUTPUT FORMAT:**

**Question:**
[VSTEP Speaking Part 3 question about the topic]

**Model Answer (Speaking - about 2 minutes):**
[Write a natural, coherent speaking answer that:
- Uses conversational language (contractions, filler phrases like "Well,", "I think", "To be honest")
- Has clear idea progression with smooth transitions
- Includes real-life examples
- Sounds like authentic speech, not written text
- Bolds every vocabulary bank word when used (e.g., **word**)
- Length: approximately 500 words]

**Key Phrases Used:**
[List 5-8 useful phrases naturally used in the answer]

**Structure Summary:**
[Brief outline: Introduction → Point 1 → Point 2 → (Point 3 if needed) → Conclusion]`
            : `**OUTPUT FORMAT:**

**Question:**
[VSTEP Writing Task 2 question about the topic]

**Model Essay (about 500 words):**
[Write a well-structured essay with:
- Clear introduction with thesis statement
- 2-3 body paragraphs with topic sentences and examples
- Conclusion summarizing main points
- Appropriate academic vocabulary and linking words
- Bolds every vocabulary bank word when used (e.g., **word**)]

**Key Vocabulary & Phrases Used:**
[List 8-10 useful words/phrases naturally used in the essay]

**Structure Summary:**
[Brief outline of the essay structure]`;

        return `${roleDescription}

**TOPIC:** ${topicDescription}

**TASK:** ${taskInstruction}
${ideasSection}${vocabSection}
**CRITICAL REQUIREMENTS (in order of priority):**
1. **COHERENCE & LOGIC FIRST**: The answer must flow naturally with clear connections between ideas. Prioritize logical structure over vocabulary complexity.
2. **EASY TO REMEMBER**: Use simple, memorable reasoning and examples that are realistic and relatable. The student should be able to recall the main ideas easily.
3. **NATURAL LANGUAGE**: Write as a real person would ${isSpeaking ? 'speak' : 'write'} - don't force complex vocabulary. Use B2 level naturally.
4. **CLEAR STRUCTURE**:
   - Introduction: Direct answer to the question
   - Main points (2-3 ideas): Each with explanation and example
   - Conclusion: Brief summary or personal reflection
5. **BOLD VOCABULARY**: Bold every word from the vocabulary bank when used (e.g., **word** or **word1/word2**). Only bold words from the vocabulary bank, not other words.

${outputFormat}`;
    }
};
