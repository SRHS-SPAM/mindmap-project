import React, { useState, useEffect, useCallback, useMemo } from 'react';

// API 통신을 위한 기본 설정
const API_BASE_URL = 'http://localhost:8000/api/v1';

// --- MOCK 데이터 및 API 함수 ---
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
        const errorDetail = await response.json().catch(() => ({ detail: 'API 요청 실패' }));
        throw new Error(errorDetail.detail || 'API 요청 실패');
    }
    // No Content 응답 처리
    if (response.status === 204) return null;
    return response.json();
};

// --- 컴포넌트 정의 ---

// 마인드맵 노드 상세 정보 및 수정 모달
const NodeDetailModal = ({ node, onClose, onUpdate, isGenerating }) => {
    const [title, setTitle] = useState(node.title);
    const [description, setDescription] = useState(node.description);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate({ ...node, title, description });
    };

    if (isGenerating) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
                AI가 마인드맵을 생성 중이므로 수정할 수 없습니다.
            </div>
        );
    }
    
    return (
        <div className="p-6 bg-white shadow-xl rounded-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">{node.node_type} 상세 수정</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">설명</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 h-24"
                        required
                    />
                </div>
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        닫기
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                    >
                        수정 저장
                    </button>
                </div>
            </form>
        </div>
    );
};


// 마인드맵 시각화 (Mock)
const MindMapVisualization = ({ nodes, onNodeClick }) => {
    // 핵심 주제 (원의 중앙), 대주제, 소주제를 구분하여 렌더링
    const coreNode = nodes.find(n => n.node_type === '핵심 주제');
    const majorNodes = nodes.filter(n => n.node_type === '대주제');
    const minorNodes = nodes.filter(n => n.node_type === '소주제');

    if (!coreNode) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50 border-4 border-dashed border-gray-300 rounded-xl text-gray-500">
                마인드맵이 생성되지 않았습니다. 채팅 후 'AI 분석 시작' 버튼을 눌러주세요.
            </div>
        );
    }
    
    // 연결선(Links)을 SVG로 그리는 로직은 복잡하므로 여기서는 시각화 노드만 Mock으로 배치
    return (
        <div className="relative w-full h-full p-4 overflow-auto">
            {/* 핵심 주제 - 중앙 배치 */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-blue-600 text-white rounded-full flex items-center justify-center text-center shadow-lg cursor-pointer transition hover:scale-105"
                onClick={() => onNodeClick(coreNode)}
            >
                <span className="font-bold text-lg">{coreNode.title}</span>
            </div>

            {/* 대주제 - 주변에 원형 배치 (Mock Position) */}
            {majorNodes.map((node, index) => (
                <div 
                    key={node.id} 
                    className={`absolute w-32 h-20 bg-green-500 text-white rounded-xl shadow-md flex items-center justify-center text-center p-2 cursor-pointer transition hover:bg-green-600`}
                    // Mock: 원형 배치 (CSS 계산 복잡하여 단순 배치)
                    style={{ 
                        top: `calc(50% + ${Math.cos(index * (2 * Math.PI / majorNodes.length)) * 150}px)`, 
                        left: `calc(50% + ${Math.sin(index * (2 * Math.PI / majorNodes.length)) * 150}px)`,
                        transform: 'translate(-50%, -50%)' 
                    }}
                    onClick={() => onNodeClick(node)}
                >
                    <span className="font-medium text-sm">{node.title}</span>
                </div>
            ))}
            
            {/* 소주제는 생략 (복잡한 시각화 라이브러리가 필요함) */}

            {/* 실제 구현 시: nodes[].connections와 links[] 데이터를 기반으로 SVG 또는 Canvas를 이용해 선을 그려야 합니다. */}
            <p className="absolute bottom-2 right-2 text-sm text-gray-400">
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

    const chatContainerRef = React.useRef(null);
    
    // 채팅 기록 불러오기
    const fetchChatHistory = useCallback(async () => {
        try {
            const history = await fetchApi(`${API_BASE_URL}/project/${PROJECT_ID}/chat`);
            setChats(history);
        } catch (error) {
            setErrorMessage(error.message);
        }
    }, []);

    // 마인드맵 노드 불러오기
    const fetchMindMapNodes = useCallback(async () => {
        try {
            const fetchedNodes = await fetchApi(`${API_BASE_URL}/project/${PROJECT_ID}/mindmap`);
            setNodes(fetchedNodes);
            // isGenerating 상태는 Project API에서 가져오는 것이 더 정확하나, 여기서는 단순화
        } catch (error) {
            setErrorMessage(error.message);
        }
    }, []);

    useEffect(() => {
        fetchChatHistory();
        fetchMindMapNodes();
        // 실제 앱에서는 WebSocket을 통해 채팅 및 마인드맵 업데이트를 실시간으로 처리해야 함
    }, [fetchChatHistory, fetchMindMapNodes]);
    
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
        
        try {
            const newMessage = await fetchApi(
                `${API_BASE_URL}/project/${PROJECT_ID}/chat`, 
                'POST', 
                { content: newChat }
            );
            setChats(prev => [...prev, newMessage]);
            setNewChat('');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    // AI 마인드맵 생성 요청
    const handleGenerateMap = async () => {
        setIsGenerating(true);
        setErrorMessage('');
        try {
            // Project API를 통해 is_generating 상태를 가져오는 것이 정확하지만, 단순화
            const result = await fetchApi(`${API_BASE_URL}/project/${PROJECT_ID}/generate`, 'POST');
            
            if (result.is_success) {
                // 성공적으로 DB에 저장되었으므로 다시 노드 정보를 가져옴
                await fetchMindMapNodes();
                alert('마인드맵 생성이 완료되었습니다.');
            } else {
                 alert('마인드맵 생성에 실패했습니다.');
            }
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // 마인드맵 노드 수정 요청
    const handleNodeUpdate = async (updatedNode) => {
        setErrorMessage('');
        try {
             await fetchApi(
                `${API_BASE_URL}/project/${PROJECT_ID}/node/${updatedNode.id}`,
                'PUT',
                { title: updatedNode.title, description: updatedNode.description }
            );
            // 수정된 노드를 상태에 반영
            setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
            setSelectedNode(null);
            alert(`노드 [${updatedNode.title}]이 수정되었습니다.`);
        } catch (error) {
            setErrorMessage(error.message);
            setSelectedNode(null); // 수정 실패 시 모달 닫기
        }
    };
    
    // AI 추천 요청
    const handleAIReccommendation = async () => {
        setRecommendation('AI 추천을 생성 중입니다...');
        setErrorMessage('');
        try {
            const result = await fetchApi(`${API_BASE_URL}/project/${PROJECT_ID}/recommend`, 'POST');
            setRecommendation(result.recommendation);
        } catch (error) {
            setErrorMessage(error.message);
            setRecommendation('AI 추천을 불러오는 데 실패했습니다.');
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* 좌측: 채팅 영역 */}
            <div className="w-1/3 bg-white border-r flex flex-col">
                <header className="p-4 border-b bg-indigo-600 text-white font-bold text-lg">
                    프로젝트 채팅방
                </header>
                
                {/* 채팅 목록 */}
                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-3">
                    {chats.map((chat) => (
                        <div key={chat.id} className="text-sm">
                            <span className="font-semibold text-indigo-500">User_{chat.user_id}:</span> 
                            <span className="ml-2 text-gray-800">{chat.content}</span>
                            <span className="ml-3 text-xs text-gray-400">{new Date(chat.timestamp).toLocaleTimeString()}</span>
                        </div>
                    ))}
                </div>

                {/* AI 분석 및 채팅 입력 */}
                <div className="p-4 border-t">
                    <button
                        onClick={handleGenerateMap}
                        disabled={isGenerating}
                        className={`w-full py-2 mb-3 rounded-lg text-white font-bold transition ${
                            isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {isGenerating ? 'AI 분석 중...' : 'AI 분석 시작'}
                    </button>

                    <form onSubmit={handleSendChat} className="flex space-x-2">
                        <input
                            type="text"
                            value={newChat}
                            onChange={(e) => setNewChat(e.target.value)}
                            placeholder="채팅 메시지 입력..."
                            className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            disabled={isGenerating}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            disabled={isGenerating}
                        >
                            전송
                        </button>
                    </form>
                </div>
            </div>

            {/* 우측: 마인드맵 영역 */}
            <div className="w-2/3 flex flex-col p-4 space-y-4">
                <header className="flex justify-between items-center pb-2 border-b">
                    <h1 className="text-2xl font-bold text-gray-800">마인드맵 프로젝트 (ID: {PROJECT_ID})</h1>
                    <button
                        onClick={handleAIReccommendation}
                        disabled={nodes.length === 0 || isGenerating}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                            nodes.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }`}
                    >
                        AI 추천 받기 (500자 이내)
                    </button>
                </header>

                {/* AI 추천 결과 표시 */}
                {recommendation && (
                    <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-sm">
                        <span className="font-bold text-yellow-700">AI 추천:</span> {recommendation}
                    </div>
                )}
                
                {/* 에러 메시지 표시 */}
                {errorMessage && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm font-medium">
                        오류: {errorMessage}
                    </div>
                )}

                {/* 마인드맵 시각화 영역 */}
                <div className="flex-grow bg-white shadow-lg rounded-xl overflow-hidden">
                    <MindMapVisualization 
                        nodes={nodes} 
                        onNodeClick={setSelectedNode} 
                    />
                </div>

                {/* 노드 상세 수정 모달 */}
                {selectedNode && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <NodeDetailModal 
                            node={selectedNode} 
                            onClose={() => setSelectedNode(null)}
                            onUpdate={handleNodeUpdate}
                            isGenerating={isGenerating}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
