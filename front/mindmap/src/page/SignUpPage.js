import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// TODO: 실제 FastAPI 백엔드 주소로 변경하세요.
const API_BASE_URL = 'http://localhost:8000'; 

const SignUpPage = () => {
    const navigate = useNavigate();
    
    // 1. 상태 관리: name (새로 추가), email, password, 비밀번호 확인, 에러 메시지
    const [name, setName] = useState(''); // 이름/사용자명 필드 추가
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 2. 회원가입 처리 함수
    const handleSignUp = useCallback(async (e) => {
        e.preventDefault(); 
        setError('');
        
        if (password !== confirmPassword) {
            setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);

        // FastAPI 백엔드의 signup 엔드포인트 호출
        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 백엔드 UserCreate 스키마에 맞춰 name, email, password 전송
                body: JSON.stringify({ 
                    name, // 새로 추가된 name 필드
                    email, 
                    password 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 3. 성공: 로그인 페이지로 이동
                console.log("Sign up successful:", data);
                navigate('/login');
            } else {
                // 4. 실패: FastAPI 오류 객체 처리 및 에러 메시지 표시 로직 강화
                let displayMessage = '회원가입에 실패했습니다. 입력 정보를 확인해주세요.';
                
                // --- 에러 디버깅 로직 강화 (React 렌더링 오류 방지) ---
                if (Array.isArray(data.detail)) {
                    displayMessage = data.detail.map(err => {
                        const loc = err.loc.length > 1 ? err.loc[err.loc.length - 1] : '데이터';
                        return `[${loc}] ${err.msg}`;
                    }).join('; ');

                } else if (data.detail && typeof data.detail === 'string') {
                    displayMessage = data.detail;
                }
                
                setError(displayMessage);
            }
        } catch (err) {
            // 네트워크 오류 등 예외 처리
            console.error('Sign Up Error:', err);
            setError('네트워크 오류가 발생했습니다. 서버 연결 상태를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    }, [name, email, password, confirmPassword, navigate]); // name을 의존성 배열에 추가
    
    // 이전에 사용된 클래스 이름에 대한 스타일 (파일 종속성 방지를 위해 인라인으로 포함)
    const styles = `
        /* 기본 레이아웃 스타일 */
        .wrap_s {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f7f7f7;
            padding: 20px;
        }

        .text_wrap_s {
            background: #ffffff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }

        /* 제목 스타일 */
        .main_text_s {
            font-size: 2rem;
            font-weight: 700;
            color: #333;
            margin-bottom: 30px;
        }

        /* 입력 필드 그룹 스타일 */
        .in_wrap {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 25px;
        }

        /* 입력 필드 스타일 */
        .in {
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            width: 100%;
            transition: border-color 0.3s;
        }

        .in:focus {
            border-color: #5a67d8; /* Indigo color for focus */
            outline: none;
        }

        /* 추가 링크 스타일 (SignIn, Find ID/Pass) */
        .add {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #5a67d8;
            margin-bottom: 30px;
        }

        .add p {
            cursor: pointer;
            transition: color 0.3s;
            padding: 5px;
        }
        
        .add p:hover {
            color: #3f51b5;
        }

        /* 회원가입 버튼 스타일 */
        .go_s {
            width: 100%;
            padding: 12px;
            background-color: #5a67d8; /* Indigo color */
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s, opacity 0.3s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .go_s:hover:not(:disabled) {
            background-color: #3f51b5;
        }
        
        .go_s:disabled {
            background-color: #a0aec0; /* Gray when loading/disabled */
            cursor: not-allowed;
            opacity: 0.7;
        }

        /* 버튼 텍스트 스타일 */
        .sub_text {
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0; /* p 태그의 기본 마진 제거 */
        }
        
        /* 에러 메시지 스타일 */
        .error-message {
            background-color: #fee2e2;
            color: #cc0000;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #f9acaa;
            margin-bottom: 15px;
            font-size: 0.9rem;
            text-align: left;
        }
    `;

    return (
        <>
            <style>{styles}</style>
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
                                placeholder="이름 / 사용자명" // 사용자가 식별하기 쉽게 레이블 변경
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
                                placeholder="이메일 주소" // 사용자가 식별하기 쉽게 레이블 변경
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
                                placeholder="비밀번호"
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
                                placeholder="비밀번호 확인"
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
                            <p onClick={() => navigate('/login')}>SignIn</p>
                            {/* Find ID/Pass는 현재 기능이 없으므로 비활성화된 것처럼 처리 */}
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find ID</p>
                            <p style={{ opacity: 0.6, cursor: 'default' }}>Find Pass</p>
                        </div>                
                        
                        {/* 회원가입 버튼 */}
                        <button type="submit" className='go_s' disabled={isLoading}>
                            <p className='sub_text'>
                                {isLoading ? '가입 중...' : 'Sign Up >'}
                            </p>
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

export default SignUpPage;
