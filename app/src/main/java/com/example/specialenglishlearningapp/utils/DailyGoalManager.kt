package com.example.specialenglishlearningapp.utils

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.*

object DailyGoalManager {
    private const val PREFS_NAME = "daily_goal_prefs"
    private const val KEY_TODAY_COMPLETED = "today_completed"
    private const val KEY_LAST_RESET_DATE = "last_reset_date"
    private const val KEY_COMPLETED_VOCAB_IDS = "completed_vocab_ids_today"
    private const val KEY_SESSION_START_TIME = "session_start_time"

    private const val WORDS_PER_HOUR = 12

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun getTodayDate(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(Date())
    }

    fun getSessionStartTime(context: Context): Long {
        val prefs = getPrefs(context)
        var startTime = prefs.getLong(KEY_SESSION_START_TIME, 0L)
        if (startTime == 0L) {
            // First time, initialize with current time
            startTime = System.currentTimeMillis()
            prefs.edit().putLong(KEY_SESSION_START_TIME, startTime).apply()
            Logger.d("Session start time initialized: $startTime")
        }
        return startTime
    }

    fun getElapsedTimeMillis(context: Context): Long {
        val startTime = getSessionStartTime(context)
        return System.currentTimeMillis() - startTime
    }

    fun getElapsedHours(context: Context): Float {
        return getElapsedTimeMillis(context) / (60 * 60 * 1000f)
    }

    fun getCurrentGoal(context: Context): Int {
        val elapsedHours = getElapsedHours(context)
        val calculatedGoal = (elapsedHours * WORDS_PER_HOUR).toInt().coerceAtLeast(WORDS_PER_HOUR)
        Logger.d("Current goal: $calculatedGoal words (elapsed: ${String.format("%.2f", elapsedHours)} hours)")
        return calculatedGoal
    }

    fun formatElapsedTime(context: Context): String {
        val elapsed = getElapsedTimeMillis(context)
        val hours = elapsed / (60 * 60 * 1000)
        val minutes = (elapsed % (60 * 60 * 1000)) / (60 * 1000)
        val seconds = (elapsed % (60 * 1000)) / 1000
        return String.format("%02d:%02d:%02d", hours, minutes, seconds)
    }

    fun getTotalGoal(context: Context): Int {
        return getCurrentGoal(context)
    }

    fun getLevel(context: Context): String {
        val completed = getTodayCompleted(context)
        val goal = getCurrentGoal(context)
        val percentage = if (goal > 0) (completed * 100 / goal) else 0

        return when {
            percentage >= 100 -> "🏆 Xuất sắc"
            percentage >= 80 -> "⭐ Giỏi"
            percentage >= 60 -> "👍 Khá"
            percentage >= 40 -> "💪 Cố gắng"
            percentage >= 20 -> "🔥 Nỗ lực"
            else -> "⚠️ Cần cải thiện"
        }
    }

    fun getLevelDetails(context: Context): String {
        val completed = getTodayCompleted(context)
        val goal = getCurrentGoal(context)
        val percentage = if (goal > 0) (completed * 100 / goal) else 0
        val elapsed = formatElapsedTime(context)

        return "Đã học: $completed/$goal từ (${percentage}%)\nThời gian: $elapsed"
    }

    fun getTodayCompleted(context: Context): Int {
        // Return 0 as we're not tracking daily completion anymore
        return 0
    }

    fun addCompletedVocabulary(context: Context, vocabularyId: Long) {
        val prefs = getPrefs(context)
        val completedIds = getCompletedVocabIds(context).toMutableSet()

        if (completedIds.add(vocabularyId)) {
            // New vocabulary completed today
            val newCount = completedIds.size
            prefs.edit()
                .putInt(KEY_TODAY_COMPLETED, newCount)
                .putStringSet(KEY_COMPLETED_VOCAB_IDS, completedIds.map { it.toString() }.toSet())
                .apply()

            Logger.d("Vocabulary #$vocabularyId completed. Progress: $newCount/${getTotalGoal(context)}")
        }
    }

    fun getCompletedVocabIds(context: Context): Set<Long> {
        // Return empty set as we're not tracking completed vocab IDs in shared prefs anymore
        return emptySet()
    }

    fun getProgress(context: Context): Pair<Int, Int> {
        val completed = getTodayCompleted(context)
        val goal = getCurrentGoal(context)
        return completed to goal
    }

    fun getProgressPercentage(context: Context): Int {
        val (completed, goal) = getProgress(context)
        return if (goal > 0) (completed * 100 / goal).coerceAtMost(100) else 0
    }

    // Removed daily reset functionality to maintain persistent vocabulary debt
    // Vocabulary progress is now persistent across days
}
