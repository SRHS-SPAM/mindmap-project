# Python 3.11 슬림 버전 사용
FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# [중요] /app 디렉토리를 파이썬 경로에 추가
ENV PYTHONPATH /app

# 작업 디렉토리 설정
WORKDIR /app

# [핵심 1] back 폴더를 미리 생성
RUN mkdir -p /app/back

# [핵심 2] 현재 폴더(빌드 컨텍스트의 모든 파일)를 /app/back 안으로 복사
COPY . /app/back/

# [핵심 3] __init__.py 파일 강제 생성 (이게 없으면 패키지 인식 에러 발생)
RUN touch /app/back/__init__.py

# 의존성 설치
RUN pip install --no-cache-dir -r /app/back/requirements.txt

# [핵심 4] 실행 명령어
# 쉘 형태(sh -c)를 사용하여 $PORT 변수 치환을 확실하게 지원
# back 패키지 내부의 main 모듈 실행
CMD ["sh", "-c", "uvicorn back.main:app --host 0.0.0.0 --port ${PORT:-8000}"]