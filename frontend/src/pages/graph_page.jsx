import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Temporal from '../graphs/temporal';
import '../css/graph_page.css';


function TemporalPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(null);
  const [activities, setActivities] = useState([]);

  // fetch the dropdown list once
  useEffect(() => {
    fetch('http://localhost:8080/api/companies')
      .then(res => res.json())
      .then(setCompanies);
  }, []);

  // fetch this specific company's info and graph whenever id changes
  useEffect(() => {
    if (!id) return;

    fetch(`http://localhost:8080/api/companies/${id}`)
      .then(res => res.json())
      .then(setCompany);

    fetch(`http://localhost:8080/api/companies/${id}/temporal`)
      .then(res => res.json())
      .then(setActivities);
  }, [id]);

  function handleChange(e) {
    navigate(`/company/${e.target.value}`);
  }

  if (!company) return <p>Loading...</p>;

  return (
    <div className="graph-page">
      <div className="graph-header">
        <div>
          <p className="graph-eyebrow">Temporal Relationship Graph</p>
          <h1>{company.display_name}</h1>
        </div>

        <select className="company-select" value={id} onChange={handleChange}>
          {companies.map(c => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
      </div>

      <Temporal activities={activities} />
    </div>
  );
}

export default TemporalPage;