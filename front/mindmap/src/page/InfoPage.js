import React, { useState, useEffect, useCallback, useRef } from 'react';
// 🚨 useNavigate hook을 사용합니다.
import { useNavigate } from 'react-router-dom';
import "./InfoPage.css";

// TODO: 실제 FastAPI 백엔드 주소로 변경하세요.
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
const ProfileScreen = () => {
    // useNavigate 훅을 사용하여 라우팅 함수를 가져옵니다.
    const navigation = useNavigate();
    
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // 편집 가능한 상태
    const [tempDisplayName, setTempDisplayName] = useState(''); 
    const [tempEmail, setTempEmail] = useState(''); 
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    const [profileImage, setProfileImage] = useState('https://placehold.co/120x120/A5B4FC/ffffff?text=Profile');
    const [messageBox, setMessageBox] = useState(null);

    const fileInputRef = useRef(null);
    
    // 메시지 박스 닫기 핸들러
    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
    }, []);

    // 사용자 정보 불러오기 (GET /me)
    const fetchUserProfile = useCallback(async () => {
        const token = localStorage.getItem('access_token');
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
                
                // 친구 코드 필드 추가: friend_code가 없으면 "코드 없음"으로 처리
                if (!userData.friend_code) {
                    // 임시로 Mock 데이터를 할당하여 표시 테스트
                    console.warn("Backend didn't provide 'friend_code'. Using mock data 'A1B2C3D'.");
                    userData.friend_code = 'A1B2C3D'; 
                }
                
                setUser(userData);
                // 임시 상태 초기화
                setTempDisplayName(userData.name || '이름 정보 없음');
                setTempEmail(userData.email || '이메일 정보 없음');
            } else if (response.status === 401) {
                 // 토큰 만료 또는 유효하지 않음
                 localStorage.removeItem('access_token');
                 setMessageBox({ type: 'error', message: "인증 오류: 로그인 세션이 만료되었습니다. 다시 로그인해주세요." });
                 navigation('/login'); // useNavigate를 사용하여 /login으로 이동
            } else {
                setMessageBox({ type: 'error', message: `사용자 정보 로드 실패: ${response.status}` });
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

    // 프로필 업데이트 처리 (이름 또는 이메일)
    const handleUpdateProfile = async (field, value) => {
        if (!user) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigation('/login');
            return;
        }

        setIsLoading(true);

        // 유효성 검사 (이메일인 경우 간단한 형식 검사)
        if (field === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
            setMessageBox({ type: 'error', message: "유효한 이메일 형식이 아닙니다." });
            setIsLoading(false);
            return;
        }

        try {
            const payload = field === 'name' ? { name: value } : { email: value };

            // Mock PUT 요청 (실제 백엔드 API가 /users/me 라고 가정)
            const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
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
                setTempEmail(updatedUser.email);
                setMessageBox({ type: 'success', message: `프로필 정보 (${field === 'name' ? '이름' : '이메일'})가 성공적으로 업데이트되었습니다. (Mock)` });
                
                // 편집 모드 닫기
                if (field === 'name') setIsEditingName(false);
                if (field === 'email') setIsEditingEmail(false);
                
            } else {
                setMessageBox({ type: 'error', message: `프로필 업데이트 실패: ${response.status} ${response.statusText}` });
            }
        } catch (error) {
            console.error("Update Error:", error);
            setMessageBox({ type: 'error', message: "네트워크 오류로 프로필 업데이트에 실패했습니다." });
        } finally {
            setIsLoading(false);
        }
    };

    // 편집 모드 시작
    const handleStartEdit = (field) => {
        if (field === 'name') setIsEditingName(true);
        if (field === 'email') setIsEditingEmail(true);
    };

    // 편집 모드 취소 및 원래 값으로 되돌리기
    const handleCancelEdit = (field) => {
        if (field === 'name') {
            setTempDisplayName(user.name);
            setIsEditingName(false);
        }
        if (field === 'email') {
            setTempEmail(user.email);
            setIsEditingEmail(false);
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
                            <span style={{ fontSize: '1.5rem', color: '#fff' }}>+</span>
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
                            className={`text-input`}
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
                                    className="btn-edit btn-small"
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

                {/* 이메일 섹션 - 편집 가능 (실제 앱에서는 인증 필요) */}
                <div className="input-group">
                    <label className="input-label">이메일</label>
                    <div className="input-with-button">
                        <input
                            type="email"
                            className={`text-input`}
                            value={tempEmail}
                            onChange={(e) => setTempEmail(e.target.value)}
                            readOnly={!isEditingEmail}
                            disabled={isLoading}
                        />
                         {!isEditingEmail ? (
                            <button
                                className="btn-edit btn-small"
                                onClick={() => handleStartEdit('email')}
                                disabled={isLoading}
                            >
                                수정
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn-edit btn-small"
                                    onClick={() => handleUpdateProfile('email', tempEmail)}
                                    // 값이 변경되었고, 기본 유효성 검사를 통과할 때만 활성화
                                    disabled={isLoading || tempEmail.trim() === user.email || !/^\S+@\S+\.\S+$/.test(tempEmail)}
                                >
                                    저장
                                </button>
                                <button
                                    className="btn-cancel btn-small"
                                    onClick={() => handleCancelEdit('email')}
                                    disabled={isLoading}
                                >
                                    취소
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* 🚨 추가된 친구 코드 섹션 */}
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
                        {/* 친구 코드는 수정 불가능하므로, 복사 버튼 등의 기능을 추가할 수 있습니다. */}
                        <button 
                            className="btn-edit btn-small" 
                            onClick={() => {
                                navigator.clipboard.writeText(user.friend_code)
                                setMessageBox({ type: 'success', message: `친구 코드 '${user.friend_code}'가 클립보드에 복사되었습니다. 📋` })
                            }}
                            disabled={!user.friend_code}
                            style={{ backgroundColor: '#4F46E5', color: 'white' }}
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
                            message: "비밀번호 변경 기능을 여기에 추가할 수 있습니다." 
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
    return (
        <>  
            <ProfileScreen />
        </>
    );
}

export default App;