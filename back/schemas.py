from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- 인증 및 사용자 기본 스키마 ---
class UserBase(BaseModel):
    email: EmailStr # EmailStr import 추가
    name: str # name 필드가 models.User에 없지만, schema에는 있으므로 유지

class UserCreate(UserBase):
    """사용자 회원가입 시 필요 (password 포함)"""
    password: str

# 충돌하는 UserCreate 정의를 제거하고, 위의 것을 사용합니다.
# class UserCreate(BaseModel):
#     password: str

class User(UserBase):
    id: int
    is_active: bool
    last_activity: Optional[datetime] = None # 온라인 상태 확인용

    class Config:
        from_attributes = True

class UserUpdateStatus(BaseModel):
    timestamp: datetime # 클라이언트가 현재 시간을 보냄

# 토큰 스키마 (인증 라우터에서 사용)
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- 채팅 스키마 ---
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
        from_attributes = True

# --- 프로젝트 및 채팅 스키마 ---
class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, description="업데이트할 프로젝트 제목")

    class Config:
        from_attributes = True
        
class ProjectCreate(BaseModel):
    title: str
    # 초기 멤버 추가 기능이 있을 경우 여기에 포함될 수 있음 (간소화를 위해 생략)

class Project(BaseModel):
    id: int
    title: str
    is_generating: bool
    last_chat_id_processed: int
    created_at: datetime
    
    # members 필드를 위해 ProjectMemberSchema가 필요하지만, 순환 참조 문제로 인해 아래에 정의됨.
    # 일단 ProjectBase를 통해 멤버 없는 Project 스키마 정의를 유지합니다.
    
    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessage(ChatMessageCreate):
    id: int
    user_id: int
    project_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# --- 마인드맵 노드 스키마 ---
class MindMapNodeConnection(BaseModel):
    target_id: str

class MindMapNodeBase(BaseModel):
    id: str
    node_type: str # 핵심 주제, 대주제, 소주제
    title: str
    description: Optional[str] = None
    connections: List[MindMapNodeConnection] = []

class MindMapNode(MindMapNodeBase):
    project_id: int

    class Config:
        from_attributes = True

# routers/project.py에서 response_model로 참조되는 이름을 위해 alias를 추가합니다.
ORMMindMapNode = MindMapNode

# --- 프로젝트 멤버 스키마 ---
class ProjectMemberSchema(BaseModel):
    user_id: int
    is_admin: bool = False
    
    # 멤버의 상세 정보를 포함 (JOIN 결과)
    user: User

    class Config:
        from_attributes = True

# --- 프로젝트 스키마 (멤버 포함) ---
# 기존 Project 스키마를 덮어쓰거나, ProjectWithMembers 등으로 이름을 바꾸는 것이 좋지만, 
# 기존 코드 구조 유지를 위해 ProjectBase를 기반으로 최종 Project 스키마를 재정의합니다.
class ProjectBase(BaseModel):
    title: str

# ProjectCreate와 ProjectUpdate는 위에 이미 정의되어 있으므로 생략
# class ProjectCreate(ProjectBase): pass
# class ProjectUpdate(BaseModel): title: Optional[str] = None

class Project(ProjectBase): # 최종적으로 라우터에서 사용될 Project 스키마
    id: int
    created_at: datetime
    is_generating: bool = False
    last_chat_id_processed: Optional[int] = None
    
    # 멤버 목록 포함 (List, 조회 시 사용)
    members: List[ProjectMemberSchema] = [] 

    class Config:
        from_attributes = True


# --- AI 결과 스키마 ---
class MindMapData(BaseModel):
    nodes: List[MindMapNodeBase] = []
    links: List[Dict[str, str]] = [] # Link는 nodes의 connections 정보로 프론트에서 생성할 수 있으므로, 비워둘 수 있음

class AIAnalysisResult(BaseModel):
    is_success: bool
    last_chat_id: int
    mind_map_data: MindMapData

class AIRecommendation(BaseModel):
    recommendation: str

# --- 메모 스키마 (Memo Schemas) ---
class MemoBase(BaseModel):
    title: str
    content: str
    
class MemoCreate(MemoBase):
    """새 메모 생성 시 사용"""
    pass # 현재는 MemoBase와 동일하지만, 확장 가능성을 위해 분리
    
class Memo(MemoBase):
    """메모 응답 모델"""
    id: int
    owner_id: int
    # 데이터베이스 모델에 이 필드가 있다고 가정
    created_at: datetime
    updated_at: datetime 

    class Config:
        from_attributes = True

# --- 우정/친구 관리 스키마 (Friendship Schemas) ---
class FriendRequest(BaseModel):
    # 친구 요청을 보내거나 받을 때 사용될 기본 정보
    recipient_email: str
    
class FriendStatus(BaseModel):
    # 친구 관계 상태를 나타내기 위한 스키마 (상태: pending, accepted 등)
    id: int
    user_id: int
    friend_id: int
    status: str # "pending", "accepted", "rejected"
    
    class Config:
        from_attributes = True

# ORM 모델 충돌 방지 및 라우터 임포트를 위한 별칭
# project.py 라우터에서 ORM 모델과 Pydantic 모델 이름 충돌을 피하기 위해 사용됩니다.
ORMMindMapNode = MindMapNode
