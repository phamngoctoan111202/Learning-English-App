package com.example.specialenglishlearningapp.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.utils.ExampleUtils
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.utils.StringComparator
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class WordQueueItem(
    val word: String,
    val memoryScore: Float,
    val correctAttempts: Int,
    val totalAttempts: Int,
    val isCurrentWord: Boolean = false
)

data class LearnUiState(
    val word: String = "",
    val vietnameseHint: String = "",
    val progressCompleted: Int = 0,
    val progressTotal: Int = 0,
    val canCheck: Boolean = false,
    val canNext: Boolean = false,
    val canSkip: Boolean = false,
    val correctAnswerText: String = "",
    val errorDetailsText: String = "",
    val showErrorCard: Boolean = false,
    val queueWords: List<WordQueueItem> = emptyList()
)

class LearnViewModel(application: Application) : AndroidViewModel(application) {

    private val database: AppDatabase = AppDatabase.getDatabase(application)

    private val learningQueue: MutableList<VocabularyWithExamples> = mutableListOf()
    private var currentIndex: Int = -1
    private var currentVocabulary: VocabularyWithExamples? = null
    // Track unique Vietnamese sentences (multiple English translations = 1 sentence)
    private val completedVietnamese = mutableSetOf<String?>()

    private val _uiState = MutableLiveData(LearnUiState())
    val uiState: LiveData<LearnUiState> = _uiState

    private var initialized = false

    // Category filter: "GENERAL" or "TOEIC"
    var selectedCategory: String = "GENERAL"
        private set

    fun initializeIfNeeded() {
        if (initialized) return
        Logger.d("LearnVM initialize queue")
        buildLearningQueueAndStart()
        initialized = true
    }

    fun rebuildQueueForSettings() {
        Logger.d("LearnVM rebuild queue for settings change")
        buildLearningQueueAndStart()
    }

    /**
     * Set category filter and rebuild queue
     */
    fun setCategory(category: String) {
        if (selectedCategory == category) return
        selectedCategory = category
        Logger.d("LearnVM category changed to: $category")
        // Reset progress when switching categories
        completedVietnamese.clear()
        buildLearningQueueAndStart()
    }

    private fun getLearningSettings(): Pair<Int, Int> {
        val ctx = getApplication<Application>().applicationContext
        val prefs = ctx.getSharedPreferences("learn_settings", Context.MODE_PRIVATE)
        val nOldest = prefs.getInt("n_oldest", 3)
        val mNewest = prefs.getInt("m_newest", 2)
        return nOldest to mNewest
    }

    private fun buildLearningQueueAndStart() {
        viewModelScope.launch {
            try {
                val list = database.vocabularyWithExamplesDao()
                    .getAllVocabulariesWithExamples()
                    .first()

                // Filter by category AND examples
                val filtered = list.filter {
                    it.examples.isNotEmpty() && it.vocabulary.category == selectedCategory
                }

                // NEW LOGIC: Chọn 15 từ có memoryScore thấp nhất để học tập trung, sau đó xáo trộn
                // Ưu tiên: memoryScore = 0 (chưa học hoặc 0% chính xác), sau đó là memoryScore thấp nhất
                val focusedWords = filtered
                    .sortedWith(compareBy<VocabularyWithExamples> { it.vocabulary.memoryScore }
                        .thenBy { it.vocabulary.lastStudiedAt }
                        .thenByDescending { it.vocabulary.createdAt })
                    .take(15)  // Chỉ lấy 15 từ có memoryScore thấp nhất
                    .shuffled()  // Xáo trộn thứ tự để học đa dạng

                learningQueue.clear()
                learningQueue.addAll(focusedWords)

                Logger.d("Queue built with FOCUSED learning approach:")
                Logger.d("Selected ${focusedWords.size} words with lowest memoryScore:")
                focusedWords.forEach { vocab ->
                    Logger.d("  - '${vocab.vocabulary.word}': memoryScore=${String.format("%.2f", vocab.vocabulary.memoryScore)} (${vocab.vocabulary.correctAttempts}/${vocab.vocabulary.totalAttempts})")
                }

                currentIndex = -1
                loadNext()
            } catch (ce: CancellationException) {
                Logger.d("LearnVM queue build cancelled")
            } catch (e: Exception) {
                Logger.e("LearnVM error building queue", e)
                _uiState.postValue(
                    LearnUiState(
                        word = "Chưa có từ vựng",
                        progressCompleted = 0,
                        progressTotal = 0,
                        canCheck = false,
                        canNext = false,
                        canSkip = false
                    )
                )
            }
        }
    }

    fun loadNext() {
        if (learningQueue.isEmpty()) {
            _uiState.postValue(
                LearnUiState(
                    word = "Chưa có từ vựng",
                    vietnameseHint = "Hãy thêm từ vựng trong tab Edit",
                    progressCompleted = 0,
                    progressTotal = 0,
                    canCheck = false,
                    canNext = false,
                    canSkip = false
                )
            )
            return
        }
        currentIndex = (currentIndex + 1) % learningQueue.size
        val vocab = learningQueue[currentIndex]
        currentVocabulary = vocab
        completedVietnamese.clear()
        updateUiBasics()
    }

    private fun updateUiBasics() {
        val v = currentVocabulary ?: return
        // Find next uncompleted Vietnamese sentence
        val nextUncompleted = v.examples.firstOrNull { !completedVietnamese.contains(it.vietnamese) }

        // Build queue words list with current word highlighted
        val queueWordsList = learningQueue.mapIndexed { index, vocabWithExamples ->
            WordQueueItem(
                word = vocabWithExamples.vocabulary.word,
                memoryScore = vocabWithExamples.vocabulary.memoryScore,
                correctAttempts = vocabWithExamples.vocabulary.correctAttempts,
                totalAttempts = vocabWithExamples.vocabulary.totalAttempts,
                isCurrentWord = index == currentIndex
            )
        }

        // Count unique Vietnamese sentences
        val totalUniqueVietnamese = v.examples.map { it.vietnamese }.distinct().size

        _uiState.postValue(
            LearnUiState(
                word = v.vocabulary.word,
                vietnameseHint = nextUncompleted?.vietnamese.orEmpty(),
                progressCompleted = completedVietnamese.size,
                progressTotal = totalUniqueVietnamese,
                canCheck = true,
                canNext = false,
                canSkip = true,
                correctAnswerText = "",
                errorDetailsText = "",
                showErrorCard = false,
                queueWords = queueWordsList
            )
        )
    }

    fun onCorrectAnswered() {
        val v = currentVocabulary ?: return
        val next = v.examples.firstOrNull { !completedVietnamese.contains(it.vietnamese) } ?: return
        completedVietnamese.add(next.vietnamese)

        val totalUniqueVietnamese = v.examples.map { it.vietnamese }.distinct().size
        val allDone = completedVietnamese.size >= totalUniqueVietnamese
        if (allDone) {
            // Increase lastStudiedAt and reduce priority for spaced repetition
            viewModelScope.launch {
                val now = System.currentTimeMillis()
                val newPriority = (v.vocabulary.priorityScore - 1).coerceAtLeast(-5)
                database.vocabularyDao().markStudied(v.vocabulary.id, now, newPriority)
                Logger.d("Mark studied: id=${v.vocabulary.id}, word='${v.vocabulary.word}', priority=$newPriority, last=$now")
            }
        }
        _uiState.postValue(
            _uiState.value?.copy(
                vietnameseHint = v.examples.firstOrNull { !completedVietnamese.contains(it.vietnamese) }?.vietnamese.orEmpty(),
                progressCompleted = completedVietnamese.size,
                canNext = allDone,
                canCheck = !allDone
            )
        )
    }

    fun onWrongAnswered(correct: String, summary: String) {
        _uiState.postValue(
            _uiState.value?.copy(
                correctAnswerText = "Đáp án đúng: ${correct}",
                errorDetailsText = summary,
                showErrorCard = true
            )
        )
    }

    fun checkAnswer(userAnswerRaw: String) {
        val v = currentVocabulary ?: return
        val userAnswer = userAnswerRaw.trim()
        if (userAnswer.isEmpty()) {
            return
        }
        
        // Find matching example by checking all English translations in each example
        // Track by unique Vietnamese sentences
        val matching = v.examples.find { example ->
            !completedVietnamese.contains(example.vietnamese) &&
            ExampleUtils.matchesAnySentence(userAnswer, ExampleUtils.jsonToSentences(example.sentences))
        }

        if (matching != null) {
            completedVietnamese.add(matching.vietnamese)
            val totalUniqueVietnamese = v.examples.map { it.vietnamese }.distinct().size
            val allDone = completedVietnamese.size >= totalUniqueVietnamese

            // Update learning stats: total attempts +1, correct attempts +1
            viewModelScope.launch {
                updateLearningStats(v.vocabulary.id, isCorrect = true, allExamplesCompleted = allDone)
            }

            _uiState.postValue(
                _uiState.value?.copy(
                    vietnameseHint = v.examples.firstOrNull { !completedVietnamese.contains(it.vietnamese) }?.vietnamese.orEmpty(),
                    progressCompleted = completedVietnamese.size,
                    canNext = allDone,
                    canCheck = !allDone,
                    showErrorCard = false,
                    correctAnswerText = "",
                    errorDetailsText = ""
                )
            )
        } else {
            // Update learning stats: total attempts +1, correct attempts +0
            viewModelScope.launch {
                updateLearningStats(v.vocabulary.id, isCorrect = false, allExamplesCompleted = false)
            }
            
            // Find the best matching example for error display
            val bestMatch = v.examples.maxByOrNull { example ->
                val sentences = ExampleUtils.jsonToSentences(example.sentences)
                sentences.maxOfOrNull { sentence ->
                    similarity(userAnswer, sentence)
                } ?: 0
            }
            
            if (bestMatch != null) {
                val sentences = ExampleUtils.jsonToSentences(bestMatch.sentences)
                val bestSentence = ExampleUtils.findBestMatch(userAnswer, sentences) ?: sentences.first()
                val cmp = StringComparator.compareStrings(userAnswer, bestSentence)
                onWrongAnswered(bestSentence, cmp.errorDetails)
            }
        }
    }

    fun next() {
        loadNext()
    }

    private suspend fun updateLearningStats(vocabularyId: Long, isCorrect: Boolean, allExamplesCompleted: Boolean) {
        try {
            val vocabulary = database.vocabularyDao().getVocabularyById(vocabularyId)
            if (vocabulary != null) {
                val newTotalAttempts = vocabulary.totalAttempts + 1
                val newCorrectAttempts = if (isCorrect) vocabulary.correctAttempts + 1 else vocabulary.correctAttempts
                val newMemoryScore = if (newTotalAttempts > 0) {
                    newCorrectAttempts.toFloat() / newTotalAttempts.toFloat()
                } else {
                    0.0f
                }

                database.vocabularyDao().updateLearningStats(
                    vocabularyId,
                    newTotalAttempts,
                    newCorrectAttempts,
                    newMemoryScore
                )

                Logger.d("Updated learning stats for '${vocabulary.word}': total=$newTotalAttempts, correct=$newCorrectAttempts, memory=${String.format("%.2f", newMemoryScore)}")

                // LOGIC MỚI: Thay thế từ khi memoryScore > 70% VÀ đã học ít nhất 10 lần
                // Điều này đảm bảo từ được luyện tập đầy đủ trước khi thay thế
                if (newMemoryScore > 0.7f && newTotalAttempts >= 10) {
                    Logger.d("Word '${vocabulary.word}' reached >70% accuracy (${String.format("%.2f", newMemoryScore)}) with ${newTotalAttempts} attempts, replacing with new word...")
                    replaceWordInQueue(vocabularyId)
                } else if (newMemoryScore > 0.7f && newTotalAttempts < 10) {
                    Logger.d("Word '${vocabulary.word}' has >70% accuracy (${String.format("%.2f", newMemoryScore)}) but only ${newTotalAttempts}/10 attempts, need more practice")
                }
            }
        } catch (e: Exception) {
            Logger.e("Failed to update learning stats: ${e.message}", e)
        }
    }

    private suspend fun replaceWordInQueue(completedVocabId: Long) {
        try {
            // Lấy tất cả từ vựng
            val allWords = database.vocabularyWithExamplesDao()
                .getAllVocabulariesWithExamples()
                .first()
                .filter { it.examples.isNotEmpty() }

            // Tìm từ thay thế: từ có memoryScore thấp nhất mà chưa có trong queue
            val currentQueueIds = learningQueue.map { it.vocabulary.id }.toSet()
            val replacement = allWords
                .filter { it.vocabulary.id !in currentQueueIds }
                .sortedWith(compareBy<VocabularyWithExamples> { it.vocabulary.memoryScore }
                    .thenBy { it.vocabulary.lastStudiedAt }
                    .thenByDescending { it.vocabulary.createdAt })
                .firstOrNull()

            if (replacement != null) {
                // Tìm vị trí của từ cũ trong queue
                val oldIndex = learningQueue.indexOfFirst { it.vocabulary.id == completedVocabId }
                if (oldIndex >= 0) {
                    learningQueue[oldIndex] = replacement
                    Logger.d("Replaced word at position $oldIndex with '${replacement.vocabulary.word}' (memoryScore=${String.format("%.2f", replacement.vocabulary.memoryScore)})")

                    // Nếu đang ở từ vừa hoàn thành, chuyển sang từ tiếp theo
                    if (currentIndex == oldIndex) {
                        loadNext()
                    }
                }
            } else {
                Logger.d("No replacement word available (all words in queue or no more words)")
            }
        } catch (e: Exception) {
            Logger.e("Failed to replace word in queue: ${e.message}", e)
        }
    }

    private fun similarity(a: String, b: String): Int {
        val longer = if (a.length > b.length) a else b
        val edit = levenshtein(a.lowercase(), b.lowercase())
        return ((longer.length - edit).toFloat() / longer.length * 100).toInt()
    }

    private fun levenshtein(s1: String, s2: String): Int {
        val costs = IntArray(s2.length + 1)
        for (i in 0..s1.length) {
            var lastValue = i
            for (j in 0..s2.length) {
                if (i == 0) {
                    costs[j] = j
                } else if (j > 0) {
                    var newValue = costs[j - 1]
                    if (s1[i - 1] != s2[j - 1]) {
                        newValue = minOf(newValue, lastValue, costs[j]) + 1
                    }
                    costs[j - 1] = lastValue
                    lastValue = newValue
                }
            }
            if (i > 0) costs[s2.length] = lastValue
        }
        return costs[s2.length]
    }
}


