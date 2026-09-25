import { useEffect, useState  } from "react";
import {Link, useNavigate } from 'react-router-dom';
import '../css/persons_page.css';

const API_BASE = "http://localhost:8080";

function PersonsList(){
    const navigate = useNavigate();
    const [people, setPeople] = useState([]);
    const [search, setSearch] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [error, setError] = useState(null);

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
    const units = sorted.filter(([, e]) => e.type === 'msu_unit');

    const term = search.trim().toLowerCase();
    const visible = people.filter((p) => {
        if (companyId && p.company_id !== companyId) return false;
        if (!term) return true;
        return [p.display_name, p.title, p.company, p.email].some((value) => value?.toLowerCase().includes(term));
    });

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
                                    <th>Name</th>
                                    <th>Title</th>
                                    {!companyId && <th>Company</th>}
                                    <th>Email</th>
                                    <th>Since</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((p) =>(
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
