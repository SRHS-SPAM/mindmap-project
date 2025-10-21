from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Memo, User
from ..schemas import Memo, MemoCreate, MemoBase
from ..security import get_current_active_user
from typing import List

router = APIRouter()

@router.post("/", response_model=Memo, status_code=status.HTTP_201_CREATED)
def create_memo(
    memo: MemoCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """새 메모 생성"""
    db_memo = Memo(**memo.dict(), owner_id=current_user.id)
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo

@router.get("/", response_model=List[Memo])
def read_memos(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """내 메모 목록 조회"""
    memos = db.query(Memo).filter(Memo.owner_id == current_user.id).all()
    return memos

@router.put("/{memo_id}", response_model=Memo)
def update_memo(
    memo_id: int,
    memo_update: MemoBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 메모 수정"""
    db_memo = db.query(Memo).filter(Memo.id == memo_id, Memo.owner_id == current_user.id).first()
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
    db_memo = db.query(Memo).filter(Memo.id == memo_id, Memo.owner_id == current_user.id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found or access denied")
        
    db.delete(db_memo)
    db.commit()
    return {}
