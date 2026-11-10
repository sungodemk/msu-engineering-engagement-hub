// shows the linked staff person in the sidebar (Aayush)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { apiFetch } from '../api';
import '../css/profile_page.css';


function SidebarProfile() {
    const [profile, setProfile] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        apiFetch('/api/me/profile')
            .then((response) => response.ok ? response.json() : null)
            .then(setProfile)
            .catch(() => setProfile(null));
    }, []);

    {/* Added menuSwitch so the user can open/close the profile menu (Zhixiang Miao) */}
    function menuSwitch() {
        if (menuOpen === false) {
            setMenuOpen(true);
        }
        else {
            setMenuOpen(false);
        }
    }

    {/* Added the logoutHandler so the user can logout (Zhixiang Miao) */}
    async function logoutHandler(e) {
        e.preventDefault();
        try {
            await auth.signOut();
            navigate('/login');
        }
        catch (err) {
            console.error(err);
        }
    }

    
    if (!profile) return null;

    const name = profile.person_name || profile.display_name;
    const avatar = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        
        <div className="sidebar-profile-container">
            <button type="button" className="sidebar-profile" onClick={menuSwitch}>
                <div className="sidebar-profile-avatar">{avatar}</div>
                <div>
                    <div className="sidebar-profile-name">{name}</div>
                    <div className="sidebar-profile-role">{profile.role}</div>
                </div>
            </button>

            {/* Added a dropdown bar like selection menu, 
            so the user can select between go to the profile page or logout (Zhixiang Miao) */}
            {menuOpen === true && (
                <div className="profile-menu">
                    <Link className="profile-button" to="/profile" onClick={menuSwitch}>My Profile</Link>
                    <button className="logout-button" onClick={logoutHandler}>Logout</button>
                </div>
            )}
        </div>
    );
}

export default SidebarProfile;