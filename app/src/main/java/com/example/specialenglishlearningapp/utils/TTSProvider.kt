package com.example.specialenglishlearningapp.utils

import java.io.File

/**
 * Interface for Text-to-Speech providers
 * Định nghĩa contract chung cho tất cả các TTS providers
 */
interface TTSProvider {
    /**
     * Provider name for logging
     */
    val providerName: String

    /**
     * Fetches audio from the TTS API and saves to the provided cache file
     *
     * @param text Text to convert to speech
     * @param cacheFile File to save the audio data
     * @return Result indicating success or failure with error message
     */
    suspend fun fetchAudio(text: String, cacheFile: File): Result<Unit>

    /**
     * Checks if the provider is properly configured
     */
    fun isConfigured(): Boolean
}
