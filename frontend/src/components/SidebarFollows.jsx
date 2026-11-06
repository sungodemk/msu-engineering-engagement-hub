import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import '../css/profile_page.css';

export const FOLLOWS_CHANGED_EVENT = 'follows-changed';

function readJson(response) {
    return response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    });
}

// keeps the sidebar's followed companies updated across pages (Aayush)
function SidebarFollows() {
    const [companies, setCompanies] = useState([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        function loadFollows() {
            apiFetch('/api/me/follows')
                .then(readJson)
                .then((data) => {
                    setCompanies(data);
                    setError(false);
                })
                .catch(() => setError(true));
        }

        loadFollows();
        window.addEventListener(FOLLOWS_CHANGED_EVENT, loadFollows);

        return () => {
            window.removeEventListener(FOLLOWS_CHANGED_EVENT, loadFollows);
        };
    }, []);

    if (error) return null;

    return (
        <div className="sidebar-follows">
            <div className="section-label">Following</div>

            {companies.length === 0 ? (
                <div className="sidebar-follows-empty">
                    No followed companies yet.
                </div>
            ) : (
                <ul className="sidebar-follows-list">
                    {companies.map((company) => (
                        <li key={company.id}>
                            <Link to={`/company_page/${company.id}`}>
                                {company.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SidebarFollows;