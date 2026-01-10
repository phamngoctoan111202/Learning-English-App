package com.example.specialenglishlearningapp.adapters

import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import androidx.recyclerview.widget.RecyclerView
import com.example.specialenglishlearningapp.R

class EnglishSentenceAdapter(
    private val sentences: MutableList<String>,
    private val onSentenceChanged: (Int, String) -> Unit,
    private val onRemoveSentence: (Int) -> Unit
) : RecyclerView.Adapter<EnglishSentenceAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val editTextEnglish: EditText = view.findViewById(R.id.editTextEnglish)
        val buttonRemove: Button = view.findViewById(R.id.buttonRemove)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_english_sentence, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val sentence = sentences[position]

        // Remove previous text watcher if any
        holder.editTextEnglish.tag?.let { tag ->
            if (tag is TextWatcher) {
                holder.editTextEnglish.removeTextChangedListener(tag)
            }
        }

        // Set text
        holder.editTextEnglish.setText(sentence)

        // Add text watcher to update sentence in list
        val textWatcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val currentPosition = holder.bindingAdapterPosition
                if (currentPosition != RecyclerView.NO_POSITION) {
                    val newText = s.toString()
                    if (currentPosition < sentences.size) {
                        sentences[currentPosition] = newText
                        onSentenceChanged(currentPosition, newText)
                    }
                }
            }
        }
        holder.editTextEnglish.addTextChangedListener(textWatcher)
        holder.editTextEnglish.tag = textWatcher

        // Remove button click
        holder.buttonRemove.setOnClickListener {
            val currentPosition = holder.bindingAdapterPosition
            if (currentPosition != RecyclerView.NO_POSITION) {
                onRemoveSentence(currentPosition)
            }
        }

        // Hide remove button if this is the only sentence (must have at least one)
        holder.buttonRemove.visibility = if (sentences.size <= 1) View.GONE else View.VISIBLE
    }

    override fun getItemCount(): Int = sentences.size

    fun addSentence() {
        sentences.add("")
        notifyItemInserted(sentences.size - 1)
    }

    fun removeSentence(position: Int) {
        if (position >= 0 && position < sentences.size && sentences.size > 1) {
            sentences.removeAt(position)
            notifyItemRemoved(position)
            // Update all items after this position to refresh visibility
            notifyItemRangeChanged(position, sentences.size - position)
        }
    }
}
