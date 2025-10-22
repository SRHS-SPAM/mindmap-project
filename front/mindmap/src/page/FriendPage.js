import "./FriendPage.css"

import Header from "../component/Header";
import Friends from "../component/Friends";

import { Search } from "lucide-react";

const Friend = () => {
    return(
        <div className="wrap_f">
            <Header />
            <div className="info">
                <div className='text_wrap_f'>
                    <h1 className='main_text_f'>Friend</h1>
                    <div>
                        <input type="s_friend" placeholder="TRY SERCHING FOR NEW FRIEND"/>
                        <Search className="search" />  
                    </div>
                    <p className="sub_text_f">(12)</p>             
                </div>
                <div className="people_wrap">
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                </div>
                <p className="sub_text_f">OTHER PEOPLE</p>
                <div className="opeople_wrap">
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    <Friends />
                    
                </div>
        
            </div>
            
        </div>
    );
}

export default Friend;