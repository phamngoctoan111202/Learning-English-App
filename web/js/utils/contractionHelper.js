/**
 * Contraction Helper - Handle English contractions
 * Tương đương với ContractionHelper trong Android
 */
const ContractionHelper = {
    // Map of contractions to their expanded forms
    contractionMap: {
        "i'm": ["i am"],
        "i've": ["i have"],
        "i'll": ["i will", "i shall"],
        "i'd": ["i would", "i had"],
        "you're": ["you are"],
        "you've": ["you have"],
        "you'll": ["you will"],
        "you'd": ["you would", "you had"],
        "he's": ["he is", "he has"],
        "he'll": ["he will"],
        "he'd": ["he would", "he had"],
        "she's": ["she is", "she has"],
        "she'll": ["she will"],
        "she'd": ["she would", "she had"],
        "it's": ["it is", "it has"],
        "it'll": ["it will"],
        "it'd": ["it would"],
        "we're": ["we are"],
        "we've": ["we have"],
        "we'll": ["we will"],
        "we'd": ["we would", "we had"],
        "they're": ["they are"],
        "they've": ["they have"],
        "they'll": ["they will"],
        "they'd": ["they would", "they had"],
        "that's": ["that is", "that has"],
        "that'll": ["that will"],
        "that'd": ["that would", "that had"],
        "who's": ["who is", "who has"],
        "who'll": ["who will"],
        "who'd": ["who would", "who had"],
        "what's": ["what is", "what has"],
        "what'll": ["what will"],
        "what'd": ["what would", "what had"],
        "where's": ["where is", "where has"],
        "where'll": ["where will"],
        "where'd": ["where would", "where had"],
        "when's": ["when is", "when has"],
        "when'll": ["when will"],
        "when'd": ["when would", "when had"],
        "why's": ["why is", "why has"],
        "why'll": ["why will"],
        "why'd": ["why would", "why had"],
        "how's": ["how is", "how has"],
        "how'll": ["how will"],
        "how'd": ["how would", "how had"],
        "there's": ["there is", "there has"],
        "there'll": ["there will"],
        "there'd": ["there would", "there had"],
        "here's": ["here is", "here has"],
        "here'll": ["here will"],
        "isn't": ["is not"],
        "aren't": ["are not"],
        "wasn't": ["was not"],
        "weren't": ["were not"],
        "haven't": ["have not"],
        "hasn't": ["has not"],
        "hadn't": ["had not"],
        "won't": ["will not"],
        "wouldn't": ["would not"],
        "don't": ["do not"],
        "doesn't": ["does not"],
        "didn't": ["did not"],
        "can't": ["cannot", "can not"],
        "couldn't": ["could not"],
        "shouldn't": ["should not"],
        "mightn't": ["might not"],
        "mustn't": ["must not"],
        "needn't": ["need not"],
        "let's": ["let us"],
        "ain't": ["am not", "is not", "are not", "has not", "have not"],
        "y'all": ["you all"],
        "ma'am": ["madam"],
        "o'clock": ["of the clock"],
        "'cause": ["because"],
        "'til": ["until"],
        "'em": ["them"],
        "gonna": ["going to"],
        "gotta": ["got to", "have got to"],
        "wanna": ["want to"],
        "gimme": ["give me"],
        "lemme": ["let me"],
        "kinda": ["kind of"],
        "sorta": ["sort of"],
        "outta": ["out of"],
        "lotta": ["lot of"],
        "coulda": ["could have"],
        "woulda": ["would have"],
        "shoulda": ["should have"],
        "musta": ["must have"],
        "mighta": ["might have"],
        "oughta": ["ought to"]
    },

    /**
     * Normalize a string by replacing smart quotes and trimming
     */
    normalize(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"')
            .trim();
    },

    /**
     * Get all possible expansions of a contraction
     */
    getExpansions(contraction) {
        const normalized = this.normalize(contraction);
        return this.contractionMap[normalized] || [normalized];
    },

    /**
     * Expand all contractions in a sentence
     */
    expandContractions(text) {
        if (!text) return '';

        let result = this.normalize(text);

        for (const [contraction, expansions] of Object.entries(this.contractionMap)) {
            const regex = new RegExp(`\\b${contraction.replace("'", "'")}\\b`, 'gi');
            result = result.replace(regex, expansions[0]);
        }

        return result;
    },

    /**
     * Contract expansions back to contractions
     */
    contractText(text) {
        if (!text) return '';

        let result = this.normalize(text);

        // Create reverse map (expansion -> contraction)
        const reverseMap = {};
        for (const [contraction, expansions] of Object.entries(this.contractionMap)) {
            for (const expansion of expansions) {
                reverseMap[expansion] = contraction;
            }
        }

        for (const [expansion, contraction] of Object.entries(reverseMap)) {
            const regex = new RegExp(`\\b${expansion}\\b`, 'gi');
            result = result.replace(regex, contraction);
        }

        return result;
    },

    /**
     * Check if two strings are equivalent considering contractions
     */
    areEquivalent(text1, text2) {
        if (!text1 || !text2) return false;

        const norm1 = this.normalize(text1);
        const norm2 = this.normalize(text2);

        // Direct match
        if (norm1 === norm2) return true;

        // Compare expanded forms
        const expanded1 = this.expandContractions(norm1);
        const expanded2 = this.expandContractions(norm2);

        if (expanded1 === expanded2) return true;

        // Compare contracted forms
        const contracted1 = this.contractText(norm1);
        const contracted2 = this.contractText(norm2);

        if (contracted1 === contracted2) return true;

        // Cross-compare
        if (expanded1 === norm2 || norm1 === expanded2) return true;
        if (contracted1 === norm2 || norm1 === contracted2) return true;

        return false;
    },

    /**
     * Generate all possible variants of a sentence (with/without contractions)
     */
    generateVariants(text) {
        if (!text) return [];

        const variants = new Set();
        const normalized = this.normalize(text);

        variants.add(normalized);
        variants.add(this.expandContractions(normalized));
        variants.add(this.contractText(normalized));

        return Array.from(variants);
    }
};
