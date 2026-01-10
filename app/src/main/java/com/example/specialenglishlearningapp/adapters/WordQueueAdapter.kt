package com.example.specialenglishlearningapp.adapters

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.viewmodel.WordQueueItem
import com.google.android.material.card.MaterialCardView

class WordQueueAdapter : RecyclerView.Adapter<WordQueueAdapter.WordQueueViewHolder>() {

    private var words: List<WordQueueItem> = emptyList()

    fun submitList(newWords: List<WordQueueItem>) {
        words = newWords
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WordQueueViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_word_queue, parent, false)
        return WordQueueViewHolder(view)
    }

    override fun onBindViewHolder(holder: WordQueueViewHolder, position: Int) {
        holder.bind(words[position])
    }

    override fun getItemCount(): Int = words.size

    class WordQueueViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val cardWordQueue: MaterialCardView = itemView.findViewById(R.id.cardWordQueue)
        private val textQueueWord: TextView = itemView.findViewById(R.id.textQueueWord)
        private val textMemoryScore: TextView = itemView.findViewById(R.id.textMemoryScore)
        private val textAttempts: TextView = itemView.findViewById(R.id.textAttempts)
        private val textCurrentIndicator: TextView = itemView.findViewById(R.id.textCurrentIndicator)

        fun bind(item: WordQueueItem) {
            textQueueWord.text = item.word
            textMemoryScore.text = String.format("%.0f%%", item.memoryScore)
            textAttempts.text = "${item.correctAttempts}/${item.totalAttempts}"

            // Show indicator if this is the current word
            textCurrentIndicator.visibility = if (item.isCurrentWord) View.VISIBLE else View.GONE

            // Highlight current word with different background
            if (item.isCurrentWord) {
                cardWordQueue.setCardBackgroundColor(Color.parseColor("#E3F2FD")) // Light Blue
                textQueueWord.setTextColor(Color.WHITE) // White
            } else {
                cardWordQueue.setCardBackgroundColor(Color.WHITE)
                textQueueWord.setTextColor(Color.BLACK)
            }

            // Color code by memory score
            val scoreColor = when {
                item.memoryScore >= 70f -> Color.parseColor("#4CAF50") // Green: Good
                item.memoryScore >= 50f -> Color.parseColor("#FF9800") // Orange: Medium
                item.memoryScore >= 30f -> Color.parseColor("#F44336") // Red: Low
                else -> Color.parseColor("#9E9E9E") // Gray: Very low/Not started
            }
            textMemoryScore.setTextColor(scoreColor)
        }
    }
}
