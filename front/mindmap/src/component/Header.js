import "./Header.css"
import { useNavigate } from 'react-router-dom';

import { House } from 'lucide-react';
import { NotepadText } from 'lucide-react';
import { CircleUserRound } from 'lucide-react';
import { Bell } from 'lucide-react';
import { CircleEllipsis } from 'lucide-react';

const Header = () => {
    const navigation = useNavigate();

    return(
        <div className="wrap_h">
            <p onClick={() => navigation('/home')}><House className="icon"/></p>
            <p onClick={() => navigation('/mind')}><img src="/icon/mapicon.png" alt="mapicon" className="icon"/></p>
            <p onClick={() => navigation('/memo')}><NotepadText className="icon"/></p>
            <p onClick={() => navigation('/friend')}><CircleUserRound className="icon"/></p>
            <p onClick={() => navigation('/notification')}><Bell className="icon"/></p>
            <p onClick={() => navigation('/about')}><CircleEllipsis className="icon"/></p>
        </div>
    );
}

export default Header;