# OtoPost MuseTalk 1.5 GPU Worker

Worker terpisah untuk true lipsync. Backend utama tidak memuat PyTorch/model sehingga tetap ringan. Worker memakai repo resmi `TMElyralab/MuseTalk`, dipin ke commit di Dockerfile, dan menjalankan MuseTalk **v1.5** pada input 25 fps. Tidak ada Wav2Lip maupun fallback lipsync palsu.

## Syarat

- NVIDIA GPU + NVIDIA Container Toolkit (disarankan VRAM 8 GB+)
- Docker dan ruang disk untuk model

## Build & run

Dari root repo:

```bash
docker build -f workers/musetalk/Dockerfile -t otopost-musetalk:1.5 .
docker run -d --name otopost-musetalk --restart unless-stopped --gpus all \
  -p 9000:9000 \
  -e AUTO_DOWNLOAD_MODELS=1 \
  -e WORKER_TOKEN='token-panjang' \
  -e PUBLIC_BASE_URL='https://musetalk.domain.tld' \
  -v musetalk-models:/opt/MuseTalk/models \
  -v musetalk-data:/data/musetalk \
  otopost-musetalk:1.5
```

Set backend utama:

```env
MUSETALK_WORKER_URL=https://musetalk.domain.tld
MUSETALK_WORKER_TOKEN=token-panjang
MUSETALK_TIMEOUT_SECONDS=1800
```

API worker: `GET /health`, `POST /v1/jobs` (multipart `face` + `audio`), `GET /v1/jobs/{job}`, dan hasil di `/files/{job}/result.mp4`. Gunakan hanya media yang pengguna punya hak/izin untuk memproses.
