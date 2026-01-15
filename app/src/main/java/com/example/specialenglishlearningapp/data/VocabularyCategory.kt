package com.example.specialenglishlearningapp.data

enum class VocabularyCategory(val displayName: String) {
    GENERAL("General"),
    TOEIC("TOEIC"),
    VSTEP("VSTEP"),
    SPEAKING("Speaking"),
    WRITING("Writing");

    companion object {
        fun fromString(value: String?): VocabularyCategory {
            return when (value?.uppercase()) {
                "TOEIC" -> TOEIC
                "VSTEP" -> VSTEP
                "SPEAKING" -> SPEAKING
                "WRITING" -> WRITING
                else -> GENERAL
            }
        }
    }
}
