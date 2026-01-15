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
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.utils.ExampleUtils
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.adapters.EnglishSentenceAdapter

/**
 * Data class to hold one example (Vietnamese + Grammar + multiple English translations)
 */
data class ExampleInput(
    var vietnamese: String,
    var grammar: String = "",
    val englishSentences: MutableList<String>,
    var adapter: EnglishSentenceAdapter? = null
)

class EditVocabularyDialog(
    private val vocabularyWithExamples: VocabularyWithExamples,
    private val onSave: (String, List<String>, String, String?) -> Unit // word, examples, category, vocabularyGrammar
) : DialogFragment() {

    private lateinit var wordEditText: EditText
    private lateinit var vocabularyGrammarEditText: EditText
    private lateinit var radioGroupCategory: RadioGroup
    private lateinit var examplesContainer: LinearLayout
    private val exampleInputs = mutableListOf<ExampleInput>()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        Logger.d("Creating EditVocabularyDialog for vocabulary: ${vocabularyWithExamples.vocabulary.word}")
        return super.onCreateDialog(savedInstanceState)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        Logger.d("EditVocabularyDialog onCreateView")
        return inflater.inflate(R.layout.dialog_add_vocabulary, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d("EditVocabularyDialog onViewCreated")

        wordEditText = view.findViewById(R.id.editTextWord)
        vocabularyGrammarEditText = view.findViewById(R.id.editTextVocabularyGrammar)
        radioGroupCategory = view.findViewById(R.id.radioGroupCategory)
        examplesContainer = view.findViewById(R.id.containerExamples)

        val addExampleButton: TextView = view.findViewById(R.id.buttonAddExample)
        val saveButton: TextView = view.findViewById(R.id.buttonSave)
        val cancelButton: TextView = view.findViewById(R.id.buttonCancel)

        // Pre-fill with existing data
        wordEditText.setText(vocabularyWithExamples.vocabulary.word)
        vocabularyGrammarEditText.setText(vocabularyWithExamples.vocabulary.grammar ?: "")

        // Set category radio button
        val currentCategory = vocabularyWithExamples.vocabulary.category
        when (currentCategory) {
            "TOEIC" -> radioGroupCategory.check(R.id.radioToeic)
            "VSTEP" -> radioGroupCategory.check(R.id.radioVstep)
            "SPEAKING" -> radioGroupCategory.check(R.id.radioSpeaking)
            "WRITING" -> radioGroupCategory.check(R.id.radioWriting)
            else -> radioGroupCategory.check(R.id.radioGeneral)
        }

        // Clear any existing example inputs first to prevent duplicates
        exampleInputs.clear()
        examplesContainer.removeAllViews()

        // Add existing examples with improved tree structure
        Logger.d("EditVocabularyDialog: Found ${vocabularyWithExamples.examples.size} examples")
        vocabularyWithExamples.examples.forEach { example ->
            Logger.d("EditVocabularyDialog: Processing example - sentences: '${example.sentences}', vietnamese: '${example.vietnamese}', grammar: '${example.grammar}'")
            val sentences = ExampleUtils.jsonToSentences(example.sentences).toMutableList()
            Logger.d("EditVocabularyDialog: Parsed sentences: $sentences")
            addExampleField(example.vietnamese.orEmpty(), example.grammar.orEmpty(), sentences)
        }

        // If no examples, add one empty field
        if (vocabularyWithExamples.examples.isEmpty()) {
            addExampleField()
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
        // Create adapter without the remove callback first
        val adapter = EnglishSentenceAdapter(
            sentences = exampleInput.englishSentences,
            onSentenceChanged = { position, newText ->
                // Sentence updated in the list automatically
                Logger.d("English sentence updated at position $position: $newText")
            },
            onRemoveSentence = { position ->
                Logger.d("Removing English sentence at position $position")
                // Use exampleInput.adapter to avoid forward reference
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
        Logger.d("Saving edited vocabulary")
        val word = wordEditText.text.toString().trim()
        val vocabularyGrammar = vocabularyGrammarEditText.text.toString().trim()
            .ifEmpty { null }

        // Get selected category
        val selectedCategoryId = radioGroupCategory.checkedRadioButtonId
        val category = when (selectedCategoryId) {
            R.id.radioToeic -> "TOEIC"
            R.id.radioVstep -> "VSTEP"
            R.id.radioSpeaking -> "SPEAKING"
            R.id.radioWriting -> "WRITING"
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

        Logger.d("Saving edited vocabulary: $word with ${exampleList.size} examples, category: $category, vocabGrammar: ${vocabularyGrammar != null}")
        onSave(word, exampleList, category, vocabularyGrammar)
        dismiss()
    }

    override fun onStart() {
        super.onStart()
        val dm = resources.displayMetrics
        val targetWidth = (dm.widthPixels * 0.95f).toInt()
        dialog?.window?.setLayout(targetWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
    }
}
