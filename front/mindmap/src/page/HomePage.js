import "./HomePage.css"

import Header from "../component/Header";
import Friends from "../component/Friends";

const HomePage = () => {
    return(
        <div className="wrap_ho">
            <Header />
            <div className="info">
                <div className='text_wrap_ho'>
                    <h1 className='main_text_ho'>HOME</h1>
                </div>
                <div className="people_wrap">
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                </div>
                <div className="resent_wrap">
                    <div className='text_wrap_ho'>
                        <h1 className='sub_text_ho'>RECENT ACTIVITY</h1>
                    </div>
                    <div className="scroll">
                        <div className="act_wrap">
                            <p>act1</p>
                            <p>act2</p>
                            <p>act2</p>
                            <p>act2</p>
                            <p>act2</p>
                            <p>act2</p>
                            <p>act2</p>
                        </div>
                    </div>
                    
                </div>
                <div className="resent_wrap">
                    <div className='text_wrap_ho'>
                        <h1 className='sub_text_ho'>MIND MAPS YOUR FRIENDS ARE ACTIVE ON</h1>
                    </div>
                    <div className="scroll">
                        <div className="act_wrap">
                            <p>act1</p>
                            <p>act2</p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
}

export default HomePage;