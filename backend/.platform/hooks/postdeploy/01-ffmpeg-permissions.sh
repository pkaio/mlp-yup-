#!/bin/bash

set -euo pipefail

echo "🔧 Verificando instalação do FFmpeg..."

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "📦 Instalando FFmpeg via yum..."
  sudo yum install -y epel-release >/dev/null 2>&1 || true
  sudo yum install -y ffmpeg
else
  echo "✅ FFmpeg já instalado em $(command -v ffmpeg)"
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "📦 Instalando FFprobe via yum..."
  sudo yum install -y ffmpeg
else
  echo "✅ FFprobe já instalado em $(command -v ffprobe)"
fi

FFMPEG_PATH="$(command -v ffmpeg)"
FFPROBE_PATH="$(command -v ffprobe)"

sudo chmod +x "$FFMPEG_PATH"
sudo chmod +x "$FFPROBE_PATH"

cat <<'EOF' | sudo tee /etc/profile.d/ffmpeg.sh >/dev/null
export FFMPEG_PATH=$(command -v ffmpeg)
export FFPROBE_PATH=$(command -v ffprobe)
EOF

echo "🎬 FFmpeg pronto para uso."
