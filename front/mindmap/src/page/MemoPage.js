import "./MemoPage.css"

import Header from "../component/Header";

const MemoPage = () => {
    return(
        <div className="wrap_ho">
            <Header />
            <div className="info">
                <div className='text_wrap_ho'>
                    <h1 className='main_text_ho'>Memo</h1>
                </div>
                <div className="resent_wrap">
                    <div className="memo_wrap">
                        <p>memo1</p>
                        <p>memo2</p>
                        <p>memo3</p>
                        <p>memo4</p>
                        <p>memo5</p>
                        <p>memo6</p>
                        <p>memo7</p>
                    </div>
                    
                </div>
            </div>
            
        </div>
    );
}

export default MemoPage;