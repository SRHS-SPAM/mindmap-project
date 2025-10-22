from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- 인증 및 사용자 관련 스키마 ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(BaseModel):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_online: bool
    social_provider: Optional[str] = None

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- 친구 관계 스키마 ---
class FriendRequest(BaseModel):
    friend_email: EmailStr

class FriendStatus(BaseModel):
    friend_id: int
    email: EmailStr
    is_online: bool
    
# --- 메모 스키마 ---
class MemoBase(BaseModel):
    title: str
    content: str

class MemoCreate(MemoBase):
    pass

class Memo(MemoBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# --- 프로젝트 및 채팅 스키마 ---
class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, description="업데이트할 프로젝트 제목")

    class Config:
        orm_mode = True
        
class ProjectCreate(BaseModel):
    title: str
    # 초기 멤버 추가 기능이 있을 경우 여기에 포함될 수 있음 (간소화를 위해 생략)

class Project(BaseModel):
    id: int
    title: str
    is_generating: bool
    last_chat_id_processed: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessage(ChatMessageCreate):
    id: int
    user_id: int
    timestamp: datetime
    
    class Config:
        orm_mode = True

# --- 마인드맵 스키마 ---

class MindMapNodeConnection(BaseModel):
    target_id: str
    label: str = "연관성" # 선의 레이블 (추후 확장 가능)

class MindMapNodeBase(BaseModel):
    id: str = Field(..., description="고유 노드 ID (예: 'core-1')")
    node_type: str = Field(..., description="'핵심 주제', '대주제', '소주제' 중 하나")
    title: str
    description: str
    connections: List[MindMapNodeConnection] = Field(default_factory=list, description="연결된 노드 목록")

class MindMapNode(MindMapNodeBase):
    project_id: int
    
    class Config:
        orm_mode = True

class MindMapData(BaseModel):
    nodes: List[MindMapNodeBase] = Field(..., description="마인드맵 노드 목록")
    links: List[Dict[str, str]] = Field(..., description="프론트엔드 렌더링을 위한 연결 정보 (source, target)")

class AIAnalysisResult(BaseModel):
    is_success: bool
    last_chat_id: int = Field(..., description="AI가 마지막으로 분석한 채팅 메시지 ID")
    mind_map_data: MindMapData = Field(..., description="AI가 생성한 마인드맵 구조 데이터")

# --- AI 추천 스키마 ---
class AIRecommendation(BaseModel):
    recommendation: str

# ORM 모델 충돌 방지 및 라우터 임포트를 위한 별칭
# project.py 라우터에서 ORM 모델과 Pydantic 모델 이름 충돌을 피하기 위해 사용됩니다.
ORMMindMapNode = MindMapNode
