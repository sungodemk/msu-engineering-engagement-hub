import { FOLLOWS_CHANGED_EVENT } from '../components/SidebarFollows';

// shows the signed-in user's profile and followed companies (Aayush)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import '../css/persons_page.css';
import '../css/profile_page.css';


function readJson(response) {
    return response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    });
}


function initials(name) {
    return (name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}


function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [personData, setPersonData] = useState(null);
    const [follows, setFollows] = useState([]);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    function loadFollows() {
        return apiFetch('/api/me/follows')
            .then(readJson)
            .then(setFollows);
    }

    useEffect(() => {
        document.title = 'My Profile';

        apiFetch('/api/me/profile')
            .then(readJson)
            .then((account) => {
                setProfile(account);
                if (account.person_id) {
                    return apiFetch(`/api/persons/${account.person_id}`)
                        .then(readJson)
                        .then(setPersonData);
                }
            })
            .catch((err) => setError(err.message));

        loadFollows().catch((err) => setError(err.message));
    }, []);

    function searchCompanies(value) {
        setSearch(value);
        setError('');
        if (value.trim().length < 2) {
            setResults([]);
            return;
        }

        setResults(null);
        apiFetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
            .then(readJson)
            .then((data) => setResults(data.filter((item) => item.type === 'organization')))
            .catch((err) => {
                setResults([]);
                setError(err.message);
            });
    }

    function changeFollow(companyId, method) {
        setError('');

        const path = method === 'POST' ? '/api/me/follows' : `/api/me/follows/${companyId}`;
        const options = method === 'POST'
            ? { method: 'POST', body: JSON.stringify({ company_id: companyId }) }
            : { method: 'DELETE' };

        apiFetch(path, options)
            .then(readJson)
            .then(() => {
                window.dispatchEvent(new Event(FOLLOWS_CHANGED_EVENT));
                return loadFollows();
            })
            .catch((err) => setError(err.message));
    }

    const followedIds = new Set(follows.map((company) => company.id));
    const person = personData?.person;
    const current = personData?.current_affiliation;
    const attrs = person?.attributes ?? {};
    const name = person?.display_name || profile?.display_name || 'My Profile';
    const title = current?.title ?? attrs.title;
    const location = [attrs.city, attrs.state].filter(Boolean).join(', ');

    return (
        <div className="persons-page profile-page">
            <div className="pp-main">
                <h1>My Profile</h1>

                {!profile && !error && <div className="pp-card">Loading...</div>}

                {profile && (
                    <div className="pp-card pp-header">
                        <div className="pp-avatar">{initials(name)}</div>
                        <div className="pp-header-text">
                            <div className="pp-name">{name}</div>
                            {title && <div className="pp-title">{title}</div>}
                            {current?.company && <div className="pp-company">{current.company}</div>}
                            {location && <div className="pp-label">{location}</div>}
                        </div>
                        <div className="pp-owner">
                            <div className="pp-label">Account Email</div>
                            <div>{profile.email}</div>
                            <div className="pp-label">Role</div>
                            <div className="profile-role">{profile.role}</div>
                            {/* Be able to change the password inside the profile page (Zhixiang Miao) */}
                            <span className="profile-change-pw-label" type="button" onClick={() => navigate('/change_password')}>
                                Change Password
                            </span>

                            {profile.person_id && (
                                <Link to={`/persons/${profile.person_id}`} className="pp-person-name">
                                    View full record
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                <div className="pp-card">
                    <div className="pp-section-title">Following</div>
                    {error && <div className="pp-note-error">{error}</div>}

                    {follows.length === 0 ? (
                        <div className="pp-empty">Not following any companies yet.</div>
                    ) : (
                        follows.map((company) => (
                            <div className="pp-row" key={company.id}>
                                <div>
                                    <Link className="pp-person-name" to={`/company_page/${company.id}`}>
                                        {company.name}
                                    </Link>
                                    {company.industry && <div className="pp-label">{company.industry}</div>}
                                </div>
                                <button type="button" className="pp-note-delete" onClick={() => changeFollow(company.id, 'DELETE')}>
                                    Unfollow
                                </button>
                            </div>
                        ))
                    )}

                    <div className="profile-search">
                        <div className="pp-section-title">Find companies to follow</div>
                        <input
                            className="pp-search"
                            type="search"
                            placeholder="Search companies"
                            value={search}
                            onChange={(e) => searchCompanies(e.target.value)}
                        />

                        {results === null && <div className="pp-empty">Searching...</div>}
                        {search.trim().length >= 2 && results?.length === 0 && !error && (
                            <div className="pp-empty">No companies found.</div>
                        )}
                        {results?.map((company) => (
                            <div className="pp-row" key={company.id}>
                                <Link className="pp-person-name" to={`/company_page/${company.id}`}>
                                    {company.name}
                                </Link>
                                <button
                                    type="button"
                                    className="pp-note-save"
                                    disabled={followedIds.has(company.id)}
                                    onClick={() => changeFollow(company.id, 'POST')}
                                >
                                    {followedIds.has(company.id) ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;