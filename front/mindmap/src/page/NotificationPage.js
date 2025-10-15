import "./HomePage.css"
import { useNavigate } from 'react-router-dom';

import Header from "../component/Header"

const NotificationPage = () => {
    return(
        <div className="wrap_ho">
            <Header />
            <div className='text_wrap'>
                <h1 className='main_text'>NotiPage</h1>
            </div>
        </div>
    );
}

export default NotificationPage;