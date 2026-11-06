import { FOLLOWS_CHANGED_EVENT } from './SidebarFollows';

// lets users follow or unfollow a company from its page (Aayush)
import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import '../css/profile_page.css';


function readJson(response) {
    return response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || 'Failed to update following');
        return data;
    });
}


function FollowButton({ companyId }) {
    const [followed, setFollowed] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function loadFollows() {
        return apiFetch('/api/me/follows')
            .then(readJson)
            .then((companies) => {
                setFollowed(companies.some((company) => company.id === companyId));
            });
    }

    useEffect(() => {
        loadFollows().catch((err) => setError(err.message));
    }, [companyId]);

    function handleClick() {
        setSaving(true);
        setError('');

        const path = followed ? `/api/me/follows/${companyId}` : '/api/me/follows';
        const options = followed
            ? { method: 'DELETE' }
            : { method: 'POST', body: JSON.stringify({ company_id: companyId }) };

        apiFetch(path, options)
            .then(readJson)
            .then(() => {
                window.dispatchEvent(new Event(FOLLOWS_CHANGED_EVENT));
                return loadFollows();
            })
            .catch((err) => setError(err.message))
            .finally(() => setSaving(false));
    }

    return (
        <div className="company-follow">
            <button
                type="button"
                className="company-follow-button"
                disabled={followed === null || saving}
                onClick={handleClick}
            >
                {saving ? 'Saving...' : followed === null ? 'Loading...' : followed ? 'Unfollow' : 'Follow'}
            </button>
            {error && <span className="company-follow-error">{error}</span>}
        </div>
    );
}

export default FollowButton;