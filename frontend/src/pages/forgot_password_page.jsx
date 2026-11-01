import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import '../css/forgot_password_page.css'

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sendEmailStatus, setSendEmailStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function forgotPWEventHandler(e) {
        e.preventDefault();
        setSendEmailStatus(null);
        setError(null);
        
        if (!email.trim()) {
            setError("Email cannot be empty");
            setLoading(false);
            return;
        }
        const formattedEmail = email.trim();

        setLoading(true);
        try{
            const response = await apiFetch("/api/reset_password", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({email: formattedEmail})
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error);
                console.error(data.error);
                setLoading(false);
                return;
            }
            setSendEmailStatus(data.message);
        } catch(err) {
            setError(err.message);
            console.error(err);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(()=>setSendEmailStatus(null), 5000);
        return () => {
            clearTimeout(timer);
        }
    }, [sendEmailStatus]);

    return (
        <div className="forgot_password_page">
            <form className="forgot_password_form" onSubmit={forgotPWEventHandler}>
                {sendEmailStatus !== null && (
                    <div className="forgot_password_email_status_message">
                        {sendEmailStatus}
                    </div>
                )}
                <div className="forgot_password_titles">
                    <h2 className="web_title">MSU Engineering Engagement Hub</h2>
                    <h1 className="forgot_password_title">Welcome</h1>
                </div>
                <div className="email_reset_password_section">
                    <label className="netid_title">MSU Email:</label>
                    <input className="netid_dialog_box" type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                    {error && <p className="email_request_error">{error}</p>}
                    <button className="send_email_button" type="submit" disabled={loading}>
                        {loading ? 'Sending email...' : 'Send Email'}
                    </button>
                    <div className="back_to_login_text_prompt" type="button" onClick={() => navigate('/login')}>
                        Back to Login
                    </div>
                </div>
            </form>
        </div>
    );
}

export default ForgotPasswordPage;