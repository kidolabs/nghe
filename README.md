# New Round Up Starter — Listening

Web app nghe audio CD của sách *New Round Up Starter (Student's Book)* — tối ưu cho iPad, phục vụ luyện nghe tiếng Anh.

## Tính năng

- 50 track audio (tải sẵn, dùng offline được sau lần nghe đầu)
- Player: play/pause, bài trước/sau, thanh tua, tốc độ phát (1× / 1.25× / 1.5× / 0.75×)
- **A-B Repeat**: chấm điểm A → điểm B → lặp vô hạn đoạn đó để luyện 1 câu
- Lặp cả bài (🔁)
- Nhớ track + điểm A/B đang nghe khi mở lại (localStorage)
- PWA: thêm vào màn hình chính iPad, chạy như app, offline được

## Cấu trúc

```
index.html              # UI
css/style.css           # giao diện (iPad-first, dark)
js/app.js               # logic player + A-B repeat
tracks.json             # danh sách 50 track
audio/track-01..50.mp3  # file nghe (tải từ Google Drive)
sw.js                   # service worker — cache offline (xử lý 206 range cho iOS)
manifest.webmanifest    # PWA manifest
icons/                  # icon app
```

## Chạy local

```bash
python3 -m http.server 8777
# mở http://localhost:8777
```

> Phải chạy qua HTTP server (không mở trực tiếp file://) để fetch tracks.json + service worker hoạt động.

## Deploy

GitHub Pages (serve từ thư mục gốc của repo). Nguồn audio: *Student's book CD (Audio)* trên Google Drive.
