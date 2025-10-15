import "./MainPage.css"
import { useNavigate } from 'react-router-dom';


const MainPage = () => {
    const navigation = useNavigate();

    return(
        <div className="wrap">
            <div className='text_wrap'>
                <h1 className='main_text'>MINDMAP</h1>
                <button className='go' onClick={() => navigation('/login')}>
                    <p className='sub_text'>START &gt;</p>
                </button>
            </div>
        </div>
    );
}

export default MainPage;