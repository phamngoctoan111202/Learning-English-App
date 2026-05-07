package com.example.specialenglishlearningapp.utils

import android.content.Context
import com.example.specialenglishlearningapp.constants.AppwriteConfig
import io.appwrite.ID
import io.appwrite.Query
import io.appwrite.services.Databases
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object LearningProgressManager {
    private const val MINUTES_PER_WORD = 5
    private const val WORDS_PER_HOUR = 60 / MINUTES_PER_WORD
    private const val PROGRESS_DOCUMENT_ID = "user_learning_progress" // Fixed ID for single-user progress

    // Scope không bị tied vào fragment/activity lifecycle — tồn tại suốt vòng đời process
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var cachedStartTime: Long? = null
    private var cachedWordsLearned: Int? = null
    private var lastSyncTime: Long = 0
    private const val SYNC_INTERVAL_MS = 5 * 60 * 1000L // Sync every 5 minutes

    // Flag: chỉ fetch từ Appwrite một lần duy nhất mỗi session
    @Volatile private var isInitialized: Boolean = false

    /**
     * Initialize learning progress from Appwrite
     * Call this when app starts
     */
    suspend fun initialize(context: Context): Result<Unit> = withContext(Dispatchers.IO) {
        // Chỉ fetch từ Appwrite một lần mỗi session để tiết kiệm quota
        if (isInitialized) {
            Logger.d("✅ [LearningProgress] Already initialized, skipping Appwrite fetch")
            return@withContext Result.success(Unit)
        }

        try {
            Logger.d("🔄 [LearningProgress] Initializing...")
            val appwriteHelper = AppwriteHelper.getInstance(context)

            // Ensure authentication
            Logger.d("🔐 [LearningProgress] Checking authentication...")
            appwriteHelper.ensureSession()

            val databases = appwriteHelper.databases

            // Try to fetch existing progress
            try {
                Logger.d("📥 [LearningProgress] Fetching from Appwrite...")
                val document = databases.getDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID
                )

                val data = document.data
                cachedStartTime = (data["startTime"] as? String)?.toLongOrNull() ?: System.currentTimeMillis()
                cachedWordsLearned = (data["wordsLearned"] as? String)?.toIntOrNull() ?: 0
                lastSyncTime = System.currentTimeMillis()

                Logger.d("✅ [LearningProgress] Loaded from Appwrite: startTime=$cachedStartTime, wordsLearned=$cachedWordsLearned")
            } catch (e: Exception) {
                val isNotFound = e.message?.contains("not found", ignoreCase = true) == true ||
                    e.message?.contains("404") == true
                val alreadyExists = e.message?.contains("already exists", ignoreCase = true) == true

                if (alreadyExists) {
                    // Document exists but getDocument failed (race/permission issue) — treat as loaded with defaults
                    Logger.d("⚠️ [LearningProgress] Document exists but fetch failed, using cached/defaults")
                    cachedStartTime = cachedStartTime ?: System.currentTimeMillis()
                    cachedWordsLearned = cachedWordsLearned ?: 0
                } else if (isNotFound) {
                    // Document truly doesn't exist — create it
                    Logger.d("📝 [LearningProgress] Document not found, creating new document...")
                    val startTime = System.currentTimeMillis()
                    val data = mapOf(
                        "startTime" to startTime.toString(),
                        "wordsLearned" to "0",
                        "lastUpdated" to startTime.toString()
                    )
                    try {
                        databases.createDocument(
                            databaseId = AppwriteConfig.DATABASE_ID,
                            collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                            documentId = PROGRESS_DOCUMENT_ID,
                            data = data
                        )
                        cachedStartTime = startTime
                        cachedWordsLearned = 0
                        lastSyncTime = System.currentTimeMillis()
                        Logger.d("✅ [LearningProgress] Document created successfully!")
                    } catch (ce: Exception) {
                        if (ce.message?.contains("already exists", ignoreCase = true) == true) {
                            // Another coroutine created it first — that's fine
                            Logger.d("⚠️ [LearningProgress] Document created by concurrent call, using defaults")
                            cachedStartTime = cachedStartTime ?: startTime
                            cachedWordsLearned = cachedWordsLearned ?: 0
                        } else {
                            throw ce
                        }
                    }
                } else {
                    // Other error — log and use local fallback
                    Logger.e("⚠️ [LearningProgress] Fetch failed with unexpected error: ${e.message}")
                    cachedStartTime = cachedStartTime ?: System.currentTimeMillis()
                    cachedWordsLearned = cachedWordsLearned ?: 0
                }
                lastSyncTime = System.currentTimeMillis()
            }

            isInitialized = true
            Logger.d("🎉 [LearningProgress] Initialization complete!")
            Result.success(Unit)
        } catch (e: Exception) {
            Logger.e("❌ [LearningProgress] Initialization failed: ${e.message}", e)
            e.printStackTrace()
            // Fallback to local time if Appwrite fails
            cachedStartTime = cachedStartTime ?: System.currentTimeMillis()
            cachedWordsLearned = cachedWordsLearned ?: 0
            Result.failure(e)
        }
    }

    /**
     * Get start time (from cache or Appwrite)
     *
     * ⚠️ QUAN TRỌNG: startTime KHÔNG BAO GIỜ được thay đổi sau khi khởi tạo.
     * Nó xác định điểm bắt đầu tính toán mục tiêu và PHẢI BẤT BIẾN.
     */
    fun getStartTime(): Long {
        return cachedStartTime ?: System.currentTimeMillis()
    }

    /**
     * Get elapsed time in milliseconds since start
     */
    fun getElapsedTimeMillis(): Long {
        return System.currentTimeMillis() - getStartTime()
    }

    /**
     * Get elapsed time in hours
     */
    fun getElapsedHours(): Float {
        return getElapsedTimeMillis() / (60 * 60 * 1000f)
    }

    /**
     * Get elapsed time in minutes
     */
    fun getElapsedMinutes(): Float {
        return getElapsedTimeMillis() / (60 * 1000f)
    }

    fun getCurrentGoal(): Int {
        val elapsedMinutes = getElapsedMinutes()
        val calculatedGoal = (elapsedMinutes / MINUTES_PER_WORD).toInt().coerceAtLeast(1)
        Logger.d("Current goal: $calculatedGoal words (elapsed: ${String.format("%.2f", elapsedMinutes)} minutes = ${String.format("%.2f", getElapsedHours())} hours)")
        return calculatedGoal
    }

    /**
     * Get total words learned (from cache)
     */
    fun getWordsLearned(): Int {
        return cachedWordsLearned ?: 0
    }

    /**
     * Calculate debt (words owed)
     * Nợ = Mục tiêu hiện tại - Số từ đã học
     */
    fun getDebt(): Int {
        val debt = getCurrentGoal() - getWordsLearned()
        return debt.coerceAtLeast(0) // Never negative
    }

    /**
     * Get progress percentage
     */
    fun getProgressPercentage(): Int {
        val goal = getCurrentGoal()
        val learned = getWordsLearned()
        return if (goal > 0) (learned * 100 / goal).coerceAtMost(100) else 0
    }

    /**
     * Format elapsed time as HH:MM:SS
     */
    fun formatElapsedTime(): String {
        val elapsed = getElapsedTimeMillis()
        val hours = elapsed / (60 * 60 * 1000)
        val minutes = (elapsed % (60 * 60 * 1000)) / (60 * 1000)
        val seconds = (elapsed % (60 * 1000)) / 1000
        return String.format("%02d:%02d:%02d", hours, minutes, seconds)
    }

    /**
     * Add completed vocabulary and sync to Appwrite
     * Auto-sync every 30 seconds to ensure data is saved
     *
     * ✅ ĐẢMBẢO: Hàm này CHỈ TĂNG wordsLearned, KHÔNG BAO GIỜ GIẢM.
     */
    suspend fun addCompletedVocabulary(context: Context, forceSync: Boolean = false): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            cachedWordsLearned = (cachedWordsLearned ?: 0) + 1  // CHỈ TĂNG (+1)
            Logger.d("📚 Word completed. Total learned: $cachedWordsLearned")
            Logger.d("   Current goal: ${getCurrentGoal()}")
            Logger.d("   Debt: ${getDebt()}")

            // Always try to sync after completing a word
            val shouldSync = forceSync || (System.currentTimeMillis() - lastSyncTime) >= SYNC_INTERVAL_MS

            if (shouldSync) {
                Logger.d("🔄 Auto-syncing to Appwrite...")
                val syncResult = syncToAppwrite(context)
                if (syncResult.isFailure) {
                    Logger.e("⚠️ Sync failed but progress saved in memory: ${syncResult.exceptionOrNull()?.message}")
                }
            } else {
                val remainingSeconds = (SYNC_INTERVAL_MS - (System.currentTimeMillis() - lastSyncTime)) / 1000
                Logger.d("⏳ Sync scheduled in ${remainingSeconds}s")
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Logger.e("Failed to add completed vocabulary", e)
            Result.failure(e)
        }
    }

    /**
     * Force sync to Appwrite
     */
    suspend fun syncToAppwrite(context: Context): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            Logger.d("☁️ [LearningProgress] Starting sync to Appwrite...")
            val appwriteHelper = AppwriteHelper.getInstance(context)

            // Ensure authentication
            appwriteHelper.ensureSession()

            val databases = appwriteHelper.databases

            val data = mapOf(
                "startTime" to getStartTime().toString(),
                "wordsLearned" to getWordsLearned().toString(),
                "lastUpdated" to System.currentTimeMillis().toString()
            )

            Logger.d("📤 [LearningProgress] Sending data:")
            Logger.d("   Database: ${AppwriteConfig.DATABASE_ID}")
            Logger.d("   Collection: ${AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID}")
            Logger.d("   Document: $PROGRESS_DOCUMENT_ID")
            Logger.d("   startTime: ${getStartTime()}")
            Logger.d("   wordsLearned: ${getWordsLearned()}")
            Logger.d("   currentGoal: ${getCurrentGoal()}")
            Logger.d("   debt: ${getDebt()}")

            try {
                // Try to update existing document
                Logger.d("🔄 [LearningProgress] Attempting to update document...")
                val result = databases.updateDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID,
                    data = data
                )
                Logger.d("✅ [LearningProgress] Updated document successfully!")
                Logger.d("   Response ID: ${result.id}")
            } catch (e: Exception) {
                // Document doesn't exist, create it
                Logger.d("⚠️ [LearningProgress] Update failed: ${e.message}")
                Logger.d("📝 [LearningProgress] Creating new document...")
                val result = databases.createDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID,
                    data = data
                )
                Logger.d("✅ [LearningProgress] Created document successfully!")
                Logger.d("   Response ID: ${result.id}")
            }

            lastSyncTime = System.currentTimeMillis()
            Logger.d("🎉 [LearningProgress] Sync completed at: $lastSyncTime")
            Result.success(Unit)
        } catch (e: Exception) {
            Logger.e("❌ [LearningProgress] Sync failed: ${e.message}", e)
            Logger.e("   Exception type: ${e.javaClass.name}")
            Logger.e("   Stack trace: ${e.stackTraceToString()}")
            e.printStackTrace()
            Result.failure(e)
        }
    }

    /**
     * Reset progress (DISABLED - Mục tiêu không bao giờ được reset)
     *
     * HÀM NÀY ĐÃ BỊ VÔ HIỆU HÓA để đảm bảo mục tiêu luôn tăng dần
     * và không bao giờ bị reset về 0.
     */
    @Deprecated("Hàm này đã bị vô hiệu hóa. Mục tiêu không được phép reset.", level = DeprecationLevel.ERROR)
    suspend fun resetProgress(context: Context): Result<Unit> = withContext(Dispatchers.IO) {
        Logger.e("⛔ resetProgress() is DISABLED - Goals must never be reset!")
        Result.failure(UnsupportedOperationException("Reset progress is disabled. Goals must always increase."))
    }

    /**
     * Get level based on words learned
     */
    fun getLevel(): String {
        val learned = getWordsLearned()
        return when {
            learned >= 1000 -> "🏆 Bậc thầy"
            learned >= 500 -> "🌟 Chuyên gia"
            learned >= 200 -> "⭐ Trung cấp"
            learned >= 50 -> "📚 Đang tiến bộ"
            else -> "🌱 Mới bắt đầu"
        }
    }

    /**
     * Get detailed progress info
     */
    fun getProgressDetails(): String {
        val learned = getWordsLearned()
        val goal = getCurrentGoal()
        val debt = getDebt()
        val percentage = getProgressPercentage()
        val elapsed = formatElapsedTime()

        return buildString {
            append("Đã học: $learned/$goal từ (${percentage}%)\n")
            if (debt > 0) {
                append("Còn thiếu: $debt từ\n")
            } else {
                append("Đã hoàn thành mục tiêu!\n")
            }
            append("Thời gian: $elapsed")
        }
    }

    /**
     * Fire-and-forget: initialize using the manager's own scope (won't be cancelled by fragment lifecycle)
     */
    fun initializeInBackground(context: Context) {
        scope.launch { initialize(context) }
    }

    /**
     * Fire-and-forget: sync using the manager's own scope (won't be cancelled by fragment lifecycle)
     */
    fun syncInBackground(context: Context) {
        scope.launch { syncToAppwrite(context) }
    }

    /**
     * Fire-and-forget: add completed vocabulary using the manager's own scope
     */
    fun addCompletedVocabularyInBackground(context: Context) {
        scope.launch { addCompletedVocabulary(context, forceSync = true) }
    }

    /**
     * Test Appwrite connection and permissions
     */
    suspend fun testAppwriteConnection(context: Context): Result<String> = withContext(Dispatchers.IO) {
        try {
            Logger.d("🧪 [Test] Testing Appwrite connection...")
            val appwriteHelper = AppwriteHelper.getInstance(context)

            // Test 1: Check authentication
            Logger.d("🧪 [Test] Step 1: Checking authentication...")
            appwriteHelper.ensureSession()
            Logger.d("✅ [Test] Session active")

            // Test 2: Try to read document
            Logger.d("🧪 [Test] Step 2: Reading document...")
            val databases = appwriteHelper.databases
            try {
                val doc = databases.getDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID
                )
                Logger.d("✅ [Test] Document found: ${doc.id}")
            } catch (e: Exception) {
                Logger.d("⚠️ [Test] Document not found (will create): ${e.message}")
            }

            // Test 3: Try to write/update
            Logger.d("🧪 [Test] Step 3: Writing test data...")
            val testData = mapOf(
                "startTime" to System.currentTimeMillis().toString(),
                "wordsLearned" to "999",
                "lastUpdated" to System.currentTimeMillis().toString()
            )

            try {
                val result = databases.updateDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID,
                    data = testData
                )
                Logger.d("✅ [Test] Update successful: ${result.id}")
                Result.success("✅ Test thành công!\nDocument ID: ${result.id}")
            } catch (e: Exception) {
                Logger.d("⚠️ [Test] Update failed, trying create: ${e.message}")
                val result = databases.createDocument(
                    databaseId = AppwriteConfig.DATABASE_ID,
                    collectionId = AppwriteConfig.LEARNING_PROGRESS_COLLECTION_ID,
                    documentId = PROGRESS_DOCUMENT_ID,
                    data = testData
                )
                Logger.d("✅ [Test] Create successful: ${result.id}")
                Result.success("✅ Test thành công (tạo mới)!\nDocument ID: ${result.id}")
            }
        } catch (e: Exception) {
            Logger.e("❌ [Test] Failed: ${e.message}", e)
            Result.failure(e)
        }
    }
}
