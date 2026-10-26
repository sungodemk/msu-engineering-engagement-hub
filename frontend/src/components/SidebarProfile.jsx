// shows the linked staff person in the sidebar (Aayush)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import '../css/profile_page.css';


function SidebarProfile() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        apiFetch('/api/me/profile')
            .then((response) => response.ok ? response.json() : null)
            .then(setProfile)
            .catch(() => setProfile(null));
    }, []);

    if (!profile) return null;

    const name = profile.person_name || profile.display_name;
    const avatar = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

    return (
        <Link to="/profile" className="sidebar-profile">
            <div className="sidebar-profile-avatar">{avatar}</div>
            <div>
                <div className="sidebar-profile-name">{name}</div>
                <div className="sidebar-profile-role">{profile.role}</div>
            </div>
        </Link>
    );
}

export default SidebarProfile;