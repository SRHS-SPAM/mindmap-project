# Python 공식 이미지를 기반으로 사용
FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# [중요] Python이 /app 경로에서 패키지를 찾을 수 있게 설정
ENV PYTHONPATH /app

# 작업 디렉토리 설정
WORKDIR /app

# [핵심 수정 1] 소스 코드를 /app/back 폴더 안으로 복사합니다.
# 이렇게 해야 'back'이라는 패키지 구조가 생겨서 'from .database'가 작동합니다.
COPY . /app/back

# 의존성 설치
# requirements.txt 위치가 /app/back/requirements.txt로 변경되었습니다.
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# [핵심 수정 2] 실행 명령어 변경
# 1. shell 형식(대괄호 없음)을 사용하여 $PORT 변수를 인식하게 함
# 2. 'back.main:app'으로 실행하여 main.py가 'back' 패키지의 일부임을 명시
CMD uvicorn back.main:app --host 0.0.0.0 --port ${PORT:-8000}