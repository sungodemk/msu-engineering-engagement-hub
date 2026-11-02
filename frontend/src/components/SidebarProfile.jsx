// shows the linked staff person in the sidebar (Aayush)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { apiFetch } from '../api';
import '../css/profile_page.css';


function SidebarProfile() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        apiFetch('/api/me/profile')
            .then((response) => response.ok ? response.json() : null)
            .then(setProfile)
            .catch(() => setProfile(null));
    }, []);

    async function logoutHandler(e) {
        e.preventDefault();
        setError('');
        try {
            await auth.signOut();
            navigate('/login');
        }
        catch (err) {
            setError("Logout failed");
        }
    }

    if (!profile) return null;

    const name = profile.person_name || profile.display_name;
    const avatar = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="sidebar-profile-container">
            <Link to="/profile" className="sidebar-profile">
                <div className="sidebar-profile-avatar">{avatar}</div>
                <div>
                    <div className="sidebar-profile-name">{name}</div>
                    <div className="sidebar-profile-role">{profile.role}</div>
                </div>
                
            </Link>
            <button className="sidebar-logout" onClick={logoutHandler}>
                Logout
            </button>
        </div>
    );
}

export default SidebarProfile;