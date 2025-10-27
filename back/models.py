from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship, backref # backref 추가
from sqlalchemy.sql import func
from .database import Base

# --- 사용자 및 인증 관련 모델 ---

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 💡 name 필드는 스키마에서 username으로 사용될 수 있습니다.
    name = Column(String, index=True) 
    
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    social_provider = Column(String, nullable=True) 
    
    is_online = Column(Boolean, default=False)
    
    # 친구 코드는 user.py에서 핵심적으로 사용됩니다.
    friend_code = Column(String(7), unique=True, index=True, nullable=False) 
    
    # 릴레이션 정의
    memos = relationship("Memo", back_populates="owner")
    projects = relationship("ProjectMember", back_populates="user")
    
    # 🚨 친구 관계 릴레이션 정의 (user.py 로직과 일치)
    # user_id (요청을 보낸 사람) 기준
    sent_friendships = relationship(
        "Friendship", 
        foreign_keys='[Friendship.user_id]', # Friendship.user_id가 나(User.id)인 경우
        back_populates="requester"
    )
    # friend_id (요청을 받은 사람) 기준
    received_friendships = relationship(
        "Friendship", 
        foreign_keys='[Friendship.friend_id]', # Friendship.friend_id가 나(User.id)인 경우
        back_populates="receiver"
    )

# 🚨 Friendship 모델 (친구 요청 및 관계 상태 관리)
class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    
    # 요청을 보낸 사용자 (user_id)
    user_id = Column(Integer, ForeignKey("users.id"), index=True) 
    # 요청을 받은 사용자 (friend_id)
    friend_id = Column(Integer, ForeignKey("users.id"), index=True) 
    
    # 친구 요청 상태 (user.py에서 사용: 'pending', 'accepted', 'rejected')
    status = Column(String, default="pending") 
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 관계 정의: requester (요청자)와 receiver (수신자)를 명확하게 구분
    requester = relationship("User", foreign_keys=[user_id], back_populates="sent_friendships")
    receiver = relationship("User", foreign_keys=[friend_id], back_populates="received_friendships")

    # 고유 인덱스: 동일한 요청이 중복되는 것을 방지
    # (user_id, friend_id 순서 쌍만 고유함을 보장. 역방향은 허용)
    __table_args__ = (
        UniqueConstraint('user_id', 'friend_id', name='_user_friend_uc'),
    )


# --- 메모 기능 모델 ---
class Memo(Base):
    __tablename__ = "memos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="memos")


# --- 프로젝트 및 마인드맵 모델 ---
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    created_at = Column(DateTime, default=func.now())
    
    # 마인드맵 생성 상태 관리
    is_generating = Column(Boolean, default=False) 
    last_chat_id_processed = Column(Integer, default=0) 
    
    members = relationship("ProjectMember", back_populates="project")
    chats = relationship("ChatMessage", back_populates="project")
    nodes = relationship("MindMapNode", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    is_admin = Column(Boolean, default=False) 
    
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")
    
    __table_args__ = (
        UniqueConstraint('project_id', 'user_id', name='_project_member_uc'),
    )

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    
    project = relationship("Project", back_populates="chats")
    user = relationship("User") # 채팅 작성자 정보
    
    
class MindMapNode(Base):
    __tablename__ = "mindmap_nodes"
    
    id = Column(String, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    node_type = Column(String) 
    title = Column(String)
    description = Column(Text)
    
    # 연결 정보 (JSON 형태로 저장)
    connections = Column(JSON, default=lambda: []) 

    project = relationship("Project", back_populates="nodes")
