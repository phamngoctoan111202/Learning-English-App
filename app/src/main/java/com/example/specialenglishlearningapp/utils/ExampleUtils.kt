package com.example.specialenglishlearningapp.utils

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

object ExampleUtils {
    private val gson = Gson()

    /**
     * Convert list of sentences to JSON string for storage
     */
    fun sentencesToJson(sentences: List<String>): String {
        return gson.toJson(sentences)
    }

    /**
     * Convert JSON string back to list of sentences
     */
    fun jsonToSentences(json: String): List<String> {
        return try {
            // Handle empty or null input
            if (json.isBlank()) {
                return emptyList()
            }
            
            // First try to parse as JSON array
            val type = object : TypeToken<List<String>>() {}.type
            val parsed = gson.fromJson<List<String>>(json, type)
            
            if (parsed != null && parsed.isNotEmpty()) {
                // Successfully parsed as JSON array
                return parsed.filter { it.isNotBlank() }
            } else {
                // If JSON parsing returns empty or null, try treating as single sentence
                Logger.d("JSON parsing returned empty, treating as single sentence: $json")
                return listOf(json.trim()).filter { it.isNotBlank() }
            }
        } catch (e: Exception) {
            Logger.d("Failed to parse as JSON, treating as single sentence: $json")
            // If JSON parsing fails, treat the entire string as a single sentence
            return listOf(json.trim()).filter { it.isNotBlank() }
        }
    }

    /**
     * Get first sentence for display purposes
     */
    fun getFirstSentence(sentences: List<String>): String {
        return sentences.firstOrNull() ?: ""
    }

    /**
     * Check if user answer matches any of the sentences
     * Now supports contractions: "it's" matches "it is", "don't" matches "do not", etc.
     */
    fun matchesAnySentence(userAnswer: String, sentences: List<String>): Boolean {
        val normalizedUserAnswer = normalize(userAnswer)
        return sentences.any { sentence ->
            val normalizedSentence = normalize(sentence)
            // Check exact match first
            if (normalizedSentence == normalizedUserAnswer) {
                return@any true
            }
            // Check if they are equivalent considering contractions
            ContractionHelper.areEquivalent(normalizedUserAnswer, normalizedSentence)
        }
    }
    
    /**
     * Normalize string for comparison (same as in LearnFragment)
     */
    private fun normalize(input: String): String {
        return input
            .trim()
            .replace('\u2019', '\'') // smart apostrophe to ASCII
            .replace("\u2018", "'")
            .replace("\u201C", "\"")
            .replace("\u201D", "\"")
            .replace(Regex("\\s+"), " ")
    }

    /**
     * Find the best matching sentence for error display
     * Now considers contractions when matching
     */
    fun findBestMatch(userAnswer: String, sentences: List<String>): String? {
        if (sentences.isEmpty()) return null

        val normalizedUserAnswer = normalize(userAnswer)

        // First try exact match (normalized)
        sentences.forEach { sentence ->
            val normalizedSentence = normalize(sentence)
            if (normalizedSentence == normalizedUserAnswer) {
                return sentence
            }
        }

        // Try matching with contraction equivalence
        sentences.forEach { sentence ->
            if (ContractionHelper.areEquivalent(normalizedUserAnswer, normalize(sentence))) {
                return sentence
            }
        }

        // If no exact match, find the most similar sentence using similarity algorithm
        var bestMatch: String? = null
        var bestScore = 0

        sentences.forEach { sentence ->
            // Calculate similarity on both original and normalized forms
            val score1 = calculateSimilarity(userAnswer, sentence)
            val score2 = calculateSimilarity(
                ContractionHelper.normalizeToFullForm(userAnswer),
                ContractionHelper.normalizeToFullForm(sentence)
            )
            val score = maxOf(score1, score2)

            if (score > bestScore) {
                bestScore = score
                bestMatch = sentence
            }
        }

        return bestMatch ?: sentences.first()
    }
    
    /**
     * Calculate similarity between two strings (0-100%)
     */
    private fun calculateSimilarity(str1: String, str2: String): Int {
        val longer = if (str1.length > str2.length) str1 else str2
        val shorter = if (str1.length > str2.length) str2 else str1
        
        if (longer.isEmpty()) return 0
        
        val editDistance = levenshteinDistance(str1.lowercase(), str2.lowercase())
        return ((longer.length - editDistance).toFloat() / longer.length * 100).toInt()
    }
    
    /**
     * Levenshtein distance calculation
     */
    private fun levenshteinDistance(s1: String, s2: String): Int {
        val costs = IntArray(s2.length + 1)
        for (i in 0..s1.length) {
            var lastValue = i
            for (j in 0..s2.length) {
                if (i == 0) {
                    costs[j] = j
                } else if (j > 0) {
                    var newValue = costs[j - 1]
                    if (s1[i - 1] != s2[j - 1]) {
                        newValue = minOf(newValue, lastValue, costs[j]) + 1
                    }
                    costs[j - 1] = lastValue
                    lastValue = newValue
                }
            }
            if (i > 0) costs[s2.length] = lastValue
        }
        return costs[s2.length]
    }
}
