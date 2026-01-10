# Learning English App

Ứng dụng học tiếng Anh với từ vựng và câu ví dụ, hỗ trợ học offline và đồng bộ đám mây.

## 🌐 Live Demo

Truy cập ứng dụng tại: **https://phamngoctoan111202.github.io/Learning-English-App/**

## ✨ Tính năng

- **Quản lý từ vựng**: Thêm, sửa, xóa từ vựng và câu ví dụ
- **Học từ vựng**: Chế độ học tương tác với khả năng ẩn/hiện tiếng Việt
- **Text-to-Speech**: Phát âm từ vựng bằng giọng nói tự nhiên (ElevenLabs + OpenAI)
- **Công cụ dịch**: So sánh câu tiếng Anh với từ vựng đã học
- **Offline-first**: Hoạt động hoàn toàn offline với IndexedDB
- **Cloud Sync**: Tự động đồng bộ với Appwrite backend
- **Progressive Web App**: Có thể cài đặt như ứng dụng native

## 🚀 Hướng dẫn sử dụng

### Chạy local

```bash
cd web
python3 -m http.server 8080
open http://localhost:8080
```

Hoặc sử dụng script tiện lợi:

```bash
./start-web.sh
```

## 🛠️ Công nghệ sử dụng

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Appwrite (BaaS - Backend as a Service)
- **Database**: IndexedDB (local) + Appwrite Cloud Database
- **TTS**: ElevenLabs API, OpenAI TTS API
- **Hosting**: GitHub Pages

## 📁 Cấu trúc dự án

```
.
├── web/                    # Web application
│   ├── index.html         # Main app
│   ├── translate.html     # Translation tool
│   ├── css/
│   │   └── styles.css     # Styling
│   └── js/
│       ├── app.js         # Entry point
│       ├── pages/         # Page modules
│       ├── services/      # Business logic
│       └── utils/         # Utilities
└── app/                    # Android project (optional)
```

## 🔄 Cập nhật ứng dụng

Sau khi chỉnh sửa code:

```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

GitHub Pages tự động deploy sau ~1 phút.

## 📱 Cài đặt như PWA

1. Mở app trên mobile/desktop browser
2. Click "Add to Home Screen" / "Install"
3. Sử dụng như ứng dụng native

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

## 👨‍💻 Tác giả

Phát triển bởi [phamngoctoan111202](https://github.com/phamngoctoan111202)
