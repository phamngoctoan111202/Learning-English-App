# Hướng dẫn cài đặt Appwrite Collection cho Learning Progress

## Tổng quan

Hệ thống học từ vựng sử dụng logic **"nợ từ vựng"**:
- **Mỗi 10 phút** mục tiêu tăng **1 từ** (tương đương **6 từ/giờ**)
- Nếu không học → nợ tích lũy **VÔ HẠN** 🔥
- Dữ liệu được **tự động đồng bộ** với **Appwrite** mỗi **30 giây**
- Đồng bộ giữa các thiết bị và lưu trữ lâu dài trên cloud

## Bước 1: Truy cập Appwrite Console

1. Truy cập: https://cloud.appwrite.io/console
2. Đăng nhập vào project **SpecialEnglishApp** (ID: `68cf65390012ceaa2085`)
3. Chọn Database có ID: `68cfb8c900053dca6f90`

## Bước 2: Tạo Collection "learning_progress"

1. Trong Database, click **"Create Collection"**
2. Điền thông tin:
   - **Collection ID**: `learning_progress`
   - **Collection Name**: `Learning Progress`

3. Click **"Create"**

## Bước 3: Tạo Attributes (Trường dữ liệu)

Trong collection `learning_progress`, tạo các attributes sau:

### 1. startTime (String)
- **Type**: String
- **Size**: 255
- **Required**: Yes
- **Description**: Timestamp khi bắt đầu học (milliseconds)

Click **"Create"** → Đợi index hoàn thành

### 2. wordsLearned (String)
- **Type**: String
- **Size**: 255
- **Required**: Yes
- **Default**: `0`
- **Description**: Tổng số từ đã học

Click **"Create"** → Đợi index hoàn thành

### 3. lastUpdated (String)
- **Type**: String
- **Size**: 255
- **Required**: Yes
- **Description**: Timestamp cập nhật cuối cùng

Click **"Create"** → Đợi index hoàn thành

## Bước 4: Cấu hình Permissions ⚠️ **QUAN TRỌNG!**

> **🚨 LỖI THƯỜNG GẶP**: Nếu thiếu bước này, app sẽ báo lỗi:
> ```
> ❌ The current user is not authorized to perform the requested action.
> ```

1. Trong collection `learning_progress`, click tab **"Settings"** (không phải Attributes!)
2. Scroll xuống phần **"Permissions"**
3. Thêm các permissions sau:

### Document Security (Recommended)
Click **"Add Role"** và chọn:

- **Role**: `Any` (hoặc "All guests" nếu có)
  - ✅ **Create** ← Bắt buộc!
  - ✅ **Read** ← Bắt buộc!
  - ✅ **Update** ← Bắt buộc!
  - ✅ **Delete** ← Optional

4. **Nhấn "Update"** hoặc "Save" để lưu cấu hình

> **Lưu ý**: Vì đây là app học tập cá nhân và sử dụng anonymous authentication, nên cho phép `Any` role có full access. Trong production app thực tế, bạn nên sử dụng User-based permissions.

### Kiểm tra Permissions đã cấu hình đúng chưa:
- Vào collection `learning_progress` → Tab **Settings**
- Phần **Permissions** phải có ít nhất 1 role với quyền **Create**, **Read**, **Update**
- Ví dụ hiển thị: `Any: Create, Read, Update, Delete`

## Bước 5: Kiểm tra cấu hình

Đảm bảo trong file `AppwriteConfig.kt` có:

```kotlin
const val DATABASE_ID = "68cfb8c900053dca6f90"
const val LEARNING_PROGRESS_COLLECTION_ID = "learning_progress"
```

## Cách hoạt động

### 1. Khi app khởi động (MainActivity)
```kotlin
LearningProgressManager.initialize(context)
```
- Tự động login anonymous
- Tải `startTime` và `wordsLearned` từ Appwrite
- Nếu chưa có document → tạo mới với startTime = hiện tại

### 2. Khi hoàn thành từ vựng (LearnFragment)
```kotlin
LearningProgressManager.addCompletedVocabulary(context)
```
- Tăng `wordsLearned` lên 1
- Auto-sync với Appwrite mỗi 1 phút (để tiết kiệm API calls)

### 3. Tính toán mục tiêu động
```kotlin
val currentGoal = LearningProgressManager.getCurrentGoal()
// = (elapsed_minutes / 10).coerceAtLeast(1)
// Mỗi 10 phút = 1 từ

val debt = currentGoal - wordsLearned
```

### 4. Hiển thị UI
- **Thanh tiến trình**: Hiện tiến độ hoàn thành mục tiêu
- **Số từ đã học/Mục tiêu**: `25/50 từ`
- **Nợ từ vựng**: `Còn thiếu 25 từ!`
- **Level**: Dựa trên tổng số từ đã học

## Cấu trúc Document trong Appwrite

```json
{
  "$id": "user_learning_progress",
  "startTime": "1710000000000",
  "wordsLearned": "25",
  "lastUpdated": "1710003600000"
}
```

- **$id**: Fixed ID = `user_learning_progress` (single-user app)
- **startTime**: Thời điểm bắt đầu học (ms)
- **wordsLearned**: Tổng số từ đã hoàn thành
- **lastUpdated**: Lần cập nhật cuối

## Kiểm tra Log trong Android Studio

### Cách xem log:
1. Mở Android Studio
2. Chạy app trên device/emulator
3. Mở tab **Logcat** (ở phía dưới màn hình)
4. Filter theo tag: `SpecialEnglish` hoặc tìm `[LearningProgress]`

### Log khi khởi động app thành công:
```
🔄 [LearningProgress] Initializing...
🔐 [LearningProgress] Checking authentication...
✅ [LearningProgress] Already authenticated: userId=xxx
📥 [LearningProgress] Fetching from Appwrite...
   Database: 68cfb8c900053dca6f90
   Collection: learning_progress
   Document: user_learning_progress
✅ [LearningProgress] Loaded from Appwrite successfully!
   📅 startTime: 1710000000000
   📚 wordsLearned: 25
   ⏱️ elapsed: 05:30:00
   🎯 currentGoal: 27
   💳 debt: 2
🎉 [LearningProgress] Initialization complete!
```

### Log khi bấm nút Sync:
```
🔄 [EditViewModel] Starting full sync...
☁️ [LearningProgress] Starting sync to Appwrite...
📤 [LearningProgress] Sending data:
   startTime: 1710000000000
   wordsLearned: 25
   currentGoal: 27
   debt: 2
✅ [LearningProgress] Updated document successfully!
🎉 [LearningProgress] Sync completed!
✅ [EditViewModel] Full sync successful!
```

### Log khi hoàn thành từ vựng:
```
Word completed. Total learned: 26
☁️ [LearningProgress] Starting sync to Appwrite...
📤 [LearningProgress] Sending data:
   startTime: 1710000000000
   wordsLearned: 26
   currentGoal: 27
   debt: 1
✅ [LearningProgress] Updated document successfully!
🎉 [LearningProgress] Sync completed!
```

### Log lỗi (nếu collection chưa tạo):
```
❌ [LearningProgress] Initialization failed: Collection with the requested ID could not be found
```
→ **Giải pháp**: Tạo collection `learning_progress` theo hướng dẫn ở trên

### Log lỗi (nếu thiếu attributes):
```
❌ [LearningProgress] Sync failed: Invalid document structure: Missing required attribute: startTime
```
→ **Giải pháp**: Kiểm tra đã tạo đủ 3 attributes: `startTime`, `wordsLearned`, `lastUpdated`

### Log lỗi (nếu thiếu permissions): 🚨 PHỔ BIẾN NHẤT
```
❌ [LearningProgress] Initialization failed: The current user is not authorized to perform the requested action.
io.appwrite.exceptions.AppwriteException: The current user is not authorized to perform the requested action.
```
→ **Giải pháp**: Vào Appwrite Console → Collection `learning_progress` → Tab **Settings** → Phần **Permissions** → Thêm role `Any` với quyền **Create, Read, Update**

## Testing

### Test 1: Khởi tạo lần đầu
1. Xóa document `user_learning_progress` trong Appwrite (nếu có)
2. Chạy app
3. **Kiểm tra Logcat**: Tìm log `✅ [LearningProgress] Document created successfully!`
4. Kiểm tra Appwrite Console → Document mới được tạo
5. Kiểm tra UI: Hiển thị `0/5 từ`

### Test 2: Đồng bộ từ Appwrite
1. Trong Appwrite Console, edit document `user_learning_progress`
2. Đổi `wordsLearned` = `"100"`
3. Restart app
4. **Kiểm tra Logcat**: Tìm log `📚 wordsLearned: 100`
5. Kiểm tra UI: Hiện `100/... từ`

### Test 3: Bấm nút Sync
1. Vào tab **Edit**
2. Bấm nút **Sync** (biểu tượng sync màu xanh)
3. **Kiểm tra Logcat**: Tìm log `🎉 [LearningProgress] Sync completed!`
4. Thấy Toast: `✅ Đồng bộ hóa thành công!`
5. Kiểm tra Appwrite Console → `lastUpdated` được cập nhật

### Test 4: Hoàn thành từ vựng
1. Vào tab **Learn**
2. Học 1 từ vựng đúng
3. **Kiểm tra Logcat**: Tìm log `Word completed. Total learned: ...`
4. Đợi 1 phút (để auto-sync)
5. **Kiểm tra Logcat**: Tìm log `✅ [LearningProgress] Updated document successfully!`
6. Kiểm tra Appwrite Console → `wordsLearned` tăng lên

### Test 5: Nợ từ vựng
1. Trong Appwrite Console, edit `startTime`
2. Đổi thành timestamp 2 giờ trước: `System.currentTimeMillis() - (2 * 60 * 60 * 1000)`
3. Ví dụ: Nếu hiện tại là `1710000000000`, đổi thành `1709992800000`
4. Đặt `wordsLearned` = `"3"`
5. Restart app
6. **Kiểm tra Logcat**:
   ```
   ⏱️ elapsed: 02:00:00
   🎯 currentGoal: 10
   💳 debt: 7
   ```
7. Kiểm tra UI:
   - `3/10 từ`
   - `⚠️ Còn thiếu 7 từ!`

### Test 6: Kiểm tra thời gian chạy ngầm
1. Chạy app, xem `startTime` trong log
2. Tắt app
3. Đợi 1 giờ (hoặc chỉnh `startTime` trong Appwrite)
4. Mở lại app
5. **Kiểm tra Logcat**: Mục tiêu tăng thêm 5 từ
6. Ví dụ:
   - Trước: `currentGoal: 10`
   - Sau 1h: `currentGoal: 15`

## Troubleshooting

### Lỗi: "Collection not found"
- Kiểm tra Collection ID = `learning_progress`
- Kiểm tra Database ID = `68cfb8c900053dca6f90`

### Lỗi: "Missing required attribute"
- Đảm bảo đã tạo đủ 3 attributes: `startTime`, `wordsLearned`, `lastUpdated`
- Đảm bảo `Required = Yes`

### Lỗi: "Unauthorized"
- Kiểm tra Permissions → Role `Any` có đủ Create/Read/Update quyền
- Kiểm tra app đã login anonymous thành công

### Không đồng bộ
- Kiểm tra log: `Synced to Appwrite: wordsLearned=...`
- Auto-sync chỉ chạy mỗi 1 phút
- Có thể force sync bằng: `LearningProgressManager.syncToAppwrite(context)`

## Lưu ý quan trọng

1. **Document ID cố định**: App sử dụng fixed ID = `user_learning_progress` cho single-user. Nếu muốn multi-user, cần đổi logic để mỗi user có document riêng.

2. **Tính nợ không giới hạn**: Nếu bạn dừng học 1 tuần (168 giờ), nợ sẽ là `168h × 5 = 840 từ`. Đây là tính năng, không phải bug!

3. **Đồng bộ giữa thiết bị**: Vì dữ liệu lưu trên Appwrite, bạn có thể học trên điện thoại A, sau đó chuyển sang điện thoại B và tiếp tục với cùng tiến độ.

4. **Reset progress**: Nếu muốn reset về 0, gọi:
   ```kotlin
   LearningProgressManager.resetProgress(context)
   ```

## Công thức tính toán

```
Elapsed Time = Current Time - Start Time (ms)
Elapsed Minutes = Elapsed Time / (60 × 1000)
Current Goal = (Elapsed Minutes / 10).coerceAtLeast(1)
Debt = (Current Goal - Words Learned).coerceAtLeast(0)
Progress % = (Words Learned / Current Goal × 100).coerceAtMost(100)

Ví dụ:
- 0 phút: Goal = 1 từ (tối thiểu)
- 10 phút: Goal = 1 từ
- 20 phút: Goal = 2 từ
- 60 phút (1h): Goal = 6 từ
- 120 phút (2h): Goal = 12 từ
```

## Level System

- 🌱 **Mới bắt đầu**: < 50 từ
- 📚 **Đang tiến bộ**: 50-199 từ
- ⭐ **Trung cấp**: 200-499 từ
- 🌟 **Chuyên gia**: 500-999 từ
- 🏆 **Bậc thầy**: ≥ 1000 từ
