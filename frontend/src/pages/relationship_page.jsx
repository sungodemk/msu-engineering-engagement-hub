import { useEffect, useState } from 'react';
import RelationshipGraph from '../graphs/relationship.jsx';
import '../css/graph_page.css';
import { API_BASE } from '../api.js';

function RelationshipPage() {
    const [companies, setCompanies] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [company, setCompany] = useState(null);
    const [loaded, setLoaded] = useState({ id: '', data: null });

    useEffect(() => {
        fetch('${API_BASE}/api/companies')
            .then(r => r.json())
            .then(setCompanies);
    }, []);

    useEffect(() => {
        if (!selectedId) return;

        fetch(`${API_BASE}/api/companies/${selectedId}`)
            .then(res => res.json())
            .then(setCompany);

        fetch(`${API_BASE}/api/companies/${selectedId}/relationship`)
            .then(r => (r.ok ? r.json() : null))
            .then(data => setLoaded({ id: selectedId, data }))
            .catch(() => setLoaded({ id: selectedId, data: null }));
    }, [selectedId]);

    function handleChange(e) {
        setSelectedId(e.target.value);
    }

    const isLoaded = loaded.id === selectedId;
    const graph = isLoaded ? loaded.data : null;

    return (
        <div>
            <div className="graph-header">
                <div>
                    <p className="graph-type">Relationship Graph</p>
                    <h1>{company ? company.display_name : 'Select a company'}</h1>
                </div>

                <select className="company-select" value={selectedId} onChange={handleChange}>
                    <option value="" disabled>
                        Choose a company…
                    </option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.display_name}
                        </option>
                    ))}
                </select>
            </div>
            {!selectedId && <p>Select a company to view its network.</p>}
            {selectedId && !isLoaded && <p>Loading…</p>}
            {isLoaded && !graph && <p>No network data for this company.</p>}
            {graph && <RelationshipGraph data={graph} />}
        </div>

    );
}

export default RelationshipPage;