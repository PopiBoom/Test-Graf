# Memento Mori — анимация канала (20 с)

- `index.html` + `motion.js` — анимация на HTML/Canvas/JS со своим таймлайном. Чтобы посмотреть, откройте через
  локальный сервер (`python3 -m http.server` в этой папке → http://localhost:8000). Пробел — пауза, ползунок — перемотка.
- `assets/soundtrack.wav` — музыка и звуковые эффекты, синтезированы скриптом `tools/make_audio.py` (numpy).
- `assets/kapustka.mp4/.webm` — исходное видео; `assets/frames/` — его кадры для точного покадрового рендера.
- `STORYBOARD.md` — раскадровка: варианты для каждой сцены и выбранное решение.
- `memento_mori.mp4` — готовый ролик: 1920×1080, 60 fps, H.264 yuv420p, звук AAC.

Пересборка видео:

```bash
python3 tools/make_audio.py assets/soundtrack.wav
python3 -m http.server 8765 --bind 127.0.0.1 &
node tools/render.js /tmp/frames 0 1199 4 5      # 1200 кадров, моушн-блюр 5 подкадров
ffmpeg -framerate 60 -i /tmp/frames/f%05d.png -i assets/soundtrack.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart memento_mori.mp4
```
