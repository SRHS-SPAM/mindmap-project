import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from typing import List

# 임시 인증 확인 함수 (실제 앱에서는 JWT 토큰 검증 로직으로 대체해야 합니다)
def get_authenticated_user():
    return True 

router = APIRouter(
    prefix="/ai",
    tags=["5. AI Mindmap Generation"]
)

# --- Pydantic 스키마 정의 (JSON 응답 구조) ---
class MindMapDetail(BaseModel):
    topic: str = Field(..., description="주요 가지(Branch)의 제목")
    details: List[str] = Field(..., description="해당 가지에 대한 3~5개의 구체적인 세부 사항")

class MindMapResponse(BaseModel):
    mainTopic: str = Field(..., description="전체 채팅 내용을 아우르는 핵심 주제")
    branches: List[MindMapDetail]

# --- API Endpoints ---

@router.post(
    "/generate-mindmap", 
    response_model=MindMapResponse, 
    summary="채팅 기록 기반 마인드맵 생성 (Vertex AI)",
    status_code=status.HTTP_200_OK
)
async def generate_mindmap(
    chat_history: str, # 프론트엔드에서 전체 대화 기록을 문자열로 받음
    # security_check: bool = Depends(get_authenticated_user) # 🚨 실제 구현 시 인증 확인
):
    """
    제공된 채팅 기록을 분석하여 구조화된 마인드맵 JSON을 반환합니다.
    """
    if not chat_history or len(chat_history.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효한 채팅 기록(10자 이상)을 제공해야 합니다."
        )

    try:
        model = GenerativeModel("gemini-2.5-flash") # Vertex AI 모델 사용

        system_instruction = (
            "당신은 대화 내용을 마인드맵 구조로 변환하는 AI 비서입니다. "
            "제공된 대화 내용을 분석하여 핵심 주제(mainTopic) 1개와 주요 아이디어(branches) 3~5개를 추출하고, "
            "각 아이디어에 대해 3개 이상의 구체적인 세부 사항(details)을 포함해야 합니다. "
            "응답은 반드시 요청된 JSON 스키마를 따라야 하며, 다른 설명 텍스트는 포함하지 마십시오."
        )

        user_prompt = f"다음은 사용자 간의 대화 기록입니다. 이 대화를 기반으로 마인드맵 JSON을 생성해주세요:\n---\n{chat_history}"
        
        config = GenerationConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=MindMapResponse, # Pydantic 스키마를 JSON 스키마로 사용
        )

        response = model.generate_content(
            contents=user_prompt,
            config=config,
        )
        
        json_data = json.loads(response.text)
        
        return MindMapResponse(**json_data) 

    except Exception as e:
        print(f"Vertex AI 호출 중 오류 발생: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"마인드맵 생성 서버 오류가 발생했습니다. Vertex AI 인증 및 권한을 확인하세요: {e}"
        )
