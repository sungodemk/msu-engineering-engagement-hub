/* Author : Emmanuel Koshy */
import { useEffect, useMemo, useRef, useState } from 'react';   
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import '../css/dashboard.css';
import Temporal from '../graphs/temporal';
import RelationshipGraph from '../graphs/relationship';

const MAX_SELECTED = 6
// ONE COLOR PER COMPANY SO WE CAN DIFFERENCIATE BETWEEN THEM ON THE GRAPHS LATER 
const COLORS = ['#18454B', '#24509A', '#C97B2B', '#7A4E9E', '#B8423A', '#9A3F7B']

const toTime = (d) => (d ? new Date(d).getTime() : 0);
const showDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC'}) : '');
const showMoney = (n) => (n == null || n === '' ? '' :
    parseFloat(n).toLocaleString('en-US', {style: 'currency', currency:'USD', maximumFractionDigits: 0}));
const humanize = (v) =>{
    const t = (v||'').replaceAll('_', ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
};



function Dashboard() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [industry, setIndustry] = useState('');
    //company ID in the order they were checked 
    const [selected, setSelected] = useState([]);

    const [details, setDetails] = useState({});
    const requested = useRef(new Set());
    const [graphView, setGraphView] = useState('temporal');
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        apiFetch('/api/me/follows')
            .then((res) => {
                if (!res.ok) throw new Error ('Could not load followed companies.');
                return res.json();
            })
            .then((rows) => {
                setCompanies(rows);
                // set some preselected
                setSelected(rows.slice(0, 3).map((c) => c.id));
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));

    }, []);

    useEffect(() => {
        for (const id of selected) {
            if (requested.current.has(id)) continue;
            requested.current.add(id);
            setDetails((prev) => ({ ...prev, [id]: {loading:true, activities: [], graph: null} }));

            Promise.all([
                apiFetch(`/api/companies/${id}/temporal`).then((r) => (r.ok ? r.json() : [])),
                apiFetch(`/api/companies/${id}/relationship`).then((r) => (r.ok ? r.json() : null)),
            ])
                .then(([activities, graph]) => 
                    setDetails((prev) => ({ ...prev, [id]: {loading: false, activities, graph} })))
                .catch(() => 
                    setDetails((prev) => ({ ...prev, [id]: { loading: false, activities: [], graph: null} })));
        }
    }, [selected]);

    const industries = useMemo(
        () => [...new Set(companies.map((c) => c.industry).filter(Boolean))].sort(),
        [companies],
    );

    const visible = companies.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) &&
        (!industry || c.industry === industry)
    );

    function toggle(id) {
        setSelected((prev) =>{
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= MAX_SELECTED)  return prev;
            return [...prev, id];
        });
    }

    function colorFor(id){
        const i = selected.indexOf(id);
        return i === -1 ? '#d5dbd8' :  COLORS[i % COLORS.length];

    }

    const selectedCompanies = selected
        .map((id) => companies.find((c) => c.id === id))
        .filter(Boolean);
    
    // every companies activity merged into one list ordered by the newest one 
    const allActivities = selectedCompanies.flatMap((c) =>
        (details[c.id]?.activities ?? []).map((a) => ({ ...a, companyId: c.id, companyName: c.name })));
    const activityType = [...new Set(allActivities.map((a) => a.activity_type).filter(Boolean))].sort();
    const timeline = allActivities
        .filter((a) => typeFilter === 'all' || a.activity_type === typeFilter)
        .sort((a,b) => toTime(b.occurred_on) - toTime(a.occurred_on));
    
    return (
        <div className='dashboard-page'>
            <h1 className='db-title'>Dashboard</h1>

            <div className='db-layout'>
                <aside className='db-card db-companies'>
                    <div className='db-section-title'>
                        Followed Companies <span className='db-count'>{companies.length}</span>
                    </div>
                    {loading && <div className='db-empty'>Loading...</div>}
                    {error && <div className='db-error'>{error}</div>}

                    {!loading && !error && companies.length === 0 && (
                        <div className='db-empty'>
                            You're not following any companies yet. Open a company from {' '}
                            <Link to="/portfolio">Portfolio</Link> and click follow 
                        </div>
                    )}

                    {companies.length > 0 && (
                        <>
                            <input className='db-search' type='search' placeholder='Search companies'
                                value={search} onChange={(e) => setSearch(e.target.value)} />
                            <select className='db-select' value={industry} onChange={(e) => setIndustry(e.target.value)}>
                                <option value="">All industries</option>
                                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                            </select>

                            <div className='db-list-actions'>
                                <span>{selected.length} of {MAX_SELECTED} selected</span>
                                <button type='button' onClick={() => setSelected([])} disabled={!selected.length}>
                                    Clear
                                </button>
                            </div>

                            <ul className='db-company-list'>
                                {visible.map((c) => {
                                    const checked = selected.includes(c.id);
                                    const full = !checked && selected.length >= MAX_SELECTED;
                                    return (
                                        <li key={c.id}>
                                            <label className={`db-company${full ? ` db-disabled` : ''}`}
                                                   title={full ?  `Select up to ${MAX_SELECTED}` : ''}>
                                                <input type="checkbox" checked={checked} disabled={full}
                                                       onChange={() => toggle(c.id)} />
                                                <span className="db-dot" style={{ background: colorFor(c.id) }} />
                                                <span className='db-company-text'>
                                                    <span className='db-company-name'>{c.name}</span>
                                                    {c.industry && <span className='db-company-sub'>{c.industry}</span>}
                                                </span>
                                            </label>
                                        </li>
                                    );
                                })}
                                {visible.length === 0 && <li className='db-empty'>No companies match.</li>}
                            </ul>
                        </>

                    )}
                </aside>

                <div className='db-right'>
                    {/*graphs*/}
                    <section className='db-card'>
                        <div className='db-section-head'>
                            <div className='db-section-title'>Graphs</div>
                            <div className='db-toggle'>
                                <button type='button' className={graphView === 'temporal' ? 'active' : ''}
                                        onClick={() => setGraphView('temporal')}>Temporal</button>
                                <button type='button' className={graphView === 'relationship' ? 'active' : ''}
                                        onClick={() => setGraphView('relationship')}>Relationship</button>        
                            </div>
                        </div>

                        {selectedCompanies.length === 0 ? (
                            <div className='db-empty'>Check off companies on the left to see their graphs.</div>
                        ) : (
                            <div className='db-graph-grid'>
                                {selectedCompanies.map((c) => {
                                    const d = details[c.id];
                                    return (
                                        <div className='db-graph-card' key={c.id}>
                                            <div className='db-graph-head'>
                                                <span className='db-dot' style={{ background: colorFor(c.id) }} />
                                                <Link to={`/company_page/${c.id}`}>{c.name}</Link>
                                            </div>
                                            {!d || d.loading ? (
                                                <div className='db-empty'>Loading...</div>
                                            ) : graphView === 'temporal' ? (
                                                d.activities.length > 0 
                                                ? <div className='db-graph-scroll'><Temporal activities={d.activities} /> </div>
                                                : <div className='db-empty'>No temporal data available.</div>
                                            ) : (
                                                d.graph
                                                    ? <RelationshipGraph data={d.graph} />
                                                    : <div className='db-empty'>No relationship data available.</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}    
                    </section>
                    <section className='db-card'>
                        <div className='db-section-head'>
                            <div className='db-section-title'>
                                Combined Activity Timeline <span className='db-count'>{timeline.length}</span>
                            </div>
                            <select className='db-select db-select-inline' value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}>
                                <option value="all">All types</option>
                                    {activityType.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                            </select>
                        </div>
                        {timeline.length === 0 ? (
                            <div className='db-empty'>
                                {selectedCompanies.length === 0 ? 'Check companies to build a timeline.' : 'No activities found '}
                            </div>

                        ) : (
                            <div className='db-table-wrap'>
                                <table className='db-table'>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Company</th>
                                            <th>Type</th>
                                            <th>Notes</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeline.map((a) => (
                                            <tr key={`${a.companyId}-${a.id}`}>
                                                <td className='db-nowrap'>{showDate(a.occurred_on)}</td>
                                                <td>
                                                    <span className='db-cell-company'>
                                                        <span className='db-dot' style={{background: colorFor(a.companyId) }} />
                                                        {a.companyName}
                                                    </span>
                                                </td>
                                                <td>{humanize(a.activity_type)}</td>
                                                <td className='db-notes'>{a.notes}</td>
                                                <td className='db-nowrap'>{showMoney(a.amount)}</td>
                                                <td>{a.status ? humanize(a.status) : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
export default Dashboard;
 