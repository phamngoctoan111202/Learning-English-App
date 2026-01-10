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
 * TTS OpenAI Provider (ttsopenai.com)
 * Hỗ trợ retry với nhiều API keys
 */
class TTSOpenAIProvider(
    private val apiKeys: List<String>,
    private val model: String = "tts-1", // "tts-1" hoặc "tts-1-hd"
    private val voice: String = "alloy" // alloy, echo, fable, onyx, nova, shimmer
) : TTSProvider {

    override val providerName: String = "TTSOpenAI"
    private val client = OkHttpClient()

    override fun isConfigured(): Boolean {
        return apiKeys.isNotEmpty() && apiKeys.all { it.isNotBlank() }
    }

    override suspend fun fetchAudio(text: String, cacheFile: File): Result<Unit> {
        if (!isConfigured()) {
            return Result.failure(IllegalStateException("TTSOpenAI API keys not configured"))
        }

        Logger.d("TTS_OpenAI", "🎤 [TTSOpenAI] Requesting speech for: '$text'")

        var lastError: Exception? = null

        // Thử lần lượt từng API key cho đến khi thành công
        for ((index, apiKey) in apiKeys.withIndex()) {
            try {
                Logger.d("TTS_OpenAI", "🔑 [TTSOpenAI] Trying API key ${index + 1}/${apiKeys.size} (${apiKey.take(10)}...)")

                val audioUrl = "https://api.ttsopenai.com/uapi/v1/text-to-speech"

                // Request body format cho ttsopenai.com
                val jsonBody = JSONObject().apply {
                    put("text", text)
                    put("model", model)
                    put("voice", voice)
                    put("response_format", "mp3")
                }.toString()

                val request = Request.Builder()
                    .url(audioUrl)
                    .header("Accept", "audio/mpeg")
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
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
                        Logger.d("TTS_OpenAI", "✅ [TTSOpenAI] Successfully fetched audio using API key ${index + 1}/${apiKeys.size}")
                        return Result.success(Unit)
                    } else {
                        val error = IOException("Response body is null")
                        Logger.w("TTS_OpenAI", "❌ [TTSOpenAI] API key ${index + 1}/${apiKeys.size} failed: ${error.message}")
                        lastError = error
                    }
                } else {
                    val errorBody = response.body?.string()
                    val error = IOException("API request failed with code ${response.code}: $errorBody")
                    Logger.w("TTS_OpenAI", "❌ [TTSOpenAI] API key ${index + 1}/${apiKeys.size} failed: ${error.message}")
                    lastError = error
                }
            } catch (e: IOException) {
                Logger.w("TTS_OpenAI", "❌ [TTSOpenAI] API key ${index + 1}/${apiKeys.size} network error: ${e.message}")
                lastError = e
            } catch (e: Exception) {
                Logger.w("TTS_OpenAI", "❌ [TTSOpenAI] API key ${index + 1}/${apiKeys.size} unexpected error: ${e.message}")
                lastError = e
            }
        }

        // Nếu tất cả API keys đều thất bại
        Logger.e("TTS_OpenAI", "❌❌❌ [TTSOpenAI] All ${apiKeys.size} API keys failed. Last error: ${lastError?.message}", lastError)
        return Result.failure(lastError ?: IOException("All TTSOpenAI API keys failed"))
    }
}
