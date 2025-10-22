import "./SignPage.css"
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const navigation = useNavigate();

    return(
        <div className="wrap_s">
            <div className='text_wrap_s'>
                <h1 className='main_text_s'>SIGN IN</h1>
                <div className="in_wrap">
                    <input type="text" className="in" placeholder="ID"/>
                    <input type="text"  className="in" placeholder="PASS WORLD"/>
                </div>
                <div className="add">
                    <p onClick={() => navigation('/signup')}>SignUp</p>
                    <p>Find ID</p>
                    <p>Find Pass</p>
                </div>                
                <button className='go_s' onClick={() => navigation('/home')}>
                    <p className='sub_text'>Login &gt;</p>
                </button>
                
            </div>
        </div>
    );
}

export default LoginPage;