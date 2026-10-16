import { useEffect, useMemo, useState  } from "react";
import {Link, useNavigate } from 'react-router-dom';
import '../css/persons_page.css';

const API_BASE = "http://localhost:8080";

const COLUMNS = [
    { key: 'display_name', label: 'Name' },
    { key: 'title', label: 'Title' },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'since', label: 'Since' },
];

const isEmpty = (value) => value == null|| value === '';

function PersonsList(){
    const navigate = useNavigate();
    const [people, setPeople] = useState([]);
    const [search, setSearch] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [error, setError] = useState(null);
    const [sort, setSort] = useState({ key: 'display_name', direction: 'asc' });
    const [awardType, setAwardType] = useState('');

    useEffect(() => {
        document.title = 'Persons';
        fetch(`${API_BASE}/api/persons`)
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                return res.json();
            })
            .then(setPeople)
            .catch((err) => setError(err.message));
    }, []);

    // dropdown options ome from each persons current employer
    const employers = new Map();
    for (const p of people){
        if (p.company_id) employers.set(p.company_id, { name: p.company, type: p.employer_type});

    }

    const sorted = [...employers.entries()].sort((a,b) => a[1].name.localeCompare(b[1].name));
    const companies = sorted.filter(([, e]) => e.type === 'organization');
    const awardTypes = [...new Set(people.flatMap((p)=> p.award_types ?? []))].sort();
    const units = sorted.filter(([, e]) => e.type === 'msu_unit');

    const term = search.trim().toLowerCase();
    const visible = people.filter((p) => {
        if (awardType && !p.award_types?.includes(awardType)) return false; 
        if (companyId && p.company_id !== companyId) return false;
        if (!term) return true;
        return [p.display_name, p.title, p.company, p.email].some((value) => value?.toLowerCase().includes(term));
    });

    // sort the visible people by the current sort key and direction
    const toggleSort = (key) => 
        setSort((s) =>
            s.key === key
                ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: key === 'since' ? 'desc' : 'asc' }
        );
    
    const rows = useMemo(() => {
        return [...visible].sort((a, b) => {
            const aValue = a[sort.key];
            const bValue = b[sort.key];
            if (isEmpty(aValue) && isEmpty(bValue)) return 0;
            if (isEmpty(aValue)) return 1;
            if (isEmpty(bValue)) return -1;
            const cmp = String(aValue).localeCompare(String(bValue),undefined, {sensitivity: 'base'});
            return sort.direction === 'asc' ? cmp : -cmp;
        });
    }, [visible, sort]);

    const columns = companyId ? COLUMNS.filter((c) => c.key !== 'company') : COLUMNS;


    return (
        <div className="persons-list">  
            <div className="pp-card" >
                <div className="pp-list-controls">
                    <input
                        type="search"
                        className="pp-search"
                        placeholder="Search by name, title, company, or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="pp-select"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                    >
                        <option value="">All companies</option>
                        <optgroup label="Companies">
                            {companies.map(([id, e]) => <option key={id} value ={id} >{e.name}</option>)}
                        </optgroup>
                        <optgroup label="MSU units">
                            {units.map(([id, e]) => <option key={id} value ={id} >{e.name}</option>)}
                        </optgroup>

                    </select>
                    <select
                        className="pp-select"
                        value={awardType}
                        onChange={(e) => setAwardType(e.target.value)}
                    >
                        <option value="">All award types</option>
                        {awardTypes.map((t) => <option key={t}>{t}</option>)}
                    </select>
                </div>
                {companyId && (
                    <div className="pp-list-summary">
                        {visible.length} {visible.length ===1 ? 'person':'people'} currently at {employers.get(companyId)?.name}
                    </div>    

                )}

                {error && <div className="pp-empty"> Couldn't load people: {error} </div>}
                {!error && visible.length === 0 && <div className="pp-empty">No people match that search.</div>}
                {visible.length > 0 && (
                    <div className="pp-table-wrap">
                        <table className="pp-table">
                            <thead>
                                <tr>
                                    {columns.map((c) => {
                                        const active = sort.key === c.key;
                                        return (
                                            <th key={c.key}>
                                                <button
                                                    type="button"
                                                    className={`pp-sort-btn${active ? ' active' : ''}`}
                                                    onClick={() => toggleSort(c.key)}
                                                >
                                                    {c.label}
                                                    <span className='pp-sort-arrow'>
                                                        {active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                                                    </span>
                                                </button>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) =>(
                                    <tr key={p.id} onClick={() => navigate(`/persons/${p.id}`)}>
                                        <td>
                                            <Link to={`/persons/${p.id}`} className="pp-person-name">
                                                {p.display_name}
                                            </Link>
                                        </td>
                                        <td>{p.title ?? ''}</td>
                                        {!companyId && <td>{p.company ?? 'No current employer'}</td>}
                                        <td>{p.email ?? ''}</td>
                                        <td>{p.since ? p.since.slice(0, 4) : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                            </div>
                )}
            </div>
        </div>
    );

}

export default PersonsList;
