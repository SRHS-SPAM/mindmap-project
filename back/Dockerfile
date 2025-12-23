FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# 필요한 디렉토리 생성
RUN mkdir -p /app/back /app/uploaded_images

# requirements 먼저 복사 (캐싱 활용)
COPY requirements.txt /app/back/
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# 코드 복사
COPY . /app/back/
RUN touch /app/back/__init__.py

# ✅ 로그 출력 확인용
RUN echo "🐳 Docker build completed"

# ✅ 실행 시 로그 출력
CMD echo "🚀 Starting application..." && \
    python -m uvicorn back.main:app --host 0.0.0.0 --port 8000