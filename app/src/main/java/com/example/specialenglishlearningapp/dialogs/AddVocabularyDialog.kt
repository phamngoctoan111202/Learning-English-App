package com.example.specialenglishlearningapp.dialogs

import android.app.Dialog
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.RadioGroup
import android.widget.RadioButton
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.utils.ExampleUtils
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.utils.TextToSpeechHelper
import com.example.specialenglishlearningapp.adapters.EnglishSentenceAdapter

class AddVocabularyDialog(
    private val onSave: (String, List<String>, String, String?) -> Unit // word, examples, category, vocabularyGrammar
) : DialogFragment() {

    private lateinit var wordEditText: EditText
    private lateinit var vocabularyGrammarEditText: EditText
    private lateinit var radioGroupCategory: RadioGroup
    private lateinit var examplesContainer: LinearLayout
    private val exampleInputs = mutableListOf<ExampleInput>()
    private var ttsHelper: TextToSpeechHelper? = null

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Logger.d("Creating AddVocabularyDialog")
        return super.onCreateDialog(savedInstanceState)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        Logger.d("AddVocabularyDialog onCreateView")
        return inflater.inflate(R.layout.dialog_add_vocabulary, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d("AddVocabularyDialog onViewCreated")

        // Initialize TTS
        ttsHelper = TextToSpeechHelper(requireContext())

        wordEditText = view.findViewById(R.id.editTextWord)
        vocabularyGrammarEditText = view.findViewById(R.id.editTextVocabularyGrammar)
        radioGroupCategory = view.findViewById(R.id.radioGroupCategory)
        examplesContainer = view.findViewById(R.id.containerExamples)

        val addExampleButton: TextView = view.findViewById(R.id.buttonAddExample)
        val saveButton: TextView = view.findViewById(R.id.buttonSave)
        val cancelButton: TextView = view.findViewById(R.id.buttonCancel)
        val speakerButton: TextView = view.findViewById(R.id.buttonSpeaker)

        // Setup word text listener to pronounce when user types a word
        setupWordPronunciation()

        // Setup speaker button to pronounce on click
        speakerButton.setOnClickListener {
            val word = wordEditText.text.toString().trim()
            if (word.isNotEmpty()) {
                Logger.d("Speaker button clicked for word: '$word'")
                pronounceWord(word)
            } else {
                Logger.d("Speaker button clicked but word is empty")
            }
        }

        addExampleButton.setOnClickListener {
            addExampleField()
        }

        saveButton.setOnClickListener {
            saveVocabulary()
        }

        cancelButton.setOnClickListener {
            dismiss()
        }

        // Add first example field
        addExampleField()
    }

    override fun onStart() {
        super.onStart()
        val dm = resources.displayMetrics
        val targetWidth = (dm.widthPixels * 0.95f).toInt()
        dialog?.window?.setLayout(targetWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    override fun onDestroy() {
        super.onDestroy()
        // Shutdown TTS when dialog is destroyed
        ttsHelper?.shutdown()
        ttsHelper = null
        Logger.d("AddVocabularyDialog destroyed, TTS shutdown")
    }

    /**
     * Setup text watcher to pronounce the word when user finishes typing
     * Detects when user types a space after a word
     */
    private fun setupWordPronunciation() {
        wordEditText.addTextChangedListener(object : TextWatcher {
            private var lastText = ""

            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
                // Not needed
            }

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                // Not needed
            }

            override fun afterTextChanged(s: Editable?) {
                val currentText = s?.toString() ?: ""

                // Check if user just typed a space (finished typing a word)
                if (currentText.isNotEmpty() && currentText.endsWith(" ") && !lastText.endsWith(" ")) {
                    // Extract the last complete word (before the space)
                    val words = currentText.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
                    val lastWord = words.lastOrNull()

                    if (!lastWord.isNullOrEmpty()) {
                        Logger.d("User finished typing word: '$lastWord', pronouncing...")
                        pronounceWord(lastWord)
                    }
                }

                lastText = currentText
            }
        })

        // Also add click listener on the EditText to pronounce current word
        wordEditText.setOnClickListener {
            val word = wordEditText.text.toString().trim()
            if (word.isNotEmpty()) {
                pronounceWord(word)
            }
        }
    }

    /**
     * Pronounce a word using TTS
     */
    private fun pronounceWord(word: String) {
        Logger.d("TTS: Attempting to speak '$word'")
        if (ttsHelper == null) {
            Logger.e("TTS: Helper is null!")
            return
        }
        ttsHelper?.speak(word)
        Logger.d("TTS: Speak command sent")
    }

    private fun addExampleField(initialVi: String = "", initialGrammar: String = "", initialEnglishList: MutableList<String> = mutableListOf("")) {
        Logger.d("Adding example field with initial Vietnamese: $initialVi, Grammar: $initialGrammar and ${initialEnglishList.size} English sentences")

        val exampleLayout = LayoutInflater.from(context).inflate(R.layout.item_example_input_improved, examplesContainer, false)

        val vietnameseEditText: EditText = exampleLayout.findViewById(R.id.editTextVietnamese)
        val grammarEditText: EditText = exampleLayout.findViewById(R.id.editTextGrammar)
        val recyclerViewEnglish: RecyclerView = exampleLayout.findViewById(R.id.recyclerViewEnglish)
        val buttonAddEnglish: Button = exampleLayout.findViewById(R.id.buttonAddEnglish)
        val buttonDeleteExample: Button = exampleLayout.findViewById(R.id.buttonDeleteExample)

        // Set Vietnamese text
        vietnameseEditText.setText(initialVi)

        // Set Grammar text
        grammarEditText.setText(initialGrammar)

        // Ensure at least one English sentence
        if (initialEnglishList.isEmpty()) {
            initialEnglishList.add("")
        }

        // Create ExampleInput object
        val exampleInput = ExampleInput(
            vietnamese = initialVi,
            grammar = initialGrammar,
            englishSentences = initialEnglishList
        )

        // Setup RecyclerView for English sentences
        val adapter = EnglishSentenceAdapter(
            sentences = exampleInput.englishSentences,
            onSentenceChanged = { position, newText ->
                Logger.d("English sentence updated at position $position: $newText")
            },
            onRemoveSentence = { position ->
                Logger.d("Removing English sentence at position $position")
                exampleInput.adapter?.removeSentence(position)
            }
        )
        exampleInput.adapter = adapter

        recyclerViewEnglish.layoutManager = LinearLayoutManager(context)
        recyclerViewEnglish.adapter = adapter

        // Add Vietnamese text change listener
        vietnameseEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                exampleInput.vietnamese = s.toString()
            }
        })

        // Add Grammar text change listener
        grammarEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                exampleInput.grammar = s.toString()
            }
        })

        // Add English sentence button
        buttonAddEnglish.setOnClickListener {
            Logger.d("Adding new English sentence")
            exampleInput.adapter?.addSentence()
        }

        // Delete example button
        buttonDeleteExample.setOnClickListener {
            Logger.d("Deleting example")
            val index = exampleInputs.indexOf(exampleInput)
            if (index >= 0 && exampleInputs.size > 1) {
                exampleInputs.removeAt(index)
                examplesContainer.removeView(exampleLayout)
                updateDeleteButtonsVisibility()
            }
        }

        // Hide delete button if only one example
        buttonDeleteExample.visibility = if (exampleInputs.size == 0) View.GONE else View.VISIBLE

        exampleInputs.add(exampleInput)
        examplesContainer.addView(exampleLayout)

        // Update delete button visibility for all examples
        updateDeleteButtonsVisibility()
    }

    private fun updateDeleteButtonsVisibility() {
        for (i in 0 until examplesContainer.childCount) {
            val child = examplesContainer.getChildAt(i)
            val buttonDelete: Button? = child.findViewById(R.id.buttonDeleteExample)
            buttonDelete?.visibility = if (examplesContainer.childCount <= 1) View.GONE else View.VISIBLE
        }
    }

    private fun saveVocabulary() {
        Logger.d("Saving vocabulary")
        val word = wordEditText.text.toString().trim()
        val vocabularyGrammar = vocabularyGrammarEditText.text.toString().trim()
            .ifEmpty { null }

        // Get selected category
        val selectedCategoryId = radioGroupCategory.checkedRadioButtonId
        val category = when (selectedCategoryId) {
            R.id.radioToeic -> "TOEIC"
            R.id.radioVstep -> "VSTEP"
            R.id.radioSpeaking -> "SPEAKING"
            else -> "GENERAL"
        }

        val exampleList = exampleInputs.mapNotNull { exampleInput ->
            val vi = exampleInput.vietnamese.trim()
            val grammar = exampleInput.grammar.trim()
            val englishSentences = exampleInput.englishSentences
                .map { it.trim() }
                .filter { it.isNotEmpty() }

            if (englishSentences.isNotEmpty()) {
                val sentencesJson = ExampleUtils.sentencesToJson(englishSentences)
                "$sentencesJson||$vi||$grammar"
            } else null
        }

        if (word.isEmpty()) {
            wordEditText.error = "Vui lòng nhập từ vựng"
            return
        }

        if (exampleList.isEmpty()) {
            Logger.d("No valid examples, please add at least one English sentence")
            return
        }

        Logger.d("Saving vocabulary: $word with ${exampleList.size} examples, category: $category, vocabGrammar: ${vocabularyGrammar != null}")
        onSave(word, exampleList, category, vocabularyGrammar)
        dismiss()
    }
}
