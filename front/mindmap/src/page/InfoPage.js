import React, { useState, useEffect, useCallback, useRef } from 'react';
// useNavigate hook을 사용합니다.
import { useNavigate } from 'react-router-dom';
import './InfoPage.css';

import Header from "../component/Header";

// NOTE: 외부 CSS 파일은 단일 파일 원칙을 위해 <style> 태그로 대체합니다.
// TODO: 실제 FastAPI 백엔드 주소로 변경하세요. (로컬 환경 개발을 위해 유지)
const API_BASE_URL = 'http://localhost:8000';

// ------------------------------------
// 순수 CSS 스타일 정의 (MessageBox 및 기타 기본 스타일)
// ------------------------------------
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

// 메인 앱 스타일 (Tailwind CSS 스타일을 인라인으로 변환)
const AppStyles = {
    profileContainer: {
        width: 'calc(100% - 100px)',
        marginLeft: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#272E33',
        fontFamily: 'Inter, sans-serif',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        padding: '2rem',
        width: '100%',
        maxWidth: '500px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    cardTitle: {
        fontSize: '1.75rem',
        fontWeight: '700',
        color: '#1F2937',
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '1rem',
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
        overflow: 'hidden',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        transition: 'opacity 0.2s',
    },
    // Hover effect for image overlay (requires a class selector in JSX)
    // In JSX, we will manually apply hover style if needed, but for simplicity, let's keep it CSS-like
    // The hover state will be simulated via JS if necessary, but here we just show the overlay on click.
    imageHint: {
        fontSize: '0.875rem',
        color: '#6B7280',
        marginTop: '-0.25rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    inputLabel: {
        fontWeight: '600',
        color: '#374151',
        fontSize: '0.9rem',
    },
    inputWithButton: {
        display: 'flex',
        gap: '0.5rem',
    },
    textInput: {
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid #D1D5DB',
        flexGrow: 1,
        fontSize: '1rem',
        backgroundColor: '#F9FAFB',
        transition: 'all 0.2s',
        outline: 'none',
        color: '#374151',
    },
    textInputEditing: {
        backgroundColor: '#FFFFFF',
        borderColor: '#3B82F6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
    btnSmall: {
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontWeight: '600',
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
    },
    btnEdit: {
        backgroundColor: '#6B7280',
        color: 'white',
    },
    btnSave: {
        backgroundColor: '#10B981',
        color: 'white',
        cursor: 'pointer',
    },
    btnCancel: {
        backgroundColor: '#EF4444',
        color: 'white',
        cursor: 'pointer',
    },
    friendCodeWrap: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: '0.5rem',
        padding: '0.5rem',
        border: '1px solid #E5E7EB',
    },
    friendCodeText: {
        flexGrow: 1,
        padding: '0.25rem 0.5rem',
        fontWeight: '700',
        letterSpacing: '0.1rem',
        color: '#4B5563',
        fontSize: '1.125rem',
        fontFamily: 'monospace',
    },
    buttonFooter: {
        marginTop: '0.5rem',
    },
    btnSecondary: {
        backgroundColor: '#E5E7EB',
        color: '#374151',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        fontWeight: '600',
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease-in-out',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    // 로딩 스피너 CSS (인라인 스타일은 한계가 있으므로, 간단한 애니메이션 효과만 적용)
    spinnerLarge: {
        border: '4px solid #F3F4F6',
        borderTop: '4px solid #3B82F6',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem',
    }
    // Note: The 'spin' animation keyframe is omitted here as it requires a separate <style> block or complex JS,
    // but the spinner will still show a loading ring appearance.
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
// 비밀번호 변경 모달 컴포넌트
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
    
    // 비밀번호 변경 상태
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [tempDisplayName, setTempDisplayName] = useState(''); 
    const [tempEmail, setTempEmail] = useState(''); 
    const [isEditingName, setIsEditingName] = useState(false);

    // 🚨 프로필 이미지 상태 (기본값 제거, 로드된 Blob URL로 사용)
    const [profileImage, setProfileImage] = useState(null);
    const [messageBox, setMessageBox] = useState(null);

    const fileInputRef = useRef(null);
    const defaultPlaceholderImage = 'https://placehold.co/120x120/A5B4FC/ffffff?text=Profile';

    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
    }, []);
    
    const fetchProfileImage = useCallback(async (token) => {
        const imageUrl = `${API_BASE_URL}/api/v1/auth/me/profile_image`;
        
        try {
            const response = await fetch(imageUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const imageBlob = await response.blob();
                const objectUrl = URL.createObjectURL(imageBlob);
                
                // Note: 이전 Blob URL 해제는 useEffect 클린업 함수에서 처리합니다.
                setProfileImage(objectUrl);
            } else if (response.status === 404) {
                // 서버에 이미지가 없는 경우 (404 Not Found)
                setProfileImage(defaultPlaceholderImage);
            } else {
                console.error("Profile image fetch failed:", response.status);
                setProfileImage(defaultPlaceholderImage);
            }
        } catch (error) {
            console.error("Network error fetching profile image:", error);
            setProfileImage(defaultPlaceholderImage);
        }
    }, []); // ⬅️ ⭐️ 핵심: 빈 배열로 설정하여 무한 루프 차단

// ------------------------------------

// 💡 2. fetchUserProfile: 사용자 기본 정보와 이미지를 함께 불러옵니다.
//    ✅ fetchProfileImage 의존성을 제거하여 루프를 차단합니다.
    const fetchUserProfile = useCallback(async () => {
        const token = sessionStorage.getItem('access_token');
        
        // 로딩 멈춤 방지 및 토큰 체크
        if (!token) {
            setIsLoading(false); // 로딩 상태 해제 (추가)
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
                
                if (!userData.friend_code) {
                    userData.friend_code = 'A1B2C3D'; 
                }
                
                setUser(userData);
                setTempDisplayName(userData.name || '이름 정보 없음');
                setTempEmail(userData.email || '이메일 정보 없음');

                // 이미지 로드 함수 호출
                await fetchProfileImage(token);

            } else if (response.status === 401) {
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
            setIsLoading(false); // 로딩 해제
        }
    }, [navigation]); // ⬅️ ⭐️ 핵심: fetchProfileImage 제거

    // ------------------------------------

    // 💡 3. useEffect: 컴포넌트 마운트/업데이트 시 데이터를 불러오고, 언마운트 시 Blob URL을 해제합니다.
    //    ✅ profileImage 값을 클린업 시점에 캡처하여 정확히 해제합니다.
    useEffect(() => {
        fetchUserProfile();
        
        // 클린업 함수에서 사용할 profileImage의 현재 값(클로저 캡처)
        const urlToRevoke = profileImage; 

        return () => {
            // 컴포넌트가 언마운트되거나 다음 fetchUserProfile 호출 전에 이전 Blob URL 해제
            if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
                console.log("Revoking Blob URL on unmount:", urlToRevoke);
                URL.revokeObjectURL(urlToRevoke); 
            }
        };
        // fetchUserProfile만 의존성으로 유지하며, 이는 navigation 변경 시에만 재생성됩니다.
    }, [fetchUserProfile]);

    // 프로필 업데이트 처리 (이름만 가능)
    const handleUpdateProfile = async (field, value) => {
        if (!user || field !== 'name') return; 

        const token = sessionStorage.getItem('access_token');
        if (!token) {
            navigation('/login');
            return;
        }

        setIsLoading(true);

        try {
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

    // 비밀번호 변경 API 호출 함수
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
                 // 백엔드에서 'Invalid current password'와 같은 메시지를 반환한다고 가정
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

    // ------------------------------------
    // 🚨 프로필 이미지 변경 (업로드) 핸들러
    // ------------------------------------
    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const token = sessionStorage.getItem('access_token');
        if (!token) {
            setMessageBox({ type: 'error', message: "인증 오류: 로그인 후 시도해주세요." });
            return;
        }

        setIsLoading(true);

        try {
            const formData = new FormData();
            // 백엔드가 'file' 필드에 파일을 기대한다고 가정
            formData.append('file', file);

            // POST 요청: /api/v1/auth/me/profile_image 사용
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/me/profile_image`, {
                method: 'POST', // POST 또는 PUT
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // FormData 사용 시 'Content-Type': 'multipart/form-data' 헤더는 자동으로 설정됩니다.
                },
                body: formData,
            });

            if (response.ok || response.status === 200) {
                // 성공적으로 업로드되었으므로 새 이미지를 다시 로드
                await fetchProfileImage(token);
                setMessageBox({ type: 'success', message: "프로필 이미지가 성공적으로 업로드되었습니다." });
            } else {
                const errorData = await response.json();
                setMessageBox({ type: 'error', message: `이미지 업로드 실패: ${errorData.detail || response.statusText}` });
            }
        } catch (error) {
            console.error("Image Upload Error:", error);
            setMessageBox({ type: 'error', message: "네트워크 오류로 이미지 업로드에 실패했습니다." });
        } finally {
            setIsLoading(false);
            // 파일 입력 필드 초기화 (동일 파일을 연속으로 업로드 가능하게)
            event.target.value = null; 
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

    // 로딩 중 표시
    if (isLoading && !user) { // user가 null일 때만 전체 로딩 표시
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
        // Global CSS for spin animation (simulated)
        <>
        <style>
            {`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .profile-image-overlay:hover {
                opacity: 1 !important;
            }
            .btn-save:disabled, .btn-cancel:disabled, .btn-secondary:disabled {
                opacity: 0.6;
                cursor: not-allowed !important;
            }
            .text-input:read-only {
                cursor: default;
            }
            `}
        </style>
        <Header/>
        <div className="profile-container" style={AppStyles.profileContainer}>
             <input
                 type="file"
                 ref={fileInputRef}
                 style={{ display: 'none' }}
                 accept="image/*"
                 onChange={handleImageChange}
                 disabled={isLoading}
             />
             <div className="card" style={AppStyles.card}>
                 <h2 className="card-title" style={AppStyles.cardTitle}>내 프로필 정보</h2>

                 {/* 프로필 이미지 섹션 (API 연결) */}
                 <div className="profile-image-wrap" style={AppStyles.profileImageWrap}>
                     <div 
                         className="profile-image" 
                         style={{ 
                             ...AppStyles.profileImage, 
                             backgroundImage: `url(${profileImage || defaultPlaceholderImage})`,
                             opacity: isLoading ? 0.7 : 1, // 로딩 중 투명도 조절
                         }}
                         onClick={() => !isLoading && fileInputRef.current.click()} // 로딩 중 클릭 불가
                     >
                         <div 
                            className="image-overlay profile-image-overlay" 
                            style={AppStyles.imageOverlay}
                         >
                             {isLoading ? (
                                 <div className="spinner-small" style={{...AppStyles.spinnerLarge, width: '20px', height: '20px'}}></div>
                             ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}><path d="M12 5v14M5 12h14"/></svg>
                             )}
                         </div>
                     </div>
                     <p className="image-hint" style={AppStyles.imageHint}>클릭하여 이미지 변경 (API 연결됨)</p>
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
                             style={{ ...AppStyles.textInput, paddingRight: '1rem', backgroundColor: '#F3F4F6' }}
                             value={tempEmail}
                             readOnly={true} 
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
                             style={{ ...AppStyles.btnEdit, ...AppStyles.btnSmall, backgroundColor: '#4B5563' }}
                             onClick={() => {
                                 try {
                                     // iFrame 환경 대체 복사 로직: 임시 input 생성 후 복사
                                     const tempInput = document.createElement('textarea');
                                     tempInput.value = user.friend_code;
                                     document.body.appendChild(tempInput);
                                     tempInput.select();
                                     document.execCommand('copy'); 
                                     document.body.removeChild(tempInput);
                                     setMessageBox({ type: 'success', message: `친구 코드 '${user.friend_code}'가 클립보드에 복사되었습니다. 📋` });
                                 } catch (error) {
                                     setMessageBox({ type: 'error', message: "클립보드 복사 실패. 브라우저 설정을 확인해주세요." });
                                 }
                             }}
                             disabled={!user.friend_code || isLoading}
                         >
                             복사
                         </button>
                     </div>
                 </div>
                 
                 {/* 비밀번호 변경 버튼 */}
                 <div className="button-footer" style={AppStyles.buttonFooter}>
                     <button 
                         className="btn-secondary full-width" 
                         style={{ ...AppStyles.btnSecondary, ...AppStyles.fullWidth, backgroundColor: '#3B82F6', color: 'white' }}
                         onClick={() => {
                             // 비밀번호 변경 모달 열기 및 상태 초기화
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
             
             {/* 비밀번호 변경 모달 렌더링 */}
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
        </>
    );
};


// ------------------------------------
// App 컴포넌트
// ------------------------------------
const App = () => {
    // NOTE: React Router의 useNavigate를 사용하므로, 실제 실행 환경에서는 
    // <Router> 또는 <BrowserRouter> 컴포넌트 내부에 래핑되어야 합니다.
    // 여기서는 useNavigate를 모킹하거나, 실제 라우터 환경에서 실행된다고 가정합니다.
    return (<InfoPageScreen />);
}

export default App;
