/**
 * TTS Service - Text-to-Speech with ElevenLabs and OpenAI fallback
 * Tương đương với TextToSpeechHelper, ElevenLabsTTSProvider, TTSOpenAIProvider trong Android
 */
class TTSService {
    constructor() {
        // ElevenLabs configuration
        this.elevenLabsVoiceId = '2EiwWnXFnvU5JabPnv8n'; // Adam voice
        this.elevenLabsApiKeys = [
            'sk_3fc4b250ecb44ab4a20cb9a9bbc9be3ab9f2ed6b1213e0f1',
            'sk_e0cb6eff4f6c2e0a69458e66d4eb6da12eb5ef945c7fee50',
            'sk_1644fcacca8dfe5ddb6ea6bc9ef8c65ba90efdef32ed64ad'
        ];

        // OpenAI TTS configuration
        this.openAiApiKeys = [
            'sk-proj-xxx', // Add your OpenAI keys here
            'sk-proj-yyy'
        ];
        this.openAiModel = 'tts-1';
        this.openAiVoice = 'alloy';

        // Audio cache
        this.audioCache = new Map();
        this.currentAudio = null;

        // Load cache from localStorage
        this.loadCache();
    }

    /**
     * Load cached audio URLs from localStorage
     */
    loadCache() {
        try {
            const cached = localStorage.getItem('tts_cache');
            if (cached) {
                const data = JSON.parse(cached);
                // Only load entries less than 24 hours old
                const now = Date.now();
                for (const [key, value] of Object.entries(data)) {
                    if (now - value.timestamp < 24 * 60 * 60 * 1000) {
                        this.audioCache.set(key, value.url);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading TTS cache:', e);
        }
    }

    /**
     * Save cache to localStorage
     */
    saveCache() {
        try {
            const data = {};
            for (const [key, url] of this.audioCache.entries()) {
                data[key] = { url, timestamp: Date.now() };
            }
            localStorage.setItem('tts_cache', JSON.stringify(data));
        } catch (e) {
            console.error('Error saving TTS cache:', e);
        }
    }

    /**
     * Speak text
     */
    async speak(text) {
        if (!text || text.trim().length === 0) return;

        const normalizedText = text.trim().toLowerCase();

        // Check cache first
        if (this.audioCache.has(normalizedText)) {
            await this.playAudioUrl(this.audioCache.get(normalizedText));
            return;
        }

        // Try ElevenLabs first
        let audioUrl = await this.tryElevenLabs(text);

        // If ElevenLabs fails, try OpenAI
        if (!audioUrl) {
            audioUrl = await this.tryOpenAI(text);
        }

        // If all APIs fail, use browser TTS as last resort
        if (!audioUrl) {
            this.useBrowserTTS(text);
            return;
        }

        // Cache and play
        this.audioCache.set(normalizedText, audioUrl);
        this.saveCache();
        await this.playAudioUrl(audioUrl);
    }

    /**
     * Try ElevenLabs API
     */
    async tryElevenLabs(text) {
        for (const apiKey of this.elevenLabsApiKeys) {
            try {
                const response = await fetch(
                    `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsVoiceId}`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'audio/mpeg',
                            'Content-Type': 'application/json',
                            'xi-api-key': apiKey
                        },
                        body: JSON.stringify({
                            text: text,
                            model_id: 'eleven_monolingual_v1',
                            voice_settings: {
                                stability: 0.5,
                                similarity_boost: 0.5
                            }
                        })
                    }
                );

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    return url;
                }
            } catch (error) {
                // API key failed, try next
            }
        }

        return null;
    }

    /**
     * Try OpenAI TTS API
     */
    async tryOpenAI(text) {
        for (const apiKey of this.openAiApiKeys) {
            if (!apiKey || apiKey.includes('xxx')) continue;

            try {
                const response = await fetch(
                    'https://api.openai.com/v1/audio/speech',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: this.openAiModel,
                            input: text,
                            voice: this.openAiVoice
                        })
                    }
                );

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    return url;
                }
            } catch (error) {
                // API key failed, try next
            }
        }

        return null;
    }

    /**
     * Use browser's built-in TTS as fallback
     */
    useBrowserTTS(text) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;

            // Try to find an English voice
            const voices = window.speechSynthesis.getVoices();
            const englishVoice = voices.find(v =>
                v.lang.startsWith('en') && v.name.includes('English')
            ) || voices.find(v => v.lang.startsWith('en'));

            if (englishVoice) {
                utterance.voice = englishVoice;
            }

            window.speechSynthesis.speak(utterance);
        }
    }

    /**
     * Play audio from URL
     */
    async playAudioUrl(url) {
        return new Promise((resolve, reject) => {
            // Stop current audio if playing
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            const audio = new Audio(url);
            this.currentAudio = audio;

            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (error) => {
                this.currentAudio = null;
                reject(error);
            };

            audio.play().catch(reject);
        });
    }

    /**
     * Stop current audio
     */
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        window.speechSynthesis?.cancel();
    }

    /**
     * Speak a word (convenience method)
     */
    async speakWord(word) {
        await this.speak(word);
    }

    /**
     * Speak a sentence (convenience method)
     */
    async speakSentence(sentence) {
        await this.speak(sentence);
    }

    /**
     * Clear audio cache
     */
    clearCache() {
        // Revoke all object URLs
        for (const url of this.audioCache.values()) {
            URL.revokeObjectURL(url);
        }
        this.audioCache.clear();
        localStorage.removeItem('tts_cache');
    }
}

// Global TTS service instance
const ttsService = new TTSService();
