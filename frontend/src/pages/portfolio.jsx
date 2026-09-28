import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/Portfolio.css';

const NUMERIC_KEYS = ['total_giving', 'active_research', 'recruiting_volume'];

function Portfolio() {
    const [companies, setCompanies] = useState([]);
    const [sortKey, setSortKey] = useState('last_activity_date');
    const [sortDir, setSortDir] = useState('desc');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('all');

    useEffect(() => {
        fetch('http://localhost:8080/api/portfolio')
        .then(res => res.json())
        .then(setCompanies);
    }, []);

    const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))];
    const owners = [...new Set(companies.map(c => c.owner).filter(Boolean))];

    function handleSort(key) {
        if (sortKey === key) {
         setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
        setSortKey(key);
        setSortDir('asc');
        }
    }

    function getSortValue(company, key) {
    const raw = company[key];
    if (raw === null || raw === undefined || raw === '') return null;
    if (NUMERIC_KEYS.includes(key)) return Number(raw);
    if (key === "last_activity_date") return new Date(raw).getTime();
    return String(raw).toLowerCase();
    }

    const filtered = companies.filter(c => {
        if (sectorFilter !== 'all' && c.sector !== sectorFilter) return false;
        return !(ownerFilter !== 'all' && c.owner !== ownerFilter);
     });

    const sorted = [...filtered].sort((a, b) => {
        const valA = getSortValue(a, sortKey);
        const valB = getSortValue(b, sortKey);

        // nulls always sort last
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    // helper function to display sort arrow in table header
    function arrow(key) {
        if (sortKey !== key) return '';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    }

    return (
    <div className="portfolio-page">
        <div className="portfolio-header">
            <h1>Corporate Portfolio</h1>
            <p>{filtered.length} of {companies.length} companies shown</p>
        </div>

        <div className="portfolio-filters">
            <label>Sector:
            <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
                <option value="all">All Industries</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            </label>

            <label>Owner:
                <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
                    <option value="all">All Owners</option>
                    {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </label>
        </div>

        <table className="portfolio-table">
            <thead>
            <tr>
            <th onClick={() => handleSort('name')}>Company{arrow('name')}</th>
            <th onClick={() => handleSort('sector')}>Sector{arrow('sector')}</th>
            <th onClick={() => handleSort('owner')}>Owner{arrow('owner')}</th>
            <th onClick={() => handleSort('last_activity_date')}>Last Activity{arrow('last_activity_date')}</th>
            <th onClick={() => handleSort('total_giving')}>Total Giving{arrow('total_giving')}</th>
            <th onClick={() => handleSort('active_research')}>Research (Active){arrow('active_research')}</th>
            <th onClick={() => handleSort('recruiting_volume')}>Recruiting{arrow('recruiting_volume')}</th>
            </tr>
            </thead>
            <tbody>
                {sorted.map(c => (
                <tr key={c.id}>
                <td><Link className="portfolio-link" to="/company_page">{c.name}</Link></td>
                <td>{c.sector || '—'}</td>
                <td>{c.owner_id ? (<Link className="portfolio-link" to={`/persons/${c.owner_id}`}>{c.owner}</Link>)
                    : (c.owner || '—')}
                </td>
                <td>{c.last_activity_date ? new Date(c.last_activity_date).toLocaleDateString() : '—'}</td>
                <td>{c.total_giving ? `$${Number(c.total_giving).toLocaleString()}` : '—'}</td>
                <td>{c.active_research || '—'}</td>
                <td>{c.recruiting_volume || '—'}</td>
                </tr> ))}
            </tbody>
        </table>
    </div>
  );
}

export default Portfolio;