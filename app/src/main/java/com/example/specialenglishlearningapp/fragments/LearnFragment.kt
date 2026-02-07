package com.example.specialenglishlearningapp.fragments

import android.os.Bundle
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.databinding.FragmentLearnBinding
import com.example.specialenglishlearningapp.utils.ExampleUtils
import com.example.specialenglishlearningapp.utils.Logger
import androidx.appcompat.app.AlertDialog
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import com.example.specialenglishlearningapp.utils.LearningSession
import com.example.specialenglishlearningapp.utils.LearningProgressManager
import android.widget.EditText
import android.os.Handler
import android.os.Looper
import com.example.specialenglishlearningapp.utils.TextToSpeechHelper
import android.text.Editable
import android.text.TextWatcher
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.specialenglishlearningapp.adapters.WordQueueAdapter
import com.example.specialenglishlearningapp.viewmodel.WordQueueItem

class LearnFragment : Fragment() {
    private var _binding: FragmentLearnBinding? = null
    private val binding get() = _binding!!

    private lateinit var database: AppDatabase
    private val learningQueue: MutableList<VocabularyWithExamples> = mutableListOf()
    private var currentIndex: Int = -1
    private var currentVocabulary: VocabularyWithExamples? = null
    // Track unique Vietnamese sentences that have been completed
    // Multiple English translations of same Vietnamese sentence count as one
    private val completedVietnamese = mutableSetOf<String?>()
    private var totalSentences = 0
    private var isVocabularyCompleted = false

    // Sử dụng Handler thay vì CountDownTimer để đếm lên
    private val handler = Handler(Looper.getMainLooper())
    private var updateUIRunnable: Runnable? = null
    private var autoSyncRunnable: Runnable? = null

    // Text-to-Speech helper
    private var ttsHelper: TextToSpeechHelper? = null

    // Word Queue Adapter
    private lateinit var wordQueueAdapter: WordQueueAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Logger.d("LearnFragment onCreateView")
        _binding = FragmentLearnBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d("LearnFragment onViewCreated")

        // Initialize TTS
        ttsHelper = TextToSpeechHelper(requireContext())

        database = AppDatabase.getDatabase(requireContext())

        // Setup RecyclerView for word queue
        setupWordQueueRecyclerView()

        setupClickListeners()

        // FIXED: Ensure LearningProgressManager is initialized before updating UI
        lifecycleScope.launch {
            // Re-initialize if needed (in case MainActivity's init failed or Fragment recreated)
            val initResult = LearningProgressManager.initialize(requireContext())
            if (initResult.isFailure) {
                Logger.e("⚠️ LearningProgressManager initialization failed in LearnFragment: ${initResult.exceptionOrNull()?.message}")
            }

            // Now update UI with loaded data
            withContext(Dispatchers.Main) {
                updateDailyGoalUI() // Initialize daily goal UI
            }
        }

        startUIUpdateTimer() // Start UI update timer (đếm lên)
        startAutoSyncTimer() // Start auto-sync timer

        // ALWAYS build queue from SharedPreferences (persistent storage)
        // This ensures 5 words are consistent across app restarts
        buildLearningQueueAndStart()
    }

    private fun setupWordQueueRecyclerView() {
        wordQueueAdapter = WordQueueAdapter()
        binding.recyclerViewWordQueue.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = wordQueueAdapter
        }
        Logger.d("Word queue RecyclerView setup complete")
    }

    private fun updateWordQueueUI() {
        if (_binding == null) return

        // Build queue words list with current word highlighted
        val queueWordsList = learningQueue.mapIndexed { index, vocabWithExamples ->
            val vocab = vocabWithExamples.vocabulary

            WordQueueItem(
                word = vocab.word,
                memoryScore = vocab.memoryScore,
                correctAttempts = vocab.correctAttempts,
                totalAttempts = vocab.totalAttempts,
                isCurrentWord = index == currentIndex
            )
        }

        wordQueueAdapter.submitList(queueWordsList)
        Logger.d("Word queue UI updated with ${queueWordsList.size} words")
    }

    private fun setupClickListeners() {
        binding.buttonCheck.setOnClickListener {
            checkAnswer()
        }

        binding.buttonNext.setOnClickListener {
            Logger.d("Next button clicked - moving to next vocabulary")
            loadNextFromQueue()
        }

        binding.buttonSkip.setOnClickListener {
            loadNextFromQueue()
        }

        // Open settings on progress text tap
        binding.textProgress.setOnClickListener { showSettingsDialog() }
        binding.buttonSettings.setOnClickListener { showSettingsDialog() }

        // Daily goal click listener
        binding.textDailyGoal.setOnClickListener {
            showDailyGoalDialog()
        }

        // Level click listener
        binding.textLevel.setOnClickListener {
            showLevelDetailsDialog()
        }

        // TTS speaker button - pronounce current word
        binding.textWord.setOnClickListener {
            pronounceCurrentWord()
        }

        // Category filter
        binding.radioGroupCategory.setOnCheckedChangeListener { _, checkedId ->
            val category = when (checkedId) {
                R.id.radioToeic -> "TOEIC"
                R.id.radioVstep -> "VSTEP"
                R.id.radioSpeaking -> "SPEAKING"
                R.id.radioWriting -> "WRITING"
                else -> "GENERAL"
            }
            onCategoryChanged(category)
        }

        // Setup TTS for answer EditText - pronounce word when user types space
        setupAnswerTTS()
    }

    /**
     * Handle category change
     */
    private fun onCategoryChanged(category: String) {
        Logger.d("Category changed to: $category")
        // Reset progress for new category
        completedVietnamese.clear()
        currentIndex = -1
        isVocabularyCompleted = false
        // Rebuild queue with new category filter
        buildLearningQueueAndStart(category)
    }

    /**
     * Setup TTS for answer EditText
     * Pronounce the last word when user types a space
     */
    private fun setupAnswerTTS() {
        binding.editTextAnswer.addTextChangedListener(object : TextWatcher {
            private var lastText = ""

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                // Not needed
            }

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                // Not needed
            }

            override fun afterTextChanged(s: Editable?) {
                val currentText = s?.toString() ?: ""

                // Check if user just typed a period (finished typing a sentence)
                // PRIORITY: Check period BEFORE space, so "It's beautiful." pronounces the whole sentence
                if (currentText.isNotEmpty() && currentText.endsWith(".") && !lastText.endsWith(".")) {
                    // Find the start of the last sentence (after the previous period or from beginning)
                    val lastPeriodIndex = currentText.lastIndexOf('.', startIndex = currentText.length - 2)
                    val sentenceStartIndex = if (lastPeriodIndex >= 0) lastPeriodIndex + 1 else 0

                    // Extract the sentence (from start to just before the new period)
                    val sentence = currentText.substring(sentenceStartIndex, currentText.length - 1).trim()

                    if (sentence.isNotEmpty()) {
                        Logger.d("User finished typing sentence: '$sentence', pronouncing...")
                        ttsHelper?.speak(sentence)
                    }
                }
                // Check if user just typed a space (finished typing a word)
                else if (currentText.isNotEmpty() && currentText.endsWith(" ") && !lastText.endsWith(" ")) {
                    // Extract the last complete word (before the space)
                    // "hello world " -> trim -> "hello world" -> split -> ["hello", "world"]
                    val words = currentText.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
                    val lastWord = words.lastOrNull()  // Get the last word: "world"

                    if (!lastWord.isNullOrEmpty() && lastWord.length > 1) {
                        Logger.d("User finished typing word in answer: '$lastWord', pronouncing...")
                        ttsHelper?.speak(lastWord)
                    }
                }

                lastText = currentText
            }
        })
    }

    /**
     * Pronounce the current vocabulary word
     */
    private fun pronounceCurrentWord() {
        val word = currentVocabulary?.vocabulary?.word
        if (!word.isNullOrEmpty()) {
            Logger.d("Pronouncing word: $word")
            ttsHelper?.speak(word)
            Toast.makeText(context, "🔊 Đang phát âm: $word", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Timer đếm LÊN: Cập nhật UI mỗi giây để hiển thị thời gian đã học
     */
    private fun startUIUpdateTimer() {
        // Hủy timer cũ nếu có
        updateUIRunnable?.let { handler.removeCallbacks(it) }

        // Tạo runnable mới
        updateUIRunnable = object : Runnable {
            override fun run() {
                if (_binding == null) return // Fragment bị destroy

                // Lấy thời gian đã học từ LearningProgressManager
                val elapsed = LearningProgressManager.formatElapsedTime()
                val elapsedMinutes = LearningProgressManager.getElapsedMinutes()

                binding.textCountdown.text = "⏱️ $elapsed"

                // Đổi màu theo số phút đã học (mỗi 10 phút = 1 từ)
                val color = when {
                    elapsedMinutes < 10 -> "#4CAF50" // Green: < 10min (chưa đủ 1 từ)
                    elapsedMinutes < 60 -> "#2196F3" // Blue: 10-60min (1-6 từ)
                    elapsedMinutes < 120 -> "#FF9800" // Orange: 1-2h (6-12 từ)
                    else -> "#F44336" // Red: > 2h (>12 từ)
                }
                binding.textCountdown.setTextColor(android.graphics.Color.parseColor(color))

                // Cập nhật mục tiêu động mỗi giây
                updateDailyGoalUI()

                // Lặp lại sau 1 giây
                handler.postDelayed(this, 1000)
            }
        }

        // Bắt đầu timer
        handler.post(updateUIRunnable!!)
        Logger.d("⏱️ UI update timer started (counting UP)")
    }

    /**
     * Timer tự động sync lên server mỗi 30 giây
     */
    private fun startAutoSyncTimer() {
        // Hủy timer cũ nếu có
        autoSyncRunnable?.let { handler.removeCallbacks(it) }

        // Tạo runnable mới
        autoSyncRunnable = object : Runnable {
            override fun run() {
                if (_binding == null) return // Fragment bị destroy

                Logger.d("🔄 [Auto-Sync] Syncing progress to Appwrite...")
                lifecycleScope.launch {
                    try {
                        val result = LearningProgressManager.syncToAppwrite(requireContext())
                        if (result.isSuccess) {
                            Logger.d("✅ [Auto-Sync] Sync successful")
                        } else {
                            Logger.e("❌ [Auto-Sync] Sync failed: ${result.exceptionOrNull()?.message}")
                        }
                    } catch (e: Exception) {
                        Logger.e("❌ [Auto-Sync] Exception: ${e.message}", e)
                    }
                }

                // Lặp lại sau 30 giây
                handler.postDelayed(this, 30000)
            }
        }

        // Bắt đầu timer
        handler.post(autoSyncRunnable!!)
        Logger.d("🔄 Auto-sync timer started (every 30s)")
    }

    private fun showLevelDetailsDialog() {
        val level = LearningProgressManager.getLevel()
        val details = LearningProgressManager.getProgressDetails()

        AlertDialog.Builder(requireContext())
            .setTitle("Thống kê học tập")
            .setMessage("$level\n\n$details")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun updateDailyGoalUI() {
        // Lấy thông tin từ LearningProgressManager
        val wordsLearned = LearningProgressManager.getWordsLearned()
        val currentGoal = LearningProgressManager.getCurrentGoal()
        val debt = LearningProgressManager.getDebt()
        val progressPercentage = LearningProgressManager.getProgressPercentage()

        // Hiển thị mục tiêu và tiến độ
        binding.textDailyGoal.text = "$wordsLearned/$currentGoal từ"

        // Hiển thị thanh tiến trình
        binding.progressBarDaily.visibility = View.VISIBLE
        binding.progressBarDaily.progress = progressPercentage

        // Cập nhật level
        val level = LearningProgressManager.getLevel()
        binding.textLevel.text = "$level ($wordsLearned từ)"

        // Cập nhật thông tin nợ
        if (debt > 0) {
            binding.textDailyProgress.text = "⚠️ Còn thiếu $debt từ! Hãy cố gắng lên!"
        } else {
            binding.textDailyProgress.text = "🎉 Đã hoàn thành mục tiêu! Tiếp tục phát huy!"
        }
    }

    private fun showDailyGoalDialog() {
        val wordsLearned = LearningProgressManager.getWordsLearned()
        val currentGoal = LearningProgressManager.getCurrentGoal()
        val debt = LearningProgressManager.getDebt()
        val progressPercentage = LearningProgressManager.getProgressPercentage()
        val elapsed = LearningProgressManager.formatElapsedTime()
        val elapsedMinutes = LearningProgressManager.getElapsedMinutes()

        AlertDialog.Builder(requireContext())
            .setTitle("Tiến độ học tập")
            .setMessage(
                "📊 Mục tiêu hiện tại: $currentGoal từ\n" +
                "📚 Đã hoàn thành: $wordsLearned từ\n" +
                "📈 Tiến độ: $progressPercentage%\n" +
                (if (debt > 0) "⚠️ Còn thiếu: $debt từ\n" else "🎉 Đã hoàn thành mục tiêu!\n") +
                "⏱️ Thời gian: $elapsed (${String.format("%.1f", elapsedMinutes)} phút)\n\n" +
                "💡 Quy tắc:\n" +
                "• Mỗi 5 phút → mục tiêu tăng 1 từ\n" +
                "• Tương đương 12 từ/giờ\n" +
                "• Nếu không học → nợ tích lũy VÔ HẠN!\n" +
                "• Tự động đồng bộ lên server mỗi 30 giây"
            )
            .setPositiveButton("OK", null)
            .setNeutralButton("Test Appwrite") { _, _ ->
                testAppwriteConnection()
            }
            .show()
    }

    private fun testAppwriteConnection() {
        lifecycleScope.launch {
            try {
                Toast.makeText(context, "Đang test kết nối Appwrite...", Toast.LENGTH_SHORT).show()
                val result = LearningProgressManager.testAppwriteConnection(requireContext())
                if (result.isSuccess) {
                    AlertDialog.Builder(requireContext())
                        .setTitle("✅ Kết nối thành công")
                        .setMessage(result.getOrNull() ?: "OK")
                        .setPositiveButton("OK", null)
                        .show()
                } else {
                    val error = result.exceptionOrNull()
                    AlertDialog.Builder(requireContext())
                        .setTitle("❌ Lỗi kết nối")
                        .setMessage("${error?.message}\n\nChi tiết:\n${error?.stackTraceToString()}")
                        .setPositiveButton("OK", null)
                        .show()
                }
            } catch (e: Exception) {
                AlertDialog.Builder(requireContext())
                    .setTitle("❌ Exception")
                    .setMessage(e.stackTraceToString())
                    .setPositiveButton("OK", null)
                    .show()
            }
        }
    }

    private var selectedCategory: String = "GENERAL"

    private fun buildLearningQueueAndStart(category: String = selectedCategory) {
        selectedCategory = category
        Logger.d("🏗️ Building learning queue with PERSISTENT 30-word focus for category: $category")
        Logger.d("   📍 Called from: ${Thread.currentThread().stackTrace[3].methodName}")

        lifecycleScope.launch {
            try {
                val list = database.vocabularyWithExamplesDao()
                    .getAllVocabulariesWithExamples()
                    .first()

                Logger.d("📊 Total vocabularies: ${list.size}")

                // Filter by category AND examples
                val filtered = list.filter {
                    it.examples.isNotEmpty() && it.vocabulary.category == category
                }
                Logger.d("Filtered vocabularies with examples: ${filtered.size}")

                if (filtered.isEmpty()) {
                    Logger.d("No vocabularies with examples found")
                    learningQueue.clear()
                    currentIndex = -1
                    saveFocusedWordsToPrefs(emptyList())
                    loadNextFromQueue()
                    return@launch
                }

                // Load saved focused words from SharedPreferences
                val savedWordIds = loadFocusedWordsFromPrefs()
                Logger.d("Loaded ${savedWordIds.size} saved word IDs from preferences: $savedWordIds")

                val selected = if (savedWordIds.isNotEmpty()) {
                    // Use saved words if available
                    Logger.d("📚 Using SAVED focused words from SharedPreferences")
                    val vocabMap = filtered.associateBy { it.vocabulary.id }
                    val restoredWords = savedWordIds.mapNotNull { vocabMap[it] }

                    Logger.d("Restored ${restoredWords.size} words from preferences:")
                    restoredWords.forEach {
                        Logger.d("  ✓ ${it.vocabulary.word} (ID=${it.vocabulary.id})")
                    }

                    // If some words are missing (deleted), fill up to 30 words
                    if (restoredWords.size < 30) {
                        val existingIds = restoredWords.map { it.vocabulary.id }.toSet()
                        val additionalWords = filtered
                            .filter { it.vocabulary.id !in existingIds }
                            .sortedWith(compareBy<VocabularyWithExamples> { if (it.vocabulary.totalAttempts == 0) 0 else 1 }
                                .thenByDescending { if (it.vocabulary.totalAttempts == 0) it.vocabulary.createdAt else 0L }
                                .thenBy { it.vocabulary.memoryScore }
                                .thenBy { it.vocabulary.lastStudiedAt }
                                .thenByDescending { it.vocabulary.createdAt })
                            .take(30 - restoredWords.size)

                        Logger.d("Added ${additionalWords.size} additional words to reach 30")
                        (restoredWords + additionalWords).shuffled()
                    } else {
                        restoredWords.take(30).shuffled()
                    }
                } else {
                    // First time: Select 30 words with lowest memoryScore, then shuffle
                    // Prioritize never-studied words (totalAttempts == 0) first, newest first
                    Logger.d("🆕 FIRST TIME setup: selecting 30 words (prioritizing never-studied, then lowest memoryScore)")
                    filtered
                        .sortedWith(compareBy<VocabularyWithExamples> { if (it.vocabulary.totalAttempts == 0) 0 else 1 }
                            .thenByDescending { if (it.vocabulary.totalAttempts == 0) it.vocabulary.createdAt else 0L }
                            .thenBy { it.vocabulary.memoryScore }
                            .thenBy { it.vocabulary.lastStudiedAt }
                            .thenByDescending { it.vocabulary.createdAt })
                        .take(30)
                        .shuffled()
                }

                Logger.d("Selected ${selected.size} vocabularies for FOCUSED learning:")
                selected.forEach {
                    Logger.d("  - ${it.vocabulary.word}: memoryScore=${String.format("%.1f", it.vocabulary.memoryScore)}%, correct=${it.vocabulary.correctAttempts}/${it.vocabulary.totalAttempts}")
                }

                // Log examples for the 30 selected words
                Logger.d("list examples", "📚 Listing examples for ${selected.size} focused words:")
                selected.forEachIndexed { index, vocabWithExamples ->
                    val word = vocabWithExamples.vocabulary.word
                    val examples = vocabWithExamples.examples
                    Logger.d("list examples", "[${index + 1}/${selected.size}] '$word' has ${examples.size} example(s)")
                    examples.forEachIndexed { exIndex, example ->
                        val sentences = ExampleUtils.jsonToSentences(example.sentences)
                        Logger.d("list examples", "  Ex${exIndex + 1}: Vietnamese='${example.vietnamese}' (${sentences.size} English variant(s))")
                        sentences.forEachIndexed { sIndex, sentence ->
                            Logger.d("list examples", "    ↳ ${sIndex + 1}. \"$sentence\"")
                        }
                    }
                }

                learningQueue.clear()
                learningQueue.addAll(selected)

                // Validate: Check for duplicates
                val queueIds = learningQueue.map { it.vocabulary.id }
                val uniqueIds = queueIds.toSet()
                if (queueIds.size != uniqueIds.size) {
                    Logger.e("❌ DUPLICATE DETECTED in queue! IDs: $queueIds")
                    // Remove duplicates by keeping only unique words
                    val uniqueWords = learningQueue.distinctBy { it.vocabulary.id }
                    learningQueue.clear()
                    learningQueue.addAll(uniqueWords)
                    Logger.d("✅ Duplicates removed. New queue size: ${learningQueue.size}")
                }

                // Save to SharedPreferences
                saveFocusedWordsToPrefs(learningQueue.map { it.vocabulary.id })

                Logger.d("Final queue size: ${learningQueue.size}, words: ${learningQueue.joinToString { it.vocabulary.word }}")
                currentIndex = -1

                // Update word queue UI before loading first word
                updateWordQueueUI()

                loadNextFromQueue()
            } catch (ce: CancellationException) {
                Logger.d("Queue build cancelled")
            } catch (e: Exception) {
                Logger.e("Error building queue", e)
                if (isAdded) {
                    Toast.makeText(context, "Lỗi khi tải danh sách học", Toast.LENGTH_SHORT).show()
                    showNoVocabularyMessage()
                }
            }
        }
    }

    private fun saveFocusedWordsToPrefs(wordIds: List<Long>) {
        val prefs = requireContext().getSharedPreferences("learning_focus", Context.MODE_PRIVATE)

        // Ensure no duplicates before saving
        val uniqueIds = wordIds.distinct()
        if (wordIds.size != uniqueIds.size) {
            Logger.e("❌ Attempted to save DUPLICATE IDs to SharedPreferences! Original: $wordIds")
            Logger.d("✅ Saving only unique IDs: $uniqueIds")
        }

        val idsString = uniqueIds.joinToString(",")
        prefs.edit().putString("focused_word_ids", idsString).apply()
        Logger.d("💾 Saved focused words to prefs (${uniqueIds.size} words): $idsString")
    }

    private fun loadFocusedWordsFromPrefs(): List<Long> {
        val prefs = requireContext().getSharedPreferences("learning_focus", Context.MODE_PRIVATE)
        val idsString = prefs.getString("focused_word_ids", "") ?: ""
        return if (idsString.isNotEmpty()) {
            val ids = idsString.split(",").mapNotNull { it.toLongOrNull() }
            // Remove duplicates from saved preferences
            val uniqueIds = ids.distinct()
            if (ids.size != uniqueIds.size) {
                Logger.e("❌ DUPLICATE IDs found in SharedPreferences! Original: $ids")
                Logger.d("✅ Cleaned to unique IDs: $uniqueIds")
                // Save cleaned IDs back to preferences
                saveFocusedWordsToPrefs(uniqueIds)
            }
            uniqueIds
        } else {
            emptyList()
        }
    }

    private suspend fun replaceWordInQueue(completedVocabId: Long) {
        try {
            Logger.d("🔄 replaceWordInQueue: Starting replacement for vocab ID=$completedVocabId")

            // Get all vocabularies
            val allWords = database.vocabularyWithExamplesDao()
                .getAllVocabulariesWithExamples()
                .first()
                .filter { it.examples.isNotEmpty() }

            Logger.d("📚 Total available words: ${allWords.size}")

            // Find replacement: word with lowest memoryScore that is NOT in current queue
            val currentQueueIds = learningQueue.map { it.vocabulary.id }.toSet()
            Logger.d("🎯 Current queue IDs: $currentQueueIds")

            // Log current queue words for debugging
            learningQueue.forEachIndexed { index, vocab ->
                Logger.d("   Queue[$index]: ${vocab.vocabulary.word} (ID=${vocab.vocabulary.id}, score=${String.format("%.1f", vocab.vocabulary.memoryScore)}%)")
            }

            val candidateWords = allWords.filter { it.vocabulary.id !in currentQueueIds }
            Logger.d("🔍 Candidate words (not in queue): ${candidateWords.size}")

            // Log top 5 candidates for debugging
            candidateWords.take(5).forEachIndexed { index, vocab ->
                Logger.d("   Candidate[$index]: ${vocab.vocabulary.word} (ID=${vocab.vocabulary.id}, score=${String.format("%.1f", vocab.vocabulary.memoryScore)}%)")
            }

            val replacement = candidateWords
                .sortedWith(compareBy<VocabularyWithExamples> { if (it.vocabulary.totalAttempts == 0) 0 else 1 }
                    .thenByDescending { if (it.vocabulary.totalAttempts == 0) it.vocabulary.createdAt else 0L }
                    .thenBy { it.vocabulary.memoryScore }
                    .thenBy { it.vocabulary.lastStudiedAt }
                    .thenByDescending { it.vocabulary.createdAt })
                .firstOrNull()

            if (replacement != null) {
                Logger.d("✅ Found replacement: '${replacement.vocabulary.word}' (memoryScore=${String.format("%.1f", replacement.vocabulary.memoryScore)}%)")

                // Find position of old word in queue
                val oldIndex = learningQueue.indexOfFirst { it.vocabulary.id == completedVocabId }
                Logger.d("📍 Old word position in queue: $oldIndex")

                if (oldIndex >= 0) {
                    val oldWord = learningQueue[oldIndex].vocabulary.word
                    learningQueue[oldIndex] = replacement
                    Logger.d("🔄 Replaced '$oldWord' → '${replacement.vocabulary.word}' at position $oldIndex")

                    // Validate: Check for duplicates after replacement
                    val queueIds = learningQueue.map { it.vocabulary.id }
                    val uniqueIds = queueIds.toSet()
                    if (queueIds.size != uniqueIds.size) {
                        Logger.e("❌ DUPLICATE DETECTED after replacement! IDs: $queueIds")
                        // This should never happen, but if it does, log error
                        Logger.e("   Replacement word: ${replacement.vocabulary.word} (ID=${replacement.vocabulary.id})")
                        Logger.e("   Queue words: ${learningQueue.joinToString { "${it.vocabulary.word}(${it.vocabulary.id})" }}")

                        // Remove duplicates
                        val uniqueWords = learningQueue.distinctBy { it.vocabulary.id }
                        learningQueue.clear()
                        learningQueue.addAll(uniqueWords)
                        Logger.d("✅ Duplicates removed after replacement. New queue size: ${learningQueue.size}")
                    }

                    // Update SharedPreferences with new queue (SINGLE SOURCE OF TRUTH)
                    val newQueueIds = learningQueue.map { it.vocabulary.id }
                    saveFocusedWordsToPrefs(newQueueIds)
                    Logger.d("💾 Updated SharedPreferences with new queue: $newQueueIds")

                    // Update word queue UI
                    withContext(Dispatchers.Main) {
                        updateWordQueueUI()
                    }

                    // Show notification to user
                    withContext(Dispatchers.Main) {
                        if (isAdded) {
                            Toast.makeText(
                                requireContext(),
                                "🎉 '$oldWord' đạt >70%! Thay bằng: '$${replacement.vocabulary.word}'",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                } else {
                    Logger.e("❌ Old word ID=$completedVocabId not found in queue!")
                }
            } else {
                Logger.d("⚠️ No replacement word available (all words in queue or no more words)")
                withContext(Dispatchers.Main) {
                    if (isAdded) {
                        Toast.makeText(
                            requireContext(),
                            "🎉 Tuyệt vời! Bạn đã học hết tất cả các từ!",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        } catch (e: Exception) {
            Logger.e("❌ Failed to replace word in queue: ${e.message}", e)
            e.printStackTrace()
        }
    }

    // DEPRECATED: No longer used - buildLearningQueueAndStart() loads from SharedPreferences
    // private fun restoreQueueFromSession() { ... }

    private fun getLearningSettings(): Pair<Int, Int> {
        val prefs = requireContext().getSharedPreferences("learn_settings", Context.MODE_PRIVATE)
        val nOldest = prefs.getInt("n_oldest", 3)
        val mNewest = prefs.getInt("m_newest", 2)
        return nOldest to mNewest
    }

    private fun loadNextFromQueue() {
        if (!isAdded || _binding == null) return
        if (learningQueue.isEmpty()) {
            if (isAdded && _binding != null) showNoVocabularyMessage()
            return
        }

        // Simply cycle through the queue without checking completion status
        currentIndex = (currentIndex + 1) % learningQueue.size
        val vocabulary = learningQueue[currentIndex]

        currentVocabulary = vocabulary
        completedVietnamese.clear()
        isVocabularyCompleted = false
        // Count unique Vietnamese sentences (multiple English translations = 1 sentence)
        totalSentences = vocabulary.examples.map { it.vietnamese }.distinct().size
        Logger.d("Load from queue: ${vocabulary.vocabulary.word} (${currentIndex + 1}/${learningQueue.size}), total unique Vietnamese sentences=$totalSentences")
        updateUI()
    }

    private fun showSettingsDialog() {
        val (currentN, currentM) = getLearningSettings()
        val context = requireContext()
        val container = LayoutInflater.from(context).inflate(R.layout.simple_settings_dialog, null)
        val inputN = container.findViewById<EditText>(R.id.inputN)
        val inputM = container.findViewById<EditText>(R.id.inputM)
        inputN.setText(currentN.toString())
        inputM.setText(currentM.toString())

        AlertDialog.Builder(context)
            .setTitle("Cài đặt chế độ học")
            .setView(container)
            .setPositiveButton("Lưu") { _, _ ->
                val n = inputN.text.toString().toIntOrNull()?.coerceAtLeast(0) ?: currentN
                val m = inputM.text.toString().toIntOrNull()?.coerceAtLeast(0) ?: currentM
                val prefs = context.getSharedPreferences("learn_settings", Context.MODE_PRIVATE)
                prefs.edit().putInt("n_oldest", n).putInt("m_newest", m).apply()
                buildLearningQueueAndStart()
            }
            .setNegativeButton("Hủy", null)
            .show()
    }

    private fun updateUI() {
        val vocabulary = currentVocabulary ?: return

        binding.textWord.text = vocabulary.vocabulary.word

        // Find the NEXT uncompleted example to display its Vietnamese meaning
        val nextUncompletedExample = vocabulary.examples.firstOrNull { example ->
            !completedVietnamese.contains(example.vietnamese)
        }

        // If all examples are completed, show the first one (or could show "Completed!")
        val vi = if (nextUncompletedExample != null) {
            nextUncompletedExample.vietnamese.orEmpty()
        } else {
            vocabulary.examples.firstOrNull()?.vietnamese.orEmpty()
        }

        Logger.d("Bind header: word='${vocabulary.vocabulary.word}', showing Vietnamese='$vi', completed=${completedVietnamese.size}/$totalSentences")
        binding.textWordVi.text = vi

        // Update examples info
        binding.textExamplesInfo.text = "Có $totalSentences câu ví dụ cho bản dịch này"
        binding.editTextAnswer.text?.clear()

        // Display sentence completion progress (track by unique Vietnamese sentences)
        val vocab = vocabulary.vocabulary

        val progressText = if (isVocabularyCompleted) {
            "✅ Hoàn thành: $totalSentences/$totalSentences câu | Độ nhớ: ${vocab.correctAttempts}/${vocab.totalAttempts} đúng"
        } else {
            "${completedVietnamese.size}/$totalSentences câu | Độ nhớ: ${vocab.correctAttempts}/${vocab.totalAttempts} đúng"
        }
        binding.textProgress.text = progressText

        val allDone = isVocabularyCompleted
        binding.buttonCheck.isEnabled = !allDone
        binding.buttonNext.isEnabled = allDone
        binding.buttonSkip.isEnabled = true

        // Hide error details card
        binding.cardErrorDetails.visibility = android.view.View.GONE

        // Update daily goal UI
        updateDailyGoalUI()

        // Update word queue UI
        updateWordQueueUI()

        // Auto-pronounce the word when loading new vocabulary
        val word = vocabulary.vocabulary.word
        Logger.d("Auto-pronouncing word: $word")
        // Delay to let UI update first
        binding.root.postDelayed({
            ttsHelper?.speak(word)
        }, 300)

        Logger.d("UI updated for vocabulary: ${vocabulary.vocabulary.word}")
    }

    private fun checkAnswer() {
        val vocabulary = currentVocabulary ?: return
        val rawUser = binding.editTextAnswer.text.toString()
        val userAnswer = normalize(rawUser)

        if (userAnswer.isEmpty()) {
            binding.editTextAnswer.error = "Vui lòng nhập câu trả lời"
            return
        }

        Logger.d("Checking answer: $userAnswer")
        Logger.d("Available examples: ${vocabulary.examples.size}")
        Logger.d("Already completed Vietnamese: ${completedVietnamese.size}/$totalSentences")

        // FIXED: Find the CURRENT example being displayed (first uncompleted Vietnamese)
        val currentDisplayedExample = vocabulary.examples.firstOrNull { example ->
            !completedVietnamese.contains(example.vietnamese)
        }

        if (currentDisplayedExample == null) {
            Logger.d("⚠️ No uncompleted examples available")
            Toast.makeText(context, "Không có ví dụ nào để hoàn thành", Toast.LENGTH_SHORT).show()
            return
        }

        val currentVietnamese = currentDisplayedExample.vietnamese
        val currentSentences = ExampleUtils.jsonToSentences(currentDisplayedExample.sentences)
        Logger.d("Current displayed example: vietnamese='$currentVietnamese', ${currentSentences.size} English translations")

        // Check if user answer matches the CURRENT displayed example
        val matchesCurrentExample = ExampleUtils.matchesAnySentence(userAnswer, currentSentences)

        // Also check if user answer matches ANY OTHER example (to warn them)
        var matchedOtherExample: com.example.specialenglishlearningapp.data.Example? = null
        for (example in vocabulary.examples) {
            if (example.id == currentDisplayedExample.id) continue // Skip current example

            val sentences = ExampleUtils.jsonToSentences(example.sentences)
            if (ExampleUtils.matchesAnySentence(userAnswer, sentences)) {
                matchedOtherExample = example
                Logger.d("User answered a different example: vietnamese='${example.vietnamese}'")
                break
            }
        }

        // Handle the different cases
        var matchedExample: com.example.specialenglishlearningapp.data.Example? = null
        var isNewVietnamese = false

        if (matchesCurrentExample) {
            // User correctly answered the current displayed example
            matchedExample = currentDisplayedExample
            isNewVietnamese = true // Always true because we filtered for uncompleted
            Logger.d("✅ User answered the current displayed example correctly")
        } else if (matchedOtherExample != null) {
            // User answered a different example (either completed or not yet displayed)
            val isCompleted = completedVietnamese.contains(matchedOtherExample.vietnamese)
            if (isCompleted) {
                Logger.d("⚠️ User answered an already completed example: '${matchedOtherExample.vietnamese}'")
                Toast.makeText(context, "⚠️ Bạn đã hoàn thành câu này rồi! Hãy trả lời câu đang hiển thị: '$currentVietnamese'", Toast.LENGTH_LONG).show()
            } else {
                Logger.d("⚠️ User answered a different example (not current): '${matchedOtherExample.vietnamese}'")
                Toast.makeText(context, "⚠️ Hãy trả lời câu đang hiển thị: '$currentVietnamese'", Toast.LENGTH_LONG).show()
            }
            binding.editTextAnswer.text?.clear()
            binding.cardErrorDetails.visibility = android.view.View.GONE
            return
        }
        // If neither matchesCurrentExample nor matchedOtherExample: it's a wrong answer

        if (matchedExample != null && isNewVietnamese) {
            // Correct answer - add this Vietnamese sentence to completed set
            completedVietnamese.add(matchedExample.vietnamese)
            Logger.d("✅ Correct! Completed Vietnamese: '${matchedExample.vietnamese}' (${completedVietnamese.size}/$totalSentences)")

            // Check if ALL unique Vietnamese sentences are completed
            isVocabularyCompleted = (completedVietnamese.size >= totalSentences)

            lifecycleScope.launch {
                Logger.d("📚 Sentence completed! Incrementing words learned counter...")
                LearningProgressManager.addCompletedVocabulary(requireContext())
                withContext(Dispatchers.Main) {
                    updateDailyGoalUI()
                }
            }

            // Update learning statistics in database (each correct sentence = 1 correct attempt)
            lifecycleScope.launch {
                try {
                    val currentStats = vocabulary.vocabulary
                    val newTotalAttempts = currentStats.totalAttempts + 1
                    val newCorrectAttempts = currentStats.correctAttempts + 1
                    val newMemoryScore = (newCorrectAttempts.toFloat() / newTotalAttempts) * 100

                    // Update last 10 attempts with correct answer
                    val newLast10Attempts = updateLast10Attempts(currentStats.last10Attempts, true)

                    database.vocabularyDao().updateLearningStatsWithLast10(
                        currentStats.id,
                        newTotalAttempts,
                        newCorrectAttempts,
                        newMemoryScore,
                        newLast10Attempts
                    )

                    // Refresh currentVocabulary from database to get updated stats
                    val updatedVocabulary = database.vocabularyWithExamplesDao()
                        .getAllVocabulariesWithExamples()
                        .first()
                        .find { it.vocabulary.id == currentStats.id }

                    if (updatedVocabulary != null) {
                        // Update the vocabulary in learning queue
                        val queueIndex = learningQueue.indexOfFirst { it.vocabulary.id == currentStats.id }
                        if (queueIndex >= 0) {
                            learningQueue[queueIndex] = updatedVocabulary
                        }
                        currentVocabulary = updatedVocabulary
                    }

                    Logger.d("Updated learning stats: total=$newTotalAttempts, correct=$newCorrectAttempts, memoryScore=${String.format("%.1f", newMemoryScore)}%")

                    // Update progress text
                    val progressText = if (isVocabularyCompleted) {
                        "✅ Hoàn thành: $totalSentences/$totalSentences câu | Độ nhớ: $newCorrectAttempts/$newTotalAttempts đúng"
                    } else {
                        "${completedVietnamese.size}/$totalSentences câu | Độ nhớ: $newCorrectAttempts/$newTotalAttempts đúng"
                    }
                    binding.textProgress.text = progressText

                    // Check if ALL sentences are done AND >= 70% accuracy with at least 10 attempts
                    if (isVocabularyCompleted && updatedVocabulary?.vocabulary?.hasPassed() == true) {
                        Logger.d("✅ Word '${currentStats.word}' COMPLETED all sentences with 70%+ accuracy (${String.format("%.1f", newMemoryScore)}%), REPLACING...")
                        // Replace word in queue (wordsLearned already incremented per sentence)
                        lifecycleScope.launch {
                            replaceWordInQueue(currentStats.id)
                        }
                    } else if (isVocabularyCompleted && newTotalAttempts < 10) {
                        Logger.d("⏳ Word '${currentStats.word}' completed all sentences but only $newTotalAttempts/10 attempts, need more practice")
                    } else if (isVocabularyCompleted) {
                        Logger.d("⏳ Word '${currentStats.word}' completed all sentences but <70% accuracy ($newCorrectAttempts/$newTotalAttempts), keeping in queue")
                    }

                    // Update word queue UI to reflect new memory score
                    updateWordQueueUI()

                    // Update Vietnamese meaning to show next uncompleted example
                    val nextUncompletedExample = vocabulary.examples.firstOrNull { example ->
                        !completedVietnamese.contains(example.vietnamese)
                    }
                    val vi = if (nextUncompletedExample != null) {
                        nextUncompletedExample.vietnamese.orEmpty()
                    } else {
                        vocabulary.examples.firstOrNull()?.vietnamese.orEmpty()
                    }
                    binding.textWordVi.text = vi
                    Logger.d("Updated Vietnamese meaning after correct answer: '$vi'")
                } catch (e: Exception) {
                    Logger.e("Failed to update learning stats", e)
                }
            }

            binding.editTextAnswer.text?.clear()
            binding.editTextAnswer.error = null

            // Hide error details
            binding.cardErrorDetails.visibility = android.view.View.GONE

            if (isVocabularyCompleted) {
                // ALL sentences completed - enable Next button
                Logger.d("🎉 Vocabulary FULLY completed: ${vocabulary.vocabulary.word} ($totalSentences/$totalSentences sentences)")
                Toast.makeText(context, "🎉 Hoàn thành tất cả câu! Từ '${vocabulary.vocabulary.word}' đã xong", Toast.LENGTH_LONG).show()
                binding.buttonNext.isEnabled = true
                binding.buttonCheck.isEnabled = false

                // Auto-advance to next vocabulary after a short delay
                binding.root.postDelayed({
                    Logger.d("Auto-advancing to next vocabulary")
                    loadNextFromQueue()
                }, 2000)
            } else {
                // Still have more Vietnamese sentences to complete
                Logger.d("✅ Correct! ${completedVietnamese.size}/$totalSentences completed. Continue...")
                Toast.makeText(context, "✅ Đúng rồi! Còn ${totalSentences - completedVietnamese.size} câu nữa", Toast.LENGTH_SHORT).show()
                binding.buttonCheck.isEnabled = true
                binding.buttonNext.isEnabled = false
            }
        } else if (matchedExample != null && !isNewVietnamese) {
            // User answered a Vietnamese sentence they already completed before
            Logger.d("⚠️ Already completed this Vietnamese: '${matchedExample.vietnamese}'")
            Toast.makeText(context, "⚠️ Bạn đã hoàn thành câu này rồi! Hãy thử câu khác (${completedVietnamese.size}/$totalSentences)", Toast.LENGTH_LONG).show()
            binding.editTextAnswer.text?.clear()
            binding.cardErrorDetails.visibility = android.view.View.GONE
        } else {
            // Wrong answer - check if similarity is 100% due to unicode/apostrophe differences
            Logger.d("❌ Wrong answer: $userAnswer")
            // FIXED: Compare with CURRENT displayed example, not all examples
            val sentences = ExampleUtils.jsonToSentences(currentDisplayedExample.sentences)
            val bestSentence = ExampleUtils.findBestMatch(userAnswer, sentences) ?: sentences.first()
            val percent = calculateSimilarity(userAnswer, bestSentence)

            if (percent == 100) {
                // Treat as correct (100% similarity, likely unicode difference)
                // This should not happen because we already checked for exact match
                // But keep this for safety (e.g., unicode normalization issues)
                Logger.d("⚠️ [100% similarity] This shouldn't happen - exact match should be caught earlier!")

                completedVietnamese.add(currentDisplayedExample.vietnamese)
                isVocabularyCompleted = (completedVietnamese.size >= totalSentences)
                Logger.d("✅ [100% similarity] Correct! Completed Vietnamese: '${currentDisplayedExample.vietnamese}' (${completedVietnamese.size}/$totalSentences)")

                lifecycleScope.launch {
                    Logger.d("📚 [100% similarity] Sentence completed! Incrementing words learned counter...")
                    LearningProgressManager.addCompletedVocabulary(requireContext())
                    withContext(Dispatchers.Main) {
                        updateDailyGoalUI()
                    }
                }

                // Update learning statistics
                lifecycleScope.launch {
                    try {
                        val currentStats = vocabulary.vocabulary
                        val newTotalAttempts = currentStats.totalAttempts + 1
                        val newCorrectAttempts = currentStats.correctAttempts + 1
                        val newMemoryScore = (newCorrectAttempts.toFloat() / newTotalAttempts) * 100

                        // Update last 10 attempts with correct answer
                        val newLast10Attempts = updateLast10Attempts(currentStats.last10Attempts, true)

                        database.vocabularyDao().updateLearningStatsWithLast10(
                            currentStats.id,
                            newTotalAttempts,
                            newCorrectAttempts,
                            newMemoryScore,
                            newLast10Attempts
                        )

                        val updatedVocabulary = database.vocabularyWithExamplesDao()
                            .getAllVocabulariesWithExamples()
                            .first()
                            .find { it.vocabulary.id == currentStats.id }

                        if (updatedVocabulary != null) {
                            val queueIndex = learningQueue.indexOfFirst { it.vocabulary.id == currentStats.id }
                            if (queueIndex >= 0) {
                                learningQueue[queueIndex] = updatedVocabulary
                            }
                            currentVocabulary = updatedVocabulary
                        }

                        Logger.d("Updated stats (100% similarity): total=$newTotalAttempts, correct=$newCorrectAttempts, memoryScore=${String.format("%.1f", newMemoryScore)}%")

                        val progressText = if (isVocabularyCompleted) {
                            "✅ Hoàn thành: $totalSentences/$totalSentences câu | Độ nhớ: $newCorrectAttempts/$newTotalAttempts đúng"
                        } else {
                            "${completedVietnamese.size}/$totalSentences câu | Độ nhớ: $newCorrectAttempts/$newTotalAttempts đúng"
                        }
                        binding.textProgress.text = progressText

                        if (isVocabularyCompleted && updatedVocabulary?.vocabulary?.hasPassed() == true) {
                            Logger.d("✅ [100% similarity] Word COMPLETED with 70%+ accuracy (${String.format("%.1f", newMemoryScore)}%), REPLACING...")
                            // Replace word in queue (wordsLearned already incremented per sentence)
                            lifecycleScope.launch {
                                replaceWordInQueue(currentStats.id)
                            }
                        } else if (isVocabularyCompleted && newTotalAttempts < 10) {
                            Logger.d("⏳ [100% similarity] Word completed but only $newTotalAttempts/10 attempts, need more practice")
                        }

                        updateWordQueueUI()

                        // Update Vietnamese meaning to show next uncompleted example
                        val nextUncompletedExample = vocabulary.examples.firstOrNull { example ->
                            !completedVietnamese.contains(example.vietnamese)
                        }
                        val vi = if (nextUncompletedExample != null) {
                            nextUncompletedExample.vietnamese.orEmpty()
                        } else {
                            vocabulary.examples.firstOrNull()?.vietnamese.orEmpty()
                        }
                        binding.textWordVi.text = vi
                        Logger.d("Updated Vietnamese meaning after correct answer (100% similarity): '$vi'")
                    } catch (e: Exception) {
                        Logger.e("Failed to update learning stats", e)
                    }
                }

                binding.editTextAnswer.text?.clear()
                binding.editTextAnswer.error = null
                binding.cardErrorDetails.visibility = View.GONE

                if (isVocabularyCompleted) {
                    Logger.d("🎉 [100% similarity] FULLY completed: ${vocabulary.vocabulary.word}")
                    Toast.makeText(context, "🎉 Hoàn thành tất cả câu! Từ '${vocabulary.vocabulary.word}' đã xong", Toast.LENGTH_LONG).show()
                    binding.buttonNext.isEnabled = true
                    binding.buttonCheck.isEnabled = false
                    binding.root.postDelayed({
                        loadNextFromQueue()
                    }, 2000)
                } else {
                    Toast.makeText(context, "✅ Đúng rồi! Còn ${totalSentences - completedVietnamese.size} câu nữa", Toast.LENGTH_SHORT).show()
                    binding.buttonCheck.isEnabled = true
                    binding.buttonNext.isEnabled = false
                }
                return
            } else {
                // Wrong answer - update total attempts but not correct attempts
                lifecycleScope.launch {
                    try {
                        val currentStats = vocabulary.vocabulary
                        val newTotalAttempts = currentStats.totalAttempts + 1
                        val newCorrectAttempts = currentStats.correctAttempts // No change
                        val newMemoryScore = if (newTotalAttempts > 0) {
                            (newCorrectAttempts.toFloat() / newTotalAttempts) * 100
                        } else 0f

                        // Update last 10 attempts with wrong answer
                        val newLast10Attempts = updateLast10Attempts(currentStats.last10Attempts, false)

                        database.vocabularyDao().updateLearningStatsWithLast10(
                            currentStats.id,
                            newTotalAttempts,
                            newCorrectAttempts,
                            newMemoryScore,
                            newLast10Attempts
                        )

                        // Refresh currentVocabulary from database to get updated stats
                        val updatedVocabulary = database.vocabularyWithExamplesDao()
                            .getAllVocabulariesWithExamples()
                            .first()
                            .find { it.vocabulary.id == currentStats.id }

                        if (updatedVocabulary != null) {
                            // Update the vocabulary in learning queue
                            val queueIndex = learningQueue.indexOfFirst { it.vocabulary.id == currentStats.id }
                            if (queueIndex >= 0) {
                                learningQueue[queueIndex] = updatedVocabulary
                            }
                            currentVocabulary = updatedVocabulary
                        }

                        Logger.d("Updated learning stats (wrong): total=$newTotalAttempts, correct=$newCorrectAttempts, memoryScore=${String.format("%.1f", newMemoryScore)}%")

                        // Update progress text (show Vietnamese progress + learning stats)
                        val progressText = "${completedVietnamese.size}/$totalSentences câu | Độ nhớ: $newCorrectAttempts/$newTotalAttempts đúng"
                        binding.textProgress.text = progressText
                    } catch (e: Exception) {
                        Logger.e("Failed to update learning stats", e)
                    }
                }
            }
            // FIXED: Use the current displayed example for error display
            // (already found at the beginning of checkAnswer())
            showDetailedError(userAnswer, listOf(currentDisplayedExample))
        }
    }

    private fun normalize(input: String): String {
        return input
            .trim()
            .replace('\u2019', '\'') // smart apostrophe to ASCII
            .replace("\u2018", "'")
            .replace("\u201C", "\"")
            .replace("\u201D", "\"")
            .replace(Regex("\\s+"), " ")
    }

    private fun showDetailedError(userAnswer: String, examples: List<com.example.specialenglishlearningapp.data.Example>) {
        Logger.d("Showing simplified error for: $userAnswer")

        // Find the example that the user is currently working on (the next uncompleted Vietnamese)
        val targetExample = currentVocabulary?.examples?.firstOrNull { example ->
            !completedVietnamese.contains(example.vietnamese)
        } ?: findClosestExample(userAnswer, examples)

        if (targetExample != null) {
            val sentences = ExampleUtils.jsonToSentences(targetExample.sentences)
            val bestSentence = ExampleUtils.findBestMatch(userAnswer, sentences) ?: sentences.first()
            val percent = calculateSimilarity(userAnswer, bestSentence)
            val comparison = com.example.specialenglishlearningapp.utils.StringComparator.compareStrings(
                userAnswer,
                bestSentence
            )
            Logger.d("Error detail: vocab='${currentVocabulary?.vocabulary?.word}', idx=${currentIndex + 1}/${learningQueue.size}, targetExampleId=${targetExample.id}, user='${userAnswer}', correct='${bestSentence}', percent=${percent}")
            Logger.d("Error detail breakdown: ${comparison.errorDetails}")

            // Show all correct answers for this example
            val allCorrectAnswers = sentences.joinToString("\n") { "• $it" }
            binding.textCorrectAnswer.text = "Tất cả đáp án đúng:\n$allCorrectAnswers\n\nSo sánh với câu gần nhất: ${comparison.correctAnswer}\n" + getString(R.string.match_percentage, percent)
            binding.textErrorDetails.text = comparison.errorDetails
            binding.textErrorDetails.visibility = View.VISIBLE
            
            // Show the card
            binding.cardErrorDetails.visibility = android.view.View.VISIBLE
            
            // Show message
            binding.editTextAnswer.error = getString(R.string.wrong_answer)
            Toast.makeText(context, "Sai rồi! Xem từ/dấu còn thiếu bên dưới", Toast.LENGTH_SHORT).show()
        } else {
            Logger.d("No example available for comparison. user='${userAnswer}' vocab='${currentVocabulary?.vocabulary?.word}'")
            binding.textErrorDetails.text = "Không tìm thấy ví dụ tương tự. Vui lòng kiểm tra lại từ vựng."
            binding.textErrorDetails.visibility = View.VISIBLE
            binding.textCorrectAnswer.text = "Các ví dụ có sẵn:\n${examples.joinToString("\n") { "• ${ExampleUtils.getFirstSentence(ExampleUtils.jsonToSentences(it.sentences))}" }}"
            binding.cardErrorDetails.visibility = android.view.View.VISIBLE
            binding.editTextAnswer.error = getString(R.string.wrong_answer)
        }
    }

    private fun findClosestExample(userAnswer: String, examples: List<com.example.specialenglishlearningapp.data.Example>): com.example.specialenglishlearningapp.data.Example? {
        if (examples.isEmpty()) return null
        
        // Simple similarity check - find example with most common characters
        var bestMatch: com.example.specialenglishlearningapp.data.Example? = null
        var bestScore = 0
        
        examples.forEach { example ->
            val sentences = ExampleUtils.jsonToSentences(example.sentences)
            val bestSentence = ExampleUtils.findBestMatch(userAnswer, sentences) ?: sentences.first()
            val score = calculateSimilarity(userAnswer, bestSentence)
            if (score > bestScore) {
                bestScore = score
                bestMatch = example
            }
        }
        
        return bestMatch
    }

    private fun calculateSimilarity(str1: String, str2: String): Int {
        val longer = if (str1.length > str2.length) str1 else str2
        val shorter = if (str1.length > str2.length) str2 else str1
        
        if (longer.isEmpty()) return 0
        
        val editDistance = levenshteinDistance(str1.lowercase(), str2.lowercase())
        return ((longer.length - editDistance).toFloat() / longer.length * 100).toInt()
    }

    private fun levenshteinDistance(s1: String, s2: String): Int {
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

    /**
     * Helper function to update last 10 attempts
     * @param currentAttempts Current last10Attempts JSON string
     * @param isCorrect Whether the current attempt is correct
     * @return New last10Attempts JSON string (max 10 items)
     */
    private fun updateLast10Attempts(currentAttempts: String, isCorrect: Boolean): String {
        val attempts = try {
            val jsonArray = org.json.JSONArray(currentAttempts)
            MutableList(jsonArray.length()) { index ->
                jsonArray.getBoolean(index)
            }
        } catch (e: Exception) {
            mutableListOf()
        }

        // Add new attempt
        attempts.add(isCorrect)

        // Keep only last 10
        while (attempts.size > 10) {
            attempts.removeAt(0)
        }

        // Convert back to JSON
        val jsonArray = org.json.JSONArray()
        attempts.forEach { jsonArray.put(it) }
        return jsonArray.toString()
    }

    private fun showNoVocabularyMessage() {
        _binding?.let { b ->
            b.textWord.text = getString(R.string.no_vocabulary)
            b.textProgress.text = "Chưa có từ vựng để học"
            b.textWordVi.text = ""
            b.textExamplesInfo.text = ""
            b.buttonCheck.isEnabled = false
            b.buttonNext.isEnabled = false
            b.buttonSkip.isEnabled = false
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()

        // Dọn dẹp tất cả timer
        updateUIRunnable?.let { handler.removeCallbacks(it) }
        autoSyncRunnable?.let { handler.removeCallbacks(it) }

        // Shutdown TTS
        ttsHelper?.shutdown()
        ttsHelper = null

        Logger.d("⏱️ All timers stopped and TTS shutdown")
        _binding = null
    }
}
