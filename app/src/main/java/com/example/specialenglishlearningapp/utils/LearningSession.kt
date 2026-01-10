package com.example.specialenglishlearningapp.utils

object LearningSession {
    val queueVocabularyIds: MutableList<Long> = mutableListOf()
    var currentIndex: Int = -1
    var initialized: Boolean = false

    // Track completed example ids per vocabulary id
    val completedByVocabId: MutableMap<Long, MutableSet<Long>> = mutableMapOf()

    fun reset() {
        queueVocabularyIds.clear()
        currentIndex = -1
        initialized = false
        completedByVocabId.clear()
    }
}


