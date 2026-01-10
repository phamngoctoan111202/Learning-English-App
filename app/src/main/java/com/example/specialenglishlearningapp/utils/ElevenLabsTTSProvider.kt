package com.example.specialenglishlearningapp.utils

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * ElevenLabs TTS Provider
 * Hỗ trợ retry với nhiều API keys
 */
class ElevenLabsTTSProvider(
    private val apiKeys: List<String>,
    private val voiceId: String = "2EiwWnXFnvU5JabPnv8n" // Default: Adam voice
) : TTSProvider {

    override val providerName: String = "ElevenLabs"
    private val client = OkHttpClient()

    override fun isConfigured(): Boolean {
        return apiKeys.isNotEmpty() && apiKeys.all { it.isNotBlank() }
    }

    override suspend fun fetchAudio(text: String, cacheFile: File): Result<Unit> {
        if (!isConfigured()) {
            return Result.failure(IllegalStateException("ElevenLabs API keys not configured"))
        }

        Logger.d("TTS_ElevenLabs", "🎤 [ElevenLabs] Requesting speech for: '$text'")

        var lastError: Exception? = null

        // Thử lần lượt từng API key cho đến khi thành công
        for ((index, apiKey) in apiKeys.withIndex()) {
            try {
                Logger.d("TTS_ElevenLabs", "🔑 [ElevenLabs] Trying API key ${index + 1}/${apiKeys.size} (${apiKey.take(10)}...)")

                val audioUrl = "https://api.elevenlabs.io/v1/text-to-speech/$voiceId/stream"

                val jsonBody = JSONObject().apply {
                    put("text", text)
                    put("model_id", "eleven_multilingual_v2") // Model hỗ trợ nhiều ngôn ngữ
                    put("voice_settings", JSONObject().apply {
                        put("stability", 0.5)
                        put("similarity_boost", 0.75)
                    })
                }.toString()

                val request = Request.Builder()
                    .url(audioUrl)
                    .header("Accept", "audio/mpeg")
                    .header("Content-Type", "application/json")
                    .header("xi-api-key", apiKey)
                    .post(jsonBody.toRequestBody("application/json".toMediaType()))
                    .build()

                val response = withContext(Dispatchers.IO) {
                    client.newCall(request).execute()
                }

                if (response.isSuccessful) {
                    val audioData = response.body?.byteStream()
                    if (audioData != null) {
                        withContext(Dispatchers.IO) {
                            audioData.use { inputStream ->
                                cacheFile.outputStream().use { outputStream ->
                                    inputStream.copyTo(outputStream)
                                }
                            }
                        }
                        Logger.d("TTS_ElevenLabs", "✅ [ElevenLabs] Successfully fetched audio using API key ${index + 1}/${apiKeys.size}")
                        return Result.success(Unit)
                    } else {
                        val error = IOException("Response body is null")
                        Logger.w("TTS_ElevenLabs", "❌ [ElevenLabs] API key ${index + 1}/${apiKeys.size} failed: ${error.message}")
                        lastError = error
                    }
                } else {
                    val errorBody = response.body?.string()
                    val error = IOException("API request failed with code ${response.code}: $errorBody")
                    Logger.w("TTS_ElevenLabs", "❌ [ElevenLabs] API key ${index + 1}/${apiKeys.size} failed: ${error.message}")
                    lastError = error
                }
            } catch (e: IOException) {
                Logger.w("TTS_ElevenLabs", "❌ [ElevenLabs] API key ${index + 1}/${apiKeys.size} network error: ${e.message}")
                lastError = e
            } catch (e: Exception) {
                Logger.w("TTS_ElevenLabs", "❌ [ElevenLabs] API key ${index + 1}/${apiKeys.size} unexpected error: ${e.message}")
                lastError = e
            }
        }

        // Nếu tất cả API keys đều thất bại
        Logger.e("TTS_ElevenLabs", "❌❌❌ [ElevenLabs] All ${apiKeys.size} API keys failed. Last error: ${lastError?.message}", lastError)
        return Result.failure(lastError ?: IOException("All ElevenLabs API keys failed"))
    }
}
