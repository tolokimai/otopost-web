FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    MUSETALK_DIR=/opt/MuseTalk \
    WORK_DIR=/data/musetalk

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip python3.10-dev git ffmpeg libgl1 libglib2.0-0 build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --no-cache-dir \
    torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 \
    --index-url https://download.pytorch.org/whl/cu118

ARG MUSETALK_COMMIT=0a89dec45a0192b824e3cf4daf96c239440c5ed8
RUN git clone https://github.com/TMElyralab/MuseTalk.git /opt/MuseTalk \
    && cd /opt/MuseTalk && git checkout ${MUSETALK_COMMIT} \
    && python3 -m pip install --no-cache-dir -r requirements.txt

WORKDIR /worker
COPY workers/musetalk/requirements-api.txt ./requirements-api.txt
RUN python3 -m pip install --no-cache-dir -r requirements-api.txt
COPY workers/musetalk/app.py ./app.py
COPY workers/musetalk/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /data/musetalk

EXPOSE 9000
ENTRYPOINT ["./entrypoint.sh"]
