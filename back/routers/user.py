from typing import List # List 타입을 사용하기 위해 추가
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Friendship
from ..schemas import User as UserSchema, FriendRequest, FriendStatus # 충돌 방지를 위해 UserSchema로 리네임 (선택 사항)
from ..security import get_current_active_user

# 참고: 위 코드에서 `from schemas import User`가 Pydantic 모델을 의미한다고 가정하고,
#        `from models import User`는 SQLAlchemy 모델을 의미한다고 가정합니다.

router = APIRouter(prefix="/user", tags=["user"])

@router.post("/friends/add", response_model=FriendStatus, status_code=status.HTTP_201_CREATED)
def add_friend(
    friend_req: FriendRequest,
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """친구 코드(7자리)를 사용하여 친구 추가 요청 (상호 친구 관계 생성)"""
    
    # 1. 친구 코드로 사용자 검색
    friend_to_add = db.query(User).filter(User.friend_code == friend_req.friend_code).first()
    
    if not friend_to_add:
        raise HTTPException(status_code=404, detail="Friend code not found or invalid")
    
    # 2. 자기 자신을 친구로 추가하는 경우 방지
    if friend_to_add.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")

    # 3. 이미 친구인지 확인 (단방향만 확인해도 충분)
    existing_friendship = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == friend_to_add.id
    ).first()
    
    if existing_friendship:
        raise HTTPException(status_code=400, detail="Already friends")

    # 4. 친구 관계 생성 (양방향으로 간단히 생성)
    # 사용자 -> 친구
    friendship1 = Friendship(user_id=current_user.id, friend_id=friend_to_add.id)
    # 친구 -> 사용자
    friendship2 = Friendship(user_id=friend_to_add.id, friend_id=current_user.id)
    
    db.add_all([friendship1, friendship2])
    db.commit()
    db.refresh(friendship1) # ID를 얻기 위해 refresh

    return FriendStatus(
        friend_id=friend_to_add.id,
        email=friend_to_add.email,
        friend_code=friend_to_add.friend_code, # FriendStatus 스키마에 추가했다고 가정
        is_online=friend_to_add.is_online
    )

@router.get("/friends", response_model=List[FriendStatus])
def list_friends_status(
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """친구 목록 및 온라인 상태 조회"""
    friendships = db.query(Friendship).filter(Friendship.user_id == current_user.id).all()
    friend_ids = [f.friend_id for f in friendships]
    
    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    
    return [
        FriendStatus(
            friend_id=friend.id,
            email=friend.email,
            friend_code=friend.friend_code, # FriendStatus 스키마에 추가했다고 가정
            is_online=friend.is_online # WebSocket으로 실시간 업데이트되어야 함
        ) for friend in friends
    ]

@router.post("/set_online", status_code=status.HTTP_204_NO_CONTENT)
def set_online_status(
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """사용자 온라인 상태 설정 (실제로는 웹소켓 연결 시 처리)"""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if db_user:
        db_user.is_online = True
        db.commit()
