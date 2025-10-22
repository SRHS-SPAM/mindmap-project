import "./Friends.css"

import { CircleUserRound } from 'lucide-react';

const Friends = () => {
    return(
        <div className="friend">
            <CircleUserRound className="icon_u"/>
            <p>● USER</p>
        </div>
    );
}

export default Friends;