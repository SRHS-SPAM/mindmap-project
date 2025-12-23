# Python 3.11 슬림 버전 사용
FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH /app

# 작업 디렉토리 설정
WORKDIR /app

# [수정 1] 필요한 폴더들을 미리 생성 (uploaded_images 필수!)
RUN mkdir -p /app/back /app/uploaded_images

# [기존 유지] 현재 폴더를 /app/back 안으로 복사
COPY . /app/back/

# [기존 유지] __init__.py 강제 생성
RUN touch /app/back/__init__.py

# 의존성 설치
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# [수정 2] 실행 명령어 간소화 및 명확화
# Cloud Run은 자동으로 PORT 환경변수를 주입하지만, 
# 쉘 변수 확장 문제 방지를 위해 --port 8000을 기본값으로 명시하지 않고
# uvicorn이 환경변수 PORT를 인식하도록 하거나, 아래처럼 쉘 확장을 정확히 사용해야 합니다.
CMD ["sh", "-c", "uvicorn back.main:app --host 0.0.0.0 --port ${PORT:-8000}"]