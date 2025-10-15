import "./HomePage.css"
import { useNavigate } from 'react-router-dom';

import Header from "../component/Header"

const FriendPage = () => {
    return(
        <div className="wrap_ho">
            <Header />
            <div className='text_wrap'>
                <h1 className='main_text'>FriendPage</h1>
            </div>
        </div>
    );
}

export default FriendPage;