package com.example.specialenglishlearningapp.fragments

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.Vocabulary
import com.example.specialenglishlearningapp.utils.Logger
import com.google.android.flexbox.FlexboxLayout
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ReviewFragment : Fragment() {

    private lateinit var radioGroupCategory: RadioGroup
    private lateinit var textWordsCount: TextView
    private lateinit var flexboxMasteredWords: FlexboxLayout
    private lateinit var spinnerLength: Spinner
    private lateinit var editTextPrompt: EditText
    private lateinit var buttonGeneratePrompt: Button
    private lateinit var buttonCopyPrompt: Button

    private var selectedCategory: String = "GENERAL"
    private var learnedVocabs: List<Vocabulary> = emptyList()

    private val lengthOptions = listOf(
        LengthOption(3, "Ngắn - khoảng 3 câu"),
        LengthOption(5, "Vừa - khoảng 5 câu"),
        LengthOption(8, "Dài - khoảng 8 câu")
    )

    data class LengthOption(val sentences: Int, val label: String) {
        override fun toString(): String = label
    }

    data class ProcessedWordList(
        val processedWords: List<String>,
        val synonymGroups: List<List<String>>
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_review, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Initialize views
        radioGroupCategory = view.findViewById(R.id.radioGroupCategory)
        textWordsCount = view.findViewById(R.id.textWordsCount)
        flexboxMasteredWords = view.findViewById(R.id.flexboxMasteredWords)
        spinnerLength = view.findViewById(R.id.spinnerLength)
        editTextPrompt = view.findViewById(R.id.editTextPrompt)
        buttonGeneratePrompt = view.findViewById(R.id.buttonGeneratePrompt)
        buttonCopyPrompt = view.findViewById(R.id.buttonCopyPrompt)

        // Load saved category
        val prefs = requireContext().getSharedPreferences("review_prefs", Context.MODE_PRIVATE)
        selectedCategory = prefs.getString("selected_category", "GENERAL") ?: "GENERAL"
        setRadioButtonForCategory(selectedCategory)

        setupSpinner()
        setupListeners()
        loadData()
    }

    private fun setRadioButtonForCategory(category: String) {
        val radioId = when (category) {
            "GENERAL" -> R.id.radioGeneral
            "TOEIC" -> R.id.radioToeic
            "VSTEP" -> R.id.radioVstep
            "SPEAKING" -> R.id.radioSpeaking
            "WRITING" -> R.id.radioWriting
            else -> R.id.radioGeneral
        }
        radioGroupCategory.check(radioId)
    }

    private fun setupSpinner() {
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            lengthOptions
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerLength.adapter = adapter
        spinnerLength.setSelection(1) // Default to "Vừa - khoảng 5 câu"

        spinnerLength.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                generatePrompt()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun setupListeners() {
        radioGroupCategory.setOnCheckedChangeListener { _, checkedId ->
            selectedCategory = when (checkedId) {
                R.id.radioGeneral -> "GENERAL"
                R.id.radioToeic -> "TOEIC"
                R.id.radioVstep -> "VSTEP"
                R.id.radioSpeaking -> "SPEAKING"
                R.id.radioWriting -> "WRITING"
                else -> "GENERAL"
            }

            // Save preference
            requireContext().getSharedPreferences("review_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("selected_category", selectedCategory)
                .apply()

            loadData()
        }

        buttonGeneratePrompt.setOnClickListener {
            generatePrompt()
        }

        buttonCopyPrompt.setOnClickListener {
            copyPromptToClipboard()
        }
    }

    private fun loadData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val database = AppDatabase.getDatabase(requireContext())
                val allVocabs = database.vocabularyDao().getVocabulariesByCategory(selectedCategory).first()

                learnedVocabs = allVocabs.filter { vocab -> vocab.totalAttempts >= 1 }

                renderWords()
                generatePrompt()
            } catch (e: Exception) {
                Logger.e("Error loading learned vocabs: ${e.message}")
            }
        }
    }

    private fun renderWords() {
        flexboxMasteredWords.removeAllViews()

        if (learnedVocabs.isEmpty()) {
            textWordsCount.text = "(0 từ đã học trong nhóm này)"

            val emptyText = TextView(requireContext()).apply {
                text = "Hãy học ít nhất 1 lần ở tab Learn, sau đó quay lại đây để ôn bằng đoạn văn."
                setTextColor(0xFF777777.toInt())
                textSize = 13f
            }
            flexboxMasteredWords.addView(emptyText)
            return
        }

        val words = learnedVocabs
            .mapNotNull { it.word }
            .sorted()

        textWordsCount.text = "(${words.size} từ)"

        words.forEach { word ->
            val chip = TextView(requireContext()).apply {
                text = word
                setTextColor(0xFF1565C0.toInt())
                textSize = 13f
                setPadding(24, 8, 24, 8)
                setBackgroundResource(R.drawable.bg_word_chip)

                val params = FlexboxLayout.LayoutParams(
                    FlexboxLayout.LayoutParams.WRAP_CONTENT,
                    FlexboxLayout.LayoutParams.WRAP_CONTENT
                )
                params.setMargins(4, 4, 4, 4)
                layoutParams = params
            }
            flexboxMasteredWords.addView(chip)
        }
    }

    private fun processWordList(words: List<String>): ProcessedWordList {
        val processedWords = mutableListOf<String>()
        val synonymGroups = mutableListOf<List<String>>()

        for (word in words) {
            if (word.contains(" vs ")) {
                val parts = word.split(" vs ").map { it.trim() }.filter { it.isNotEmpty() }
                processedWords.addAll(parts)
                if (parts.size >= 2) {
                    synonymGroups.add(parts)
                }
            } else {
                processedWords.add(word)
            }
        }

        return ProcessedWordList(processedWords, synonymGroups)
    }

    private fun generatePrompt() {
        if (learnedVocabs.isEmpty()) {
            editTextPrompt.setText("Chưa có từ nào trong nhóm này để tạo prompt. Hãy học ít nhất 1 lần ở tab Learn.")
            return
        }

        val words = learnedVocabs
            .mapNotNull { it.word }
            .sorted()

        val (processedWords, synonymGroups) = processWordList(words)

        val selectedLength = (spinnerLength.selectedItem as? LengthOption)?.sentences ?: 5

        val categoryLabel = when (selectedCategory) {
            "VSTEP" -> "VSTEP"
            "TOEIC" -> "TOEIC"
            "GENERAL" -> "general English"
            "SPEAKING" -> "speaking practice"
            "WRITING" -> "writing practice"
            else -> selectedCategory
        }

        val wordsListText = processedWords.joinToString(", ")

        val synonymSection = if (synonymGroups.isNotEmpty()) {
            val synonymLines = synonymGroups.joinToString("\n") { group -> "- ${group.joinToString(" / ")}" }
            "\n**SYNONYM/ALTERNATIVE GROUPS (can write as word1/word2):**\n$synonymLines\n"
        } else {
            ""
        }

        val promptText = buildString {
            append("You are an English teacher helping a learner review previously learned vocabulary for the ")
            append(categoryLabel)
            append(" exam.\n\n")
            append("**TASK:** Write one coherent English paragraph of about ")
            append(selectedLength)
            append(" sentences, followed by 10 multiple-choice comprehension questions.\n\n")
            append("**VOCABULARY TO USE:**\n")
            append(wordsListText)
            append(synonymSection)
            append("\n**CRITICAL REQUIREMENTS:**\n")
            append("1. PRIORITY: Write a meaningful, coherent paragraph first. Do NOT force words that don't fit naturally.\n")
            append("2. Use as many target words as possible, but SKIP words that would make the paragraph awkward or unnatural.\n")
            append("3. For synonym pairs (e.g., hamper/prevent), you may write \"hamper/prevent\" to show both alternatives.\n")
            append("4. Bold each target vocabulary word when used (e.g., **word** or **word1/word2**).\n")
            append("5. The paragraph must tell a connected story with logical flow between sentences.\n\n")
            append("**OUTPUT FORMAT:**\n\n")
            append("**Paragraph:**\n[Your paragraph here]\n\n")
            append("**Words used:** [list words actually used]\n")
            append("**Words skipped:** [list words that didn't fit naturally, or \"None\" if all used]\n\n")
            append("**Comprehension Questions (10 MCQs about the paragraph content):**\n")
            append("1. [Question about information in the paragraph]\n")
            append("   A) ...\n")
            append("   B) ...\n")
            append("   C) ...\n")
            append("   D) ...\n")
            append("   Answer: [letter]\n\n")
            append("[Continue for questions 2-10]")
        }

        editTextPrompt.setText(promptText)
    }

    private fun copyPromptToClipboard() {
        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Review Prompt", editTextPrompt.text.toString())
        clipboard.setPrimaryClip(clip)
        Toast.makeText(requireContext(), "Đã copy prompt!", Toast.LENGTH_SHORT).show()
    }
}
