import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import "./SignPage.css"


// TODO: 실제 FastAPI 백엔드 주소로 변경하세요.
const API_BASE_URL = 'http://localhost:8000'; 

// 이 컴포넌트는 단일 파일 환경이므로 useNavigate를 대체하는 더미 함수를 사용합니다.
const navigate = (path) => console.log(`Navigating to: ${path}`);

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
                    hoverBackgroundColor: type === 'error' ? '#B91C1C' : '#047857'
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

    // 1. 상태 관리: 이메일(ID), 비밀번호, 에러 메시지
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // UI 및 로딩 상태
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messageBox, setMessageBox] = useState(null); 

    // 메시지 박스 닫기 핸들러
    const closeMessageBox = useCallback(() => {
        setMessageBox(null);
    }, []);

    // 2. 로그인 처리 함수
    const handleLogin = useCallback(async (e) => {
        e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지
        setError('');
        setMessageBox(null);
        setIsLoading(true);

        try {
            // 🚨 수정된 로직: FastAPI의 Pydantic 모델(UserCreate)이 예상하는
            // JSON 형식의 페이로드를 생성하고 'email' 키를 사용합니다.
            const payload = {
                email: email, // Pydantic 모델에 맞게 'email' 사용
                password: password
            };

            const requestBody = JSON.stringify(payload);
            console.log("Request Content-Type:", 'application/json');
            console.log("Request Body (JSON):", requestBody);


            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: 'POST',
                // ⚠️ Content-Type을 'application/json'으로 설정합니다.
                headers: {
                    'Content-Type': 'application/json', // 🚨 수정된 부분
                },
                // JSON 문자열을 본문으로 전송합니다.
                body: requestBody, // 🚨 수정된 부분
            });

            // 응답이 비어있지 않은지 확인 후 JSON으로 파싱 시도
            // ERR_EMPTY_RESPONSE를 방지하기 위해 response.json() 호출 전 상태 코드를 확인합니다.
            if (!response.bodyUsed && response.status === 204) {
                 // 204 No Content는 토큰이 없으므로 오류로 간주합니다.
                 throw new Error("서버에서 빈 응답(204 No Content)을 받았습니다. 백엔드 구현을 확인해주세요.");
            }
            
            // 응답 본문 파싱
            const data = await response.json();


            if (response.ok) {
                // 3. 성공: JWT 토큰 저장 및 홈으로 이동
                sessionStorage.setItem('access_token', data.access_token);
                console.log("Login successful. Token stored:", data.access_token);
                
                setMessageBox({ 
                    type: 'success', 
                    message: `로그인 성공! JWT 토큰이 저장되었습니다:\n${data.access_token.substring(0, 30)}...`
                });
                navigation('/home');

            } else {
                // 4. 실패: 에러 메시지 표시
                let errorMessage = data.detail || `로그인 실패. HTTP 상태코드: ${response.status}. ID와 비밀번호를 확인해주세요.`;
                
                // Pydantic Validation Errors 처리
                if (Array.isArray(data.detail)) {
                     errorMessage = data.detail.map(err => {
                         const loc = err.loc.length > 1 ? err.loc[err.loc.length - 1] : '데이터';
                         let msg = err.msg;
                         if (msg.includes("field required")) msg = "필수 입력 항목입니다.";
                         if (msg.includes("value is not a valid email address")) msg = "올바른 이메일 형식이 아닙니다.";
                         // 422 오류 메시지를 명확히 전달
                         if (response.status === 422 && err.type === "missing") {
                              msg = `필드 [${loc}]이(가) 누락되었습니다. (FastAPI는 JSON 형식으로 'email'과 'password'를 기대함)`;
                         }
                         return `[${loc}] ${msg}`;
                     }).join('\n');
                } else if (response.status === 422) {
                    // 사용자 정의 422 오류 메시지 처리
                    if (data.detail && typeof data.detail === 'string') {
                         errorMessage = `백엔드 유효성 검사 오류 (422):\n${data.detail}`;
                    } else if (data.detail && data.detail.includes("value is not a valid dictionary or object")) {
                        // 수정 후에도 422 오류가 발생하면, 페이로드가 JSON이 아니라는 뜻이므로 명확히 안내합니다.
                         errorMessage = `🚨 데이터 형식 오류 (422) 🚨\n백엔드가 유효한 JSON 데이터를 읽지 못했습니다.\n\n[FastAPI 예상 형식] Content-Type: application/json, Body: {"email": "...", "password": "..."}`;
                    }
                }


                setError(errorMessage);
                setMessageBox({ type: 'error', message: errorMessage });
            }
        } catch (err) {
            // 네트워크 오류 등 예외 처리
            console.error('Login Error:', err);
            const networkError = `네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해주세요. 오류 메시지: ${err.message}`;
            setError(networkError);
            setMessageBox({ type: 'error', message: networkError });
        } finally {
            setIsLoading(false);
        }
    }, [email, password]);
    

    return (
        <>
            <div className="wrap_s">
                <div className='text_wrap_s'>
                    <h1 className='main_text_s'>SIGN IN</h1>
                    
                    {/* 폼 제출을 위한 form 태그와 이벤트 핸들러 추가 */}
                    <form onSubmit={handleLogin}>
                        <div className="in_wrap">
                            {/* ID (Email) Input */}
                            <input
                                type="email" 
                                id="email"
                                className="in" 
                                // 🚨 힌트 텍스트 변경: 이제 'email' 키를 사용합니다.
                                placeholder="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            {/* Password Input */}
                            <input
                                type="password" 
                                id="password"
                                className="in"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                        {/* 기존 클래스 이름 적용: add */}
                        <div className="add">
                            {/* navigate는 console.log로 대체되며, 이 컴포넌트에서는 /signup을 가리킵니다. */}
                            <p onClick={() => navigation('/signup')}>SignUp</p>
                            {/* Find ID/Pass는 현재 기능이 없으므로 비활성화된 것처럼 처리 */}
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find ID</p>
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find Pass</p>
                        </div>
                        
                        {/* 로그인 버튼 - type="submit"으로 변경 및 로딩 상태/비활성화 처리 */}
                        <button type="submit" className='go_s' disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="spinner"></div>
                                    <p className='sub_text'>로그인 중...</p>
                                </>
                            ) : (
                                <p className='sub_text'>Login {'>'}</p> 
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
