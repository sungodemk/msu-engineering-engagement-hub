// Zhixiang Miao

import {useEffect, useState} from 'react';
import { Link, useParams, useNavigate } from "react-router-dom";
import '../css/login_page.css';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Default login handler, will add more algorithm later. 
    async function loginHandler(e) {
        e.preventDefault();
        navigate('/');
    }

    return (
        <div className="login_page">
            <form className="login_form" onSubmit={loginHandler}>
                <div className="titles">
                    <h2 className="web_title">MSU Engineering Engagement Hub</h2>
                    <h1 className="login_title">Welcome</h1>
                </div>
                <div className="account_login_section">
                    <label className="netid_title">MSU NetID</label>
                    <input className="netid_dialog_box" type="netid" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <label className="password_title">Password:</label>
                    <input className="password_dialog_box" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="login_button" type="submit">Sign in</button>
                </div>
            </form>
        </div>
    );
}

export default LoginPage;