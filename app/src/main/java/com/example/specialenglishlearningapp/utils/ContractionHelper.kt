package com.example.specialenglishlearningapp.utils

/**
 * Helper class for handling English contractions
 * Normalizes contractions and full forms so they can be matched interchangeably
 * Example: "it's" matches "it is", "don't" matches "do not", etc.
 */
object ContractionHelper {

    // Map of contractions to their full forms
    // Key: contraction (lowercase), Value: list of possible full forms
    private val contractionMap = mapOf(
        // BE verb contractions
        "i'm" to listOf("i am"),
        "you're" to listOf("you are"),
        "he's" to listOf("he is", "he has"),
        "she's" to listOf("she is", "she has"),
        "it's" to listOf("it is", "it has"),
        "we're" to listOf("we are"),
        "they're" to listOf("they are"),
        "that's" to listOf("that is", "that has"),
        "there's" to listOf("there is", "there has"),
        "here's" to listOf("here is", "here has"),
        "who's" to listOf("who is", "who has"),
        "what's" to listOf("what is", "what has"),
        "where's" to listOf("where is", "where has"),
        "when's" to listOf("when is", "when has"),
        "why's" to listOf("why is", "why has"),
        "how's" to listOf("how is", "how has"),

        // Negative contractions
        "isn't" to listOf("is not"),
        "aren't" to listOf("are not"),
        "wasn't" to listOf("was not"),
        "weren't" to listOf("were not"),
        "haven't" to listOf("have not"),
        "hasn't" to listOf("has not"),
        "hadn't" to listOf("had not"),
        "won't" to listOf("will not"),
        "wouldn't" to listOf("would not"),
        "don't" to listOf("do not"),
        "doesn't" to listOf("does not"),
        "didn't" to listOf("did not"),
        "can't" to listOf("cannot", "can not"),
        "couldn't" to listOf("could not"),
        "shouldn't" to listOf("should not"),
        "mightn't" to listOf("might not"),
        "mustn't" to listOf("must not"),
        "needn't" to listOf("need not"),

        // Modal contractions
        "i'll" to listOf("i will", "i shall"),
        "you'll" to listOf("you will", "you shall"),
        "he'll" to listOf("he will", "he shall"),
        "she'll" to listOf("she will", "she shall"),
        "it'll" to listOf("it will", "it shall"),
        "we'll" to listOf("we will", "we shall"),
        "they'll" to listOf("they will", "they shall"),
        "that'll" to listOf("that will", "that shall"),

        "i'd" to listOf("i would", "i had"),
        "you'd" to listOf("you would", "you had"),
        "he'd" to listOf("he would", "he had"),
        "she'd" to listOf("she would", "she had"),
        "it'd" to listOf("it would", "it had"),
        "we'd" to listOf("we would", "we had"),
        "they'd" to listOf("they would", "they had"),
        "that'd" to listOf("that would", "that had"),

        "i've" to listOf("i have"),
        "you've" to listOf("you have"),
        "we've" to listOf("we have"),
        "they've" to listOf("they have"),
        "could've" to listOf("could have"),
        "should've" to listOf("should have"),
        "would've" to listOf("would have"),
        "might've" to listOf("might have"),
        "must've" to listOf("must have"),

        // Informal contractions
        "ain't" to listOf("am not", "is not", "are not", "has not", "have not"),
        "gonna" to listOf("going to"),
        "wanna" to listOf("want to"),
        "gotta" to listOf("got to", "have got to"),
        "oughta" to listOf("ought to"),

        // Let's
        "let's" to listOf("let us"),

        // Other common contractions
        "ma'am" to listOf("madam"),
        "o'clock" to listOf("of the clock"),
        "y'all" to listOf("you all")
    )

    // Reverse map: full form -> contractions
    private val fullFormMap: Map<String, List<String>> by lazy {
        val map = mutableMapOf<String, MutableList<String>>()
        contractionMap.forEach { (contraction, fullForms) ->
            fullForms.forEach { fullForm ->
                map.getOrPut(fullForm) { mutableListOf() }.add(contraction)
            }
        }
        map
    }

    /**
     * Normalize a sentence by expanding all contractions to their full forms
     * This allows "it's" to match "it is"
     */
    fun normalizeToFullForm(text: String): String {
        var normalized = text.lowercase().trim()

        // Replace smart quotes with ASCII apostrophes first
        normalized = normalized
            .replace('\u2019', '\'')
            .replace("\u2018", "'")

        // Expand each contraction to its first full form
        contractionMap.forEach { (contraction, fullForms) ->
            val regex = Regex("\\b$contraction\\b", RegexOption.IGNORE_CASE)
            normalized = regex.replace(normalized, fullForms.first())
        }

        // Normalize whitespace
        return normalized.replace(Regex("\\s+"), " ").trim()
    }

    /**
     * Normalize a sentence by converting full forms to contractions
     * This allows "it is" to match "it's"
     */
    fun normalizeToContraction(text: String): String {
        var normalized = text.lowercase().trim()

        // Replace smart quotes with ASCII apostrophes first
        normalized = normalized
            .replace('\u2019', '\'')
            .replace("\u2018", "'")

        // Replace full forms with their contractions
        fullFormMap.forEach { (fullForm, contractions) ->
            val regex = Regex("\\b$fullForm\\b", RegexOption.IGNORE_CASE)
            normalized = regex.replace(normalized, contractions.first())
        }

        // Normalize whitespace
        return normalized.replace(Regex("\\s+"), " ").trim()
    }

    /**
     * Check if two sentences are equivalent considering contractions
     * Returns true if they match either as contractions or full forms
     */
    fun areEquivalent(text1: String, text2: String): Boolean {
        // Normalize both to full form and compare
        val normalized1 = normalizeToFullForm(text1)
        val normalized2 = normalizeToFullForm(text2)

        return normalized1 == normalized2
    }

    /**
     * Generate all possible variations of a sentence with contractions/expansions
     * Example: "it's good" -> ["it's good", "it is good"]
     */
    fun getAllVariations(text: String): List<String> {
        val variations = mutableSetOf<String>()

        // Add original
        variations.add(text.trim())

        // Add fully expanded version
        variations.add(normalizeToFullForm(text))

        // Add fully contracted version
        variations.add(normalizeToContraction(text))

        return variations.toList()
    }

    /**
     * Get a user-friendly explanation of contraction equivalence
     */
    fun getEquivalenceExplanation(contraction: String, fullForm: String): String {
        val contractionLower = contraction.lowercase()
        val fullFormLower = fullForm.lowercase()

        // Check if they are in our map
        contractionMap[contractionLower]?.let { fullForms ->
            if (fullFormLower in fullForms) {
                return "✓ '$contraction' = '$fullForm' (viết tắt hợp lệ)"
            }
        }

        fullFormMap[fullFormLower]?.let { contractions ->
            if (contractionLower in contractions) {
                return "✓ '$fullForm' = '$contraction' (viết đầy đủ hợp lệ)"
            }
        }

        return ""
    }
}
