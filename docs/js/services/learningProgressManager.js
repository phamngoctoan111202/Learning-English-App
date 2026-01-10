/**
 * Learning Progress Manager - Simple and clean implementation
 *
 * Rules:
 * - Every 5 minutes → goal increases by 1 word (12 words/hour)
 * - Complete 1 mastered word (7/10) → wordsLearned++
 * - Sync immediately to Appwrite
 * - Load from Appwrite on refresh
 */
class LearningProgressManager {
    constructor() {
        // Constants
        this.MINUTES_PER_WORD = 5; // 5 minutes = 1 word goal
        this.STORAGE_KEY = 'learning_progress';

        // State
        this.startTime = null;      // Session start time (milliseconds)
        this.wordsLearned = 0;      // Total words completed
        this.lastSyncTime = 0;      // Last sync timestamp
    }

    /**
     * Initialize - Load from Appwrite or create new session
     */
    async initialize() {
        console.log('🔄 [Progress] Initializing...');

        try {
            // Try to load from Appwrite
            await appwriteService.loginAnonymously();
            const serverData = await appwriteService.getLearningProgress();

            if (serverData && serverData.startTime) {
                // Load existing session from server
                this.startTime = parseInt(serverData.startTime);
                this.wordsLearned = parseInt(serverData.wordsLearned) || 0;
                console.log('✅ [Progress] Loaded from Appwrite:', {
                    startTime: new Date(this.startTime).toLocaleString(),
                    wordsLearned: this.wordsLearned,
                    goal: this.getCurrentGoal(),
                    debt: this.getDebt()
                });
            } else {
                // Create new session
                this.startTime = Date.now();
                this.wordsLearned = 0;
                console.log('🆕 [Progress] Created new session');

                // Sync new session to server
                await this.syncToAppwrite();
            }

            // Save to localStorage as backup
            this.saveToLocalStorage();

        } catch (error) {
            console.error('❌ [Progress] Init failed:', error);

            // Fallback to localStorage
            const localData = localStorage.getItem(this.STORAGE_KEY);
            if (localData) {
                const data = JSON.parse(localData);
                this.startTime = data.startTime || Date.now();
                this.wordsLearned = data.wordsLearned || 0;
                console.log('⚠️ [Progress] Using localStorage fallback');
            } else {
                // Last resort: create new session
                this.startTime = Date.now();
                this.wordsLearned = 0;
                console.log('🆕 [Progress] Created new local session');
            }
        }

        console.log('✅ [Progress] Initialized:', this.getSummary());
    }

    /**
     * Add completed word - Call this when user completes a sentence correctly
     */
    async addCompletedWord() {
        const oldCount = this.wordsLearned;
        this.wordsLearned++;
        const newCount = this.wordsLearned;

        console.log('✅ [Progress] Word completed:', oldCount, '→', newCount);
        console.log('   🎯 Goal:', this.getCurrentGoal());
        console.log('   💳 Debt:', this.getDebt());

        // Save locally
        this.saveToLocalStorage();

        // Sync to server immediately
        try {
            await this.syncToAppwrite();
            console.log('   ✅ Synced to Appwrite');
        } catch (error) {
            console.error('   ❌ Sync failed:', error.message);
        }

        return newCount;
    }

    /**
     * Calculate current goal based on elapsed time
     * Formula: elapsedMinutes / 5 = goal
     */
    getCurrentGoal() {
        const elapsedMinutes = this.getElapsedMinutes();
        const goal = Math.floor(elapsedMinutes / this.MINUTES_PER_WORD);
        return goal;
    }

    /**
     * Get elapsed time in minutes
     */
    getElapsedMinutes() {
        if (!this.startTime) return 0;
        const elapsed = Date.now() - this.startTime;
        return elapsed / (60 * 1000);
    }

    /**
     * Get elapsed time formatted as HH:MM:SS
     */
    getElapsedTimeFormatted() {
        if (!this.startTime) return '0:00';

        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / (60 * 60 * 1000));
        const minutes = Math.floor((elapsed % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((elapsed % (60 * 1000)) / 1000);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get debt (how many words behind schedule)
     */
    getDebt() {
        const goal = this.getCurrentGoal();
        const debt = Math.max(0, goal - this.wordsLearned);
        return debt;
    }

    /**
     * Get progress percentage
     */
    getProgressPercentage() {
        const goal = this.getCurrentGoal();
        if (goal === 0) return 0;
        const percentage = Math.min(100, Math.floor((this.wordsLearned / goal) * 100));
        return percentage;
    }

    /**
     * Get level based on progress
     */
    getLevel() {
        const percentage = this.getProgressPercentage();

        if (percentage >= 100) return 'Master';
        if (percentage >= 80) return 'Advanced';
        if (percentage >= 60) return 'Intermediate';
        if (percentage >= 40) return 'Beginner';
        if (percentage >= 20) return 'Novice';
        return 'Starting';
    }

    /**
     * Get time status class (for UI coloring)
     */
    getTimeStatusClass() {
        const debt = this.getDebt();
        if (debt === 0) return 'success';
        if (debt < 5) return 'warning';
        return 'danger';
    }

    /**
     * Get summary object (for UI display)
     */
    getSummary() {
        return {
            wordsLearned: this.wordsLearned,
            goal: this.getCurrentGoal(),
            debt: this.getDebt(),
            progressPercentage: this.getProgressPercentage(),
            level: this.getLevel(),
            elapsedTime: this.getElapsedTimeFormatted(),
            timeStatusClass: this.getTimeStatusClass()
        };
    }

    /**
     * Save to localStorage (backup)
     */
    saveToLocalStorage() {
        const data = {
            startTime: this.startTime,
            wordsLearned: this.wordsLearned,
            lastUpdated: Date.now()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    /**
     * Sync to Appwrite
     */
    async syncToAppwrite() {
        if (!this.startTime) {
            console.warn('⚠️ [Progress] Cannot sync: startTime is null');
            return;
        }

        await appwriteService.saveLearningProgress({
            startTime: this.startTime,
            wordsLearned: this.wordsLearned
        });

        this.lastSyncTime = Date.now();
    }

    /**
     * Reset progress (start new session)
     */
    async resetProgress() {
        console.log('🔄 [Progress] Resetting...');

        this.startTime = Date.now();
        this.wordsLearned = 0;

        this.saveToLocalStorage();
        await this.syncToAppwrite();

        console.log('✅ [Progress] Reset complete');
    }

    /**
     * Debug info
     */
    debug() {
        const summary = this.getSummary();
        console.log('🐛 [Progress] Debug Info:');
        console.table(summary);
        console.log('   Start time:', new Date(this.startTime).toLocaleString());
        console.log('   Elapsed minutes:', this.getElapsedMinutes().toFixed(2));
        return summary;
    }
}

// Global instance
const learningProgressManager = new LearningProgressManager();

// Debug command
window.debugProgress = () => learningProgressManager.debug();
window.resetProgress = () => learningProgressManager.resetProgress();
