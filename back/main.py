import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import vertexai
from dotenv import load_dotenv 

from .database import engine, Base
from .routers import auth, project, user, memo, ai 
from .utils import UPLOAD_FOLDER
from .config import setup_gcp_credentials  # ✅ 추가

load_dotenv()

# ✅ 앱 시작 전에 GCP 인증 설정
setup_gcp_credentials()

app = FastAPI(
    title="MindMap Collaboration API",
    description="React 프론트엔드와 연동되는 마인드맵 협업 프로젝트 백엔드 (FastAPI)",
    version="1.0.0"
)

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

# ✅ uploaded_images 디렉토리가 없으면 생성
os.makedirs("uploaded_images", exist_ok=True)

# ✅ 수정: 중복 제거 - 한 번만 마운트
app.mount(
    "/uploaded_images", 
    StaticFiles(directory="uploaded_images"), 
    name="uploaded_images"
)

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 Vertex AI 초기화"""
    try:
        project_id = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("GCP_REGION", "us-central1") 
        
        if not project_id:
            print("⚠️  경고: GCP_PROJECT_ID 환경 변수가 설정되지 않았습니다.")
            return
        
        # ✅ GOOGLE_APPLICATION_CREDENTIALS가 설정되었는지 확인
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path and os.path.exists(creds_path):
            print(f"✅ Using GCP credentials from: {creds_path}")
        else:
            print("⚠️  GOOGLE_APPLICATION_CREDENTIALS not found")
        
        vertexai.init(project=project_id, location=location)
        print(f"✅ Vertex AI 초기화 성공! (Project: {project_id}, Location: {location})")
    except Exception as e:
        print(f"❌ Vertex AI 초기화 오류: {e}")

# ✅ 수정: Vercel 배포 주소도 추가
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    'https://mindmap-500829034336.asia-northeast3.run.app',
    "https://mindmap-project-sigma.vercel.app",
    'https://mindmap-project-d1q9lfzje-andire120s-projects.vercel.app',
    "https://mindmap-697550966480.asia-northeast3.run.app",
    "https://*.vercel.app",  # Vercel 배포 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.auth_router_base, prefix="/api/v1", tags=["1. 인증 (기본 기능)"])
app.include_router(auth.auth_router_protected, prefix="/api/v1", tags=["1. 사용자 관리 (보호된 기능)"])
app.include_router(user.router, prefix="/api/v1/user", tags=["2. 사용자 및 친구"])
app.include_router(memo.router, prefix="/api/v1/memo", tags=["3. 메모 관리"])
app.include_router(project.router, prefix="/api/v1", tags=["4. 프로젝트 및 마인드맵"])
app.include_router(ai.router, prefix="/api/v1", tags=["5. AI 마인드맵 생성"])

@app.get("/", tags=["Root"])
def read_root():
    return {
        "message": "MindMap Collaboration API is running.",
        "version": "1.0.0",
        "gcp_credentials": "✅" if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") else "❌"
    }

# ✅ 수정: 헬스체크 엔드포인트 추가 (Cloud Run용)
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected" if engine else "disconnected",
        "gcp_auth": "configured" if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") else "missing"
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Server starting on port {port}")
    print(f"📊 Database: {os.getenv('DB_HOST', 'SQLite')}")
    print(f"🔐 GCP Auth: {'✅' if os.getenv('GOOGLE_APPLICATION_CREDENTIALS') else '❌'}")
    
    # ✅ 수정: reload=False로 변경 (프로덕션 환경)
    uvicorn.run("back.main:app", host="0.0.0.0", port=port, reload=False)

@app.get("/debug-env", tags=["Debug"])
def debug_env():
    """환경변수 확인"""
    import os
    
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    return {
        "GCP_PROJECT_ID": os.getenv("GCP_PROJECT_ID"),
        "GCP_REGION": os.getenv("GCP_REGION"),
        "GOOGLE_APPLICATION_CREDENTIALS": creds_path,
        "credentials_exists": os.path.exists(creds_path) if creds_path else False,
        "GCP_CREDENTIALS_JSON_set": bool(os.getenv("GCP_CREDENTIALS_JSON")),
        "GCP_CREDENTIALS_JSON_length": len(os.getenv("GCP_CREDENTIALS_JSON", ""))
    }

@app.post("/debug-generate", tags=["Debug"])
async def debug_generate():
    """마인드맵 생성 디버그"""
    import os
    import traceback
    
    try:
        project_id = os.getenv("GCP_PROJECT_ID")
        region = os.getenv("GCP_REGION")
        
        if not project_id:
            return {"error": "GCP_PROJECT_ID not set"}
        
        if not region:
            return {"error": "GCP_REGION not set"}
        
        # Vertex AI 초기화 시도
        import vertexai
        vertexai.init(project=project_id, location=region)
        
        return {
            "status": "success",
            "project_id": project_id,
            "region": region,
            "vertex_initialized": True
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }