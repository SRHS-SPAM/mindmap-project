import React, { useState, useEffect, useCallback, useRef } from 'react';
// 🚨 useNavigate hook을 사용합니다.
import { useNavigate } from 'react-router-dom';
import "./InfoPage.css";

// TODO: 실제 FastAPI 백엔드 주소로 변경하세요. (로컬 환경 개발을 위해 유지)
const API_BASE_URL = 'http://localhost:8000'; 

// 메시지 박스 컴포넌트 (alert() 대신 사용)
const MessageBox = ({ message, type, onClose }) => (
    <div style={messageBoxStyles.overlay}>
        <div style={{
            ...messageBoxStyles.box,
            borderColor: type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : (type === 'info' ? '#F59E0B' : '#60A5FA')),
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
            <h3 style={messageBoxStyles.title}>
                {type === 'error' ? '⚠️ 오류 발생' : (type === 'success' ? '✅ 성공' : '💡 알림')}
            </h3>
            <p style={messageBoxStyles.content}>{message}</p>
            <button
                onClick={onClose}
                style={{
                    ...messageBoxStyles.button,
                    backgroundColor: type === 'error' ? '#DC2626' : (type === 'success' ? '#059669' : (type === 'info' ? '#D97706' : '#2563EB')),
                }}
            >
                확인
            </button>
        </div>
    </div>
);

// 순수 CSS 스타일 정의
const messageBoxStyles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 10000, // 최상위 z-index
    },
    box: {
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: '2px solid',
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1F2937',
    },
    content: {
        color: '#4B5563',
        whiteSpace: 'pre-wrap',
    },
    button: {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        fontWeight: '600',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease-in-out',
    }
};


// ------------------------------------
// 메인 프로필 화면 컴포넌트
// ------------------------------------
const InfoPageScreen = () => { // 이름 변경: ProfileScreen -> InfoPageScreen
    // useNavigate 훅을 사용하여 라우팅 함수를 가져옵니다.
    const navigation = useNavigate();
    
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // 편집 가능한 상태: 이메일은 이제 편집 불가능하므로 isEditingEmail 상태는 사용하지 않습니다.
    const [tempDisplayName, setTempDisplayName] = useState(''); 
    const [tempEmail, setTempEmail] = useState(''); 
    const [isEditingName, setIsEditingName] = useState(false);
    // const [isEditingEmail, setIsEditingEmail] = useState(false); // 이메일 수정 불가능으로 제거

    const [profileImage, setProfileImage] = useState('https://placehold.co/120x120/A5B4FC/ffffff?text=Profile');
    const [messageBox, setMessageBox] = useState(null);

    const fileInputRef = useRef(null);
    
    // 메시지 박스 닫기 핸들러
    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
    }, []);

    // 사용자 정보 불러오기 (GET /me)
    const fetchUserProfile = useCallback(async () => {
        const token = sessionStorage.getItem('access_token');
        if (!token) {
            // 토큰이 없으면 로그인 페이지로 이동
            navigation('/login'); 
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                
                // 친구 코드 필드 추가: friend_code가 없으면 "코드 없음"으로 처리 (Mock 데이터 사용)
                if (!userData.friend_code) {
                    console.warn("Backend didn't provide 'friend_code'. Using mock data 'A1B2C3D'.");
                    userData.friend_code = 'A1B2C3D'; 
                }
                
                setUser(userData);
                // 임시 상태 초기화: name 필드에 회원가입 시 입력한 이름이 들어있다고 가정
                setTempDisplayName(userData.name || '이름 정보 없음');
                setTempEmail(userData.email || '이메일 정보 없음');
            } else if (response.status === 401) {
                // 토큰 만료 또는 유효하지 않음
                sessionStorage.removeItem('access_token');
                setMessageBox({ type: 'error', message: "인증 오류: 로그인 세션이 만료되었습니다. 다시 로그인해주세요." });
                navigation('/login'); // useNavigate를 사용하여 /login으로 이동
            } else {
                const errorData = await response.json();
                setMessageBox({ type: 'error', message: `사용자 정보 로드 실패: ${errorData.detail || response.status}` });
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            setMessageBox({ type: 'error', message: "네트워크 오류로 사용자 정보를 불러올 수 없습니다." });
        } finally {
            setIsLoading(false);
        }
    }, [navigation]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // 프로필 업데이트 처리 (이름만 가능)
    const handleUpdateProfile = async (field, value) => {
        if (!user || field !== 'name') return; // 이름(name) 필드만 업데이트 가능

        const token = sessionStorage.getItem('access_token');
        if (!token) {
            navigation('/login');
            return;
        }

        setIsLoading(true);

        try {
            // name 필드만 업데이트
            const payload = { name: value };

            // PUT 요청: 실제 백엔드 API /api/v1/users/me 사용
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/name`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                // 백엔드에서 업데이트된 사용자 객체를 반환한다고 가정
                const updatedUser = { ...user, ...payload };
                setUser(updatedUser);
                setTempDisplayName(updatedUser.name);
                setMessageBox({ type: 'success', message: `프로필 이름이 성공적으로 '${updatedUser.name}'(으)로 업데이트되었습니다.` });
                
                // 편집 모드 닫기
                setIsEditingName(false);
                
            } else {
                const errorData = await response.json();
                setMessageBox({ type: 'error', message: `프로필 업데이트 실패: ${errorData.detail || response.statusText}` });
            }
        } catch (error) {
            console.error("Update Error:", error);
            setMessageBox({ type: 'error', message: "네트워크 오류로 프로필 업데이트에 실패했습니다." });
        } finally {
            setIsLoading(false);
        }
    };

    // 편집 모드 시작 (이름만)
    const handleStartEdit = (field) => {
        if (field === 'name') setIsEditingName(true);
    };

    // 편집 모드 취소 및 원래 값으로 되돌리기 (이름만)
    const handleCancelEdit = (field) => {
        if (field === 'name') {
            setTempDisplayName(user.name);
            setIsEditingName(false);
        }
    };


    // 프로필 이미지 변경 핸들러 (Mock - 수정 기능 제거로 인해 Mock 업로드만 유지)
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                setMessageBox({ type: 'info', message: "프로필 이미지가 임시로 변경되었습니다. (백엔드 업로드 Mock)" });
            };
            reader.readAsDataURL(file);
        }
    };
    
    // 로딩 중 표시
    if (isLoading) {
        return (
            <div className="profile-container">
                <div className="loading-card">
                    <div className="spinner-large"></div>
                    <p>사용자 정보 불러오는 중...</p>
                </div>
            </div>
        );
    }
    
    // 사용자 정보가 로드되지 않았을 때 (토큰 없음/오류 후 리디렉션)
    if (!user && !isLoading) {
        return <div className="profile-container">
            <div className="card">
                <p>사용자 정보를 불러올 수 없습니다. 로그인이 필요합니다.</p>
                <button className="btn-primary full-width" onClick={() => navigation('/login')}>로그인 페이지로</button>
            </div>
        </div>
    }

    return (
        <div className="profile-container">
             <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageChange}
            />
            <div className="card">
                <h2 className="card-title">내 프로필 정보</h2>

                {/* 프로필 이미지 섹션 (업로드 Mock) */}
                <div className="profile-image-wrap">
                    <div 
                        className="profile-image" 
                        style={{backgroundImage: `url(${profileImage})`}}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <div className="image-overlay">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                    </div>
                    <p className="image-hint">클릭하여 이미지 변경 (Mock)</p>
                </div>

                {/* 사용자 ID (Name) 섹션 - 편집 가능 */}
                <div className="input-group">
                    <label className="input-label">사용자 ID (이름)</label>
                    <div className="input-with-button">
                        <input
                            type="text"
                            className={`text-input ${isEditingName ? 'editing' : ''}`}
                            value={tempDisplayName}
                            onChange={(e) => setTempDisplayName(e.target.value)}
                            readOnly={!isEditingName}
                            disabled={isLoading}
                        />
                        {!isEditingName ? (
                            <button
                                className="btn-edit btn-small"
                                onClick={() => handleStartEdit('name')}
                                disabled={isLoading}
                            >
                                수정
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn-save btn-small" // 클래스명 변경: btn-edit -> btn-save
                                    onClick={() => handleUpdateProfile('name', tempDisplayName)}
                                    // 값이 변경되었고, 공백이 아닐 때만 활성화
                                    disabled={isLoading || tempDisplayName.trim() === user.name || tempDisplayName.trim() === ''}
                                >
                                    저장
                                </button>
                                <button
                                    className="btn-cancel btn-small"
                                    onClick={() => handleCancelEdit('name')}
                                    disabled={isLoading}
                                >
                                    취소
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 이메일 섹션 - 수정 불가능 (읽기 전용으로 변경) */}
                <div className="input-group">
                    <label className="input-label">이메일</label>
                    <div className="input-with-button read-only-input">
                        <input
                            type="email"
                            className={`text-input`}
                            value={tempEmail}
                            readOnly={true} // 영구적으로 읽기 전용
                            disabled={isLoading}
                            style={{ paddingRight: '1rem' }} // 버튼 공간 확보를 위해 패딩 조정
                        />
                        {/* 이메일은 수정 불가능하므로 버튼을 제거했습니다. */}
                    </div>
                </div>
                
                {/* 친구 코드 섹션 */}
                <div className="input-group">
                    <label className="input-label">친구 코드 (7자리)</label>
                    <div className="input-with-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#F3F4F6', borderRadius: '0.5rem' }}>
                        <span style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 'bold', 
                            color: '#1F2937',
                            letterSpacing: '0.1em' // 코드 가독성 향상
                        }}>
                            {user.friend_code || '로드 중...'}
                        </span>
                        {/* 친구 코드는 수정 불가능하므로, 복사 버튼 등의 기능을 추가했습니다. */}
                        <button 
                            className="btn-copy btn-small" // 클래스명 변경: btn-edit -> btn-copy
                            onClick={() => {
                                // 클립보드 복사 (iFrame 환경에서 지원되는지 확인 필요)
                                try {
                                    navigator.clipboard.writeText(user.friend_code);
                                    setMessageBox({ type: 'success', message: `친구 코드 '${user.friend_code}'가 클립보드에 복사되었습니다. 📋` });
                                } catch (error) {
                                    // navigator.clipboard.writeText()가 지원되지 않을 경우의 대체 처리
                                    const tempInput = document.createElement('input');
                                    tempInput.value = user.friend_code;
                                    document.body.appendChild(tempInput);
                                    tempInput.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(tempInput);
                                    setMessageBox({ type: 'success', message: `친구 코드 '${user.friend_code}'가 클립보드에 복사되었습니다. (대체 복사)` });
                                }

                            }}
                            disabled={!user.friend_code}
                        >
                            복사
                        </button>
                    </div>
                </div>
                

                {/* 기타 버튼 */}
                <div className="button-footer">
                    <button 
                        className="btn-secondary full-width" 
                        onClick={() => setMessageBox({ 
                            type: 'info', 
                            // 비밀번호 변경 요구사항 반영
                            message: "비밀번호 변경을 진행하려면 현재 비밀번호를 먼저 입력해야 합니다. (Mock)" 
                        })}
                        disabled={isLoading}
                    >
                        비밀번호 변경 (Mock)
                    </button>
                </div>
                
                {/* 돌아가기 버튼 */}
                <div className="button-footer">
                    <button 
                        className="btn-secondary full-width" 
                        onClick={() => navigation('/about')} // 요청하신 /about 경로로 이동
                        disabled={isLoading}
                    >
                        돌아가기
                    </button>
                </div>

            </div>
            {messageBox && <MessageBox {...messageBox} onClose={closeMessageBox} />}
        </div>
    );
};


// ------------------------------------
// App 컴포넌트
// ------------------------------------
const App = () => {
    // InfoPageScreen으로 컴포넌트 이름 변경 반영
    return <InfoPageScreen />;
}

export default App;
