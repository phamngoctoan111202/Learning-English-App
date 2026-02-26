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
    private var masteredVocabs: List<Vocabulary> = emptyList()

    private val lengthOptions = listOf(
        LengthOption(3, "Ngắn - khoảng 3 câu"),
        LengthOption(5, "Vừa - khoảng 5 câu"),
        LengthOption(8, "Dài - khoảng 8 câu")
    )

    data class LengthOption(val sentences: Int, val label: String) {
        override fun toString(): String = label
    }

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

                // Filter mastered words (70%+ accuracy with at least 10 total attempts)
                // memoryScore is stored as ratio (0.0 - 1.0), so 70% = 0.7
                masteredVocabs = allVocabs.filter { vocab ->
                    vocab.totalAttempts >= 10 && vocab.memoryScore >= 0.7f
                }

                renderWords()
                generatePrompt()
            } catch (e: Exception) {
                Logger.e("Error loading mastered vocabs: ${e.message}")
            }
        }
    }

    private fun renderWords() {
        flexboxMasteredWords.removeAllViews()

        if (masteredVocabs.isEmpty()) {
            textWordsCount.text = "(0 từ đã đạt 7/10 trong nhóm này)"

            val emptyText = TextView(requireContext()).apply {
                text = "Hãy luyện thêm ở tab Learn để đạt 7/10, sau đó quay lại đây để ôn bằng đoạn văn."
                setTextColor(0xFF777777.toInt())
                textSize = 13f
            }
            flexboxMasteredWords.addView(emptyText)
            return
        }

        val words = masteredVocabs
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

    private fun generatePrompt() {
        if (masteredVocabs.isEmpty()) {
            editTextPrompt.setText("Chưa có từ nào đạt 7/10 trong nhóm này để tạo prompt. Hãy luyện thêm ở tab Learn.")
            return
        }

        val words = masteredVocabs
            .mapNotNull { it.word }
            .sorted()

        val selectedLength = (spinnerLength.selectedItem as? LengthOption)?.sentences ?: 5

        val categoryLabel = when (selectedCategory) {
            "VSTEP" -> "VSTEP"
            "TOEIC" -> "TOEIC"
            "GENERAL" -> "general English"
            "SPEAKING" -> "speaking practice"
            "WRITING" -> "writing practice"
            else -> selectedCategory
        }

        val wordsListText = words.joinToString(", ")

        val promptText = buildString {
            append("You are an English teacher helping a learner review previously mastered vocabulary for the ")
            append(categoryLabel)
            append(" exam.\n")
            append("Write one coherent English paragraph of about ")
            append(selectedLength)
            append(" sentences that tells a connected story or describes a related scenario.\n\n")
            append("CRITICAL REQUIREMENTS:\n")
            append("1. You MUST use ALL of these words at least once: ")
            append(wordsListText)
            append("\n")
            append("2. Try to use as MANY of these words as possible MULTIPLE TIMES if it fits naturally.\n")
            append("3. The paragraph must tell a coherent story - all sentences should connect logically.\n")
            append("4. Use clear, everyday language suitable for an intermediate learner.\n")
            append("5. Bold or highlight each target vocabulary word when used (e.g., **word**).\n\n")
            append("Only output the English paragraph, nothing else.")
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
