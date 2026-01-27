package com.example.specialenglishlearningapp.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import org.json.JSONArray

@Entity(tableName = "vocabularies")
data class Vocabulary(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val word: String,
    val createdAt: Long = System.currentTimeMillis(),
    val lastStudiedAt: Long = 0L,
    val priorityScore: Int = 0,
    val appwriteDocumentId: String? = null,
    // Category: GENERAL or TOEIC
    val category: String = "GENERAL",  // GENERAL or TOEIC
    // Grammar explanation for the entire vocabulary (shared across all examples)
    val grammar: String? = null,
    // Learning statistics (legacy - kept for backward compatibility)
    val totalAttempts: Int = 0,        // Tổng số lần điền ví dụ
    val correctAttempts: Int = 0,      // Số lần điền chính xác
    val memoryScore: Float = 0.0f,     // Khả năng ghi nhớ (correctAttempts / totalAttempts)
    // New: Last 10 attempts tracking
    val last10Attempts: String = "[]"  // JSON array of booleans: [true, false, true, ...]
) {
    /**
     * Get the list of last 10 attempts as a list of booleans
     */
    fun getLast10AttemptsList(): List<Boolean> {
        return try {
            val jsonArray = JSONArray(last10Attempts)
            List(jsonArray.length()) { index ->
                jsonArray.getBoolean(index)
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * Calculate correct count from last 10 attempts
     */
    fun getLast10CorrectCount(): Int {
        return getLast10AttemptsList().count { it }
    }

    /**
     * Calculate percentage from last 10 attempts
     * Returns 0-100 based on correct answers in last 10 attempts
     */
    fun getLast10Percentage(): Float {
        val attempts = getLast10AttemptsList()
        if (attempts.isEmpty()) return 0f
        return (getLast10CorrectCount().toFloat() / attempts.size.toFloat()) * 100f
    }

    /**
     * Check if vocabulary has passed (70%+ accuracy with at least 10 total attempts)
     */
    fun hasPassed(): Boolean {
        // memoryScore is stored as ratio (0.0 - 1.0), so 70% = 0.7
        return totalAttempts >= 10 && memoryScore >= 0.7f
    }

    /**
     * Get category as enum
     */
    fun getCategoryEnum(): VocabularyCategory {
        return VocabularyCategory.fromString(category)
    }
}
