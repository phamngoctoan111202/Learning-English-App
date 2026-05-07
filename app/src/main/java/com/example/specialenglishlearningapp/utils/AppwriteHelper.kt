package com.example.specialenglishlearningapp.utils

import android.content.Context
import com.example.specialenglishlearningapp.constants.AppwriteConfig
import io.appwrite.Client
import io.appwrite.ID
import io.appwrite.models.Session
import io.appwrite.models.User
import io.appwrite.services.Account
import io.appwrite.services.Databases
import io.appwrite.exceptions.AppwriteException

class AppwriteHelper private constructor(context: Context) {
    private val client: Client
    val account: Account
    val databases: Databases

    init {
        client = Client(context)
            .setEndpoint(AppwriteConfig.APPWRITE_PUBLIC_ENDPOINT)
            .setProject(AppwriteConfig.APPWRITE_PROJECT_ID)

        account = Account(client)
        databases = Databases(client)
    }

    companion object {
        @Volatile
        private var instance: AppwriteHelper? = null

        fun getInstance(context: Context): AppwriteHelper = 
            instance ?: synchronized(this) {
                instance ?: AppwriteHelper(context).also { instance = it }
            }
    }

    interface AuthCallback<T> {
        fun onSuccess(result: T)
        fun onError(error: Exception)
    }

    // Using suspend functions for Kotlin coroutine compatibility
    // Login
    suspend fun login(email: String, password: String): Session {
        return account.createEmailPasswordSession(email = email, password = password)
    }

    // Register
    suspend fun register(email: String, password: String): User<Map<String, Any>> {
        return account.create(userId = ID.unique(), email = email, password = password)
    }

    // Logout
    suspend fun logout() {
        account.deleteSession(sessionId = "current")
    }

    // Anonymous login for public access — safe to call even when a session is active
    suspend fun loginAnonymously(): Session {
        return try {
            account.createAnonymousSession()
        } catch (e: AppwriteException) {
            // If a session is already active, just return the current one
            if (e.message?.contains("session is active", ignoreCase = true) == true ||
                e.message?.contains("session is prohibited", ignoreCase = true) == true) {
                account.getSession("current")
            } else {
                throw e
            }
        }
    }

    // Check if user is logged in
    suspend fun getCurrentUser(): User<Map<String, Any>>? {
        return try {
            account.get()
        } catch (e: AppwriteException) {
            null
        }
    }

    // Ensure there is an active session (anonymous or otherwise)
    suspend fun ensureSession() {
        val user = getCurrentUser()
        if (user == null) {
            loginAnonymously()
        }
    }
}
