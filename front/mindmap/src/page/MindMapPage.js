import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageSquare, Zap, Target, BookOpen, Link, Settings } from 'lucide-react'; // lucide-react 아이콘 사용

// Tailwind CSS 로드 스크립트 (외부 환경에서)
// <script src="https://cdn.tailwindcss.com"></script>

// ==========================================================
// [API 경로 설정] 서버 코드에 맞춰 모든 엔드포인트를 단수형으로 수정합니다.
// GET /chat, POST /chat, GET /mindmap
// ==========================================================
const API_BASE_URL = 'http://localhost:8000/api/v1';
const PROJECTS_ENDPOINT = `${API_BASE_URL}/projects`; // API 경로 상수로 정의
// 실제 프로젝트에서는 JWT 토큰을 저장하고 사용해야 합니다.
const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGdlbWluaS5jb20iLCJleHAiOjE3NjM1MzY0MDB9.j0zH0qW-V9J8hG0YtL7c9-WlR1p2Y2c7Q6N2Lw7v8w4";
const PROJECT_ID = 1; // 테스트용 프로젝트 ID

// HTTP 요청 헬퍼
const fetchApi = async (url, method = 'GET', body = null) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_TOKEN}`,
    };
    
    const config = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
        // 서버 에러 메시지 추출 시도
        const errorDetail = await response.json().catch(() => ({ detail: `API 요청 실패: ${response.status} ${response.statusText}` }));
        throw new Error(errorDetail.detail || `API 요청 실패: ${response.status} ${response.statusText}`); // statusText 추가
    }
    // No Content 응답 처리
    if (response.status === 204) return null;
    return response.json();
};

// --- 컴포넌트 정의 ---

// 로딩 스피너
const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        처리 중...
    </div>
);

// 마인드맵 노드 상세 정보 및 수정 모달
const NodeDetailModal = ({ node, onClose, onUpdate, isGenerating }) => {
    const [title, setTitle] = useState(node.title);
    const [description, setDescription] = useState(node.description);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            // onUpdate에서 예외를 throw하므로 await로 결과를 받지 않고 성공 여부만 확인합니다.
            await onUpdate({ ...node, title, description });
            onClose(); // 성공 시 모달 닫기
        } catch (error) {
            console.error("노드 수정 실패:", error);
            // App 컴포넌트에서 에러 메시지를 표시
        } finally {
            setIsUpdating(false);
        }
    };

    const nodeColors = {
        '핵심 주제': 'bg-blue-600',
        '대주제': 'bg-green-500',
        '소주제': 'bg-yellow-500',
    };

    if (isGenerating) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-lg w-full">
                <p className="font-semibold">AI 분석 중</p>
                <p className="text-sm">마인드맵이 생성 중이므로 노드를 수정할 수 없습니다.</p>
                <button
                    onClick={onClose}
                    className="mt-3 px-3 py-1 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition text-sm"
                >
                    닫기
                </button>
            </div>
        );
    }
    
    return (
        <div className="p-6 bg-white shadow-2xl rounded-xl max-w-lg w-full transform transition-all">
            <h2 className="text-2xl font-extrabold mb-4 pb-2 border-b text-gray-800">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${nodeColors[node.node_type] || 'bg-gray-500'}`}></span>
                {node.node_type} 수정
            </h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 text-lg focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        disabled={isUpdating}
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">상세 설명</label>
                    <textarea
                        value={description || ''}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 h-28 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        disabled={isUpdating}
                    />
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 transition font-medium"
                        disabled={isUpdating}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className={`px-5 py-2 text-white rounded-xl transition font-bold shadow-md ${
                            isUpdating ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                        disabled={isUpdating}
                    >
                        {isUpdating ? '저장 중...' : '수정 저장'}
                    </button>
                </div>
            </form>
        </div>
    );
};


// 마인드맵 시각화 (Mock)
const MindMapVisualization = ({ nodes, onNodeClick }) => {
    const coreNode = nodes.find(n => n.node_type === '핵심 주제');
    const majorNodes = nodes.filter(n => n.node_type === '대주제');

    const getNodeStyle = (node, index, total, radius) => {
        if (node.node_type === '핵심 주제') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '9rem',
                height: '9rem',
            };
        }
        
        // 원형 배치 계산
        const angle = index * (2 * Math.PI / total) - (Math.PI / 2); // -90도(위쪽)부터 시작
        const top = `calc(50% + ${Math.sin(angle) * radius}px)`;
        const left = `calc(50% + ${Math.cos(angle) * radius}px)`;
        
        return {
            top,
            left,
            transform: 'translate(-50%, -50%)',
            width: '8rem',
            height: '5rem',
        };
    };

    const renderNode = (node, index, total, radius) => {
        const style = getNodeStyle(node, index, total, radius);
        const colorClass = {
            '핵심 주제': 'bg-blue-600 rounded-full text-lg',
            '대주제': 'bg-green-500 rounded-xl text-sm',
            '소주제': 'bg-yellow-500 rounded-lg text-xs',
        }[node.node_type] || 'bg-gray-500 rounded-lg';

        return (
            <div 
                key={node.id} 
                className={`absolute text-white shadow-xl flex items-center justify-center text-center p-2 cursor-pointer transition-all hover:scale-105 font-bold ${colorClass}`}
                style={style}
                onClick={() => onNodeClick(node)}
            >
                <span className="p-1 line-clamp-2">{node.title}</span>
            </div>
        );
    };

    if (!coreNode) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 border-4 border-dashed border-gray-300 rounded-xl text-gray-500 p-8">
                <Zap className="w-12 h-12 mb-3 text-indigo-400"/>
                <p className="text-xl font-semibold mb-2">마인드맵을 생성해주세요.</p>
                <p className="text-center">채팅을 시작한 후, 좌측에서 'AI 분석 시작' 버튼을 눌러 마인드맵을 자동 생성할 수 있습니다.</p>
            </div>
        );
    }
    
    return (
        <div className="relative w-full h-full p-4 overflow-auto min-h-[500px]">
            {/* 핵심 주제 */}
            {renderNode(coreNode, 0, 1, 0)}

            {/* 대주제 */}
            {majorNodes.map((node, index) => renderNode(node, index, majorNodes.length, 250))}

            <p className="absolute bottom-2 right-2 text-xs text-gray-400">
                * 요소 클릭 시 상세 정보 수정 가능 (시각화는 Mock)
            </p>
        </div>
    );
};


const App = () => {
    const [chats, setChats] = useState([]);
    const [newChat, setNewChat] = useState('');
    const [nodes, setNodes] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [recommendation, setRecommendation] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    // [수정: 옵티미스틱 업데이트를 위한 상태 추가] 임시 ID 카운터
    const [tempIdCounter, setTempIdCounter] = useState(-1); 

    const chatContainerRef = useRef(null);
    
    // 채팅 기록 불러오기
    const fetchChatHistory = useCallback(async () => {
        setIsLoadingChats(true);
        try {
            // [경로 수정] 서버 정의에 맞춰 'chat' (단수형) 사용
            const history = await fetchApi(`${PROJECTS_ENDPOINT}/${PROJECT_ID}/chat`);
            setChats(history);
            setErrorMessage('');
        } catch (error) {
            console.error("채팅 기록 불러오기 실패:", error);
            setErrorMessage(`채팅 기록을 불러오는 데 실패했습니다. (${error.message})`);
        } finally {
            setIsLoadingChats(false);
        }
    }, []);

    // 마인드맵 노드 불러오기
    const fetchMindMapNodes = useCallback(async () => {
        try {
            // [경로 수정] 서버 정의에 맞춰 'mindmap' (단수형) 사용
            const fetchedNodes = await fetchApi(`${PROJECTS_ENDPOINT}/${PROJECT_ID}/mindmap`);
            setNodes(fetchedNodes);
            setErrorMessage('');
        } catch (error) {
            console.error("노드 불러오기 실패:", error);
            setErrorMessage(`마인드맵 노드를 불러오는 데 실패했습니다. (${error.message})`);
        }
    }, []);

    const fetchAllData = useCallback(() => {
        fetchChatHistory();
        fetchMindMapNodes();
    }, [fetchChatHistory, fetchMindMapNodes]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    
    // 스크롤을 항상 최신 채팅으로 이동
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chats]);

    // 채팅 메시지 전송
    const handleSendChat = async (e) => {
        e.preventDefault();
        if (!newChat.trim()) return;
        
        const messageToSend = newChat.trim();
        setNewChat('');
        setErrorMessage('');
        
        // 1. [옵티미스틱 업데이트] 임시 메시지 생성 및 UI에 즉시 표시
        const tempId = tempIdCounter;
        setTempIdCounter(prev => prev - 1);
        
        const tempMessage = {
            // 임시 ID는 음수, isPending 플래그 추가
            id: tempId, 
            content: messageToSend, 
            user_id: 999, // 임시 사용자 ID (실제는 인증 토큰에서 가져와야 함)
            timestamp: new Date().toISOString(),
            isPending: true 
        };

        // 이 부분이 실행되어야 "전송 중..."이 표시됩니다.
        setChats(prev => [...prev, tempMessage]); 

        try {
            // 2. API 호출
            // [경로 수정] 서버 정의에 맞춰 'chat' (단수형) 사용
            const serverMessage = await fetchApi(
                `${PROJECTS_ENDPOINT}/${PROJECT_ID}/chat`, 
                'POST', 
                { content: messageToSend }
            );
            
            // 3. 성공: 임시 메시지를 서버 데이터로 대체
            setChats(prev => prev.map(chat => 
                chat.id === tempId 
                    ? { ...serverMessage, isPending: false } // 서버가 반환한 메시지로 교체
                    : chat
            )); 
            
        } catch (error) {
            console.error("채팅 전송 실패:", error);
            setErrorMessage(`채팅 전송에 실패했습니다. (${error.message})`);
            
            // 4. 실패: 임시 메시지를 UI에서 제거
            setChats(prev => prev.filter(chat => chat.id !== tempId));
            
            // 실패 시 입력 내용 복원 (선택 사항)
            // setNewChat(messageToSend); 
        }
    };

    // AI 마인드맵 생성 요청
    const handleGenerateMap = async () => {
        if (chats.length === 0) {
            // alert 대신 모달/토스트 메시지 사용 권장
            setErrorMessage('채팅 내역이 없습니다. 메시지를 입력 후 시도해주세요.');
            return;
        }

        setIsGenerating(true);
        setErrorMessage('');
        try {
            // API 명세에 따라 '/generate' 엔드포인트 사용 (변경 없음)
            const result = await fetchApi(`${PROJECTS_ENDPOINT}/${PROJECT_ID}/generate`, 'POST');
            
            if (result.is_success) {
                // 성공적으로 DB에 저장되었으므로 다시 노드 정보를 가져옴
                await fetchMindMapNodes();
                // [alert 대체] 성공 메시지는 임시로 에러 메시지 영역에 표시
                setErrorMessage('🎉 마인드맵 생성이 완료되었습니다.');
                setTimeout(() => setErrorMessage(''), 3000); 

            } else {
                 // alert 대신 모달/토스트 메시지 사용 권장
                 setErrorMessage('마인드맵 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error("AI 분석 실패:", error);
            setErrorMessage(`AI 분석에 실패했습니다. (${error.message})`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 마인드맵 노드 수정 요청
    const handleNodeUpdate = async (updatedNode) => {
        setErrorMessage('');
        try {
             // API 명세에 따라 '/node/{node_id}' 엔드포인트 사용 (변경 없음)
             const result = await fetchApi(
                 `${PROJECTS_ENDPOINT}/${PROJECT_ID}/node/${updatedNode.id}`,
                 'PUT',
                 { title: updatedNode.title, description: updatedNode.description }
             );
             // 수정된 노드를 상태에 반영 (API에서 반환된 최신 데이터 사용)
             setNodes(prev => prev.map(n => n.id === result.id ? result : n));
             
             // [alert 대체] 성공 메시지는 임시로 에러 메시지 영역에 표시
             setErrorMessage(`✅ 노드 [${result.title}]이 수정되었습니다.`);
             setTimeout(() => setErrorMessage(''), 3000);

             return true; // 성공 시 true 반환
        } catch (error) {
            console.error("노드 업데이트 실패:", error);
            setErrorMessage(`노드 수정에 실패했습니다. (${error.message})`);
            throw error; // 에러를 다시 던져 NodeDetailModal에서 catch하도록 함
        }
    };
    
    // AI 추천 요청
    const handleAIRecommendation = async () => {
        setRecommendation('');
        setErrorMessage('');
        const oldRecommendation = recommendation; // 기존 추천 내용 저장
        setRecommendation('AI 추천을 생성 중입니다. 잠시만 기다려주세요...');

        try {
            // API 명세에 따라 '/recommend' 엔드포인트 사용 (변경 없음)
            const result = await fetchApi(`${PROJECTS_ENDPOINT}/${PROJECT_ID}/recommend`, 'POST');
            setRecommendation(result.recommendation);
        } catch (error) {
            console.error("AI 추천 실패:", error);
            setErrorMessage(`AI 추천을 불러오는 데 실패했습니다. (${error.message})`);
            setRecommendation(oldRecommendation || 'AI 추천을 불러오는 데 실패했습니다.');
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-inter text-gray-800 antialiased">
            {/* 좌측: 채팅 영역 */}
            <div className="w-full lg:w-1/3 bg-white border-r flex flex-col shadow-lg">
                <header className="p-4 border-b bg-indigo-600 text-white font-extrabold text-xl flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2"/>
                    협업 채팅방
                </header>
                
                {/* 채팅 목록 */}
                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
                    {isLoadingChats && chats.length === 0 ? (
                            <div className="flex justify-center items-center h-full">
                                <LoadingSpinner />
                            </div>
                    ) : (
                        chats.map((chat) => (
                            <div key={chat.id} className="text-sm flex flex-col p-2 bg-white rounded-lg shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-indigo-600 flex items-center">
                                        <Target className="w-4 h-4 mr-1"/> User_{chat.user_id}:
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(chat.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {/* [수정: 전송 대기 상태 표시] isPending일 경우 회색 음영 처리 */}
                                <p className={`text-gray-800 text-base break-words whitespace-pre-wrap ${chat.isPending ? 'opacity-50 italic' : ''}`}>
                                    {chat.content}
                                    {chat.isPending && (
                                        <span className="ml-2 text-xs text-gray-500 font-semibold">(전송 중...)</span>
                                    )}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* AI 분석 및 채팅 입력 */}
                <div className="p-4 border-t bg-white">
                    <button
                        onClick={handleGenerateMap}
                        disabled={isGenerating}
                        className={`w-full py-3 mb-3 rounded-xl text-white font-bold transition duration-200 shadow-md flex items-center justify-center ${
                            isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        <Zap className="w-5 h-5 mr-2"/>
                        {isGenerating ? 'AI 마인드맵 분석 중...' : 'AI 분석 시작'}
                    </button>

                    <form onSubmit={handleSendChat} className="flex space-x-2">
                        <input
                            type="text"
                            value={newChat}
                            onChange={(e) => setNewChat(e.target.value)}
                            placeholder="채팅 메시지를 입력하고 Enter를 누르세요..."
                            className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            disabled={isGenerating}
                        />
                        <button
                            type="submit"
                            className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition duration-200 font-bold shadow-md"
                            disabled={isGenerating || !newChat.trim()}
                        >
                            <MessageSquare className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            </div>

            {/* 우측: 마인드맵 영역 */}
            <div className="flex-grow flex flex-col p-6 space-y-4 overflow-hidden">
                <header className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <h1 className="text-2xl font-extrabold text-gray-800 flex items-center">
                        <BookOpen className="w-6 h-6 mr-2 text-indigo-500"/>
                        협업 마인드맵 (Project ID: {PROJECT_ID})
                    </h1>
                    <button
                        onClick={handleAIRecommendation} /* 함수 이름 수정 */
                        disabled={nodes.length === 0 || isGenerating}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition duration-200 shadow-lg flex items-center ${
                            nodes.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }`}
                    >
                        <Settings className="w-4 h-4 mr-2"/>
                        AI 개선 추천 받기
                    </button>
                </header>

                {/* AI 추천 결과 표시 */}
                {recommendation && (
                    <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-sm shadow-inner">
                        <span className="font-bold text-yellow-700">AI 추천:</span> {recommendation}
                    </div>
                )}
                
                {/* 에러 메시지 표시 */}
                {errorMessage && (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm font-medium shadow-md">
                        <span className="font-bold">시스템 메시지:</span> {errorMessage}
                    </div>
                )}

                {/* 마인드맵 시각화 영역 */}
                <div className="flex-grow bg-white shadow-xl rounded-xl overflow-hidden relative border border-gray-200">
                    <MindMapVisualization 
                        nodes={nodes} 
                        onNodeClick={setSelectedNode} 
                    />
                </div>

                {/* 노드 상세 수정 모달 */}
                {selectedNode && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNode(null)}>
                        <div onClick={e => e.stopPropagation()}>
                            <NodeDetailModal 
                                node={selectedNode} 
                                onClose={() => setSelectedNode(null)}
                                onUpdate={handleNodeUpdate}
                                isGenerating={isGenerating}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Canvas 환경에서 렌더링을 위한 기본 설정
const rootElement = document.getElementById('root') || document.body;
if (!document.getElementById('root')) {
    const div = document.createElement('div');
    div.id = 'root';
    document.body.appendChild(div);
}
// createRoot(rootElement).render(<App />); // 실제 환경에서 사용
export default App;
