import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import "./SignPage.css"


// TODO: 실제 FastAPI 백엔드 주소로 변경하세요.
const API_BASE_URL = 'http://localhost:8000'; 

// 메시지 박스 컴포넌트 (alert() 대신 사용)
const MessageBox = ({ message, type, onClose }) => (
    <div style={messageBoxStyles.overlay}>
        <div style={{
            ...messageBoxStyles.box,
            borderColor: type === 'error' ? '#EF4444' : '#10B981',
            boxShadow: type === 'error' ? '0 10px 15px -3px rgba(239, 68, 68, 0.1), 0 4px 6px -2px rgba(239, 68, 68, 0.05)' : '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)'
        }}>
            <h3 style={messageBoxStyles.title}>
                {type === 'error' ? '⚠️ 오류 발생' : '✅ 성공'}
            </h3>
            <p style={messageBoxStyles.content}>{message}</p>
            <button
                onClick={onClose}
                style={{
                    ...messageBoxStyles.button,
                    backgroundColor: type === 'error' ? '#DC2626' : '#059669',
                    hoverBackgroundColor: type === 'error' ? '#B91C1C' : '#047857' // 실제 hover는 CSS에서 처리
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
        zIndex: 1000,
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


const App = () => {
    const navigation = useNavigate();

    // useNavigate를 대체하는 더미 함수 (단일 파일 환경)
    const navigate = (path) => console.log(`Navigating to: ${path}`);
    
    // 1. 상태 관리
    const [name, setName] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // UI 및 로딩 상태
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [messageBox, setMessageBox] = useState(null); 

    // 메시지 박스 닫기 핸들러
    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
        if (messageBox?.type === 'success') {
            navigate('/login'); // 성공 시에만 라우팅 시도
        }
    }, [messageBox, navigate]);

    // 2. 회원가입 처리 함수
    const handleSignUp = useCallback(async (e) => {
        e.preventDefault(); 
        setError('');
        setMessageBox(null);
        
        if (password !== confirmPassword) {
            setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);

        // FastAPI 백엔드의 signup 엔드포인트 호출
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 백엔드 UserCreate 스키마에 맞춰 name, email, password 전송
                body: JSON.stringify({ 
                    name, 
                    email, 
                    password 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 3. 성공: 메시지 박스 표시
                console.log("Sign up successful:", data);
                setMessageBox({ 
                    type: 'success', 
                    message: '회원가입이 성공적으로 완료되었습니다. 로그인 페이지로 이동합니다.' 
                });
                navigation('/login');
            } else {
                // 4. 실패: FastAPI 오류 객체 처리 및 에러 메시지 표시 로직 강화
                let displayMessage = '회원가입에 실패했습니다. 입력 정보를 다시 확인해주세요.';
                
                if (Array.isArray(data.detail)) {
                    displayMessage = data.detail.map(err => {
                        const loc = err.loc.length > 1 ? err.loc[err.loc.length - 1] : '데이터';
                        
                        // Pydantic 오류 메시지를 한국어로 변환하거나 그대로 표시
                        let msg = err.msg;
                        if (msg.includes("field required")) msg = "필수 입력 항목입니다.";
                        if (msg.includes("value is not a valid email address")) msg = "올바른 이메일 형식이 아닙니다.";

                        return `[${loc}] ${msg}`;
                    }).join('\n');

                } else if (data.detail && typeof data.detail === 'string') {
                    displayMessage = data.detail;
                }
                
                setError(displayMessage);
                setMessageBox({ 
                    type: 'error', 
                    message: displayMessage 
                });
            }
        } catch (err) {
            // 네트워크 오류 등 예외 처리
            console.error('Sign Up Error:', err);
            setMessageBox({ 
                type: 'error', 
                message: '네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해주세요.' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [name, email, password, confirmPassword]);
    

    return (
        <>
            <div className="wrap_s">
                <div className='text_wrap_s'>
                    <h1 className='main_text_s'>SIGN UP</h1>
                    
                    <form onSubmit={handleSignUp}>
                        <div className="in_wrap">
                            {/* 1. Name Input (Username/ID 역할) */}
                            <input
                                type="text" 
                                id="name"
                                className="in" 
                                placeholder="USER NAME" // 사용자가 식별하기 쉽게 레이블 변경
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {/* 2. Email Input */}
                            <input
                                type="email" 
                                id="email"
                                className="in" 
                                placeholder="EMAIL" // 사용자가 식별하기 쉽게 레이블 변경
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {/* 3. Password Input */}
                            <input
                                type="password" 
                                id="password"
                                className="in" 
                                placeholder="PASSWORLD"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {/* 4. Password Confirmation Input */}
                            <input
                                type="password" 
                                id="confirmPassword"
                                className="in" 
                                placeholder="PASSWORD CHICK"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        {/* 에러 메시지 표시 */}
                        {error && (
                            <div className="error-message">
                                <p>오류: {error}</p>
                            </div>
                        )}

                        <div className="add">
                            <p onClick={() => navigation('/login')}>SignIn</p>
                            {/* Find ID/Pass는 현재 기능이 없으므로 비활성화된 것처럼 처리 */}
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find ID</p>
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find Pass</p>
                        </div>
                        
                        {/* 회원가입 버튼 */}
                        <button type="submit" className='go_s' disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="spinner"></div>
                                    <p className='sub_text'>가입 중...</p>
                                </>
                            ) : (
                                <p className='sub_text'>Sign Up</p>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            {/* 메시지 박스 렌더링 */}
            {messageBox && (
                <MessageBox 
                    message={messageBox.message} 
                    type={messageBox.type} 
                    onClose={closeMessageBox} 
                />
            )}
        </>
    );
}

export default App;
