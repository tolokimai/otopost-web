#!/usr/bin/env bash
set -euo pipefail

if [[ "${AUTO_DOWNLOAD_MODELS:-0}" == "1" ]] && [[ ! -f "${MUSETALK_DIR:-/opt/MuseTalk}/models/musetalkV15/unet.pth" ]]; then
  echo "Downloading official MuseTalk model weights..."
  cd "${MUSETALK_DIR:-/opt/MuseTalk}"
  bash download_weights.sh
fi

exec python3 -m uvicorn app:app --host 0.0.0.0 --port "${PORT:-9000}"
