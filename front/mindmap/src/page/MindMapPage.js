import React, { useState, useEffect, useCallback } from 'react';

// API 키 및 URL 설정 (Canvas 환경에서 자동으로 주입됩니다)
const apiKey = "";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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
        if (chatHistory.length < 2) {
            // alert 대신 UI 메시지를 사용하는 것이 좋습니다. (alert 사용 금지 규칙 준수)
            console.error('마인드맵을 생성하려면 최소한 사용자 메시지가 하나 필요합니다.');
            return;
        }

        // UI 상태 변경: 로딩 시작
        setIsLoading(true);
        setMindMapData(null);
        setError(null);
        
        try {
            // API 요청에 필요한 모든 채팅 내용 추출
            const conversationPrompt = chatHistory.map(msg => 
                `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.text}`
            ).join('\n');
            
            const systemPrompt = `
                당신은 대화 내용을 마인드맵 구조로 변환하는 AI 비서입니다.
                제공된 대화 내용을 분석하여 핵심 주제(mainTopic) 1개와 주요 아이디어(branches) 3~5개를 추출하세요.
                각 주요 아이디어에는 3개 이상의 구체적인 세부 사항(details)을 포함해야 합니다.
                결과는 반드시 다음 JSON 스키마를 따라야 합니다.
            `;

            // API Payload 구성
            const payload = {
                contents: [{ parts: [{ text: conversationPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: mindMapSchema
                },
            };
            
            // --- API 호출 및 응답 처리 (재시도 로직 포함) ---
            
            let response;
            let parsedJson = null;
            let errorMessage = null;

            const MAX_RETRIES = 3;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (jsonText) {
                            parsedJson = JSON.parse(jsonText);
                            break; // 성공
                        } else {
                            throw new Error("API 응답에서 JSON 텍스트를 찾을 수 없습니다.");
                        }
                    } else {
                        // 4xx/5xx 에러 처리
                        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    errorMessage = error.message;
                    console.error(`Attempt ${attempt + 1} failed:`, error);
                    if (attempt < MAX_RETRIES - 1) {
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // 마지막 시도 실패 시 상태 업데이트
                        setError("API 호출이 최대 재시도 횟수를 초과하여 실패했습니다.");
                    }
                }
            }
            
            // 최종 결과 처리
            if (parsedJson) {
                setMindMapData(parsedJson);
            } else {
                 console.warn("API 호출 실패 또는 결과 없음. 시뮬레이션 데이터로 대체합니다.");
                 const fallbackData = generateFallbackMindMap(conversationPrompt);
                 setMindMapData(fallbackData);
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
    }, [chatHistory]);


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
            
            {/* Error/Context Message */}
            <div className="text-center bg-red-100 p-3 rounded-lg border border-red-300 mb-6 shadow-sm">
                <p className="text-red-700 font-semibold">
                    사용자님의 원래 오류: <strong className="text-red-900">'로딩 실패: Not authenticated'</strong>는 백엔드 인증 문제이며,
                    이 React 앱은 프론트엔드 기능을 시연하기 위한 독립적인 파일입니다.
                </p>
            </div>

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
