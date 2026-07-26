package com.example.specialenglishlearningapp.data

enum class VocabularyCategory(val displayName: String) {
    GENERAL("General"),
    TOEIC("TOEIC"),
    VSTEP("VSTEP"),
    SPEAKING("Speaking"),
    WRITING("Writing"),
    POPULAR_TOPICS("Popular topics"),
    TECHNICAL_BACKEND("Backend"),
    TECHNICAL_MOBILE("Mobile");

    companion object {
        fun fromString(value: String?): VocabularyCategory {
            return when (value?.uppercase()) {
                "TOEIC" -> TOEIC
                "VSTEP" -> VSTEP
                "SPEAKING" -> SPEAKING
                "WRITING" -> WRITING
                "POPULAR_TOPICS", "POPULAR TOPICS" -> POPULAR_TOPICS
                "TECHNICAL_BACKEND", "BACKEND" -> TECHNICAL_BACKEND
                "TECHNICAL_MOBILE", "MOBILE" -> TECHNICAL_MOBILE
                "TECHNICAL" -> TECHNICAL_BACKEND
                else -> GENERAL
            }
        }
    }
}
