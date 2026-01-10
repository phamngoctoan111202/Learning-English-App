# 🧠 Logic Tính Memory Score (Khả Năng Ghi Nhớ)

## Tổng Quan

Memory Score là chỉ số đo lường khả năng ghi nhớ từ vựng của người dùng, được tính theo **Vocabulary** (từ vựng), không phải theo Example (ví dụ).

## Cấu Trúc Dữ Liệu

### Vocabulary (Từ Vựng)
```kotlin
data class Vocabulary(
    val id: Long,
    val word: String,              // Từ tiếng Anh (ví dụ: "beautiful")
    val totalAttempts: Int,        // Tổng số lần học từ này
    val correctAttempts: Int,      // Số lần trả lời đúng
    val memoryScore: Float         // % ghi nhớ = (correctAttempts / totalAttempts) * 100
)
```

### Example (Ví Dụ)
```kotlin
data class Example(
    val id: Long,
    val vocabularyId: Long,        // Thuộc về Vocabulary nào
    val sentences: String,         // JSON array các câu tiếng Anh
    val vietnamese: String?        // Bản dịch tiếng Việt (cùng cho tất cả câu)
)
```

### Mối Quan Hệ
```
1 Vocabulary (beautiful)
├─ Example 1: "đẹp" → ["It's beautiful", "She is beautiful"]
└─ Example 2: "đẹp đẽ" → ["This is beautiful", "What a beautiful day"]
```

---

## Logic Tính Memory Score

### Công Thức
```
memoryScore = (correctAttempts / totalAttempts) * 100
```

### Cách Hoạt Động

#### 1. Khi Học Từ (LearnFragment)

**Tình huống:**
- User đang học từ "beautiful"
- Có 2 Examples với tổng 4 câu tiếng Anh
- User chỉ cần trả lời đúng **1 câu bất kỳ** là hoàn thành

**Code Logic:** ([LearnFragment.kt:532-556](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L532-L556))
```kotlin
// Tìm Example khớp với câu trả lời của user
val matchingExample = vocabulary.examples.find { example ->
    val sentences = ExampleUtils.jsonToSentences(example.sentences)
    ExampleUtils.matchesAnySentence(userAnswer, sentences)
}

if (matchingExample != null) {
    // ✅ Đúng rồi!
    val newTotalAttempts = currentStats.totalAttempts + 1
    val newCorrectAttempts = currentStats.correctAttempts + 1
    val newMemoryScore = (newCorrectAttempts.toFloat() / newTotalAttempts) * 100

    // Cập nhật vào database
    database.vocabularyDao().updateLearningStats(
        currentStats.id,
        newTotalAttempts,
        newCorrectAttempts,
        newMemoryScore
    )
}
```

#### 2. Khi Trả Lời Sai

**Code Logic:** ([LearnFragment.kt:649-689](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L649-L689))
```kotlin
else {
    // ❌ Sai rồi!
    val newTotalAttempts = currentStats.totalAttempts + 1
    val newCorrectAttempts = currentStats.correctAttempts // Không tăng
    val newMemoryScore = (newCorrectAttempts.toFloat() / newTotalAttempts) * 100

    // Cập nhật vào database
    database.vocabularyDao().updateLearningStats(
        currentStats.id,
        newTotalAttempts,
        newCorrectAttempts,
        newMemoryScore
    )
}
```

---

## Ví Dụ Thực Tế

### Vocabulary: "beautiful"
- Example 1: "đẹp" → ["It's beautiful", "She is beautiful"]
- Example 2: "đẹp đẽ" → ["This is beautiful"]

### Lượt 1: User nhập "It's beautiful"
```
✅ Đúng!
totalAttempts: 0 → 1
correctAttempts: 0 → 1
memoryScore: 0% → 100%
```

### Lượt 2: User nhập "This is beautiful"
```
✅ Đúng!
totalAttempts: 1 → 2
correctAttempts: 1 → 2
memoryScore: 100% → 100%
```

### Lượt 3: User nhập "It beautiful" (thiếu 's)
```
❌ Sai!
totalAttempts: 2 → 3
correctAttempts: 2 (không đổi)
memoryScore: 100% → 66.67%
```

### Lượt 4: User nhập "She is beautiful"
```
✅ Đúng!
totalAttempts: 3 → 4
correctAttempts: 2 → 3
memoryScore: 66.67% → 75%
```

---

## Phân Loại Khả Năng Ghi Nhớ

### Trong LearnFragment
```kotlin
val weakVocabularies = vocabularies.filter {
    it.vocabulary.memoryScore < 70.0
}
```

### Các Mức Độ
| Memory Score | Đánh Giá | Ưu Tiên Học |
|--------------|----------|-------------|
| 0% - 30% | 🔴 Rất yếu | Cao nhất |
| 30% - 50% | 🟠 Yếu | Cao |
| 50% - 70% | 🟡 Trung bình | Trung bình |
| 70% - 85% | 🟢 Khá | Thấp |
| 85% - 100% | 🟣 Xuất sắc | Rất thấp |

---

## Tính Năng Chống Trùng Lặp

### Vấn Đề
Nếu user vô tình thêm 2 lần từ "beautiful":
- Vocabulary 1: "beautiful" (id=1)
- Vocabulary 2: "beautiful" (id=2)

→ Khi search "beautiful" hoặc "đẹp" → Ra 2 kết quả trùng!

### Giải Pháp
**Auto Cleanup Duplicates** ([EditFragment.kt:54-68](app/src/main/java/com/example/specialenglishlearningapp/fragments/EditFragment.kt#L54-L68))

```kotlin
// Tự động chạy lần đầu tiên mở EditFragment
private fun cleanupDuplicatesOnce() {
    if (!hasCleanedUp) {
        editViewModel.cleanupDuplicates()
        // Gộp các từ trùng thành 1
        // Merge tất cả Examples vào từ cũ nhất
        // Xóa các từ trùng còn lại
    }
}
```

**Logic Merge:** ([SyncManager.kt:90-151](app/src/main/java/com/example/specialenglishlearningapp/utils/SyncManager.kt#L90-L151))
1. Nhóm các Vocabulary theo tên (case-insensitive)
2. Nếu có > 1 từ cùng tên:
   - Giữ từ cũ nhất (theo `createdAt`)
   - Merge tất cả Examples từ các từ trùng
   - **Bảo toàn `memoryScore` của từ cũ nhất**
   - Xóa các từ trùng còn lại

---

## Lợi Ích Của Logic Này

### ✅ Tính Theo Vocabulary
- User chỉ cần nhớ **1 cách dùng** của từ là đủ
- Không bắt buộc phải nhớ tất cả các câu ví dụ
- Linh hoạt: viết "It's" hoặc "It is" đều được

### ✅ Chống Trùng Lặp
- Tự động gộp các từ trùng lặp
- Bảo toàn lịch sử học tập
- Search không bị duplicate

### ✅ Thống Kê Chính Xác
- Memory score phản ánh khả năng nhớ **từ vựng**, không phải từng câu
- Dễ dàng lọc ra các từ yếu để ôn tập
- Ưu tiên học từ yếu nhất trước

---

## Code Reference

### Update Memory Score
- [LearnFragment.kt:543-556](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L543-L556) - Correct answer
- [LearnFragment.kt:649-689](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L649-L689) - Wrong answer

### Query & Filter
- [VocabularyDao.kt:32-33](app/src/main/java/com/example/specialenglishlearningapp/data/VocabularyDao.kt#L32-L33) - Update query
- [LearnFragment.kt:321-326](app/src/main/java/com/example/specialenglishlearningapp/fragments/LearnFragment.kt#L321-L326) - Filter weak vocabularies

### Duplicate Cleanup
- [SyncManager.kt:90-151](app/src/main/java/com/example/specialenglishlearningapp/utils/SyncManager.kt#L90-L151) - Merge logic
- [EditFragment.kt:54-68](app/src/main/java/com/example/specialenglishlearningapp/fragments/EditFragment.kt#L54-L68) - Auto cleanup

---

## FAQ

### ❓ Tại sao không tính theo Example?
**Trả lời:** Vì 1 Example có thể có nhiều câu tiếng Anh (cùng 1 nghĩa tiếng Việt). Nếu tính theo Example, user sẽ phải nhớ nhiều cách nói khác nhau, quá khó.

### ❓ Nếu tôi có 2 Examples với cùng Vietnamese "đẹp" thì sao?
**Trả lời:** Không sao! Hệ thống chấp nhận bất kỳ câu nào từ bất kỳ Example nào. Miễn là đúng 1 câu là được tính là nhớ từ đó.

### ❓ Tại sao search vẫn ra kết quả trùng?
**Trả lời:** Có thể bạn có nhiều Vocabulary trùng tên trong database. Chạy "Đồng bộ" hoặc mở lại EditFragment để tự động cleanup.

### ❓ Memory score có đồng bộ lên server không?
**Trả lời:** Có! Khi bấm "Đồng bộ", tất cả thống kê (`totalAttempts`, `correctAttempts`, `memoryScore`) đều được sync lên Appwrite.

---

**Phát triển bởi**: SpecialEnglishLearningApp
**Phiên bản**: 2.0
**Ngày cập nhật**: 2025-10-12
