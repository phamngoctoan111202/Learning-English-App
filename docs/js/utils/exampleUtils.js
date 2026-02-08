/**
 * Example Utils - Utilities for parsing and matching examples/sentences
 * Tương đương với ExampleUtils trong Android
 */
const ExampleUtils = {
    /**
     * Parse sentences from JSON array string, multi-line, or comma-separated string
     * Returns array of individual sentences
     *
     * Handles formats:
     * - JSON array: '["sentence1", "sentence2"]'
     * - Multi-line: "sentence1\nsentence2"
     * - Single sentence: "sentence1"
     */
    parseSentences(sentencesStr) {
        if (!sentencesStr) return [];

        // Trim the input
        const trimmed = sentencesStr.trim();

        // Try to parse as JSON array first (Android stores sentences as JSON array)
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(s => String(s).trim()).filter(s => s.length > 0);
                }
            } catch (e) {
                // Not valid JSON, continue with other parsing
            }
        }

        // Split by newlines, then clean up
        const sentences = trimmed
            .split(/\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (sentences.length === 0 && trimmed.length > 0) {
            console.warn('⚠️ [ExampleUtils] No sentences parsed from non-empty input');
        }

        return sentences;
    },

    /**
     * Normalize a sentence for comparison
     */
    normalizeSentence(sentence) {
        if (!sentence) return '';

        return sentence
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')           // Multiple spaces to single
            .replace(/['']/g, "'")          // Smart quotes
            .replace(/[""]/g, '"')          // Smart double quotes
            .replace(/[.!?]+$/, '')         // Remove trailing punctuation
            .trim();
    },

    /**
     * Check if user answer matches any sentence in the example
     */
    matchesAnySentence(userAnswer, example) {
        if (!userAnswer || !example) return false;

        const normalizedAnswer = this.normalizeSentence(userAnswer);
        const sentences = this.parseSentences(example.sentences);

        for (const sentence of sentences) {
            const normalizedSentence = this.normalizeSentence(sentence);

            // Exact match
            if (normalizedAnswer === normalizedSentence) {
                return true;
            }

            // Contraction equivalence
            if (ContractionHelper.areEquivalent(normalizedAnswer, normalizedSentence)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Find best matching sentence from example
     */
    findBestMatch(userAnswer, example) {
        if (!userAnswer || !example) return null;

        const normalizedAnswer = this.normalizeSentence(userAnswer);
        const sentences = this.parseSentences(example.sentences);

        if (sentences.length === 0) return null;

        // First try exact/contraction matches
        for (const sentence of sentences) {
            const normalizedSentence = this.normalizeSentence(sentence);

            if (normalizedAnswer === normalizedSentence) {
                return { sentence, similarity: 100, isExact: true };
            }

            if (ContractionHelper.areEquivalent(normalizedAnswer, normalizedSentence)) {
                return { sentence, similarity: 100, isExact: true };
            }
        }

        // No exact match, find closest using similarity
        let bestMatch = null;
        let bestSimilarity = -1;

        for (const sentence of sentences) {
            const normalizedSentence = this.normalizeSentence(sentence);
            const similarity = StringComparator.calculateSimilarity(normalizedAnswer, normalizedSentence);

            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = sentence;
            }
        }

        return {
            sentence: bestMatch,
            similarity: bestSimilarity,
            isExact: false
        };
    },

    /**
     * Get all sentences from example as array
     */
    getAllSentences(example) {
        return this.parseSentences(example.sentences);
    },

    /**
     * Get count of sentences in example
     */
    getSentenceCount(example) {
        return this.parseSentences(example.sentences).length;
    },

    /**
     * Check if answer matches with some flexibility (90% similarity)
     */
    matchesWithFlexibility(userAnswer, example, threshold = 90) {
        if (!userAnswer || !example) return false;

        const normalizedAnswer = this.normalizeSentence(userAnswer);
        const sentences = this.parseSentences(example.sentences);

        for (const sentence of sentences) {
            const normalizedSentence = this.normalizeSentence(sentence);

            // Exact match
            if (normalizedAnswer === normalizedSentence) {
                return true;
            }

            // Contraction equivalence
            if (ContractionHelper.areEquivalent(normalizedAnswer, normalizedSentence)) {
                return true;
            }

            // Similarity threshold
            const similarity = StringComparator.calculateSimilarity(normalizedAnswer, normalizedSentence);
            if (similarity >= threshold) {
                return true;
            }
        }

        return false;
    },

    /**
     * Group examples by Vietnamese translation
     */
    groupExamplesByVietnamese(examples) {
        const groups = new Map();

        for (const example of examples) {
            const vietnamese = example.vietnamese || '';
            if (!groups.has(vietnamese)) {
                groups.set(vietnamese, []);
            }
            groups.get(vietnamese).push(example);
        }

        return groups;
    },

    /**
     * Get all Vietnamese translations from examples
     */
    getVietnameseTranslations(examples) {
        const translations = new Set();

        for (const example of examples) {
            if (example.vietnamese) {
                translations.add(example.vietnamese);
            }
        }

        return Array.from(translations);
    },

    /**
     * Find examples matching a Vietnamese translation
     */
    findExamplesByVietnamese(examples, vietnamese) {
        return examples.filter(ex =>
            this.normalizeSentence(ex.vietnamese) === this.normalizeSentence(vietnamese)
        );
    },

    /**
     * Get total sentence count across all examples
     */
    getTotalSentenceCount(examples) {
        let count = 0;
        for (const example of examples) {
            count += this.getSentenceCount(example);
        }
        return count;
    },

    /**
     * Validate example data
     */
    isValidExample(example) {
        return example &&
               example.sentences &&
               example.sentences.trim().length > 0;
    },

    /**
     * Format example for display
     */
    formatExampleForDisplay(example) {
        const sentences = this.parseSentences(example.sentences);
        return {
            sentences: sentences,
            vietnamese: example.vietnamese || '',
            sentenceCount: sentences.length
        };
    }
};
