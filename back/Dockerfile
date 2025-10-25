# Python 공식 이미지를 기반으로 사용
FROM python:3.11-slim

# 필요한 환경 변수 설정 (예시)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# 💡 핵심 수정: Python이 /app 디렉토리에서 모듈을 찾도록 경로를 설정합니다.
ENV PYTHONPATH /app

# 컨테이너의 작업 디렉토리를 /app으로 설정합니다.
# 이 경로는 호스트의 'back' 폴더 내용이 복사될 위치입니다.
WORKDIR /app

# 현재 디렉토리(back)의 모든 파일과 폴더를 /app으로 복사합니다.
# 호스트: mindmap/back/* ->  컨테이너: /app/*
# (참고: Docker Compose의 context: ./back 때문에 실제로 back 폴더 안의 내용이 복사됨)
COPY . /app

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 서버 실행 명령
# 이제 main.py가 /app 디렉토리에 있으므로, 'main:app'으로 실행 가능합니다.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
