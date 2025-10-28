import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// API 키 및 URL 설정 (Canvas 환경에서 자동으로 주입됩니다)
// const apiKey = "";
// const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// 💡 백엔드 FastAPI 서버의 기본 URL을 상수로 정의
// (FastAPI가 8000번 포트에서 실행된다고 가정)
const BACKEND_BASE_URL = 'http://localhost:8000';

// 💡 [수정 필요] API 버전과 프로젝트 라우터를 포함하여 정확한 경로를 명시합니다.
const API_VERSION_PREFIX = '/api/v1'; // main.py에 설정된 prefix
// MindMapPage.js (수정 후)
// 💡 프로젝트 ID는 아마도 라우팅 파라미터나 상태로 관리될 것입니다. 임시로 하드코딩된 값이라 가정합니다.
// const PROJECT_ID = 1; // 실제로는 React Router 등에서 가져와야 함.
// 백엔드 Fast API 엔드포인트 URL

// 💡 [최종 수정된 호출 URL]
// const BACKEND_GENERATE_URL = `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/generate`;
// 참고: project.py 라우터에 prefix="/projects"를 사용했으므로 '/api/v1'은 main.py에서 처리해야 합니다.
// 현재 백엔드 라우터(project.py)에 맞게 '/projects/{project_id}/generate'로 설정합니다.

// 마인드맵 JSON 구조 정의
const mindMapSchema = {
    type: "OBJECT",
    properties: {
        "mainTopic": { "type": "STRING", "description": "전체 채팅 내용을 아우르는 핵심 주제" },
        "branches": {
            "type": "ARRAY",
            "description": "주요 아이디어와 세부 사항 목록",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "topic": { "type": "STRING", "description": "주요 가지(Branch)의 제목" },
                    "details": {
                        "type": "ARRAY",
                        "description": "해당 가지에 대한 3~5개의 구체적인 세부 사항",
                        "items": { "type": "STRING" }
                    }
                },
                "required": ["topic", "details"]
            }
        }
    },
    required: ["mainTopic", "branches"]
};

// 시뮬레이션용 데이터 생성 함수 (실제 LLM이 응답하지 않을 때 사용)
const generateFallbackMindMap = (text) => {
    return {
        "mainTopic": text.length > 50 ? text.substring(0, 50) + "..." : "대화 내용 기반 핵심 주제",
        "branches": [
            {
                "topic": "첫 번째 핵심 논점 (대체 데이터)",
                "details": ["논점 1의 세부 사항 A", "논점 1의 세부 사항 B", "논점 1의 구체적 예시"]
            },
            {
                "topic": "두 번째 중요 아이디어 (대체 데이터)",
                "details": ["아이디어 2의 정의", "아이디어 2의 장점", "아이디어 2의 한계"]
            },
            {
                "topic": "세 번째 관련 요소 (대체 데이터)",
                "details": ["요소 3의 배경", "요소 3의 영향력", "요소 3의 향후 전망"]
            }
        ]
    };
};

// --- Chat Message Component (채팅 메시지 렌더링) ---
const ChatMessage = ({ role, text }) => {
    const isUser = role === 'user';
    return (
        <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-xl p-3 rounded-xl shadow-md ${
                isUser 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
                {text}
            </div>
        </div>
    );
};

// --- Mind Map Rendering Component (마인드맵 구조 렌더링) ---
const MindMapOutput = ({ mindMapData, errorMessage }) => {
    if (errorMessage) {
        // API 오류 발생 시 메시지 표시
        return (
            <div className="text-red-500 p-4 bg-red-100 rounded-lg">
                <strong>오류 발생:</strong> 마인드맵 생성에 실패했습니다. (콘솔 확인)
                <p className="mt-2 text-sm text-red-700">API 설정 또는 응답 처리 중 문제가 발생했습니다. 시뮬레이션 데이터가 표시됩니다.</p>
            </div>
        );
    }
    
    if (!mindMapData) {
        // 초기 상태 메시지
        return (
            <div className="text-center text-gray-500 py-10">
                좌측에서 대화를 시작하고 '마인드맵 생성' 버튼을 눌러주세요.
            </div>
        );
    }

    const { mainTopic, branches } = mindMapData;

    // 마인드맵 가지(Branch)와 세부 사항(Details)을 JSX로 변환
    const MindMapList = branches.map((branch, index) => {
        const detailHtml = (branch.details || []).map((detail, detailIndex) => 
            <li key={detailIndex} className="detail-item text-sm mt-1">{detail}</li>
        );

        return (
            <li 
                key={index} 
                className="bg-white rounded-xl p-4 mb-4 shadow-lg transition duration-300 hover:shadow-xl hover:scale-[1.01]"
            >
                <h3 className="text-xl font-bold text-gray-700 mb-2 border-b pb-1 border-blue-100">
                    {branch.topic || '가지 주제 없음'}
                </h3>
                <ul className="list-none pt-2">{detailHtml}</ul>
            </li>
        );
    });

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-3xl font-extrabold text-gray-800 text-center bg-yellow-300 p-4 rounded-xl shadow-lg border-b-4 border-yellow-500 animate-pulse-once">
                    {mainTopic || '주제 없음'}
                </h2>
            </div>
            {branches.length > 0 ? (
                // mindmap-list 클래스는 Custom CSS에 정의되어 있습니다.
                <ul className="mindmap-list">
                    {MindMapList}
                </ul>
            ) : (
                <div className="text-center text-gray-500 py-10">
                    대화 내용에서 마인드맵 구조를 추출하지 못했습니다. 더 자세한 대화를 시도해 보세요.
                </div>
            )}
        </div>
    );
};


// --- Main App Component (메인 애플리케이션) ---
const App = () => {
    // State Hooks: 채팅 내역, 입력 값, 마인드맵 데이터, 로딩 상태, 오류 메시지
    const [chatHistory, setChatHistory] = useState([
        { role: 'model', text: "안녕하세요! 마인드맵으로 만들고 싶은 주제에 대해 대화해보세요. 대화 후 '마인드맵 생성' 버튼을 눌러주세요." }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [mindMapData, setMindMapData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 💡 [수정] useParams를 사용하여 프로젝트 ID를 동적으로 가져옵니다.
    const { projectId: routeProjectId } = useParams();
    
    // 프로젝트 ID를 상수로 정의하거나, 숫자로 변환합니다.
    // URL 파라미터는 문자열이므로 숫자로 변환합니다 (NaN 방지).
    const PROJECT_ID = parseInt(routeProjectId, 10);
    
    // 💡 [수정] BACKEND_GENERATE_URL을 컴포넌트 내에서 PROJECT_ID를 사용해 동적으로 정의합니다.
    // projectId가 유효하지 않으면 요청을 보내지 않도록 합니다.
    const BACKEND_GENERATE_URL = PROJECT_ID && !isNaN(PROJECT_ID)
        ? `${BACKEND_BASE_URL}${API_VERSION_PREFIX}/projects/${PROJECT_ID}/generate`
        : null;
    
    // Ref: 채팅 로그 자동 스크롤을 위한 참조
    const chatLogRef = React.useRef(null);

    // Effect: 채팅 내역이 업데이트될 때마다 자동으로 스크롤
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
        }
    }, [chatHistory]);


    // AI 응답 시뮬레이션 (마인드맵 생성을 위한 대화 축적 목적)
    const simulateAiResponse = useCallback(() => {
        let aiResponseText;
        
        if (chatHistory.length === 1) {
            aiResponseText = "안녕하세요! 마인드맵으로 만들고 싶은 주제에 대해 편하게 이야기해주세요. 제가 핵심 내용을 정리해 드리겠습니다.";
        } else if (chatHistory.length % 4 === 0) {
            aiResponseText = "좋은 아이디어네요. 혹시 그 부분에 대해 더 구체적인 예시나 세부 사항이 있으신가요?";
        } else {
            aiResponseText = "네, 알겠습니다. 계속해서 내용을 말씀해주세요.";
        }

        setTimeout(() => {
            setChatHistory(prev => [...prev, { role: 'model', text: aiResponseText }]);
        }, 500);
    }, [chatHistory.length]);

    // 메시지 전송 로직
    const sendMessage = useCallback((e) => {
        e.preventDefault(); // 폼 제출 기본 동작 방지
        const text = chatInput.trim();
        if (text === '') return;

        // 1. 사용자 메시지 기록
        setChatHistory(prev => [...prev, { role: 'user', text }]);

        // 2. AI 응답 시뮬레이션 요청
        simulateAiResponse();
        
        setChatInput(''); // 입력 필드 초기화
    }, [chatInput, simulateAiResponse]);


    // 마인드맵 생성 로직 (Gemini API 호출)
    const generateMindMap = useCallback(async () => {
        if (!BACKEND_GENERATE_URL || chatHistory.length < 2) { // 💡 [추가] URL 유효성 검사
            console.error('유효하지 않은 프로젝트 ID 또는 대화 내용 부족.');
            setError("프로젝트 ID가 유효하지 않거나 대화 내용이 부족합니다.");
            return;
        }

        // UI 상태 변경: 로딩 시작
        setIsLoading(true);
        setMindMapData(null);
        setError(null);
        
        // 💡 백엔드 Fast API 엔드포인트는 project_id만 필요하고, 
        // 채팅 내역은 백엔드가 DB에서 직접 가져오도록 설계되어 있습니다.
        // 따라서, payload는 빈 객체이거나, 필요한 경우 project_id만 포함하면 됩니다.
        // (현재 project_id는 URL에 포함되어 있음)

        try {
            let response;
            let parsedResult = null;
            let errorMessage = null;

            const MAX_RETRIES = 1; // 재시도는 백엔드에서 처리하도록 맡기는 것이 좋습니다.

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    // 💡 1. 저장된 토큰을 가져옵니다. (토큰이 로컬 스토리지에 저장되어 있다고 가정)
                    const authToken = sessionStorage.getItem('access_token'); // 또는 쿠키에서 가져옵니다.

                    // 💡 2. 토큰이 없으면 함수를 종료하거나 오류를 보고합니다.
                    if (!authToken) {
                        console.error("인증 토큰이 없습니다. 로그인 상태를 확인하세요.");
                        return; // 요청을 보내지 않음
                    }

                    // 💡 [수정됨] 백엔드 API 호출로 변경!
                    response = await fetch(BACKEND_GENERATE_URL, {
                        method: 'POST',
                        // JWT 토큰 등을 'Authorization' 헤더에 포함시켜야 할 수 있습니다. (로그인 구현 시)
                        headers: {
                            'Content-Type': 'application/json',
                            // 💡 [핵심 추가] Authorization 헤더에 Bearer 토큰을 추가합니다.
                            'Authorization': `Bearer ${authToken}` 
                        },
                        // Fast API generate 엔드포인트는 body가 필요 없거나 project_id를 URL에 사용합니다.
                        // body: JSON.stringify({}), // 요청 본문은 비워두거나 필요에 따라 조정
                    });

                    if (response.ok) {
                        // 백엔드에서 온 JSON 응답을 바로 파싱
                        const result = await response.json(); 
                        
                        // 💡 [가정] 백엔드의 응답 스키마(AIAnalysisResult)에 
                        // 마인드맵 데이터가 `mindmap_data` 필드에 포함되어 있다고 가정합니다.
                        if (result.is_success && result.mindmap_data) {
                            parsedResult = result.mindmap_data;
                            break; // 성공
                        } else {
                            throw new Error(`백엔드 분석 실패: ${result.message || 'AI 분석 결과가 유효하지 않습니다.'}`);
                        }
                    } else {
                        // 4xx/5xx 에러 처리
                        const errorDetail = await response.json().catch(() => ({ detail: '응답 본문 파싱 실패' }));
                        throw new Error(`API 요청 실패: ${response.status} (${response.statusText}). 상세: ${errorDetail.detail}`);
                    }
                } catch (error) {
                    errorMessage = error.message;
                    console.error(`Attempt ${attempt + 1} failed:`, error);
                }
            }
            
            // 최종 결과 처리
            if (parsedResult) {
                // 💡 [수정됨] 백엔드에서 받은 실제 마인드맵 데이터로 업데이트
                setMindMapData(parsedResult); 
            } else {
                // 실패 시 대체 데이터 처리 유지 (디버깅 용)
                console.warn("백엔드 호출 실패 또는 결과 없음. 시뮬레이션 데이터로 대체합니다.");
                const conversationText = chatHistory.map(msg => msg.text).join(' ');
                setMindMapData(generateFallbackMindMap(conversationText));
                if (errorMessage) {
                    setError(errorMessage);
                }
            }
        } catch (err) {
            console.error('마인드맵 생성 중 심각한 오류 발생:', err);
            setError("마인드맵 생성 중 알 수 없는 오류가 발생했습니다.");
            
            // 최종 실패 시에도 대체 데이터 렌더링
            const conversationText = chatHistory.map(msg => msg.text).join(' ');
            setMindMapData(generateFallbackMindMap(conversationText));

        } finally {
            // UI 상태 복원: 로딩 종료
            setIsLoading(false);
        }
    },[chatHistory, BACKEND_GENERATE_URL]);


    return (
        <div className="p-4 md:p-8 min-h-screen" style={{ fontFamily: 'Noto Sans KR, Inter, sans-serif' }}>
            {/* Custom CSS for Mind Map Structure */}
            <style jsx="true">{`
                /* 한국어 폰트 설정 (JSX 환경에서는 font-family만 남깁니다) */
                body {
                    font-family: 'Noto Sans KR', 'Inter', sans-serif;
                    background-color: #f7f9fb;
                }
                /* 마인드맵 구조 스타일링 */
                .mindmap-list {
                    list-style: none;
                    padding-left: 0;
                }
                .mindmap-list > li {
                    position: relative;
                    padding: 10px 0 10px 30px;
                    margin-bottom: 5px;
                    border-left: 2px solid #3b82f6;
                }
                .mindmap-list > li::before {
                    content: '⬤';
                    position: absolute;
                    left: -8px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #3b82f6;
                    font-size: 10px;
                    background-color: #f7f9fb;
                    padding: 0 4px;
                }
                .detail-item {
                    position: relative;
                    padding-left: 15px;
                    color: #4b5563;
                }
                .detail-item::before {
                    content: '—';
                    position: absolute;
                    left: 0;
                    color: #6b7280;
                }
                .scrollable-area::-webkit-scrollbar {
                    width: 6px;
                }
                .scrollable-area::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .scrollable-area::-webkit-scrollbar-track {
                    background: #f1f5f9;
                }
            `}</style>

            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-3">AI 채팅 마인드맵 생성 데모</h1>
            

            {/* 메인 레이아웃 (채팅과 마인드맵) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh] min-h-[500px]">
                
                {/* 좌측: 채팅 인터페이스 */}
                <div className="flex flex-col bg-white rounded-2xl shadow-xl p-6 h-full">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">1. 대화 기록</h2>
                    
                    {/* 채팅 로그 영역 */}
                    <div 
                        ref={chatLogRef}
                        className="flex-grow overflow-y-auto scrollable-area p-2 mb-4 bg-gray-50 rounded-lg border"
                    >
                        {chatHistory.map((msg, index) => (
                            <ChatMessage 
                                key={index} 
                                role={msg.role} 
                                text={msg.text} 
                            />
                        ))}
                    </div>

                    {/* 채팅 입력 및 전송 */}
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="마인드맵 주제에 대해 이야기해보세요..."
                            className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition duration-150"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition duration-150 active:scale-95 shadow-md"
                            disabled={isLoading}
                        >
                            전송
                        </button>
                    </form>
                    
                    <button 
                        onClick={generateMindMap}
                        disabled={isLoading}
                        className={`mt-4 w-full font-bold py-3 rounded-xl transition duration-150 active:scale-[0.99] shadow-lg ${
                            isLoading 
                                ? 'bg-indigo-400 cursor-not-allowed opacity-70' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                    >
                        {isLoading ? '생성 중...' : '2. 대화 기반 마인드맵 생성'}
                    </button>
                </div>

                {/* 우측: 마인드맵 결과 */}
                <div className="flex flex-col bg-white rounded-2xl shadow-xl p-6 h-full">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">3. 마인드맵 결과</h2>
                    
                    {/* 콘텐츠 영역 */}
                    <div className="flex-grow overflow-y-auto scrollable-area p-2">
                        {isLoading ? (
                            // 로딩 인디케이터
                            <div className="flex justify-center items-center h-full min-h-[200px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                                <p className="ml-4 text-indigo-600 font-medium">AI가 대화 내용을 분석 중...</p>
                            </div>
                        ) : (
                            // 마인드맵 또는 초기 메시지 렌더링
                            <MindMapOutput 
                                mindMapData={mindMapData} 
                                errorMessage={error}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
