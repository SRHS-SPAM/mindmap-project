import "./SignPage.css"
import { useNavigate } from 'react-router-dom';

const SignUpPage = () => {
    const navigation = useNavigate();

    return(
        <div className="wrap_s">
            <div className='text_wrap_s'>
                <h1 className='main_text_s'>SIGN UP</h1>
                <div className="in_wrap">
                    <input type="text" className="in" placeholder="ID"/>
                    <input type="text"  className="in" placeholder="PASS WORLD"/>
                    <input type="email"  className="in" placeholder="EMAIL"/>
                </div>
                <div className="add">
                    <p onClick={() => navigation('/login')}>SignIn</p>
                    <p>Find ID</p>
                    <p>Find Pass</p>
                </div>                
                <button className='go_s' onClick={() => navigation('/login')}>
                    <p className='sub_text'>Sign Up &gt;</p>
                </button>
                
            </div>
        </div>
    );
}

export default SignUpPage;