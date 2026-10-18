// Zhixiang Miao
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../css/sign_up_page.css';
import { apiFetch } from '../api';

function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function signUpHandler(e) {
        e.preventDefault();
        setError('');
        
        if (!email.trim()) {
            setError('Email cannot be empty');
            setLoading(false);
            return;
        }
        if (!password.trim()) {
            setError('Password cannot be empty');
            setLoading(false);
            return;
        }

        const formattedEmail = email.trim()

        const validateEmail = formattedEmail.includes('@') && formattedEmail.endsWith('@msu.edu');
        if (!validateEmail) {
            setError('Invalid email format');
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const checkPassword = await validatePassword(auth, password);
            if (!checkPassword.isValid) {
                throw new Error('Password does not meet the required criteria');
            }
            // await createUserWithEmailAndPassword(auth, email, password);
            const response = await apiFetch('/api/sign_up', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: formattedEmail, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to sign up');
            }
            await auth.signOut();
            navigate('/login');
        } catch (err) {
            if (err.code === 'auth/weak-password') {
                setError('Password is too weak');
            } 
            else if (err.code === 'auth/email-already-in-use') {
                setError('Email already in use');
            }
            else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="sign_up_page">
            <form className="sign_up_form" onSubmit={signUpHandler}>
                <div className="sign_up_titles">
                    <h2 className="sign_up_web_title">MSU Engineering Engagement Hub</h2>
                    <h1 className="sign_up_title">Welcome and sign up your account</h1>
                </div>
                <div className="account_sign_up_section">
                    <label className="sign_up_netid_title">MSU Email:</label>
                    <input className="sign_up_netid_dialog_box" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <label className="sign_up_password_title">Password:</label>
                    <input className="sign_up_password_dialog_box" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    {error && <p className="sign_up_error_message">{error}</p>}
                    <button className="sign_up_button" type="submit" disabled={loading}>
                        {loading ? 'Signing up...' : 'Sign up'}
                    </button>
                    <div className="back_to_login_text_prompt" type="button" onClick={() => navigate('/login')}>
                        Back to login
                    </div>
                </div>
            </form>
        </div>
    );
}

export default SignUpPage;