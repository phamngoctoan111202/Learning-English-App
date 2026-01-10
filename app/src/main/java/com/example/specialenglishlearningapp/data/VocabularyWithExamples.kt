package com.example.specialenglishlearningapp.data

import androidx.room.Embedded
import androidx.room.Relation

data class VocabularyWithExamples(
    @Embedded val vocabulary: Vocabulary,
    @Relation(
        parentColumn = "id",
        entityColumn = "vocabularyId"
    )
    val examples: List<Example>
)
