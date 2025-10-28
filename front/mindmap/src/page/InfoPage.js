import React, { useState, useEffect, useCallback, useRef } from 'react';
// 🚨 useNavigate hook을 사용합니다.
import { useNavigate } from 'react-router-dom';

// NOTE: 외부 CSS 파일은 단일 파일 원칙을 위해 <style> 태그로 대체합니다.
// TODO: 실제 FastAPI 백엔드 주소로 변경하세요. (로컬 환경 개발을 위해 유지)
const API_BASE_URL = 'http://localhost:8000'; 

// 순수 CSS 스타일 정의 (MessageBox 및 기타 기본 스타일)
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
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
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

// 메시지 박스 컴포넌트 (alert() 대신 사용)
const MessageBox = ({ message, type, onClose }) => (
    <div style={messageBoxStyles.overlay}>
        <div style={{
            ...messageBoxStyles.box,
            borderColor: type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : (type === 'info' ? '#F59E0B' : '#60A5FA')),
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

// ------------------------------------
// 🚨 새 컴포넌트: 비밀번호 변경 모달
// ------------------------------------
const PasswordChangeModal = ({ 
    onClose, 
    onSave, 
    isLoading, 
    oldPassword, 
    setOldPassword, 
    newPassword, 
    setNewPassword, 
    confirmNewPassword, 
    setConfirmNewPassword 
}) => {
    // 유효성 검사 메시지
    const passwordsMatch = newPassword === confirmNewPassword;
    const isNewPasswordValid = newPassword.length >= 8;
    const isFormValid = oldPassword.length > 0 && newPassword.length > 0 && passwordsMatch && isNewPasswordValid;

    // 모달 내부 스타일 (messageBoxStyles 기반)
    const modalStyle = {
        ...messageBoxStyles.box,
        maxWidth: '450px',
        padding: '1.5rem',
        gap: '1rem',
        borderColor: '#3B82F6',
        borderWidth: '3px'
    };
    const inputStyle = {
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #D1D5DB',
        width: '100%',
        transition: 'border-color 0.15s',
        fontSize: '1rem',
        backgroundColor: 'white',
        outline: 'none',
    };
    const buttonGroupStyle = {
        display: 'flex',
        gap: '0.75rem',
        width: '100%',
        marginTop: '0.5rem',
    };
    const saveButtonStyle = {
        ...messageBoxStyles.button,
        backgroundColor: isFormValid ? '#3B82F6' : '#9CA3AF',
        cursor: isFormValid ? 'pointer' : 'not-allowed',
        flexGrow: 1,
    };
    const closeButtonStyle = {
        ...messageBoxStyles.button,
        backgroundColor: '#6B7280',
        flexGrow: 1,
    };

    return (
        <div style={messageBoxStyles.overlay} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <h3 style={{ ...messageBoxStyles.title, color: '#3B82F6' }}>비밀번호 변경</h3>

                <div className="input-group" style={{ textAlign: 'left', width: '100%' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>현재 비밀번호</label>
                    <input
                        type="password"
                        style={inputStyle}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="현재 비밀번호를 입력해주세요"
                        disabled={isLoading}
                    />
                </div>

                <div className="input-group" style={{ textAlign: 'left', width: '100%' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>새 비밀번호</label>
                    <input
                        type="password"
                        style={inputStyle}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="새 비밀번호 (최소 8자)"
                        disabled={isLoading}
                    />
                    {!isNewPasswordValid && newPassword.length > 0 && (
                        <p style={{ color: '#EF4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            새 비밀번호는 최소 8자 이상이어야 합니다.
                        </p>
                    )}
                </div>

                <div className="input-group" style={{ textAlign: 'left', width: '100%' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>새 비밀번호 확인</label>
                    <input
                        type="password"
                        style={{ ...inputStyle, borderColor: newPassword.length > 0 && confirmNewPassword.length > 0 && !passwordsMatch ? '#EF4444' : '#D1D5DB' }}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="새 비밀번호를 다시 입력해주세요"
                        disabled={isLoading}
                    />
                    {newPassword.length > 0 && confirmNewPassword.length > 0 && !passwordsMatch && (
                        <p style={{ color: '#EF4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            비밀번호가 일치하지 않습니다.
                        </p>
                    )}
                </div>

                <div style={buttonGroupStyle}>
                    <button
                        onClick={onSave}
                        style={saveButtonStyle}
                        disabled={isLoading || !isFormValid}
                    >
                        {isLoading ? '저장 중...' : '비밀번호 저장'}
                    </button>
                    <button
                        onClick={onClose}
                        style={closeButtonStyle}
                        disabled={isLoading}
                    >
                        취소
                    </button>
                </div>

            </div>
        </div>
    );
};

// ------------------------------------
// 메인 프로필 화면 컴포넌트
// ------------------------------------
const InfoPageScreen = () => { 
    const navigation = useNavigate();
    
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // 🚨 비밀번호 변경 상태 추가
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [tempDisplayName, setTempDisplayName] = useState(''); 
    const [tempEmail, setTempEmail] = useState(''); 
    const [isEditingName, setIsEditingName] = useState(false);

    const [profileImage, setProfileImage] = useState('https://placehold.co/120x120/A5B4FC/ffffff?text=Profile');
    const [messageBox, setMessageBox] = useState(null);

    const fileInputRef = useRef(null);
    
    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
    }, []);

    // 사용자 정보 불러오기 (GET /me)
    const fetchUserProfile = useCallback(async () => {
        const token = sessionStorage.getItem('access_token');
        if (!token) {
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
                setTempDisplayName(userData.name || '이름 정보 없음');
                setTempEmail(userData.email || '이메일 정보 없음');
            } else if (response.status === 401) {
                // 토큰 만료 또는 유효하지 않음
                sessionStorage.removeItem('access_token');
                setMessageBox({ type: 'error', message: "인증 오류: 로그인 세션이 만료되었습니다. 다시 로그인해주세요." });
                navigation('/login'); 
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

            // PUT 요청: /api/v1/auth/me/name 사용
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/name`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const updatedUser = { ...user, ...payload };
                setUser(updatedUser);
                setTempDisplayName(updatedUser.name);
                setMessageBox({ type: 'success', message: `프로필 이름이 성공적으로 '${updatedUser.name}'(으)로 업데이트되었습니다.` });
                
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

    // 🚨 비밀번호 변경 API 호출 함수
    const handleChangePassword = useCallback(async () => {
        if (newPassword !== confirmNewPassword) {
            setMessageBox({ type: 'error', message: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다." });
            return;
        }

        if (newPassword.length < 8) {
            setMessageBox({ type: 'error', message: "새 비밀번호는 최소 8자 이상이어야 합니다." });
            return;
        }

        const token = sessionStorage.getItem('access_token');
        if (!token) {
            navigation('/login');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                old_password: oldPassword,
                new_password: newPassword,
            };

            // PUT 요청: /api/v1/auth/me/password 사용
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 204) { // 204 No Content: 성공
                setMessageBox({ type: 'success', message: "비밀번호가 성공적으로 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요." });
                setIsPasswordModalOpen(false);
                // 성공 후 입력 필드 초기화
                setOldPassword('');
                setNewPassword('');
                setConfirmNewPassword('');

            } else if (response.status === 401) {
                // 현재 비밀번호 불일치 오류 처리
                 const errorData = await response.json();
                 setMessageBox({ type: 'error', message: errorData.detail || "현재 비밀번호가 일치하지 않습니다." });
            } else {
                // 기타 오류 처리
                const errorData = await response.json();
                setMessageBox({ type: 'error', message: `비밀번호 변경 실패: ${errorData.detail || response.statusText}` });
            }
        } catch (error) {
            console.error("Password Change Error:", error);
            setMessageBox({ type: 'error', message: "네트워크 오류로 비밀번호 변경에 실패했습니다." });
        } finally {
            setIsLoading(false);
        }
    }, [oldPassword, newPassword, confirmNewPassword, navigation]);

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
            <div className="profile-container" style={AppStyles.profileContainer}>
                <div className="loading-card" style={AppStyles.card}>
                    <div className="spinner-large" style={AppStyles.spinnerLarge}></div>
                    <p>사용자 정보 불러오는 중...</p>
                </div>
            </div>
        );
    }
    
    // 사용자 정보가 로드되지 않았을 때 (토큰 없음/오류 후 리디렉션)
    if (!user && !isLoading) {
        return <div className="profile-container" style={AppStyles.profileContainer}>
            <div className="card" style={AppStyles.card}>
                <p>사용자 정보를 불러올 수 없습니다. 로그인이 필요합니다.</p>
                <button className="btn-primary full-width" style={{ ...AppStyles.btnPrimary, ...AppStyles.fullWidth }} onClick={() => navigation('/login')}>로그인 페이지로</button>
            </div>
        </div>
    }

    return (
        <div className="profile-container" style={AppStyles.profileContainer}>
             <input
                 type="file"
                 ref={fileInputRef}
                 style={{ display: 'none' }}
                 accept="image/*"
                 onChange={handleImageChange}
             />
             <div className="card" style={AppStyles.card}>
                 <h2 className="card-title" style={AppStyles.cardTitle}>내 프로필 정보</h2>

                 {/* 프로필 이미지 섹션 (업로드 Mock) */}
                 <div className="profile-image-wrap" style={AppStyles.profileImageWrap}>
                     <div 
                         className="profile-image" 
                         style={{ ...AppStyles.profileImage, backgroundImage: `url(${profileImage})`}}
                         onClick={() => fileInputRef.current.click()}
                     >
                         <div className="image-overlay" style={AppStyles.imageOverlay}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><path d="M12 5v14M5 12h14"/></svg>
                         </div>
                     </div>
                     <p className="image-hint" style={AppStyles.imageHint}>클릭하여 이미지 변경 (Mock)</p>
                 </div>

                 {/* 사용자 ID (Name) 섹션 - 편집 가능 */}
                 <div className="input-group" style={AppStyles.inputGroup}>
                     <label className="input-label" style={AppStyles.inputLabel}>사용자 ID (이름)</label>
                     <div className="input-with-button" style={AppStyles.inputWithButton}>
                         <input
                             type="text"
                             className={`text-input ${isEditingName ? 'editing' : ''}`}
                             style={{ ...AppStyles.textInput, ...(isEditingName ? AppStyles.textInputEditing : {}) }}
                             value={tempDisplayName}
                             onChange={(e) => setTempDisplayName(e.target.value)}
                             readOnly={!isEditingName}
                             disabled={isLoading}
                         />
                         {!isEditingName ? (
                             <button
                                 className="btn-edit btn-small"
                                 style={{ ...AppStyles.btnEdit, ...AppStyles.btnSmall }}
                                 onClick={() => handleStartEdit('name')}
                                 disabled={isLoading}
                             >
                                 수정
                             </button>
                         ) : (
                             <>
                                 <button
                                     className="btn-save btn-small" 
                                     style={{ ...AppStyles.btnSave, ...AppStyles.btnSmall }}
                                     onClick={() => handleUpdateProfile('name', tempDisplayName)}
                                     disabled={isLoading || tempDisplayName.trim() === user.name || tempDisplayName.trim() === ''}
                                 >
                                     저장
                                 </button>
                                 <button
                                     className="btn-cancel btn-small"
                                     style={{ ...AppStyles.btnCancel, ...AppStyles.btnSmall }}
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
                 <div className="input-group" style={AppStyles.inputGroup}>
                     <label className="input-label" style={AppStyles.inputLabel}>이메일</label>
                     <div className="input-with-button read-only-input" style={AppStyles.inputWithButton}>
                         <input
                             type="email"
                             className={`text-input`}
                             style={{ ...AppStyles.textInput, paddingRight: '1rem' }}
                             value={tempEmail}
                             readOnly={true} // 영구적으로 읽기 전용
                             disabled={isLoading}
                         />
                     </div>
                 </div>
                 
                 {/* 친구 코드 섹션 */}
                 <div className="input-group" style={AppStyles.inputGroup}>
                     <label className="input-label" style={AppStyles.inputLabel}>친구 코드 (7자리)</label>
                     <div className="input-with-button" style={AppStyles.friendCodeWrap}>
                         <span style={AppStyles.friendCodeText}>
                             {user.friend_code || '로드 중...'}
                         </span>
                         <button 
                             className="btn-copy btn-small" 
                             style={{ ...AppStyles.btnCopy, ...AppStyles.btnSmall }}
                             onClick={() => {
                                 try {
                                     document.execCommand('copy'); // iFrame 환경 대체 복사
                                     setMessageBox({ type: 'success', message: `친구 코드 '${user.friend_code}'가 클립보드에 복사되었습니다. 📋` });
                                 } catch (error) {
                                     setMessageBox({ type: 'error', message: "클립보드 복사 실패. 브라우저 설정을 확인해주세요." });
                                 }
                             }}
                             disabled={!user.friend_code}
                         >
                             복사
                         </button>
                     </div>
                 </div>
                 
                 {/* 기타 버튼 */}
                 <div className="button-footer" style={AppStyles.buttonFooter}>
                     <button 
                         className="btn-secondary full-width" 
                         style={{ ...AppStyles.btnSecondary, ...AppStyles.fullWidth }}
                         onClick={() => {
                             // 🚨 비밀번호 변경 모달 열기 및 상태 초기화
                             setOldPassword('');
                             setNewPassword('');
                             setConfirmNewPassword('');
                             setIsPasswordModalOpen(true);
                         }}
                         disabled={isLoading}
                     >
                         비밀번호 변경
                     </button>
                 </div>
                 
                 {/* 돌아가기 버튼 */}
                 <div className="button-footer" style={AppStyles.buttonFooter}>
                     <button 
                         className="btn-secondary full-width" 
                         style={{ ...AppStyles.btnSecondary, ...AppStyles.fullWidth }}
                         onClick={() => navigation('/about')} 
                         disabled={isLoading}
                     >
                         돌아가기
                     </button>
                 </div>

             </div>
             {messageBox && <MessageBox {...messageBox} onClose={closeMessageBox} />}
             
             {/* 🚨 비밀번호 변경 모달 렌더링 */}
             {isPasswordModalOpen && (
                 <PasswordChangeModal
                     onClose={() => {
                         // 모달 닫을 때 상태 초기화
                         setOldPassword('');
                         setNewPassword('');
                         setConfirmNewPassword('');
                         setIsPasswordModalOpen(false);
                     }}
                     onSave={handleChangePassword}
                     isLoading={isLoading}
                     oldPassword={oldPassword}
                     setOldPassword={setOldPassword}
                     newPassword={newPassword}
                     setNewPassword={setNewPassword}
                     confirmNewPassword={confirmNewPassword}
                     setConfirmNewPassword={setConfirmNewPassword}
                 />
             )}
        </div>
    );
};


// ------------------------------------
// 임베디드 CSS 스타일 (기존 InfoPage.css 대체)
// ------------------------------------
// 클래스명을 건드리지 않기 위해 인라인 스타일 객체로 변환합니다.
const AppStyles = {
    profileContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F3F4F6',
        padding: '1rem',
        fontFamily: 'Inter, sans-serif',
    },
    card: {
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        maxWidth: '450px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    cardTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: '0.5rem',
    },
    profileImageWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
    },
    profileImage: {
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#A5B4FC',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '50%',
        opacity: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'opacity 0.2s',
    },
    imageHint: {
        fontSize: '0.875rem',
        color: '#6B7280',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    inputLabel: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
    },
    inputWithButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
    },
    textInput: {
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid #D1D5DB',
        flexGrow: 1,
        fontSize: '1rem',
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    textInputEditing: {
        backgroundColor: 'white',
        borderColor: '#3B82F6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
    },
    btnBase: {
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease-in-out, opacity 0.15s ease-in-out',
        border: 'none',
        whiteSpace: 'nowrap',
    },
    btnSmall: {
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
    },
    btnEdit: {
        backgroundColor: '#F3F4F6',
        color: '#374151',
    },
    btnSave: {
        backgroundColor: '#10B981',
        color: 'white',
    },
    btnCancel: {
        backgroundColor: '#EF4444',
        color: 'white',
    },
    btnCopy: {
        backgroundColor: '#3B82F6',
        color: 'white',
    },
    btnPrimary: {
        backgroundColor: '#3B82F6',
        color: 'white',
    },
    btnSecondary: {
        backgroundColor: '#E5E7EB',
        color: '#374151',
    },
    fullWidth: {
        width: '100%',
    },
    buttonFooter: {
        marginTop: '0.5rem',
    },
    friendCodeWrap: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        backgroundColor: '#F3F4F6',
        borderRadius: '0.5rem',
        border: '1px solid #E5E7EB',
    },
    friendCodeText: {
        fontSize: '1.25rem', 
        fontWeight: 'bold', 
        color: '#1F2937',
        letterSpacing: '0.1em',
    },
    // 로딩 스피너 (간단한 인라인 애니메이션)
    spinnerLarge: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderTop: '4px solid #3B82F6',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: '0 auto',
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    }
};

// ------------------------------------
// App 컴포넌트
// ------------------------------------
const App = () => {
    return (<InfoPageScreen />
    );
}

export default App;
