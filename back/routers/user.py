from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError 
from datetime import datetime # datetime을 사용하기 위해 임포트

from ..database import get_db
from ..models import User, Friendship 
from ..schemas import User as UserSchema, FriendRequest, FriendshipBase, FriendNotification, FriendAction 
from ..security import get_current_active_user

router = APIRouter(prefix="/user", tags=["user"])

# (기존 search_user_by_friend_code 함수는 그대로 둡니다.)
@router.get("/search", response_model=UserSchema)
def search_user_by_friend_code(
    friend_code: str, 
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """친구 코드를 통해 사용자 정보를 검색합니다."""
    user_found = db.query(User).filter(User.friend_code == friend_code).first()
    
    if not user_found or user_found.id == current_user.id:
        raise HTTPException(status_code=404, detail="User not found with this friend code or cannot search self.")
        
    return user_found

# 🚨 수정: 친구 요청 (Friendship 상태를 'pending'으로 생성)
@router.post("/friends/add", response_model=FriendshipBase, status_code=status.HTTP_201_CREATED)
def add_friend_request(
    friend_req: FriendRequest,
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """친구 코드(7자리)를 사용하여 친구 요청을 보냅니다 (상태: pending)."""
    
    friend_to_add = db.query(User).filter(User.friend_code == friend_req.friend_code).first()
    
    if not friend_to_add:
        raise HTTPException(status_code=404, detail="Friend code not found or invalid")
    
    if friend_to_add.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send a friend request to yourself")

    # 1. 이미 요청이 존재하거나 친구 관계인지 확인 (사용자 -> 친구 방향)
    existing_request = db.query(Friendship).filter(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == friend_to_add.id
    ).first()
    
    if existing_request:
        if existing_request.status == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        if existing_request.status == "pending":
            raise HTTPException(status_code=400, detail="Friend request already sent and pending")

    # 2. 상대방이 나에게 이미 요청을 보냈는지 확인 (친구 -> 사용자 방향)
    # 이 경우, 자동으로 수락 처리
    inverse_request = db.query(Friendship).filter(
        Friendship.user_id == friend_to_add.id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).first()
    
    if inverse_request:
        # 이미 요청이 있다면, 해당 요청을 accepted로 변경하고 새로 레코드 생성 없이 종료
        inverse_request.status = "accepted"
        db.commit()
        # 💡 성공 응답 대신 HTTPException을 사용하여 프론트에서 즉시 친구로 표시하도록 유도
        raise HTTPException(status_code=200, detail="Inverse request found and automatically accepted.")

    # 3. 새로운 요청 (pending) 생성
    try:
        new_request = Friendship(
            user_id=current_user.id, 
            friend_id=friend_to_add.id, 
            status="pending"
        )
        
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
        
        return new_request
    except IntegrityError:
        # UniqueConstraint 위반 시 발생하는 에러를 명시적으로 처리
        db.rollback()
        raise HTTPException(status_code=400, detail="A relationship already exists or a pending request exists.")


# 🚨 새 함수: 친구 요청 알림 목록 가져오기 (알림 페이지용)
@router.get("/friends/requests", response_model=List[FriendNotification])
def get_friend_requests(
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """나에게 온 'pending' 상태의 친구 요청 목록을 조회합니다."""
    
    # Friendship.requester 관계를 JOIN하여 요청자 정보를 가져옵니다.
    pending_requests = db.query(Friendship).options(
        joinedload(Friendship.requester)
    ).filter(
        Friendship.friend_id == current_user.id, # 내가 받은 요청
        Friendship.status == "pending"
    ).all()

    notifications = []
    for req in pending_requests:
        # requester가 User 모델 인스턴스입니다.
        sender_name = req.requester.name if req.requester.name else req.requester.email.split('@')[0]
        notifications.append(FriendNotification(
            id=req.id,
            sender_id=req.user_id,
            sender_name=sender_name,
            sender_friend_code=req.requester.friend_code,
            status=req.status
        ))
        
    return notifications


# 🚨 새 함수: 친구 요청 수락/거절
@router.post("/friends/action", status_code=status.HTTP_204_NO_CONTENT)
def handle_friend_request_action(
    action_data: FriendAction,
    current_user: UserSchema = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """친구 요청(Friendship ID)을 수락하거나 거절합니다."""
    
    friendship_record = db.query(Friendship).filter(
        Friendship.id == action_data.friendship_id,
        Friendship.friend_id == current_user.id # 요청을 받은 사람이 현재 사용자여야 함
    ).first()
    
    if not friendship_record:
        raise HTTPException(status_code=404, detail="Friend request not found or unauthorized")
        
    if friendship_record.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")

    if action_data.action == "accept":
        # 1. 기존 요청 상태를 'accepted'로 변경 (친구 -> 나)
        friendship_record.status = "accepted"
        
        # 2. 역방향 레코드 생성 (나 -> 친구)
        # 역방향 레코드는 반드시 'accepted' 상태로 새로 생성되어야 합니다.
        inverse_friendship = Friendship(
            user_id=current_user.id, 
            friend_id=friendship_record.user_id, 
            status="accepted"
        )
        db.add(inverse_friendship)
        
        db.commit()
        
    elif action_data.action == "reject":
        # 거절 시, 해당 요청 레코드의 상태를 'rejected'로 변경 (또는 삭제)
        friendship_record.status = "rejected"
        db.commit()
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'accept' or 'reject'.")
        
    return 

# (list_friends_status, set_online_status 함수들은 그대로 둡니다.)
