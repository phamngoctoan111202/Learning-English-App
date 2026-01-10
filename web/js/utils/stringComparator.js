/**
 * String Comparator - String similarity and comparison utilities
 * Tương đương với StringComparator trong Android
 */
const StringComparator = {
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;

        // Create 2D array for dynamic programming
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        // Initialize base cases
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],     // deletion
                        dp[i][j - 1],     // insertion
                        dp[i - 1][j - 1]  // substitution
                    );
                }
            }
        }

        return dp[m][n];
    },

    /**
     * Calculate similarity percentage between two strings
     */
    calculateSimilarity(str1, str2) {
        if (!str1 && !str2) return 100;
        if (!str1 || !str2) return 0;

        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();

        if (s1 === s2) return 100;

        const distance = this.levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);

        if (maxLength === 0) return 100;

        return Math.round((1 - distance / maxLength) * 100);
    },

    /**
     * Get detailed character-by-character comparison
     */
    getDetailedComparison(userAnswer, correctAnswer) {
        const user = userAnswer.toLowerCase().trim();
        const correct = correctAnswer.toLowerCase().trim();

        const result = {
            userFormatted: [],
            correctFormatted: [],
            errors: []
        };

        // Use LCS (Longest Common Subsequence) approach for alignment
        const m = user.length;
        const n = correct.length;

        // Build LCS matrix
        const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (user[i - 1] === correct[j - 1]) {
                    lcs[i][j] = lcs[i - 1][j - 1] + 1;
                } else {
                    lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
                }
            }
        }

        // Backtrack to find alignment
        let i = m, j = n;
        const userChars = [];
        const correctChars = [];

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && user[i - 1] === correct[j - 1]) {
                userChars.unshift({ char: user[i - 1], type: 'correct' });
                correctChars.unshift({ char: correct[j - 1], type: 'correct' });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
                // Missing character in user answer
                userChars.unshift({ char: '_', type: 'missing' });
                correctChars.unshift({ char: correct[j - 1], type: 'missing' });
                result.errors.push({
                    type: 'missing',
                    position: j - 1,
                    expected: correct[j - 1]
                });
                j--;
            } else if (i > 0) {
                // Extra character in user answer
                userChars.unshift({ char: user[i - 1], type: 'wrong' });
                correctChars.unshift({ char: ' ', type: 'extra' });
                result.errors.push({
                    type: 'extra',
                    position: i - 1,
                    got: user[i - 1]
                });
                i--;
            }
        }

        result.userFormatted = userChars;
        result.correctFormatted = correctChars;

        return result;
    },

    /**
     * Generate HTML for character comparison display
     */
    generateComparisonHTML(userAnswer, correctAnswer) {
        const comparison = this.getDetailedComparison(userAnswer, correctAnswer);
        const similarity = this.calculateSimilarity(userAnswer, correctAnswer);

        let userHTML = '';
        let correctHTML = '';

        for (const item of comparison.userFormatted) {
            const cssClass = `char-${item.type}`;
            userHTML += `<span class="${cssClass}">${item.char}</span>`;
        }

        for (const item of comparison.correctFormatted) {
            const cssClass = item.type === 'correct' ? 'char-correct' :
                            item.type === 'missing' ? 'char-missing' : '';
            correctHTML += `<span class="${cssClass}">${item.char}</span>`;
        }

        return {
            userHTML,
            correctHTML,
            similarity,
            errorCount: comparison.errors.length
        };
    },

    /**
     * Find the best matching string from a list
     */
    findBestMatch(target, candidates) {
        if (!candidates || candidates.length === 0) return null;

        let bestMatch = null;
        let bestSimilarity = -1;

        for (const candidate of candidates) {
            const similarity = this.calculateSimilarity(target, candidate);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = candidate;
            }
        }

        return {
            match: bestMatch,
            similarity: bestSimilarity
        };
    },

    /**
     * Normalize string for comparison
     */
    normalize(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')           // Multiple spaces to single
            .replace(/['']/g, "'")          // Smart quotes
            .replace(/[""]/g, '"')          // Smart double quotes
            .replace(/[.!?]+$/, '')         // Trailing punctuation
            .trim();
    },

    /**
     * Check if two strings are approximately equal
     */
    approximatelyEqual(str1, str2, threshold = 85) {
        return this.calculateSimilarity(str1, str2) >= threshold;
    }
};
