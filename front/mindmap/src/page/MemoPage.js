import React, { useState, useEffect, useCallback } from 'react';
// import "./MemoPage.css"; // 사용자의 기존 CSS 파일을 가정하고 클래스 이름을 사용합니다.

import './MemoPage.css';

import Header from "../component/Header";

// 백엔드 API의 기본 URL을 새로운 구조 (Host + /api/v1/memo)에 맞게 설정합니다.
const API_BASE_URL = 'https://mindmap-697550966480.asia-northeast3.run.app/api/v1/memo'; 


const MemoPage = () => {
    // === 상태 관리 ===
    const [viewMode, setViewMode] = useState('list'); 
    const [memos, setMemos] = useState([]);
    const [currentMemo, setCurrentMemo] = useState(null); 
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(''); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 🚨 수정된 부분: AUTH_TOKEN 상태로 관리하고 localStorage에서 불러옵니다.
    const [authToken, setAuthToken] = useState(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true); // 인증 확인 중 상태

    useEffect(() => {
        // 컴포넌트 마운트 시 localStorage에서 토큰을 확인합니다.
        const token = sessionStorage.getItem('access_token');
        if (token) {
            setAuthToken(token);
            // 토큰이 있으므로 메모를 로드합니다.
            fetchMemos(token); 
        } else {
            // 토큰이 없으므로 로딩을 멈추고 오류 메시지를 표시합니다.
            setError("인증 토큰을 찾을 수 없습니다. 로그인 페이지로 이동해주세요.");
            setIsLoading(false);
        }
        setIsAuthChecking(false);
    }, []); // 초기 마운트 시 한 번만 실행

    // === API 함수 (FastAPI 연동) ===

    // fetchMemos 함수가 인자로 토큰을 받도록 수정
    const fetchMemos = useCallback(async (token) => {
        // 토큰이 유효한지 다시 한번 확인
        if (!token) {
            setError("메모를 불러오려면 유효한 로그인 토큰이 필요합니다.");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // API 경로 수정: /api/v1/memo/
            const response = await fetch(`${API_BASE_URL}/`, {
                headers: {
                    // 🚨 수정된 부분: 인자로 받은 토큰을 사용
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorDetail = errorText;
                try {
                    const errorData = JSON.parse(errorText);
                    errorDetail = errorData.detail || errorText;
                } catch (e) {
                    // JSON 파싱 실패 시 원본 텍스트 사용
                }
                
                // 401 Unauthorized 오류를 사용자에게 명확히 알림
                if (response.status === 401) {
                    throw new Error(`[401 UNAUTHORIZED] 로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.`);
                } else {
                    throw new Error(`메모 조회 실패: HTTP ${response.status} - ${errorDetail}`);
                }
            }

            const data = await response.json();
            setMemos(data);
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err.message || "메모 로드에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, []); // useCallback 의존성 비어 있음: 토큰은 useEffect에서 한 번 받아서 전달함

    // 메모 생성/수정 처리 (POST /api/v1/memo/ 또는 PUT /api/v1/memo/{id})
    const handleSaveMemo = async (isUpdate) => {
        if (!title || !content) {
            console.error("제목과 내용을 모두 입력해 주세요.");
            return;
        }
        if (!authToken) {
            setError("인증 토큰이 없습니다. 로그인 후 다시 시도해주세요.");
            return;
        }
        
        const method = isUpdate ? 'PUT' : 'POST';
        const url = isUpdate 
            ? `${API_BASE_URL}/${currentMemo.id}` 
            : `${API_BASE_URL}/`; 
        
        try {
            setIsLoading(true);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${authToken}`, // 🚨 저장된 토큰 사용
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, content }), 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `메모 ${isUpdate ? '수정' : '생성'} 실패: HTTP ${response.status}`);
            }

            // 저장 후 목록 새로고침 및 목록 뷰로 이동
            // 🚨 수정: 저장 후에는 최신 토큰 상태를 사용하여 목록을 다시 불러옵니다.
            await fetchMemos(authToken); 
            handleBackToList();

        } catch (err) {
            console.error("Save Error:", err);
            setError(err.message || "메모 저장에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 메모 삭제 처리 (DELETE /api/v1/memo/{id})
    const handleDeleteMemo = async () => {
        console.log("메모 삭제 요청 (확인 절차 생략)");
        if (!authToken) {
            setError("인증 토큰이 없습니다. 로그인 후 다시 시도해주세요.");
            return;
        }
        
        try {
            setIsLoading(true);

            const response = await fetch(`${API_BASE_URL}/${currentMemo.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`, // 🚨 저장된 토큰 사용
                },
            });

            if (response.status !== 204) { 
                 if (response.status !== 204) throw new Error(`메모 삭제 실패: HTTP ${response.status}`);
            }

            // 삭제 후 목록 새로고침 및 목록 뷰로 이동
            // 🚨 수정: 삭제 후에는 최신 토큰 상태를 사용하여 목록을 다시 불러옵니다.
            await fetchMemos(authToken);
            handleBackToList();

        } catch (err) {
            console.error("Delete Error:", err);
            setError(err.message || "메모 삭제에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // === 네비게이션 및 핸들러 (이하 동일) ===

    // 메모 항목 클릭 시 상세 뷰로 이동
    const handleSelectMemo = (memo) => {
        setCurrentMemo(memo);
        setViewMode('detail');
    };

    // 새 메모 작성 모드로 이동
    const handleNewMemo = () => {
        setCurrentMemo(null); // 새 메모는 currentMemo가 null
        setTitle('');
        setContent('');
        setViewMode('edit');
    };

    // 수정 모드로 이동 (폼에 현재 메모 내용 채우기)
    const handleEdit = () => {
        if (currentMemo) {
            setTitle(currentMemo.title || '');
            setContent(currentMemo.content || '');
            setViewMode('edit');
        }
    };

    // 목록 뷰로 돌아가기
    const handleBackToList = () => {
        setCurrentMemo(null);
        setTitle('');
        setContent('');
        setViewMode('list');
    };

    // === 뷰 렌더링 함수 ===

    // 1. 메모 목록 뷰 ('list')
    const renderMemoList = () => {
        if (isAuthChecking) return <p className="loading-indicator">로그인 토큰 확인 중...</p>;
        if (isLoading) return <p className="loading-indicator">메모를 불러오는 중입니다...</p>;
        
        // 토큰이 없거나, 401 오류 등으로 에러가 발생한 경우
        if (error) return (
            <div className="error-container p-4 border border-red-400 bg-red-100 rounded-lg text-red-800">
                <p className="font-bold">🚨 {error}</p>
                <p className='mt-2'>로그인 페이지로 이동하여 유효한 토큰을 발급받으세요.</p>
            </div>
        );
        

        return (
            <>
                <div className="memo-actions">
                    <button onClick={handleNewMemo} className="memo-button primary-button">
                        + 새 메모 추가
                    </button>
                </div>

                <div className="memo_wrap">
                    {memos.length === 0 ? (
                        <p className="text-2xl text-white mt-5">작성된 메모가 없습니다. 위의 버튼을 눌러 메모를 추가하세요.</p>
                    ) : (
                        memos.map((memo) => (
                            <div 
                                key={memo.id} 
                                className="memo-list-item"
                                onClick={() => handleSelectMemo(memo)}
                            >
                                <p className="memo-item-title">{memo.title || "(제목 없음)"}</p>
                                <div className="memo-content-area">
                                    {/* \n을 <br/>로 치환하여 줄바꿈 표시 */}
                                    {/* 🚨 오류 수정: currentMemo.content 대신 반복 중인 memo.content를 사용합니다. */}
                                    {memo.content && memo.content.split('\n').map((line, index) => (
                                        <React.Fragment key={index}>
                                            {line}
                                            <br/>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
        );
    };

    // 2. 메모 상세 뷰 ('detail')
    const renderMemoDetail = () => {
        if (!currentMemo) return null; 

        return (
            <div className="memo-detail">
                <h2 className="memo-title">{currentMemo.title || "(제목 없음)"}</h2>
                <div className="memo-content-area">
                    {/* \n을 <br/>로 치환하여 줄바꿈 표시 */}
                    {currentMemo.content && currentMemo.content.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                            {line}
                            <br/>
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="memo-actions">
                    <button onClick={handleBackToList} className="memo-button back-button">
                        &lt; 뒤로가기
                    </button>
                    <button onClick={handleEdit} className="memo-button secondary-button">
                        수정
                    </button>
                    <button onClick={handleDeleteMemo} className="memo-button danger-button">
                        삭제
                    </button>
                </div>
            </div>
        );
    };

    // 3. 메모 생성/수정 폼 뷰 ('edit')
    const renderMemoForm = () => {
        const isUpdate = currentMemo !== null;

        return (
            <div className="memo-form">
                <h2>{isUpdate ? '메모 수정' : '새 메모 작성'}</h2>
                <input
                    type="text"
                    className="memo-input"
                    placeholder="제목을 입력하세요 (필수)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                    className="memo-textarea"
                    placeholder="내용을 입력하세요 (필수)"
                    rows="15"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                ></textarea>
                
                <div className="memo-actions">
                    <button onClick={handleBackToList} className="memo-button back-button">
                        취소
                    </button>
                    <button 
                        onClick={() => handleSaveMemo(isUpdate)} 
                        className="memo-button primary-button"
                        disabled={isLoading}
                    >
                        {isLoading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        );
    };


    // === 메인 렌더링 ===
    let memoContentToRender; 
    if (viewMode === 'list') {
        memoContentToRender = renderMemoList();
    } else if (viewMode === 'detail') {
        memoContentToRender = renderMemoDetail();
    } else if (viewMode === 'edit') {
        memoContentToRender = renderMemoForm();
    }

    return(
        <div className="wrap_ho">
            <Header />
            <div className="info">
                <div className='text_wrap_ho'>
                    <h1 className='main_text_ho'>MEMO</h1>
                </div>
                <div className="resent_wrap">
                    <div className="memo_wrap">
                        {memoContentToRender}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MemoPage;