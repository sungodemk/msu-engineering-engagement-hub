import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import '../css/change_password_page.css'
import '../css/login_page.css'

function ChangePasswordPage() {
    const [passwordReqs] = useState(["Your password should be in between 6-20 characters",
                        "It should contain uppercase character",
                        "and lower case character",
                        "It should contain numerical character",
                        "and special case character (!@#$%^, etc.)"])
    const [curPassword, setCurPassword] = useState('');
    const [showCurPW, setShowCurPW] = useState('');
    const [changePassword, setChangePassword] = useState('');
    const [showChangePW, setShowChangePW] = useState('');
    const [changePWRetype, setChangePWRetype] = useState('');
    const [showChangePWRetype, setShowChangePWRetype] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    async function changePWHandler(e) {
        e.preventDefault();
        setError('');
        if (!auth.currentUser) {
            setError("User is not available");
            setLoading(false);
            return;
        }
        const email = auth.currentUser.email;
        if (!email) {
            setError("Email is not available");
            setLoading(false);
            return;
        }
        if (!curPassword) {
            setError('Passworld field cannot be empty');
            setLoading(false);
            return;
        }
        if (!changePassword) {
            setError('Change password field cannot be empty');
            setLoading(false);
            return;
        }
        if(!changePWRetype) {
            setError('Re-type password field cannot be empty');
            setLoading(false);
            return;
        }

        if (curPassword === changePassword) {
            setError('Changed password cannot be the same as the previous password');
            setLoading(false)
            return;
        }

        if (changePWRetype !== changePassword) {
            setError('Password re-typed does not match');
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const checkChangedPassword = await validatePassword(auth, changePassword);
            if (!checkChangedPassword.isValid) {
                if (!checkChangedPassword.meetsMinPasswordLength) {
                    throw new Error('Password does not meet the minimum required length');
                }
                else if (!checkChangedPassword.meetsMaxPasswordLength) {
                    throw new Error('Password exceeds the length');
                }
                else if (!checkChangedPassword.containsLowercaseLetter) {
                    throw new Error('Password does not contain the lowercase letter');
                }
                else if (!checkChangedPassword.containsUppercaseLetter) {
                    throw new Error('Password does not contain the uppercase letter');
                }
                else if (!checkChangedPassword.containsNumericCharacter) {
                    throw new Error('Password does not contain the numeric character');
                }
                else if (!checkChangedPassword.containsNonAlphanumericCharacter) {
                    throw new Error("Password does not contain the non-alpha-numeric character such as '@'");
                }
                throw new Error('Password set up failed');
            }
            const authCredential = EmailAuthProvider.credential(email, curPassword);
            await reauthenticateWithCredential(auth.currentUser, authCredential);

            await updatePassword(auth.currentUser, changePassword);

            navigate('/profile')


        } catch(err) {
            if (err.code === 'auth/weak-password') {
                setError('Password is too weak');
            } 
            setError(err.message)

        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="change_password_page">
            <form className="change_password_form" onSubmit={changePWHandler}>
                <div className="change_password_titles">
                    <h2 className="change_password_web_title">MSU Engineering Engagement Hub</h2>
                    <h1 className="change_password_header_title">Change your password</h1>
                </div>
                <div className="change_password_section">
                    {passwordReqs.map(req => (
                        <div className="change_password_requirement">
                            {req}
                        </div>
                    ))}
                    <label className="cur_password_title">Current Password:</label>
                    {showCurPW ? (
                        <input className="cur_password_dialog_box" type="text" value={curPassword} onChange={(e) => setCurPassword(e.target.value)} />
                    ): <input className="cur_password_dialog_box" type="password" value={curPassword} onChange={(e) => setCurPassword(e.target.value)} />}
                    <label className="show_pw_checkbox">
                        Show Current Password <input type="checkbox" name="showPWCheckbox" checked={showCurPW} onChange={(e) => setShowCurPW(e.target.checked)} />
                    </label>

                    <label className="change_password_title">Change Password:</label>
                    {showChangePW ? (
                        <input className="change_password_dialog_box" type="text" value={changePassword} onChange={(e) => setChangePassword(e.target.value)} />
                    ): <input className="change_password_dialog_box" type="password" value={changePassword} onChange={(e) => setChangePassword(e.target.value)} />}
                    <label className="show_pw_checkbox">
                        Show Changed Password <input type="checkbox" name="showPWCheckbox" checked={showChangePW} onChange={(e) => setShowChangePW(e.target.checked)} />
                    </label>

                    <label className="change_password_retype_title">Confirm New Password:</label>
                    {showChangePWRetype ? (
                        <input className="change_password_retype_dialog_box" type="text" value={changePWRetype} onChange={(e) => setChangePWRetype(e.target.value)} />
                    ) : <input className="change_password_retype_dialog_box" type="password" value={changePWRetype} onChange={(e) => setChangePWRetype(e.target.value)} />}
                    <label className="show_pw_checkbox">
                        Show Changed Password <input type="checkbox" name="showPWCheckbox" checked={showChangePWRetype} onChange={(e) => setShowChangePWRetype(e.target.checked)} />
                    </label>

                    {error && <p className="change_password_error_message">{error}</p>}
                    <button className="change_password_button" type="submit" disabled={loading}>
                        {loading ? 'Changing password...' : 'Change password'}
                    </button>
                    <div className="back_to_profile_text_prompt_cpw" type="button" onClick={() => navigate('/profile')}>
                        Back to profile
                    </div>
                </div>
            </form>
        </div>
    )
}

export default ChangePasswordPage;