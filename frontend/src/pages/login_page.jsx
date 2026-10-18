// Zhixiang Miao

// Learned about firebase from these links: 
// https://firebase.google.com/docs/reference/js
// https://www.youtube.com/watch?v=n-kUZw97-lA

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { apiFetch } from '../api';
import '../css/login_page.css';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function loginHandler(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        const formattedEmail = email.includes('@') ? email.trim() : `${email.trim()}@msu.edu`;
        try {
            await signInWithEmailAndPassword(auth, formattedEmail, password);
            const res = await apiFetch('/api/me');
            if (!res.ok) {
                await auth.signOut();
                throw new Error('Your account does not have access to the hub.');
            }
            navigate('/');
        } catch (err) {
            setError(err.code === 'auth/invalid-credential' ? 'Incorrect MSU email or password.' : err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login_page">
            <form className="login_form" onSubmit={loginHandler}>
                <div className="titles">
                    <h2 className="web_title">MSU Engineering Engagement Hub</h2>
                    <h1 className="login_title">Welcome</h1>
                </div>
                <div className="account_login_section">
                    <label className="netid_title">MSU Email:</label>
                    <input className="netid_dialog_box" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <label className="password_title">Password:</label>
                    <input className="password_dialog_box" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    {error && <p className="login_error">{error}</p>}
                    <button className="login_button" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                    <div className="sign_up_text_prompt" type="button" onClick={() => navigate('/sign_up')}>
                        Sign Up
                    </div>
                </div>
            </form>
        </div>
    );
}

export default LoginPage;
