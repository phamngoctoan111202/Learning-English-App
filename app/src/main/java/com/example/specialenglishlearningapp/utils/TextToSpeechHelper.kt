package com.example.specialenglishlearningapp.utils

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest

/**
 * Helper class for Text-to-Speech functionality
 * Hỗ trợ nhiều TTS providers với fallback logic:
 * 1. Thử tất cả ElevenLabs API keys
 * 2. Nếu tất cả fail → fallback sang TTSOpenAI
 *
 * NOTE: Cần cấu hình API keys cho các providers bên dưới
 */
class TextToSpeechHelper(private val context: Context) {

    // --- CẤU HÌNH CỦA BẠN ---

    // ElevenLabs API Keys - https://elevenlabs.io/
    private val ELEVENLABS_API_KEYS = listOf(
        "sk_daed3b18295611ce6ab85526f93447826ce36e8964d984f1",
        "sk_36c2fc116f03281e93f9218e17a889a6935a9f26aaed1e07",
        "sk_b1d9abefc5c55660d54e591ff322e1373eb5aafeaf87be85"
    )
    private val ELEVENLABS_VOICE_ID = "2EiwWnXFnvU5JabPnv8n" // Adam voice

    // TTSOpenAI API Keys - https://ttsopenai.com/
    private val TTSOPENAI_API_KEYS = listOf(
        "tts-f8e8cebe9e94a16c31ceec7df3416b08",
        "tts-3d0b697a86e6b6298790fa7377dd1da9",
        // Thêm các keys khác ở đây
    )
    private val TTSOPENAI_MODEL = "tts-1" // "tts-1" hoặc "tts-1-hd"
    private val TTSOPENAI_VOICE = "alloy" // alloy, echo, fable, onyx, nova, shimmer

    // -------------------------

    private var mediaPlayer: MediaPlayer? = null
    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    // Initialize providers
    private val elevenLabsProvider = ElevenLabsTTSProvider(
        apiKeys = ELEVENLABS_API_KEYS,
        voiceId = ELEVENLABS_VOICE_ID
    )

    private val ttsOpenAIProvider = TTSOpenAIProvider(
        apiKeys = TTSOPENAI_API_KEYS,
        model = TTSOPENAI_MODEL,
        voice = TTSOPENAI_VOICE
    )

    /**
     * Speaks the given text, using a local cache to avoid repeated API calls.
     * Fallback logic: ElevenLabs → TTSOpenAI
     */
    fun speak(text: String) {
        if (text.isBlank()) {
            Logger.w("TTS", "Empty text, nothing to speak")
            return
        }

        if (!elevenLabsProvider.isConfigured() && !ttsOpenAIProvider.isConfigured()) {
            Logger.e("TTS", "No TTS providers configured. Please update API keys in TextToSpeechHelper.kt")
            return
        }

        coroutineScope.launch {
            val cacheFile = getCacheFileForText(text)
            if (cacheFile.exists()) {
                Logger.d("TTS", "💾 Cache hit for '$text'. Playing from local file.")
                withContext(Dispatchers.Main) {
                    playAudioFile(cacheFile.absolutePath)
                }
            } else {
                Logger.d("TTS", "🌐 Cache miss for '$text'. Fetching from API with fallback logic...")
                fetchAndPlay(text, cacheFile)
            }
        }
    }

    /**
     * Fetches audio from TTS providers with fallback logic:
     * 1. Try all ElevenLabs API keys
     * 2. If all fail → try all TTSOpenAI API keys
     */
    private suspend fun fetchAndPlay(text: String, cacheFile: File) {
        coroutineScope.launch {
            var success = false

            // Step 1: Thử ElevenLabs provider
            if (elevenLabsProvider.isConfigured()) {
                Logger.d("TTS", "🎯 [Step 1/2] Trying ElevenLabs provider...")
                val result = elevenLabsProvider.fetchAudio(text, cacheFile)
                if (result.isSuccess) {
                    Logger.d("TTS", "✅ [Step 1/2] ElevenLabs succeeded!")
                    success = true
                    withContext(Dispatchers.Main) {
                        playAudioFile(cacheFile.absolutePath)
                    }
                    return@launch
                } else {
                    Logger.w("TTS", "⚠️ [Step 1/2] ElevenLabs failed: ${result.exceptionOrNull()?.message}")
                }
            } else {
                Logger.w("TTS", "⚠️ [Step 1/2] ElevenLabs not configured, skipping...")
            }

            // Step 2: Fallback sang TTSOpenAI provider
            if (ttsOpenAIProvider.isConfigured()) {
                Logger.d("TTS", "🎯 [Step 2/2] Fallback to TTSOpenAI provider...")
                val result = ttsOpenAIProvider.fetchAudio(text, cacheFile)
                if (result.isSuccess) {
                    Logger.d("TTS", "✅ [Step 2/2] TTSOpenAI succeeded!")
                    success = true
                    withContext(Dispatchers.Main) {
                        playAudioFile(cacheFile.absolutePath)
                    }
                    return@launch
                } else {
                    Logger.e("TTS", "❌ [Step 2/2] TTSOpenAI failed: ${result.exceptionOrNull()?.message}")
                }
            } else {
                Logger.w("TTS", "⚠️ [Step 2/2] TTSOpenAI not configured, skipping...")
            }

            // Nếu tất cả providers đều thất bại
            if (!success) {
                Logger.e("TTS", "❌❌❌ All TTS providers failed for text: '$text'")
            }
        }
    }

    private fun playAudioFile(filePath: String) {
        // Stop any currently playing audio
        stop()

        try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(filePath)
                prepareAsync() // Asynchronous preparation

                setOnPreparedListener { mp ->
                    Logger.d("TTS", "🎵 MediaPlayer prepared, starting playback.")
                    mp.start()
                }

                setOnCompletionListener { mp ->
                    Logger.d("TTS", "✅ Playback completed.")
                    mp.release()
                    mediaPlayer = null
                }

                setOnErrorListener { mp, what, extra ->
                    Logger.e("TTS", "❌ MediaPlayer Error: what=$what, extra=$extra")
                    mp.release()
                    mediaPlayer = null
                    true
                }
            }
        } catch (e: Exception) {
            Logger.e("TTS", "Error playing audio file: ${e.message}", e)
        }
    }

    private fun getCacheFileForText(text: String): File {
        val fileName = text.toSha256() + ".mp3"
        return File(context.cacheDir, fileName)
    }

    private fun String.toSha256(): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(this.toByteArray())
            .fold("") { str, it -> str + "%02x".format(it) }
    }

    fun stop() {
        if (mediaPlayer?.isPlaying == true) {
            Logger.d("TTS", "⏸️ Stopping current playback.")
            mediaPlayer?.stop()
        }
        mediaPlayer?.release()
        mediaPlayer = null
    }

    fun isSpeaking(): Boolean {
        return mediaPlayer?.isPlaying ?: false
    }

    fun shutdown() {
        Logger.d("TTS", "🛑 Shutting down TextToSpeechHelper.")
        stop()
    }

    // --- Các hàm không còn cần thiết với API, giữ lại để tương thích ---
    fun setSpeechRate(rate: Float) {
        Logger.w("TTS", "setSpeechRate is not supported with API-based TTS.")
    }

    fun setProgressListener(listener: UtteranceProgressListener) {
        Logger.w("TTS", "setProgressListener is not directly supported.")
    }
}
