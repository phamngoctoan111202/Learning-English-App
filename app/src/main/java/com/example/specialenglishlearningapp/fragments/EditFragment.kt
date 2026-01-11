package com.example.specialenglishlearningapp.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.adapters.VocabularyAdapter
import com.example.specialenglishlearningapp.data.AppDatabase
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.databinding.FragmentEditBinding
import com.example.specialenglishlearningapp.dialogs.AddVocabularyDialog
import com.example.specialenglishlearningapp.dialogs.EditVocabularyDialog
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.viewmodel.EditViewModel
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.launch

class EditFragment : Fragment() {
    private var _binding: FragmentEditBinding? = null
    private val binding get() = _binding!!

    private lateinit var editViewModel: EditViewModel
    private lateinit var vocabularyAdapter: VocabularyAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        Logger.d("EditFragment onCreateView")
        _binding = FragmentEditBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d("EditFragment onViewCreated")

        editViewModel = ViewModelProvider(this, ViewModelProvider.AndroidViewModelFactory.getInstance(requireActivity().application)).get(EditViewModel::class.java)

        setupRecyclerView()
        setupClickListeners()
        setupObservers()

        // Auto-cleanup duplicates on first load
        cleanupDuplicatesOnce()
    }

    private fun cleanupDuplicatesOnce() {
        val prefs = requireContext().getSharedPreferences("edit_prefs", android.content.Context.MODE_PRIVATE)
        val hasCleanedUp = prefs.getBoolean("has_cleaned_duplicates_v2", false)

        if (!hasCleanedUp) {
            Logger.d("🧹 First time opening EditFragment, cleaning up duplicates...")
            lifecycleScope.launch {
                // Clean up duplicates (local only, no Appwrite sync)
                editViewModel.cleanupDuplicates()
                // Mark as cleaned up
                prefs.edit().putBoolean("has_cleaned_duplicates_v2", true).apply()
                Logger.d("✅ Duplicate cleanup completed")
            }
        }
    }

    private fun setupRecyclerView() {
        Logger.d("Setting up RecyclerView")
        vocabularyAdapter = VocabularyAdapter(
            onEditClick = { vocabularyWithExamples ->
                showEditDialog(vocabularyWithExamples)
            },
            onDeleteClick = { vocabularyWithExamples ->
                editViewModel.deleteVocabulary(vocabularyWithExamples)
            }
        )

        binding.recyclerViewVocabularies.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = vocabularyAdapter
        }
    }

    private fun setupClickListeners() {
        binding.fabAddVocabulary.setOnClickListener {
            Logger.d("Add vocabulary button clicked")
            showAddDialog()
        }

        // Setup SearchView
        binding.searchView.setOnQueryTextListener(object : androidx.appcompat.widget.SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                query?.let { editViewModel.searchVocabularies(it) }
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                editViewModel.searchVocabularies(newText ?: "")
                return true
            }
        })

        // Setup Category Filter
        binding.radioGroupCategoryFilter.setOnCheckedChangeListener { _, checkedId ->
            val category = when (checkedId) {
                R.id.radioFilterGeneral -> "GENERAL"
                R.id.radioFilterToeic -> "TOEIC"
                R.id.radioFilterVstep -> "VSTEP"
                R.id.radioFilterSpeaking -> "SPEAKING"
                else -> null // All
            }
            Logger.d("Category filter changed: $category")
            editViewModel.filterByCategory(category)
        }
    }

    private fun setupObservers() {
        editViewModel.vocabularies.observe(viewLifecycleOwner) { vocabularies ->
            Logger.d("Observed ${vocabularies.size} vocabularies from ViewModel")
            vocabularyAdapter.submitList(vocabularies)
        }

        editViewModel.syncStatus.observe(viewLifecycleOwner) { status ->
            if (!status.isNullOrEmpty()) {
                Toast.makeText(context, status, Toast.LENGTH_SHORT).show()
            }
        }

        editViewModel.addVocabularyStatus.observe(viewLifecycleOwner) { result ->
            when (result) {
                is com.example.specialenglishlearningapp.viewmodel.AddVocabularyResult.Success -> {
                    Toast.makeText(context, "✅ Đã thêm từ vựng thành công", Toast.LENGTH_SHORT).show()
                }
                is com.example.specialenglishlearningapp.viewmodel.AddVocabularyResult.Duplicate -> {
                    Toast.makeText(context, "⚠️ Từ '${result.word}' đã tồn tại trong danh sách", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showAddDialog() {
        val dialog = AddVocabularyDialog { word, examples, category, vocabularyGrammar ->
            editViewModel.addVocabulary(word, examples, category, vocabularyGrammar)
        }
        dialog.show(parentFragmentManager, "AddVocabularyDialog")
    }

    private fun showEditDialog(vocabularyWithExamples: VocabularyWithExamples) {
        val dialog = EditVocabularyDialog(vocabularyWithExamples) { word, examples, category, vocabularyGrammar ->
            editViewModel.updateVocabulary(vocabularyWithExamples.vocabulary.id, word, examples, category, vocabularyGrammar)
        }
        dialog.show(parentFragmentManager, "EditVocabularyDialog")
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
