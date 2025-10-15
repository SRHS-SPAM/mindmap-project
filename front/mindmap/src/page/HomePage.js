import "./HomePage.css"
import { useNavigate } from 'react-router-dom';

import Header from "../component/Header"

const HomePage = () => {
    return(
        <div className="wrap_ho">
            <Header />
            <div className='text_wrap'>
                <h1 className='main_text_h'>Home</h1>
            </div>
        </div>
    );
}

export default HomePage;