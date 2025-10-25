import "./AboutPage.css"

import { useNavigate } from 'react-router-dom';

import Header from "../component/Header";

const Friend = () => {
    const navigation = useNavigate();

    const handleLogout = (e) => {
        e.preventDefault();
        // 로컬 스토리지에서 토큰을 제거하고 페이지를 새로고침하여 로그아웃을 시뮬레이션합니다.
        localStorage.removeItem('access_token');
        window.location.reload();
    };
    
    return(
        <div className="wrap_f">
            <Header />
            <div className="info_a">
                <button className='go_a' onClick={() => navigation('/info')}>
                    <p className='sub_text'>ACCOUNT DETAILS</p>
                </button>
                <button className='go_a' onClick={() => navigation('/login') && handleLogout}>
                    <p className='sub_text'>LOGOUT</p>
                </button>
            </div>   
        </div>
    );
}

export default Friend;