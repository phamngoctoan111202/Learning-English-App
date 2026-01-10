# 🔊 Hướng Dẫn Text-to-Speech (TTS)

## Tổng Quan

Ứng dụng sử dụng **Android TextToSpeech API** (miễn phí, tích hợp sẵn) để phát âm từ tiếng Anh. Tính năng này giúp người học:
- Nghe cách phát âm đúng của từ
- Học phát âm tự nhiên như người bản xứ
- Cải thiện kỹ năng nghe

## Tính Năng TTS

### 1️⃣ Tab Learn - Học Từ

#### A. Tự Động Phát Âm Khi Load Từ Mới
**Code:** [LearnFragment.kt:496-502](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L496-L502)

```kotlin
// Khi load từ mới, tự động phát âm sau 300ms
binding.root.postDelayed({
    ttsHelper?.speak(word)
}, 300)
```

**Hoạt động:**
- Khi chuyển sang từ mới → Tự động đọc từ
- Delay 300ms để UI load xong

#### B. Bấm Vào Từ Để Nghe Lại
**Code:** [LearnFragment.kt:108-110](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L108-L110)

```kotlin
binding.textWord.setOnClickListener {
    pronounceCurrentWord()
}
```

**Hoạt động:**
- Bấm vào từ vựng (có icon 🔊)
- Nghe lại phát âm bất cứ lúc nào

#### C. Phát Âm Khi Gõ Trong EditText ⭐ MỚI
**Code:** [LearnFragment.kt:120-150](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L120-L150)

```kotlin
binding.editTextAnswer.addTextChangedListener(object : TextWatcher {
    override fun afterTextChanged(s: Editable?) {
        val currentText = s?.toString() ?: ""

        // Khi user gõ space → Phát âm từ vừa gõ
        if (currentText.endsWith(" ") && !lastText.endsWith(" ")) {
            val words = currentText.trim().split(Regex("\\s+"))
            val lastWord = if (words.size > 1) words[words.size - 2] else words.lastOrNull()

            if (!lastWord.isNullOrEmpty()) {
                ttsHelper?.speak(lastWord)
            }
        }
    }
})
```

**Ví Dụ:**
```
User gõ: "hello" → Chưa phát âm
User gõ: "hello " (có space) → Phát âm "hello"
User gõ: "hello world" → Chưa phát âm
User gõ: "hello world " (có space) → Phát âm "world"
```

---

### 2️⃣ Tab Edit - Thêm/Sửa Từ

#### A. Phát Âm Khi Gõ Space
**Code:** [AddVocabularyDialog.kt:92-150](app/src/main/java/com/example/specialenglishlearningapp/dialogs/AddVocabularyDialog.kt#L92-L150)

```kotlin
wordEditText.addTextChangedListener(object : TextWatcher {
    override fun afterTextChanged(s: Editable?) {
        if (currentText.endsWith(" ") && !lastText.endsWith(" ")) {
            val lastWord = extractLastWord(currentText)
            pronounceWord(lastWord)
        }
    }
})
```

**Hoạt động:**
- Gõ từ "beautiful" → Chưa phát âm
- Gõ "beautiful " (có space) → Phát âm "beautiful"

#### B. Nút Speaker 🔊
**Code:** [AddVocabularyDialog.kt:60-69](app/src/main/java/com/example/specialenglishlearningapp/dialogs/AddVocabularyDialog.kt#L60-L69)

**Layout:** [dialog_add_vocabulary.xml:38-48](app/src/main/res/layout/dialog_add_vocabulary.xml#L38-L48)

```xml
<TextView
    android:id="@+id/buttonSpeaker"
    android:text="🔊"
    android:textSize="24sp"
    android:clickable="true" />
```

**Hoạt động:**
- Bấm nút 🔊 → Phát âm từ hiện tại
- Không cần gõ space

#### C. Bấm Vào EditText
**Code:** [AddVocabularyDialog.kt:123-129](app/src/main/java/com/example/specialenglishlearningapp/dialogs/AddVocabularyDialog.kt#L123-L129)

```kotlin
wordEditText.setOnClickListener {
    val word = wordEditText.text.toString().trim()
    if (word.isNotEmpty()) {
        pronounceWord(word)
    }
}
```

**Hoạt động:**
- Click vào EditText → Phát âm từ hiện tại

---

## TextToSpeechHelper API

### Khởi Tạo
**Code:** [TextToSpeechHelper.kt](app/src/main/java/com/example/specialenglishlearningapp/utils/TextToSpeechHelper.kt)

```kotlin
// Khởi tạo
val ttsHelper = TextToSpeechHelper(context)

// Sử dụng
ttsHelper.speak("hello")

// Cleanup khi không dùng nữa
ttsHelper.shutdown()
```

### Tính Năng Chính

#### 1. Pending Queue
**Vấn đề:** TTS init mất vài giây → User gõ ngay có thể không nghe được

**Giải pháp:**
```kotlin
private val pendingSpeeches = mutableListOf<String>()

fun speak(text: String) {
    if (!isInitialized) {
        // Thêm vào queue, đợi TTS init xong
        pendingSpeeches.add(text)
        return
    }
    speakNow(text)
}
```

**Lợi ích:**
- User gõ ngay vẫn nghe được (sau khi TTS init xong)
- Không bị mất bất kỳ từ nào

#### 2. Logging Chi Tiết
```kotlin
Logger.d("TTS: Initializing TextToSpeech...")
Logger.d("TTS: Init callback received with status: $status")
Logger.d("TTS: setLanguage result: $result")
Logger.d("TTS: Speaking '$text'")
Logger.d("TTS: speak() returned: $result")
```

**Debug:** Kiểm tra logcat với tag "TTS:"

#### 3. Tốc Độ & Giọng
```kotlin
textToSpeech?.setSpeechRate(0.9f)  // 90% tốc độ bình thường
textToSpeech?.setPitch(1.0f)       // Giọng bình thường
textToSpeech?.setLanguage(Locale.US) // Tiếng Anh Mỹ
```

---

## API So Sánh

### Android TextToSpeech (Đang Dùng) ✅

**Ưu điểm:**
- ✅ Miễn phí 100%
- ✅ Offline (không cần internet)
- ✅ Tích hợp sẵn trong Android
- ✅ Nhiều giọng: US, UK, AU, IN
- ✅ Tốc độ nhanh
- ✅ Ổn định

**Nhược điểm:**
- ⚠️ Chất lượng phụ thuộc vào thiết bị
- ⚠️ Giọng có thể nghe máy móc (tùy thiết bị)

**Đánh giá:** ⭐⭐⭐⭐ (4/5) - Rất phù hợp cho app học tiếng Anh

---

### Google Cloud Text-to-Speech API

**Ưu điểm:**
- ✅ Chất lượng cao (giọng WaveNet/Neural2)
- ✅ Nhiều giọng tự nhiên
- ✅ Hỗ trợ SSML (điều chỉnh phát âm)

**Nhược điểm:**
- ❌ **TỐN TIỀN**: $4/1M ký tự (WaveNet), $16/1M ký tự (Neural2)
- ❌ Cần internet
- ❌ Cần setup API key, billing
- ❌ Delay cao hơn (phải gọi API)

**Chi phí ước tính:**
- 1000 từ/ngày × 30 ngày = 30,000 từ/tháng
- Trung bình 5 ký tự/từ = 150,000 ký tự
- Chi phí: $0.60 - $2.40/tháng/user

**Kết luận:** ❌ Không cần thiết cho app này

---

### Microsoft Azure TTS

**Ưu điểm:**
- ✅ Chất lượng cao (Neural voices)
- ✅ Free tier: 5M ký tự/tháng

**Nhược điểm:**
- ❌ Cần setup Azure account
- ❌ Phức tạp hơn Android TTS
- ❌ Cần internet

**Kết luận:** ❌ Không cần thiết

---

### Amazon Polly

**Ưu điểm:**
- ✅ Chất lượng cao (Neural voices)
- ✅ Free tier: 5M ký tự/tháng (12 tháng đầu)

**Nhược điểm:**
- ❌ Cần AWS account
- ❌ Sau free tier: $4/1M ký tự
- ❌ Cần internet

**Kết luận:** ❌ Không cần thiết

---

## Kết Luận: Android TTS Là Lựa Chọn Tốt Nhất ✅

### Lý Do:

1. **Miễn phí hoàn toàn** - Không giới hạn số lần dùng
2. **Offline** - Không cần internet, không tốn data
3. **Nhanh** - Phát âm ngay lập tức
4. **Đơn giản** - Không cần setup API key, billing
5. **Chất lượng đủ tốt** - Với học tiếng Anh cơ bản là quá đủ

### Nếu Muốn Cải Thiện Chất Lượng:

**Không cần API bên ngoài!** Thay vào đó:

1. **Tải giọng chất lượng cao:**
```kotlin
// Kiểm tra và tải giọng tốt hơn
val voices = textToSpeech.voices
val highQualityVoice = voices.find {
    it.locale == Locale.US && it.quality >= Voice.QUALITY_HIGH
}
textToSpeech.voice = highQualityVoice
```

2. **Hướng dẫn user cài giọng tốt hơn:**
- Settings → Language & Input → Text-to-Speech
- Install "Google Text-to-Speech" hoặc giọng chất lượng cao khác

---

## Cách Sử Dụng

### Tab Learn:
1. **Tự động nghe:** Chuyển từ → Nghe phát âm
2. **Nghe lại:** Bấm vào từ vựng
3. **Nghe khi gõ:** Gõ "hello world " (có space) → Nghe "world"

### Tab Edit:
1. **Khi thêm từ:**
   - Gõ "beautiful" → Bấm space → Nghe "beautiful"
   - Hoặc bấm nút 🔊
   - Hoặc click vào ô nhập

---

## Debug TTS

### Kiểm tra TTS có hoạt động không:
```bash
# Xem log
adb logcat | grep "TTS:"

# Kết quả mong đợi:
TTS: Initializing TextToSpeech...
TTS: Init callback received with status: 0
TTS: setLanguage result: 0
TTS: Speaking 'hello'
TTS: speak() returned: 0
```

### Nếu TTS không hoạt động:
1. **Kiểm tra thiết bị có TTS engine:**
   - Settings → Language & Input → Text-to-Speech
   - Cài "Google Text-to-Speech" nếu chưa có

2. **Kiểm tra quyền:**
   - App không cần permission đặc biệt cho TTS
   - Nhưng cần quyền INTERNET nếu dùng cloud TTS (không dùng)

3. **Kiểm tra log:**
   - Xem có error không
   - Check `isInitialized` có true không

---

**Phát triển bởi**: SpecialEnglishLearningApp
**API sử dụng**: Android TextToSpeech (Built-in)
**Chi phí**: $0 (Free forever)
**Phiên bản**: 3.0
**Ngày cập nhật**: 2025-10-12
