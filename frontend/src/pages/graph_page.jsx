import { useEffect, useState } from 'react';
import Temporal from '../graphs/temporal';
import '../css/graph_page.css';


function TemporalPage() {

  const [companies, setCompanies] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [company, setCompany] = useState(null);
  const [activities, setActivities] = useState([]);

  // fetch the dropdown list
  useEffect(() => {
    fetch('http://localhost:8080/api/companies')
      .then(res => res.json())
      .then(setCompanies);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setCompany(null);
      setActivities([]);
      return;
    }

    fetch(`http://localhost:8080/api/companies/${selectedId}`)
        .then(res => res.json())
        .then(setCompany);

    fetch(`http://localhost:8080/api/companies/${selectedId}/temporal`)
        .then(res => res.json())
        .then(setActivities);
  }, [selectedId]);

  function handleChange(e) {
    setSelectedId(e.target.value);
  }

  return (
    <div className="graph-page">
      <div className="graph-header">
        <div>
          <p className="graph-type">Temporal Relationship Graph</p>
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
      {selectedId ? (
          <Temporal activities={activities} />
      ) : (
          <p className={"graph-empty"}>Select a company to view its temporal relationship graph.</p>
      )}
    </div>
  );
}

export default TemporalPage;