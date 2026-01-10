# 🚀 Hướng dẫn chạy Web Server

## ✅ Đã tạo sẵn cho bạn!

### Cách 1: Double-click App (Khuyên dùng!)

**Bạn có sẵn app:**
```
📁 Special English Web.app
```

**Cách sử dụng:**
1. **Double-click** vào `Special English Web.app`
2. Nếu macOS chặn, vào **System Preferences → Security & Privacy** và nhấn "Open Anyway"
3. Terminal sẽ mở và web server tự động chạy
4. Browser tự động mở http://localhost:8080
5. Nhấn `Ctrl+C` trong Terminal để tắt server

**Thêm vào Dock:**
- Kéo `Special English Web.app` vào Dock để truy cập nhanh

---

### Cách 2: Chạy shell script

**File:**
```
📄 start-web.sh
```

**Cách sử dụng:**
```bash
./start-web.sh
```

Hoặc double-click `start-web.sh` trong Finder

---

## 🔧 Các lệnh thủ công (nếu cần)

### Khởi động server:
```bash
cd web
python3 -m http.server 8080
```

### Mở trình duyệt:
```bash
open http://localhost:8080
```

### Dừng server đang chạy trên port 8080:
```bash
lsof -ti:8080 | xargs kill -9
```

---

## 📋 Troubleshooting

### Lỗi "Permission denied"
```bash
chmod +x start-web.sh
```

### Lỗi "Address already in use"
- Port 8080 đã được sử dụng
- Giải pháp:
  ```bash
  lsof -ti:8080 | xargs kill -9
  ```

### App bị macOS chặn
1. Mở **System Preferences**
2. Vào **Security & Privacy**
3. Tab **General**
4. Nhấn **"Open Anyway"** bên cạnh thông báo

---

## 💡 Tips

- **Mở nhiều tab:** Sau khi server chạy, mở thêm tab http://localhost:8080
- **Truy cập từ thiết bị khác:** Dùng IP của Mac (ví dụ: `http://192.168.1.100:8080`)
- **Xem IP của Mac:**
  ```bash
  ifconfig | grep "inet " | grep -v 127.0.0.1
  ```

---

## 🎯 Quick Start (1 dòng lệnh)

```bash
cd web && python3 -m http.server 8080 && open http://localhost:8080
```

---

**Enjoy learning! 📚✨**
