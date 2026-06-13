# Thư viện nghe — Listening Library

Web app nghe audio học tiếng Anh, tối ưu cho iPad. Trang thư viện liệt kê nhiều sách → chạm để vào player nghe.

Live: **https://kidolabs.github.io/nghe/**

## Sách hiện có
- New Round Up Starter (50 tracks)
- Round Up 1 (50 tracks)
- Round Up 2 (50 tracks)
- Round Up 3 (50 tracks — gốc .wma đã convert sang .mp3)

## Tính năng player
- Danh sách track, chạm để chọn
- Play/pause · bài trước/sau · thanh tua
- Tốc độ phát (1× / 1.25× / 1.5× / 0.75×)
- Lặp cả bài 🔁
- Âm lượng (⚠️ iOS bỏ qua slider — iPad chỉnh bằng nút cứng; slider chỉ tác dụng trên Mac/desktop)
- Nhớ track đang nghe riêng từng sách (localStorage)
- PWA offline: thêm vào màn hình chính, nghe offline sau lần đầu

## Cấu trúc

```
index.html            # Trang thư viện (list sách)
player.html           # Player chung — đọc ?book=<slug>
books.json            # Đăng ký sách
css/library.css       # giao diện thư viện
css/player.css        # giao diện player
js/library.js         # render thư viện
js/player.js          # logic player
books/
  <slug>/
    tracks.json       # [{n, title, file}]
    audio/track-NN.mp3
sw.js                 # service worker offline (network-first shell, 206 range cho iOS)
manifest.webmanifest
icons/
```

## ➕ Thêm sách mới (3 bước)

1. **Tạo folder + bỏ audio vào:**
   ```
   books/<slug>/audio/track-01.mp3 ...
   ```
   (`<slug>` = tên không dấu, dùng gạch nối, vd `round-up-4`)

2. **Tạo `books/<slug>/tracks.json`** — chạy từ thư mục gốc repo:
   ```bash
   python3 - <<'PY'
   import json, os
   slug = "round-up-4"   # đổi tên
   d = f"books/{slug}/audio"
   files = sorted(f for f in os.listdir(d) if f.endswith(".mp3"))
   tracks = [{"n": int(f[6:8]), "title": f"Track {f[6:8]}", "file": f} for f in files]
   json.dump(tracks, open(f"books/{slug}/tracks.json", "w"), ensure_ascii=False)
   print(len(tracks), "tracks")
   PY
   ```

3. **Thêm 1 dòng vào `books.json`:**
   ```json
   { "slug": "round-up-4", "title": "Round Up 4", "subtitle": "Audio CD", "tracks": 50, "color": "#f472b6" }
   ```

4. Bump version trong `sw.js` (vd `nru-shell-v4` → `v5`), rồi commit + push. Xong.

> File audio không phải .mp3 (vd .wma): convert trước bằng
> `ffmpeg -i input.wma -codec:a libmp3lame -b:a 128k track-NN.mp3`

## Chạy local
```bash
python3 -m http.server 8777   # mở http://localhost:8777
```
> Phải qua HTTP server (không mở file://) để fetch JSON + service worker chạy.
