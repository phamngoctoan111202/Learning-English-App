# 📝 Hướng Dẫn Về Viết Tắt (Contractions) Trong Tiếng Anh

## Tổng Quan

Ứng dụng hiện hỗ trợ **tự động nhận dạng và so khớp** giữa dạng viết tắt và dạng đầy đủ trong tiếng Anh. Điều này có nghĩa là:

✅ Viết "it's" hoặc "it is" đều được chấp nhận
✅ Viết "don't" hoặc "do not" đều được chấp nhận
✅ Viết "I'm" hoặc "I am" đều được chấp nhận

## Danh Sách Các Viết Tắt Được Hỗ Trợ

### 1️⃣ BE Verb Contractions (Động từ TO BE)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| I'm | I am | I'm happy |
| you're | you are | You're right |
| he's | he is / he has | He's tall / He's been here |
| she's | she is / she has | She's nice / She's done it |
| it's | it is / it has | It's good / It's been done |
| we're | we are | We're friends |
| they're | they are | They're students |
| that's | that is / that has | That's cool |
| there's | there is / there has | There's a book |
| who's | who is / who has | Who's there? |
| what's | what is / what has | What's up? |
| where's | where is / where has | Where's my phone? |

### 2️⃣ Negative Contractions (Phủ định)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| isn't | is not | It isn't fair |
| aren't | are not | They aren't ready |
| wasn't | was not | He wasn't there |
| weren't | were not | We weren't happy |
| haven't | have not | I haven't seen it |
| hasn't | has not | She hasn't arrived |
| hadn't | had not | They hadn't finished |
| won't | will not | I won't go |
| wouldn't | would not | He wouldn't listen |
| don't | do not | I don't know |
| doesn't | does not | She doesn't care |
| didn't | did not | They didn't come |
| can't | cannot / can not | I can't swim |
| couldn't | could not | He couldn't answer |
| shouldn't | should not | You shouldn't worry |
| mustn't | must not | We mustn't be late |

### 3️⃣ Modal Contractions (Động từ khuyết thiếu)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| I'll | I will / I shall | I'll help you |
| you'll | you will | You'll succeed |
| he'll | he will | He'll arrive soon |
| she'll | she will | She'll be happy |
| we'll | we will | We'll try |
| they'll | they will | They'll understand |
| I'd | I would / I had | I'd like coffee / I'd seen it |
| you'd | you would / you had | You'd better go |
| he'd | he would / he had | He'd prefer tea |
| she'd | she would | She'd love it |
| we'd | we would / we had | We'd be grateful |
| they'd | they would / they had | They'd been waiting |

### 4️⃣ Perfect Tense Contractions (Hoàn thành)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| I've | I have | I've finished |
| you've | you have | You've tried |
| we've | we have | We've arrived |
| they've | they have | They've left |
| could've | could have | I could've helped |
| should've | should have | You should've told me |
| would've | would have | He would've come |
| might've | might have | She might've known |
| must've | must have | They must've forgotten |

### 5️⃣ Informal Contractions (Thông tục)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| ain't | am not / is not / are not / has not / have not | I ain't doing it |
| gonna | going to | I'm gonna try |
| wanna | want to | I wanna go |
| gotta | got to / have got to | I gotta leave |
| oughta | ought to | You oughta see this |

### 6️⃣ Other Common Contractions (Khác)

| Viết Tắt | Đầy Đủ | Ví Dụ |
|----------|--------|-------|
| let's | let us | Let's go! |
| ma'am | madam | Yes, ma'am |
| o'clock | of the clock | It's 3 o'clock |
| y'all | you all | How are y'all? |

---

## Cách Hoạt Động

### Trong Quá Trình Học:

1. **Ví dụ gốc**: "It's a beautiful day"
2. **Người dùng nhập**: "It is a beautiful day" ✅ **ĐÚNG**
3. **Hoặc nhập**: "It's a beautiful day" ✅ **ĐÚNG**

### Khi So Sánh:

Hệ thống sẽ:
1. Chuẩn hóa cả hai câu về dạng đầy đủ
2. So sánh chúng
3. Nếu giống nhau → Chấp nhận

**Ví dụ:**
- User: "I don't like it"
- Answer: "I do not like it"
- Kết quả: ✅ **Đúng** (vì "don't" = "do not")

---

## Ưu Điểm

✅ **Linh hoạt**: Viết tắt hoặc đầy đủ đều được
✅ **Tự nhiên**: Học theo cách nói chuyện thực tế
✅ **Toàn diện**: Hỗ trợ 80+ dạng viết tắt phổ biến
✅ **Thông minh**: Nhận dạng cả smart quotes ('') và ASCII (')

---

## Lưu Ý

⚠️ **Chú ý viết đúng chính tả**: Hệ thống chỉ nhận dạng viết tắt hợp lệ
⚠️ **Phân biệt ngữ cảnh**: "he's" có thể là "he is" hoặc "he has"
⚠️ **Informal contractions**: "gonna", "wanna" là tiếng lóng, nên hạn chế dùng trong văn viết formal

---

## Code Implementation

File: `ContractionHelper.kt`

```kotlin
// Check if two sentences are equivalent
ContractionHelper.areEquivalent("it's good", "it is good") // true
ContractionHelper.areEquivalent("don't go", "do not go") // true

// Normalize to full form
ContractionHelper.normalizeToFullForm("I'm happy") // "i am happy"

// Normalize to contraction
ContractionHelper.normalizeToContraction("I am happy") // "i'm happy"
```

---

## Tham Khảo

- [English Contractions - Grammarly](https://www.grammarly.com/blog/contractions/)
- [List of Contractions - Wikipedia](https://en.wikipedia.org/wiki/Wikipedia:List_of_English_contractions)

---

**Phát triển bởi**: SpecialEnglishLearningApp
**Phiên bản**: 1.0
**Ngày cập nhật**: 2025-10-12
