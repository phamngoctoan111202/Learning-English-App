package com.example.specialenglishlearningapp.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "examples")
data class Example(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val vocabularyId: Long,
    val sentences: String, // JSON array of English sentences
    val vietnamese: String? = null,
    val grammar: String? = null, // Grammar explanation
    val createdAt: Long = System.currentTimeMillis(),
    val appwriteDocumentId: String? = null
)
