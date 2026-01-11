package com.example.specialenglishlearningapp.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.data.VocabularyWithExamples
import com.example.specialenglishlearningapp.utils.Logger
import java.text.SimpleDateFormat
import java.util.*

class VocabularyAdapter(
    private val onEditClick: (VocabularyWithExamples) -> Unit,
    private val onDeleteClick: (VocabularyWithExamples) -> Unit
) : ListAdapter<VocabularyWithExamples, VocabularyAdapter.VocabularyViewHolder>(VocabularyDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VocabularyViewHolder {
        Logger.d("Creating VocabularyViewHolder")
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_vocabulary, parent, false)
        return VocabularyViewHolder(view)
    }

    override fun onBindViewHolder(holder: VocabularyViewHolder, position: Int) {
        Logger.d("Binding VocabularyViewHolder at position $position")
        holder.bind(getItem(position))
    }

    inner class VocabularyViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val wordText: TextView = itemView.findViewById(R.id.textWord)
        private val categoryText: TextView = itemView.findViewById(R.id.textCategory)
        private val examplesText: TextView = itemView.findViewById(R.id.textExamples)
        private val learningStatsText: TextView = itemView.findViewById(R.id.textLearningStats)
        private val lastEditedText: TextView = itemView.findViewById(R.id.textLastEdited)
        private val editButton: View = itemView.findViewById(R.id.buttonEdit)
        private val deleteButton: View = itemView.findViewById(R.id.buttonDelete)

        fun bind(vocabularyWithExamples: VocabularyWithExamples) {
            Logger.d("Binding vocabulary: ${vocabularyWithExamples.vocabulary.word}")

            wordText.text = vocabularyWithExamples.vocabulary.word

            // Set category badge
            val category = vocabularyWithExamples.vocabulary.category
            categoryText.text = when (category) {
                "TOEIC" -> "TOEIC"
                "VSTEP" -> "VSTEP"
                "SPEAKING" -> "SPEAKING"
                else -> "General"
            }
            categoryText.setBackgroundResource(
                when (category) {
                    "TOEIC" -> R.drawable.bg_category_toeic
                    "VSTEP" -> R.drawable.bg_category_vstep
                    "SPEAKING" -> R.drawable.bg_category_speaking
                    else -> R.drawable.bg_category_general
                }
            )
            
            // Hide examples content in list UI per new requirement
            this.examplesText.text = ""
            
            // Display learning statistics
            val vocabulary = vocabularyWithExamples.vocabulary
            val memoryPercentage = if (vocabulary.totalAttempts > 0) {
                ((vocabulary.correctAttempts.toFloat() / vocabulary.totalAttempts) * 100).toInt()
            } else {
                0
            }
            learningStatsText.text = "📊 Đã học: ${vocabulary.correctAttempts}/${vocabulary.totalAttempts} lần ($memoryPercentage%)"
            
            // Format last edited date
            val dateFormat = SimpleDateFormat("dd/MM/yy", Locale.getDefault())
            val lastEditedDate = Date(vocabularyWithExamples.vocabulary.createdAt)
            lastEditedText.text = dateFormat.format(lastEditedDate)

            editButton.setOnClickListener {
                Logger.d("Edit button clicked for vocabulary: ${vocabularyWithExamples.vocabulary.word}")
                onEditClick(vocabularyWithExamples)
            }

            deleteButton.setOnClickListener {
                Logger.d("Delete button clicked for vocabulary: ${vocabularyWithExamples.vocabulary.word}")
                onDeleteClick(vocabularyWithExamples)
            }
        }
    }

    class VocabularyDiffCallback : DiffUtil.ItemCallback<VocabularyWithExamples>() {
        override fun areItemsTheSame(oldItem: VocabularyWithExamples, newItem: VocabularyWithExamples): Boolean {
            return oldItem.vocabulary.id == newItem.vocabulary.id
        }

        override fun areContentsTheSame(oldItem: VocabularyWithExamples, newItem: VocabularyWithExamples): Boolean {
            return oldItem == newItem
        }
    }
}
