import "./AboutPage.css"

import { useNavigate } from 'react-router-dom';

import Header from "../component/Header";

const Friend = () => {
    const navigation = useNavigate();
    return(
        <div className="wrap_f">
            <Header />
            <div className="info_a">
                <button className='go_a' onClick={() => navigation('/info')}>
                    <p className='sub_text'>ACCOUNT DETAILS</p>
                </button>
                <button className='go_a' onClick={() => navigation('/login')}>
                    <p className='sub_text'>LOGOUT</p>
                </button>
            </div>   
        </div>
    );
}

export default Friend;