/**
 * Learn Page - Active vocabulary learning page
 * Tương đương với LearnFragment trong Android
 */
const LearnPage = {
    // Learning state
    wordQueue: [],              // 30 focus words
    currentIndex: 0,            // Current word index in queue
    currentVocab: null,         // Current vocabulary with examples
    currentExampleIndex: 0,     // Current example index
    completedExamples: new Set(), // Set of completed example IDs

    // Timer
    timerInterval: null,
    progressUpdateInterval: null,

    // Settings
    QUEUE_SIZE: 30,
    STORAGE_KEY: 'learning_focus',

    // Category filter
    selectedCategory: localStorage.getItem('learnpage_filter_category') || 'GENERAL',

    // Track last words learned for logging
    _lastWordsLearned: null,

    /**
     * Render the learn page
     */
    render() {
        const mainContent = document.getElementById('main-content');
        const savedCategory = this.selectedCategory;

        mainContent.innerHTML = `
            <div class="learn-container">
                <!-- Header Card -->
                <div class="header-card" id="header-card">
                    <div class="current-word" id="current-word">
                        <span>Loading...</span>
                        <i class="fas fa-volume-up"></i>
                    </div>
                    <div class="vietnamese-hint" id="vietnamese-hint">-</div>
                    <div class="examples-count" id="examples-count">-</div>
                    <button class="settings-btn" id="settings-btn">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>

                <!-- Category Filter Card -->
                <div class="card" style="grid-column: 1 / -1; padding: 16px; background: #f5f5f5;">
                    <div style="text-align: center; margin-bottom: 12px;">
                        <strong>📚 Select Vocabulary Type</strong>
                    </div>
                    <div class="category-filter">
                        <label class="filter-radio">
                            <input type="radio" name="learn-category-filter" value="GENERAL" ${savedCategory === 'GENERAL' ? 'checked' : ''}>
                            <span>General</span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="learn-category-filter" value="TOEIC" ${savedCategory === 'TOEIC' ? 'checked' : ''}>
                            <span>TOEIC</span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="learn-category-filter" value="VSTEP" ${savedCategory === 'VSTEP' ? 'checked' : ''}>
                            <span>VSTEP</span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="learn-category-filter" value="SPEAKING" ${savedCategory === 'SPEAKING' ? 'checked' : ''}>
                            <span>SPEAKING</span>
                        </label>
                        <label class="filter-radio">
                            <input type="radio" name="learn-category-filter" value="WRITING" ${savedCategory === 'WRITING' ? 'checked' : ''}>
                            <span>WRITING</span>
                        </label>
                    </div>
                </div>

                <!-- Word Queue Card -->
                <div class="queue-card">
                    <div class="queue-title">
                        <i class="fas fa-list"></i> Learning Queue (${this.QUEUE_SIZE} words)
                    </div>
                    <div class="word-queue" id="word-queue">
                        <!-- Dynamic word queue -->
                    </div>
                </div>

                <!-- Daily Goal Card -->
                <div class="goal-card" id="goal-card">
                    <div class="goal-header">
                        <span class="goal-title">
                            <i class="fas fa-bullseye"></i> Daily Goal
                        </span>
                        <span class="goal-time" id="goal-time">
                            <i class="fas fa-clock"></i>
                            <span id="elapsed-time">0:00</span>
                        </span>
                    </div>
                    <div class="goal-progress">
                        <span class="progress-text" id="progress-text">0/1</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
                        </div>
                        <span class="level-badge" id="level-badge">Novice</span>
                    </div>
                    <div class="debt-message" id="debt-message"></div>
                </div>

                <!-- Progress Card -->
                <div class="progress-card">
                    <div class="sentence-progress">
                        Vietnamese: <span id="sentence-current">0</span>/<span id="sentence-total">0</span>
                    </div>
                </div>

                <!-- Input Card -->
                <div class="input-card">
                    <textarea class="answer-input" id="answer-input"
                              placeholder="Type English translation here..."></textarea>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="action-btn check-btn" id="check-btn">
                        <i class="fas fa-check"></i> Check
                    </button>
                    <button class="action-btn skip-btn" id="skip-btn">
                        <i class="fas fa-forward"></i> Skip
                    </button>
                    <button class="action-btn next-btn" id="next-btn" disabled>
                        <i class="fas fa-arrow-right"></i> Next
                    </button>
                </div>

                <!-- Error Details Card -->
                <div class="error-card hidden" id="error-card">
                    <div class="error-title">
                        <i class="fas fa-times-circle"></i> Incorrect Answer
                    </div>
                    <div class="correct-answers" id="correct-answers">
                        <!-- Dynamic correct answers -->
                    </div>
                    <div class="comparison-section" id="comparison-section">
                        <!-- Dynamic comparison -->
                    </div>
                    <div class="grammar-section" id="grammar-section">
                        <!-- Dynamic grammar explanation -->
                    </div>
                </div>

                <!-- Success Details Card -->
                <div class="success-card hidden" id="success-card">
                    <div class="success-title">
                        <i class="fas fa-check-circle"></i> Correct Answer!
                    </div>
                    <div class="grammar-section" id="success-grammar-section">
                        <!-- Dynamic grammar explanation -->
                    </div>
                </div>

                <!-- Instructions Card -->
                <div class="instructions-card">
                    <div class="instructions-title">
                        <i class="fas fa-info-circle"></i> Instructions
                    </div>
                    <ul class="instructions-list">
                        <li>Type the English translation of the Vietnamese sentence</li>
                        <li>Press space to hear the last word you typed</li>
                        <li>Press period (.) to hear the full sentence</li>
                        <li>Click the word to hear pronunciation</li>
                        <li>Complete 7/10 correct in last 10 attempts to master a word</li>
                    </ul>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.initialize();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Current word click (TTS)
        document.getElementById('current-word').addEventListener('click', () => {
            if (this.currentVocab) {
                ttsService.speakWord(this.currentVocab.vocabulary.word);
            }
        });

        // Answer input
        const answerInput = document.getElementById('answer-input');
        answerInput.addEventListener('keyup', (e) => {
            this.handleInputKeyup(e);
        });

        answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.checkAnswer();
            }
        });

        // Buttons
        document.getElementById('check-btn').addEventListener('click', () => {
            this.checkAnswer();
        });

        document.getElementById('skip-btn').addEventListener('click', () => {
            this.skipWord();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextWord();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        // Category filter
        const categoryRadios = document.querySelectorAll('input[name="learn-category-filter"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.onCategoryChanged(e.target.value);
            });
        });
    },

    /**
     * Handle category change
     */
    async onCategoryChanged(category) {
        console.log('[LearnPage] Category changed to:', category);
        this.selectedCategory = category;

        // Save to localStorage
        localStorage.setItem('learnpage_filter_category', category);

        // Reset progress
        this.completedExamples.clear();
        this.currentIndex = 0;

        // Clear saved queue to force rebuild with new category
        localStorage.removeItem(this.STORAGE_KEY);

        // Rebuild word queue with new category
        await this.loadWordQueue();

        // Load first word
        if (this.wordQueue.length > 0) {
            await this.loadCurrentWord();
        } else {
            this.showNoWordsMessage();
        }
    },

    /**
     * Initialize learning session
     */
    async initialize() {
        try {
            // Initialize learning progress manager
            await learningProgressManager.initialize();

            // Load word queue
            await this.loadWordQueue();

            // Start progress update interval (every 10 seconds)
            this.startProgressUpdater();
            this.updateProgressDisplay(true); // Initial update

            // Start timer
            this.startTimer();

            // Load first word
            if (this.wordQueue.length > 0) {
                await this.loadCurrentWord();
            } else {
                this.showNoWordsMessage();
            }
        } catch (error) {
            console.error('Error initializing learn page:', error);
            App.showToast('Failed to initialize learning session', 'error');
        }
    },

    /**
     * Load word queue from storage or create new one
     */
    async loadWordQueue() {
        // Try to load from localStorage
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const savedIds = JSON.parse(saved);
                // Validate and load from database, filtering by current category
                const validWords = [];
                for (const id of savedIds) {
                    const vocab = await db.getVocabularyWithExamples(id);
                    // Check both existence AND category match
                    if (vocab && (vocab.vocabulary.category || 'GENERAL') === this.selectedCategory) {
                        validWords.push(vocab);
                    }
                }

                if (validWords.length > 0) {
                    this.wordQueue = validWords;
                    // Fill remaining slots if needed
                    if (this.wordQueue.length < this.QUEUE_SIZE) {
                        await this.fillWordQueue();
                    }
                    this.renderWordQueue();
                    return;
                }
            } catch (e) {
                console.error('Error loading saved queue:', e);
            }
        }

        // Create new queue if no valid saved words for this category
        await this.createNewQueue();
    },

    /**
     * Create new word queue with MIXED strategy (filtered by category)
     * Combines:
     * - Phương án 1: 70% new words + 30% review words
     * - Phương án 3: Effective score with time decay
     * - Interleaved shuffling for alternating difficulty
     */
    async createNewQueue() {
        console.log('🔄 [LearnPage] Creating new queue with Mixed + Decay strategy...');

        // Get mixed queue: 70% new + 30% review (with effective score decay)
        const mixedVocabs = await db.getMixedQueueVocabularies(
            this.QUEUE_SIZE * 2, // Get more to account for words without examples
            [],
            this.selectedCategory
        );

        console.log(`📦 [LearnPage] Got ${mixedVocabs.length} mixed vocabularies`);

        // Apply interleaved shuffle to create alternating difficulty pattern
        const shuffledVocabs = db.shuffleInterleavedByMemoryScore(mixedVocabs);

        this.wordQueue = [];
        for (const vocab of shuffledVocabs) {
            if (this.wordQueue.length >= this.QUEUE_SIZE) break;

            const vocabWithExamples = await db.getVocabularyWithExamples(vocab.id);
            if (!vocabWithExamples) {
                console.warn('⚠️ [LearnPage] Skipping vocab, not found in DB:', vocab);
                continue;
            }

            const examplesCount = Array.isArray(vocabWithExamples.examples)
                ? vocabWithExamples.examples.length
                : 0;

            if (examplesCount === 0) {
                console.warn(
                    '⚠️ [LearnPage] Skipping vocab with no examples:',
                    {
                        id: vocabWithExamples.vocabulary.id,
                        word: vocabWithExamples.vocabulary.word
                    }
                );
                continue;
            }

            console.log(
                '✅ [LearnPage] Added to new queue:',
                {
                    id: vocabWithExamples.vocabulary.id,
                    word: vocabWithExamples.vocabulary.word,
                    examples: examplesCount
                }
            );
            this.wordQueue.push(vocabWithExamples);
        }

        console.log(`✅ [LearnPage] Queue created with ${this.wordQueue.length} words (category: ${this.selectedCategory})`);

        this.saveWordQueue();
        this.renderWordQueue();
    },

    /**
     * Fill word queue to QUEUE_SIZE (filtered by category)
     * Uses mixed queue strategy with time decay
     */
    async fillWordQueue() {
        const currentIds = this.wordQueue.map(w => w.vocabulary.id);
        const needed = this.QUEUE_SIZE - this.wordQueue.length;

        if (needed <= 0) return;

        console.log(`🔄 [LearnPage] Filling queue, need ${needed} more words...`);

        // Get mixed vocabularies (70% new + 30% review with decay)
        const additionalVocabs = await db.getMixedQueueVocabularies(
            needed * 2,
            currentIds,
            this.selectedCategory
        );

        // Apply interleaved shuffle
        const shuffledVocabs = db.shuffleInterleavedByMemoryScore(additionalVocabs);

        for (const vocab of shuffledVocabs) {
            if (this.wordQueue.length >= this.QUEUE_SIZE) break;

            const vocabWithExamples = await db.getVocabularyWithExamples(vocab.id);
            if (!vocabWithExamples) {
                console.warn('⚠️ [LearnPage] Skipping vocab in fillWordQueue, not found in DB:', vocab);
                continue;
            }

            const examplesCount = Array.isArray(vocabWithExamples.examples)
                ? vocabWithExamples.examples.length
                : 0;

            if (examplesCount === 0) {
                console.warn(
                    '⚠️ [LearnPage] Skipping vocab in fillWordQueue with no examples:',
                    {
                        id: vocabWithExamples.vocabulary.id,
                        word: vocabWithExamples.vocabulary.word
                    }
                );
                continue;
            }

            console.log(
                '✅ [LearnPage] Added to existing queue:',
                {
                    id: vocabWithExamples.vocabulary.id,
                    word: vocabWithExamples.vocabulary.word,
                    examples: examplesCount
                }
            );
            this.wordQueue.push(vocabWithExamples);
        }

        console.log(`✅ [LearnPage] Queue filled, now has ${this.wordQueue.length} words (category: ${this.selectedCategory})`);

        this.saveWordQueue();
    },

    /**
     * Save word queue to localStorage
     */
    saveWordQueue() {
        const ids = this.wordQueue.map(w => w.vocabulary.id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
    },

    /**
     * Render word queue display with days-ago info
     */
    renderWordQueue() {
        const container = document.getElementById('word-queue');
        if (!container) return; // Guard against null element

        container.innerHTML = this.wordQueue.map((item, index) => {
            const vocab = item.vocabulary;
            const examplesCount = Array.isArray(item.examples) ? item.examples.length : 1;
            const isCurrent = index === this.currentIndex;
            const hasPassed = Database.hasPassed(vocab, examplesCount);
            const last10Correct = Database.getLast10CorrectCount(vocab);

            // Calculate days since last study
            const lastStudied = vocab.lastStudiedAt || vocab.createdAt || Date.now();
            const daysSince = Math.floor((Date.now() - lastStudied) / (1000 * 60 * 60 * 24));

            // Calculate effective score for display
            const effectiveScore = db.calculateEffectiveScore(vocab);

            let className = 'queue-item';
            if (isCurrent) className += ' current';
            if (hasPassed) className += ' passed';

            // Days ago badge
            let daysAgoBadge = '';
            if (daysSince > 0) {
                const badgeClass = daysSince >= 7 ? 'days-ago-urgent' : 'days-ago';
                daysAgoBadge = `<span class="${badgeClass}">${daysSince}d</span>`;
            }

            return `
                <div class="${className}" data-index="${index}">
                    <span class="queue-item-word">${this.escapeHtml(vocab.word)}</span>
                    <span class="queue-item-stats">
                        ${last10Correct}/10
                        ${daysAgoBadge}
                    </span>
                </div>
            `;
        }).join('');

        // Add click events to queue items
        container.querySelectorAll('.queue-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.jumpToWord(index);
            });
        });
    },

    /**
     * Load current word
     */
    async loadCurrentWord() {
        if (this.currentIndex >= this.wordQueue.length) {
            this.currentIndex = 0;
        }

        this.currentVocab = this.wordQueue[this.currentIndex];

        if (!this.currentVocab || !this.currentVocab.examples.length) {
            this.nextWord(true);
            return;
        }

        // Reset example state
        this.currentExampleIndex = 0;
        this.completedExamples.clear();

        // Update UI
        this.updateWordDisplay();
        this.updateProgressDisplay();
        this.renderWordQueue();
        this.clearInput();
        this.hideErrorCard();
        this.hideSuccessCard();

        // Disable next button until all examples are done
        document.getElementById('next-btn').disabled = true;
    },

    /**
     * Update word display
     */
    updateWordDisplay() {
        const vocab = this.currentVocab.vocabulary;
        const examples = this.currentVocab.examples;
        const currentExample = examples[this.currentExampleIndex];

        document.getElementById('current-word').innerHTML = `
            <span>${this.escapeHtml(vocab.word)}</span>
            <i class="fas fa-volume-up"></i>
        `;

        document.getElementById('vietnamese-hint').textContent =
            currentExample?.vietnamese || '-';

        const totalSentences = examples.reduce((sum, ex) =>
            sum + ExampleUtils.getSentenceCount(ex), 0
        );
        document.getElementById('examples-count').textContent =
            `${examples.length} example(s), ${totalSentences} sentence(s)`;

        // Update sentence progress
        document.getElementById('sentence-current').textContent =
            this.currentExampleIndex + 1;
        document.getElementById('sentence-total').textContent =
            examples.length;
    },

    /**
     * Update goal progress display
     * @param {boolean} verbose - If true, log detailed info (default: false)
     */
    updateProgressDisplay(verbose = false) {
        const summary = learningProgressManager.getSummary();

        // Only log when explicitly requested or when wordsLearned changes
        if (verbose || summary.wordsLearned !== this._lastWordsLearned) {
            console.log('📊 [LearnPage] updateProgressDisplay:');
            console.log('   📚 Words learned:', summary.wordsLearned);
            console.log('   🎯 Goal:', summary.goal);
            console.log('   💳 Debt:', summary.debt);
            console.log('   📈 Progress:', summary.progressPercentage + '%');
            console.log('   🏅 Level:', summary.level);
            console.log('   ⏱️ Elapsed time:', summary.elapsedTime);
            this._lastWordsLearned = summary.wordsLearned;
        }

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${summary.wordsLearned}/${summary.goal}`;
        }

        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${summary.progressPercentage}%`;
        }

        const levelBadge = document.getElementById('level-badge');
        if (levelBadge) {
            levelBadge.textContent = summary.level;
        }

        const debtMessage = document.getElementById('debt-message');
        if (debtMessage) {
            if (summary.debt > 0) {
                debtMessage.textContent = `${summary.debt} word(s) behind schedule`;
                debtMessage.style.display = 'block';
            } else {
                debtMessage.style.display = 'none';
            }
        }

        // Update time status
        const timeContainer = document.getElementById('goal-time');
        if (timeContainer) {
            timeContainer.className = `goal-time ${summary.timeStatusClass}`;
        }
    },

    /**
     * Start interval to update progress display (goal changes over time)
     */
    startProgressUpdater() {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
        }
        // Update every 10 seconds to refresh the goal
        this.progressUpdateInterval = setInterval(() => {
            // Set verbose to false to avoid spamming the console
            this.updateProgressDisplay(false);
        }, 10000);
    },

    /**
     * Start timer
     */
    startTimer() {
        this.updateTimer();
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    },

    /**
     * Update timer display (only updates elapsed time, not progress)
     */
    updateTimer() {
        const elapsedTimeElement = document.getElementById('elapsed-time');
        if (elapsedTimeElement) {
            elapsedTimeElement.textContent = learningProgressManager.getElapsedTimeFormatted();
        }
        // Update time status color based on debt
        const summary = learningProgressManager.getSummary();
        document.getElementById('goal-time')?.classList.toggle('warning', summary.timeStatusClass === 'warning');
        document.getElementById('goal-time')?.classList.toggle('danger', summary.timeStatusClass === 'danger');
    },

    /**
     * Handle input keyup for TTS
     */
    handleInputKeyup(e) {
        const input = document.getElementById('answer-input');
        const value = input.value;

        // Speak last word on space
        if (e.key === ' ' && value.endsWith(' ')) {
            const words = value.trim().split(/\s+/);
            if (words.length > 0) {
                const lastWord = words[words.length - 1];
                if (lastWord) {
                    ttsService.speakWord(lastWord);
                }
            }
        }

        // Speak sentence on period
        if (e.key === '.' && value.endsWith('.')) {
            const sentence = value.trim();
            if (sentence) {
                ttsService.speakSentence(sentence);
            }
        }
    },

    /**
     * Check answer
     */
    async checkAnswer() {
        const input = document.getElementById('answer-input');
        const userAnswer = input.value.trim();

        if (!userAnswer) {
            App.showToast('Please enter an answer', 'error');
            return;
        }

        if (!this.currentVocab) return;

        const currentExample = this.currentVocab.examples[this.currentExampleIndex];
        const isCorrect = ExampleUtils.matchesAnySentence(userAnswer, currentExample);

        await db.updateLearningStats(
            this.currentVocab.vocabulary.id,
            isCorrect,
            this.currentExampleIndex
        );

        // Refresh vocabulary data
        this.currentVocab = await db.getVocabularyWithExamples(this.currentVocab.vocabulary.id);
        this.wordQueue[this.currentIndex] = this.currentVocab;

        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer(userAnswer, currentExample);
        }

        this.renderWordQueue();
    },

    /**
     * Handle correct answer
     */
    async handleCorrectAnswer() {
        console.log('✅ [LearnPage] handleCorrectAnswer called');
        console.log('   Current word:', this.currentVocab?.vocabulary?.word);
        console.log('   Example index:', this.currentExampleIndex);
        console.log('   Completed examples:', this.completedExamples.size, '/', this.currentVocab?.examples.length);

        App.showToast('Correct!', 'success');
        this.hideErrorCard();

        // Show success card with grammar
        const currentExample = this.currentVocab.examples[this.currentExampleIndex];
        this.showSuccessCard(currentExample);

        // Mark example as completed
        this.completedExamples.add(this.currentExampleIndex);
        console.log('   ✓ Marked example', this.currentExampleIndex, 'as completed');

        // Mỗi lần làm đúng một ví dụ => +1 nỗ lực ghi nhớ
        console.log('   📚 Adding memory attempt...');
        await learningProgressManager.addCompletedWord();
        this.updateProgressDisplay(true);

        // Check if all examples are done
        if (this.completedExamples.size >= this.currentVocab.examples.length) {
            console.log('   🎉 All examples completed for this word!');
            const examplesCount = this.currentVocab.examples.length || 1;
            const isMastered = Database.hasPassed(this.currentVocab.vocabulary, examplesCount);

            if (isMastered) {
                console.log('   🏆 Word is mastered (7/10 with examples)!');
                await this.handleWordMastered();
                document.getElementById('next-btn').disabled = false;
                App.showToast('Word mastered! Click Next to continue.', 'success');
            } else {
                console.log('   ⏳ Word not yet mastered to 7/10 with examples');
                App.showToast('Keep practicing this word until memory reaches 7/10.', 'warning');
                setTimeout(() => {
                    this.hideSuccessCard();
                    this.completedExamples.clear();
                    this.currentExampleIndex = 0;
                    this.updateWordDisplay();
                }, 2000);
            }
        } else {
            console.log('   ➡️ Moving to next example...');
            // Move to next example
            setTimeout(() => {
                this.hideSuccessCard();
                this.moveToNextExample();
            }, 2000); // Hide success card after 2 seconds
        }

        this.clearInput();
    },

    /**
     * Move to next incomplete example
     */
    moveToNextExample() {
        const total = this.currentVocab.examples.length;

        for (let i = 1; i <= total; i++) {
            const nextIndex = (this.currentExampleIndex + i) % total;
            if (!this.completedExamples.has(nextIndex)) {
                this.currentExampleIndex = nextIndex;
                break;
            }
        }

        this.updateWordDisplay();
    },

    /**
     * Handle wrong answer
     */
    handleWrongAnswer(userAnswer, currentExample) {
        App.showToast('Incorrect', 'error');

        // Show error card with details
        this.showErrorCard(userAnswer, currentExample);
    },

    /**
     * Show error card with comparison
     */
    showErrorCard(userAnswer, example) {
        const errorCard = document.getElementById('error-card');
        const correctAnswersContainer = document.getElementById('correct-answers');
        const comparisonSection = document.getElementById('comparison-section');
        const grammarSection = document.getElementById('grammar-section');

        // Get all correct sentences
        const sentences = ExampleUtils.getAllSentences(example);

        correctAnswersContainer.innerHTML = `
            <div class="correct-answers-title">Correct answers:</div>
            ${sentences.map(s => `
                <div class="correct-answer-item">${this.escapeHtml(s)}</div>
            `).join('')}
        `;

        // Find best match and show comparison
        const bestMatch = ExampleUtils.findBestMatch(userAnswer, example);

        if (bestMatch) {
            const comparison = StringComparator.generateComparisonHTML(
                userAnswer,
                bestMatch.sentence
            );

            comparisonSection.innerHTML = `
                <div class="comparison-title">Your answer compared to closest match:</div>
                <div class="comparison-content">
                    <div class="similarity-score">
                        Similarity: <span>${comparison.similarity}%</span>
                    </div>
                    <div class="char-comparison">
                        <div><strong>You:</strong> ${comparison.userHTML}</div>
                        <div><strong>Correct:</strong> ${comparison.correctHTML}</div>
                    </div>
                </div>
            `;
        }

        // Show grammar explanation if available
        if (example.grammar && example.grammar.trim()) {
            grammarSection.innerHTML = `
                <div class="grammar-title">
                    <i class="fas fa-book"></i> Grammar Explanation:
                </div>
                <div class="grammar-content">${this.escapeHtml(example.grammar)}</div>
            `;
            grammarSection.style.display = 'block';
        } else {
            grammarSection.style.display = 'none';
        }

        errorCard.classList.remove('hidden');
    },

    /**
     * Hide error card
     */
    hideErrorCard() {
        const errorCard = document.getElementById('error-card');
        errorCard.classList.add('hidden');
    },

    /**
     * Show success card with grammar
     */
    showSuccessCard(example) {
        const successCard = document.getElementById('success-card');
        const grammarSection = document.getElementById('success-grammar-section');

        // Show grammar explanation if available
        if (example.grammar && example.grammar.trim()) {
            grammarSection.innerHTML = `
                <div class="grammar-title">
                    <i class="fas fa-book"></i> Grammar Explanation:
                </div>
                <div class="grammar-content">${this.escapeHtml(example.grammar)}</div>
            `;
            grammarSection.style.display = 'block';
        } else {
            grammarSection.style.display = 'none';
        }

        successCard.classList.remove('hidden');
    },

    /**
     * Hide success card
     */
    hideSuccessCard() {
        const successCard = document.getElementById('success-card');
        successCard.classList.add('hidden');
    },

    /**
     * Handle word mastered
     * Replacement word is selected from shuffled list to maintain variety
     */
    async handleWordMastered() {
        const masteredWord = this.currentVocab.vocabulary.word;

        // Find replacement word using interleaved shuffle
        const currentIds = this.wordQueue.map(w => w.vocabulary.id);
        const replacementCandidates = await db.getVocabulariesByLowestMemoryScore(
            10,  // Get more candidates for better shuffling
            currentIds,
            this.selectedCategory
        );

        if (replacementCandidates.length > 0) {
            console.log(
                '🔄 [LearnPage] Finding replacement for mastered word:',
                {
                    masteredWord,
                    candidates: replacementCandidates.map(v => ({
                        id: v.id,
                        word: v.word
                    }))
                }
            );

            const shuffled = db.shuffleInterleavedByMemoryScore(replacementCandidates);

            for (const vocab of shuffled) {
                const replacement = await db.getVocabularyWithExamples(vocab.id);
                if (!replacement) {
                    console.warn('⚠️ [LearnPage] Replacement candidate not found in DB:', vocab);
                    continue;
                }

                const examplesCount = Array.isArray(replacement.examples)
                    ? replacement.examples.length
                    : 0;

                if (examplesCount === 0) {
                    console.warn(
                        '⚠️ [LearnPage] Replacement candidate has no examples, skipping:',
                        {
                            id: replacement.vocabulary.id,
                            word: replacement.vocabulary.word
                        }
                    );
                    continue;
                }

                console.log(
                    '✅ [LearnPage] Replacement word selected:',
                    {
                        id: replacement.vocabulary.id,
                        word: replacement.vocabulary.word,
                        examples: examplesCount
                    }
                );

                this.wordQueue[this.currentIndex] = replacement;
                this.saveWordQueue();

                App.showToast(
                    `"${masteredWord}" mastered! Replaced with "${replacement.vocabulary.word}"`,
                    'success'
                );
                break;
            }
        } else {
            App.showToast(`"${masteredWord}" mastered!`, 'success');
        }

        this.updateProgressDisplay();
    },

    /**
     * Skip current word
     */
    skipWord() {
        const examplesCount = this.currentVocab?.examples?.length || 1;
        const canSkip = this.currentVocab &&
            Database.hasPassed(this.currentVocab.vocabulary, examplesCount);

        if (!canSkip) {
            App.showToast('Bạn cần học từ này đến độ nhớ 7/10 trước khi chuyển.', 'warning');
            return;
        }

        this.nextWord();
    },

    /**
     * Move to next word
     */
    nextWord(force = false) {
        if (!force) {
            const examplesCount = this.currentVocab?.examples?.length || 1;
            const canMove = this.currentVocab &&
                Database.hasPassed(this.currentVocab.vocabulary, examplesCount);

            if (!canMove) {
                App.showToast('Bạn cần học từ này đến độ nhớ 7/10 trước khi chuyển.', 'warning');
                return;
            }
        }

        this.currentIndex = (this.currentIndex + 1) % this.wordQueue.length;
        this.loadCurrentWord();
    },

    /**
     * Jump to specific word
     */
    jumpToWord(index) {
        if (index >= 0 && index < this.wordQueue.length) {
            const examplesCount = this.currentVocab?.examples?.length || 1;
            const canJump = !this.currentVocab ||
                Database.hasPassed(this.currentVocab.vocabulary, examplesCount);

            if (!canJump) {
                App.showToast('Bạn cần học từ này đến độ nhớ 7/10 trước khi chuyển.', 'warning');
                return;
            }

            this.currentIndex = index;
            this.loadCurrentWord();
        }
    },

    /**
     * Clear input
     */
    clearInput() {
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
    },

    /**
     * Show no words message
     */
    showNoWordsMessage() {
        document.getElementById('current-word').innerHTML = `
            <span>No words available</span>
        `;
        document.getElementById('vietnamese-hint').textContent =
            'Add some vocabulary in the Edit tab first';
    },

    /**
     * Show settings dialog
     */
    showSettings() {
        alert('Session reset is disabled.\n\nGoals must never be reset.');
    },

    /**
     * Cleanup when leaving page
     */
    cleanup() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    },

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
