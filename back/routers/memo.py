from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# 모듈 임포트 경로 수정
from ..database import get_db
# ORM 모델은 DBMemo로 별칭을 지정하여 Pydantic 스키마 (Memo)와 충돌을 명확하게 방지합니다.
from ..models import Memo as DBMemo, User
from ..schemas import Memo, MemoCreate, MemoBase # Pydantic 스키마
from ..dependencies import get_current_active_user

router = APIRouter(
    # prefix="/memo",  # main.py에서 이미 "/api/v1/memo"로 설정되므로 제거했습니다.
    # tags는 memo 전체를 담당합니다.
    tags=["memo"]
)

@router.post("/", response_model=Memo, status_code=status.HTTP_201_CREATED)
def create_memo(
    memo: MemoCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """새 메모 생성"""
    # ORM 모델인 DBMemo를 사용하여 데이터베이스 객체를 생성합니다.
    db_memo = DBMemo(**memo.dict(), owner_id=current_user.id)
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo

@router.get("/", response_model=List[Memo]) # 경로를 "/" 대신 ""로 변경하여, main.py의 prefix와 완벽히 일치하도록 합니다.
def read_memos(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """내 메모 목록 조회"""
    # ORM 모델인 DBMemo를 사용하여 쿼리를 실행합니다.
    memos = db.query(DBMemo).filter(DBMemo.owner_id == current_user.id).all()
    return memos

@router.put("/{memo_id}", response_model=Memo)
def update_memo(
    memo_id: int,
    memo_update: MemoBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 메모 수정"""
    # ORM 모델인 DBMemo를 사용하여 메모를 조회합니다.
    db_memo = db.query(DBMemo).filter(DBMemo.id == memo_id, DBMemo.owner_id == current_user.id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found or access denied")
    
    for key, value in memo_update.dict(exclude_unset=True).items():
        setattr(db_memo, key, value)
        
    db.commit()
    db.refresh(db_memo)
    return db_memo

@router.delete("/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memo(
    memo_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 메모 삭제"""
    # ORM 모델인 DBMemo를 사용하여 메모를 조회합니다.
    db_memo = db.query(DBMemo).filter(DBMemo.id == memo_id, DBMemo.owner_id == current_user.id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found or access denied")
        
    db.delete(db_memo)
    db.commit()
    return {}
