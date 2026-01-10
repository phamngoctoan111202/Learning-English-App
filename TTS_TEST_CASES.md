# 🧪 TTS Test Cases

## Vấn Đề Đã Sửa

### ❌ Logic Cũ (SAI)
```kotlin
val words = "hello world ".trim().split(Regex("\\s+"))
// words = ["hello", "world"]
val lastWord = words[words.size - 2]  // words[0] = "hello" ❌ SAI!
```

**Kết quả:**
- Gõ "hello world " → Phát âm "hello" ❌

### ✅ Logic Mới (ĐÚNG)
```kotlin
val words = "hello world ".trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
// words = ["hello", "world"]
val lastWord = words.lastOrNull()  // "world" ✅ ĐÚNG!
```

**Kết quả:**
- Gõ "hello world " → Phát âm "world" ✅

---

## Test Cases

### Tab Learn - EditText Answer

| # | Input | Mong Đợi | Giải Thích |
|---|-------|----------|------------|
| 1 | `"hello"` | ❌ Không phát âm | Chưa có space |
| 2 | `"hello "` | 🔊 "hello" | Bấm space sau "hello" |
| 3 | `"hello world"` | ❌ Không phát âm | Chưa có space cuối |
| 4 | `"hello world "` | 🔊 "world" | Bấm space sau "world" |
| 5 | `"hello world day"` | ❌ Không phát âm | Chưa có space cuối |
| 6 | `"hello world day "` | 🔊 "day" | Bấm space sau "day" |
| 7 | `"It's "` | 🔊 "It's" | Hỗ trợ dấu nháy đơn |
| 8 | `"It's a "` | 🔊 "a" | Phát âm từ ngắn |
| 9 | `"It's a beautiful "` | 🔊 "beautiful" | Phát âm từ dài |
| 10 | `"It's a beautiful day "` | 🔊 "day" | Phát âm từ cuối |

### Tab Edit - AddVocabularyDialog

| # | Input | Mong Đợi | Giải Thích |
|---|-------|----------|------------|
| 1 | `"beautiful"` | ❌ Không phát âm | Chưa có space |
| 2 | `"beautiful "` | 🔊 "beautiful" | Bấm space |
| 3 | `"beautiful day"` | ❌ Không phát âm | Chưa có space cuối |
| 4 | `"beautiful day "` | 🔊 "day" | Bấm space sau "day" |
| 5 | Bấm nút 🔊 với `"hello"` | 🔊 "hello" | Click speaker button |
| 6 | Click vào EditText với `"world"` | 🔊 "world" | Click EditText |

---

## Giải Thích Logic

### Ví Dụ 1: Gõ "hello world "

**Bước 1:** User gõ "hello world" (chưa có space)
```
currentText = "hello world"
currentText.endsWith(" ") = false
→ Không phát âm ✅
```

**Bước 2:** User gõ space → "hello world "
```
currentText = "hello world "
lastText = "hello world"

currentText.endsWith(" ") = true ✅
lastText.endsWith(" ") = false ✅
→ Trigger phát âm!

// Extract word
currentText.trim() = "hello world"  // Bỏ space cuối
.split(Regex("\\s+")) = ["hello", "world"]
.filter { it.isNotEmpty() } = ["hello", "world"]
.lastOrNull() = "world" ✅

→ Phát âm "world" ✅
```

### Ví Dụ 2: Gõ "It's a beautiful day "

**Gõ từng bước:**
1. `"It's"` → Không phát âm (chưa có space)
2. `"It's "` → 🔊 "It's"
3. `"It's a"` → Không phát âm
4. `"It's a "` → 🔊 "a"
5. `"It's a beautiful"` → Không phát âm
6. `"It's a beautiful "` → 🔊 "beautiful"
7. `"It's a beautiful day"` → Không phát âm
8. `"It's a beautiful day "` → 🔊 "day"

**Kết quả:** Mỗi lần bấm space, phát âm từ vừa gõ xong ✅

---

## Debug

### Xem Log
```bash
adb logcat | grep "TTS:"
```

### Log Mong Đợi
```
# Gõ "hello world "
TTS: User finished typing word in answer: 'world'
TTS: Speaking 'world'
TTS: speak() returned: 0
```

### Kiểm Tra Extract Logic
Thêm log để debug:
```kotlin
override fun afterTextChanged(s: Editable?) {
    val currentText = s?.toString() ?: ""

    if (currentText.isNotEmpty() && currentText.endsWith(" ") && !lastText.endsWith(" ")) {
        Logger.d("DEBUG: currentText = '$currentText'")
        Logger.d("DEBUG: After trim = '${currentText.trim()}'")

        val words = currentText.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        Logger.d("DEBUG: words = $words")

        val lastWord = words.lastOrNull()
        Logger.d("DEBUG: lastWord = '$lastWord'")

        // Phát âm...
    }
}
```

**Ví dụ log:**
```
DEBUG: currentText = 'hello world '
DEBUG: After trim = 'hello world'
DEBUG: words = [hello, world]
DEBUG: lastWord = 'world'
TTS: Speaking 'world'
```

---

## Edge Cases

### 1. Gõ nhiều space liên tiếp
```
Input: "hello  " (2 spaces)
Kết quả: Chỉ phát âm 1 lần "hello" ✅
Lý do: Condition `!lastText.endsWith(" ")` chặn phát âm lại
```

### 2. Xóa text và gõ lại
```
Input: "hello " → xóa hết → "world "
Kết quả:
- "hello " → 🔊 "hello"
- Xóa hết → lastText reset
- "world " → 🔊 "world" ✅
```

### 3. Từ có dấu nháy đơn
```
Input: "It's "
words = ["It's"]
lastWord = "It's"
Kết quả: 🔊 "It's" ✅
```

### 4. Từ rất ngắn (1 ký tự)
```
Input: "I "
Trong LearnFragment: Check `lastWord.length > 1` → Không phát âm ❌
Trong AddVocabularyDialog: Không check length → Phát âm "I" ✅

Lý do:
- Learn: Tránh phát âm các chữ cái đơn như "a", "I" khi user đang gõ câu
- Edit: User muốn học từ "I" thì cần nghe
```

---

## Lưu Ý Quan Trọng

### ⚠️ KHÔNG Dùng `words.size - 2`
```kotlin
// SAI ❌
val lastWord = words[words.size - 2]  // Lấy từ thứ 2 từ cuối

// ĐÚNG ✅
val lastWord = words.lastOrNull()  // Lấy từ cuối cùng
```

### ✅ Tại Sao Dùng `trim()` Trước `split()`?
```kotlin
"hello world ".trim()  // "hello world" (bỏ space cuối)
.split(Regex("\\s+"))  // ["hello", "world"] (không có empty string)
```

**Nếu không trim:**
```kotlin
"hello world ".split(Regex("\\s+"))
// ["hello", "world", ""] ❌ Có empty string cuối!
```

### ✅ Tại Sao Dùng `filter { it.isNotEmpty() }`?
Phòng trường hợp có nhiều space:
```kotlin
"hello  world".split(Regex("\\s+"))  // ["hello", "", "world"] ❌
.filter { it.isNotEmpty() }  // ["hello", "world"] ✅
```

---

## So Sánh Trước & Sau

### Trước (SAI) ❌
| Input | Phát Âm | Mong Đợi |
|-------|---------|----------|
| `"hello world "` | "hello" ❌ | "world" |
| `"It's a beautiful day "` | "beautiful" ❌ | "day" |

### Sau (ĐÚNG) ✅
| Input | Phát Âm | Mong Đợi |
|-------|---------|----------|
| `"hello world "` | "world" ✅ | "world" |
| `"It's a beautiful day "` | "day" ✅ | "day" |

---

## Checklist Test

- [ ] Tab Learn: Gõ "hello " → Nghe "hello"
- [ ] Tab Learn: Gõ "hello world " → Nghe "world"
- [ ] Tab Learn: Gõ "It's a beautiful day " → Nghe "day"
- [ ] Tab Edit: Gõ "beautiful " → Nghe "beautiful"
- [ ] Tab Edit: Gõ "beautiful day " → Nghe "day"
- [ ] Tab Edit: Bấm nút 🔊 → Nghe từ hiện tại
- [ ] Tab Learn: Bấm vào từ vựng → Nghe từ vựng
- [ ] Tab Learn: Load từ mới → Tự động nghe

---

**Phiên bản**: 3.1
**Ngày sửa lỗi**: 2025-10-12
**Status**: ✅ FIXED - Đã sửa logic extract word
