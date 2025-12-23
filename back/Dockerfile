# Python 3.11 슬림 버전 사용
FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# 작업 디렉토리 설정
WORKDIR /app

# 필요한 폴더들을 미리 생성
RUN mkdir -p /app/back /app/uploaded_images

# 현재 폴더를 /app/back 안으로 복사
COPY . /app/back/

# __init__.py 강제 생성
RUN touch /app/back/__init__.py

# 의존성 설치
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# ✅ 수정: PORT 환경변수를 제대로 인식하도록 변경
# 방법 1: 쉘 없이 직접 실행하면서 uvicorn이 환경변수를 읽도록
CMD uvicorn back.main:app --host 0.0.0.0 --port ${PORT:-8000}

# 또는 방법 2: 명시적으로 쉘 스크립트 사용
# CMD sh -c "uvicorn back.main:app --host 0.0.0.0 --port ${PORT:-8000}"