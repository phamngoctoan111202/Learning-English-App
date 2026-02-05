package com.example.specialenglishlearningapp.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface VocabularyDao {
    @Query("SELECT * FROM vocabularies ORDER BY createdAt DESC")
    fun getAllVocabularies(): Flow<List<Vocabulary>>

    @Query("SELECT * FROM vocabularies WHERE category = :category ORDER BY createdAt DESC")
    fun getVocabulariesByCategory(category: String): Flow<List<Vocabulary>>

    @Query("SELECT * FROM vocabularies WHERE id = :id")
    suspend fun getVocabularyById(id: Long): Vocabulary?

    @Query("SELECT * FROM vocabularies WHERE appwriteDocumentId = :appwriteId")
    suspend fun getVocabularyByAppwriteId(appwriteId: String?): Vocabulary?

    @Query("SELECT * FROM vocabularies WHERE LOWER(TRIM(word)) = LOWER(TRIM(:word))")
    suspend fun getVocabularyByWord(word: String): Vocabulary?

    @Query("SELECT * FROM vocabularies ORDER BY RANDOM() LIMIT 1")
    suspend fun getRandomVocabulary(): Vocabulary?

    @Query("SELECT * FROM vocabularies WHERE category = :category ORDER BY RANDOM() LIMIT 1")
    suspend fun getRandomVocabularyByCategory(category: String): Vocabulary?

    @Insert
    suspend fun insertVocabulary(vocabulary: Vocabulary): Long

    @Update
    suspend fun updateVocabulary(vocabulary: Vocabulary)

    @Query("UPDATE vocabularies SET lastStudiedAt = :ts, priorityScore = :priority WHERE id = :id")
    suspend fun markStudied(id: Long, ts: Long, priority: Int)

    @Query("UPDATE vocabularies SET totalAttempts = :totalAttempts, correctAttempts = :correctAttempts, memoryScore = :memoryScore WHERE id = :id")
    suspend fun updateLearningStats(id: Long, totalAttempts: Int, correctAttempts: Int, memoryScore: Float)

    @Query("UPDATE vocabularies SET totalAttempts = :totalAttempts, correctAttempts = :correctAttempts, memoryScore = :memoryScore, last10Attempts = :last10Attempts WHERE id = :id")
    suspend fun updateLearningStatsWithLast10(id: Long, totalAttempts: Int, correctAttempts: Int, memoryScore: Float, last10Attempts: String)

    @Query("SELECT * FROM vocabularies WHERE id = :id")
    suspend fun getVocabularyByIdSync(id: Long): Vocabulary?

    @Delete
    suspend fun deleteVocabulary(vocabulary: Vocabulary)

    @Query("DELETE FROM vocabularies WHERE id = :id")
    suspend fun deleteVocabularyById(id: Long)

    // Count total vocabularies by category
    @Query("SELECT COUNT(*) FROM vocabularies WHERE category = :category")
    suspend fun countByCategory(category: String): Int

    // Count learned vocabularies by category (totalAttempts >= 1)
    @Query("SELECT COUNT(*) FROM vocabularies WHERE category = :category AND totalAttempts >= 1")
    suspend fun countLearnedByCategory(category: String): Int

    // Count total vocabularies
    @Query("SELECT COUNT(*) FROM vocabularies")
    suspend fun countAll(): Int

    // Count all learned vocabularies (totalAttempts >= 1)
    @Query("SELECT COUNT(*) FROM vocabularies WHERE totalAttempts >= 1")
    suspend fun countAllLearned(): Int
}

@Dao
interface ExampleDao {
    @Query("SELECT * FROM examples WHERE vocabularyId = :vocabularyId")
    fun getExamplesByVocabularyId(vocabularyId: Long): Flow<List<Example>>

    @Query("SELECT * FROM examples WHERE vocabularyId = :vocabularyId")
    suspend fun getExamplesByVocabularyIdSync(vocabularyId: Long): List<Example>

    @Query("SELECT * FROM examples")
    fun getAllExamples(): Flow<List<Example>>

    @Insert
    suspend fun insertExample(example: Example): Long

    @Update
    suspend fun updateExample(example: Example)

    @Delete
    suspend fun deleteExample(example: Example)

    @Query("DELETE FROM examples WHERE vocabularyId = :vocabularyId")
    suspend fun deleteExamplesByVocabularyId(vocabularyId: Long)
}

@Dao
interface VocabularyWithExamplesDao {
    @Transaction
    @Query("SELECT * FROM vocabularies ORDER BY createdAt DESC")
    fun getAllVocabulariesWithExamples(): Flow<List<VocabularyWithExamples>>

    @Transaction
    @Query("SELECT * FROM vocabularies WHERE category = :category ORDER BY createdAt DESC")
    fun getVocabulariesWithExamplesByCategory(category: String): Flow<List<VocabularyWithExamples>>

    @Transaction
    @Query("SELECT * FROM vocabularies WHERE id = :id")
    suspend fun getVocabularyWithExamplesById(id: Long): VocabularyWithExamples?

    @Transaction
    @Query("SELECT * FROM vocabularies ORDER BY RANDOM() LIMIT 1")
    suspend fun getRandomVocabularyWithExamples(): VocabularyWithExamples?

    @Transaction
    @Query("SELECT * FROM vocabularies WHERE category = :category ORDER BY RANDOM() LIMIT 1")
    suspend fun getRandomVocabularyWithExamplesByCategory(category: String): VocabularyWithExamples?
}
