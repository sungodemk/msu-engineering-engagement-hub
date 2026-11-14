import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/portfolio.css';
import { API_BASE } from '../api';

const NUMERIC_KEYS = ['total_giving', 'active_research', 'recruiting_volume'];
const DORMANT_DAYS = 365;

function isDormant(lastActivityDate) {
    if (!lastActivityDate) return true; // no activity = dormant
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DORMANT_DAYS);
    return new Date(lastActivityDate) < cutoff;
}

function getSortValue(company, key) {
    const raw = company[key];
    if (raw === null || raw === undefined || raw === '') return null;
    if (NUMERIC_KEYS.includes(key)) return Number(raw);
    if (key === "last_activity_date") return new Date(raw).getTime();
    return String(raw).toLowerCase();
}

function Portfolio() {
    const [companies, setCompanies] = useState([]);
    const [sortKey, setSortKey] = useState('last_activity_date');
    const [sortDir, setSortDir] = useState('desc');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('all');
    const [search, setSearch] = useState('');


    useEffect(() => {
        fetch(`${API_BASE}/api/portfolio`)
        .then(res => res.json())
        .then(setCompanies);
    }, []);

    const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))];
    const owners = [...new Set(companies.map(c => c.owner).filter(Boolean))];

    function handleSort(key) {
        if (sortKey === key) {
         setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        }
        else {
        setSortKey(key);
        setSortDir('asc');
        }
    }

    const [dormantOnly, setDormantOnly] = useState(false);
    const term = search.trim().toLowerCase();
    const filtered = companies.filter(c => {
        if (sectorFilter !== 'all' && c.sector !== sectorFilter) return false;
        if (ownerFilter !== 'all' && c.owner !== ownerFilter) return false;
        if (dormantOnly && !isDormant(c.last_activity_date)) return false;
        if (!term) return true;
        return [c.name, c.sector, c.owner].some(value => value?.toLowerCase().includes(term));
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

        <div className="portfolio-controls">
        <input
          type="search"
          className="portfolio-search"
          placeholder="Search by company, sector, or owner"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
          <option value="all">All Industries</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="all">All Owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <label className={"dormant-toggle"}>
            <input
                type={"checkbox"}
                checked={dormantOnly}
                onChange={e => setDormantOnly(e.target.checked)}
            />Show Dormant Only
        </label>
      </div>

      <div className="dormant-banner">
          <strong>Dormant</strong> — no recorded activity in the last {DORMANT_DAYS} days.
          Represented by highlighted rows below.
      </div>

      <div className="portfolio-card">
        <div className="portfolio-row portfolio-row-header">
          <span onClick={() => handleSort('name')}>Company{arrow('name')}</span>
          <span onClick={() => handleSort('sector')}>Sector{arrow('sector')}</span>
          <span onClick={() => handleSort('owner')}>Owner{arrow('owner')}</span>
          <span onClick={() => handleSort('last_activity_date')}>Last Activity{arrow('last_activity_date')}</span>
          <span onClick={() => handleSort('total_giving')}>Total Giving{arrow('total_giving')}</span>
          <span onClick={() => handleSort('active_research')}>Research (Active){arrow('active_research')}</span>
          <span onClick={() => handleSort('recruiting_volume')}>Recruiting{arrow('recruiting_volume')}</span>
        </div>

        {sorted.map(c => (
          <div key={c.id}
               className={`portfolio-row ${isDormant(c.last_activity_date) ? 'portfolio-row-dormant' : ''}`}>
            <span><Link className="portfolio-link" to={`/company_page/${c.id}`}>{c.name}</Link></span>
            <span>{c.sector || '—'}</span>
            <span>{c.owner_id ? (
                <Link className="portfolio-link" to={`/persons/${c.owner_id}`}>{c.owner}</Link>
              ) : (c.owner || '—')}
            </span>
            <span>{c.last_activity_date ? new Date(c.last_activity_date).toLocaleDateString() : '—'}</span>
            <span>{c.total_giving ? `$${Number(c.total_giving).toLocaleString()}` : '—'}</span>
            <span>{c.active_research || '—'}</span>
            <span>{c.recruiting_volume || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Portfolio;