package com.example.specialenglishlearningapp.utils

data class ComparisonResult(
    val isExactMatch: Boolean,
    val errorDetails: String,
    val correctAnswer: String,
    val highlightedUserAnswer: String
)

object StringComparator {
    
    fun compareStrings(userAnswer: String, correctAnswer: String): ComparisonResult {
        val trimmedUser = userAnswer.trim()
        val trimmedCorrect = correctAnswer.trim()

        if (trimmedUser == trimmedCorrect) {
            return ComparisonResult(true, "", trimmedCorrect, trimmedUser)
        }

        // Word-based comparison
        val userWords = tokenizeWords(trimmedUser)
        val correctWords = tokenizeWords(trimmedCorrect)

        val differences = findWordDifferences(userWords, correctWords)
        val punctuationReport = comparePunctuation(trimmedUser, trimmedCorrect)
        val errorDetails = buildSummaryDetails(differences, punctuationReport)
        val highlightedUser = highlightWordDifferences(userWords, differences)

        return ComparisonResult(false, errorDetails, trimmedCorrect, highlightedUser)
    }

    private fun tokenizeWords(text: String): List<String> {
        // Split by any non-letter/digit (keeps words, removes punctuation like , . ! ?)
        return text.trim()
            .split(Regex("\\W+"))
            .filter { it.isNotBlank() }
    }

    private data class WordDifference(
        val position: Int, // word index starting at 0
        val type: WordDifferenceType,
        val userWord: String?,
        val correctWord: String?,
        val description: String
    )

    private enum class WordDifferenceType {
        MISSING_WORD,  // Thiếu từ
        EXTRA_WORD,    // Thừa từ
        WRONG_WORD,    // Sai từ
        CASE_DIFFERENCE // Khác hoa thường
    }

    private fun findWordDifferences(userWords: List<String>, correctWords: List<String>): List<WordDifference> {
        val diffs = mutableListOf<WordDifference>()
        val maxLen = maxOf(userWords.size, correctWords.size)
        for (i in 0 until maxLen) {
            val uw = if (i < userWords.size) userWords[i] else null
            val cw = if (i < correctWords.size) correctWords[i] else null
            when {
                uw == null && cw != null -> diffs.add(
                    WordDifference(i, WordDifferenceType.MISSING_WORD, null, cw,
                        "Thiếu từ '$cw' ở vị trí ${i + 1}")
                )
                uw != null && cw == null -> diffs.add(
                    WordDifference(i, WordDifferenceType.EXTRA_WORD, uw, null,
                        "Thừa từ '$uw' ở vị trí ${i + 1}")
                )
                uw != null && cw != null && uw != cw -> {
                    if (uw.equals(cw, ignoreCase = true)) {
                        diffs.add(
                            WordDifference(i, WordDifferenceType.CASE_DIFFERENCE, uw, cw,
                                "Sai hoa thường: '$uw' thay vì '$cw' ở vị trí ${i + 1}")
                        )
                    } else {
                        diffs.add(
                            WordDifference(i, WordDifferenceType.WRONG_WORD, uw, cw,
                                "Sai từ: '$uw' thay vì '$cw' ở vị trí ${i + 1}")
                        )
                    }
                }
            }
        }
        return diffs
    }

    private fun buildWordErrorDetails(differences: List<WordDifference>): String {
        if (differences.isEmpty()) return ""
        val details = StringBuilder()
        details.append("Phát hiện ${differences.size} lỗi:\n\n")
        differences.forEachIndexed { index, diff ->
            details.append("${index + 1}. ${diff.description}\n")
        }
        return details.toString().trim()
    }

    private data class PunctuationReport(
        val missing: Map<String, Int>,
        val extra: Map<String, Int>
    )

    private fun comparePunctuation(user: String, correct: String): PunctuationReport {
        // Use triple-quoted string to safely include both ' and " characters
        val punctRegex = Regex("""[\.,!?:;'"]""")
        fun countMap(s: String): Map<String, Int> = punctRegex.findAll(s)
            .map { it.value }
            .groupingBy { it }
            .eachCount()
        val u = countMap(user)
        val c = countMap(correct)
        val allKeys = (u.keys + c.keys).toSet()
        val missing = mutableMapOf<String, Int>()
        val extra = mutableMapOf<String, Int>()
        for (k in allKeys) {
            val uc = u[k] ?: 0
            val cc = c[k] ?: 0
            if (cc > uc) missing[k] = cc - uc
            if (uc > cc) extra[k] = uc - cc
        }
        return PunctuationReport(missing, extra)
    }

    private fun buildSummaryDetails(differences: List<WordDifference>, punctuation: PunctuationReport): String {
        if (differences.isEmpty() && punctuation.missing.isEmpty() && punctuation.extra.isEmpty()) return ""
        val missingWords = differences.filter { it.type == WordDifferenceType.MISSING_WORD }.mapNotNull { it.correctWord }
        val extraWords = differences.filter { it.type == WordDifferenceType.EXTRA_WORD }.mapNotNull { it.userWord }
        val wrongWords = differences.filter { it.type == WordDifferenceType.WRONG_WORD }.mapNotNull { it.userWord to it.correctWord }

        val lines = mutableListOf<String>()
        lines.add("🔍 So sánh với câu gần nhất:")
        if (missingWords.isNotEmpty()) {
            lines.add("❌ Thiếu từ: " + missingWords.joinToString(", ") { "'${it}'" })
        }
        if (extraWords.isNotEmpty()) {
            lines.add("➕ Thừa từ: " + extraWords.joinToString(", ") { "'${it}'" })
        }
        if (wrongWords.isNotEmpty()) {
            lines.add("🔄 Sai từ: " + wrongWords.joinToString(", ") { (u, c) -> "'${u}'→'${c}'" })
        }
        if (punctuation.missing.isNotEmpty()) {
            val s = punctuation.missing.entries.joinToString(", ") { (k, v) -> if (v == 1) "'${k}'" else "${v}x'${k}'" }
            lines.add("❌ Thiếu dấu: $s")
        }
        if (punctuation.extra.isNotEmpty()) {
            val s = punctuation.extra.entries.joinToString(", ") { (k, v) -> if (v == 1) "'${k}'" else "${v}x'${k}'" }
            lines.add("➕ Thừa dấu: $s")
        }
        return lines.joinToString("\n")
    }

    private fun highlightWordDifferences(userWords: List<String>, differences: List<WordDifference>): String {
        if (differences.isEmpty()) return userWords.joinToString(" ")
        val diffByIndex = differences.associateBy { it.position }
        val highlighted = userWords.mapIndexed { idx, w ->
            when (diffByIndex[idx]?.type) {
                WordDifferenceType.EXTRA_WORD, WordDifferenceType.WRONG_WORD -> "🔴$w"
                WordDifferenceType.CASE_DIFFERENCE -> "🟡$w"
                else -> w
            }
        }
        return highlighted.joinToString(" ")
    }
}
