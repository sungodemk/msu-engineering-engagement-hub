import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../css/home.css';
import { apiFetch } from '../api';

function Home() {
  useEffect(() => {

  document.title = 'MSU Engineering Hub';
  }, []);

  const [userType, setUserType] = useState(null);

  useEffect(() => {
    apiFetch('/api/me')
      .then(response => response.json())
      .then(data => {
        setUserType(data.role);
      });
  }, []);

const cards = [
    {
      icon: '👤',
      title: 'Person',
      body: 'Connect with professionals and maintain your network.',
      to: '/persons',
      link: 'View People'
    },
    {
      icon: '📁',
      title: 'Portfolio',
      body: 'Showcase your projects and achievements.',
      to: '/portfolio',
      link: 'View Portfolios'
    },
    {
      icon: '📊',
      title: 'Stewardship Queue',
      body: 'Gain insights from your engineering data and performance metrics.',
      to: '/stewardship',
      link: 'View Stewardship'
    },
    // Added Temporal Graph card (Alvin)
    {
      icon: '📅',
      title: 'Temporal Graph',
      body: 'View the timeline of a company.',
      to: '/temporal',
      link: 'View Temporal Graph'
    },
    {
        icon: '🔗',
        title: 'Relationship Graph',
        body: 'Visualize the relationships between companies, MSU units, and contacts.',
        to: '/relationship',
        link: 'View Relationship Graph'
    },
    // Added Admin's Account Approval card (Zhixiang Miao)
    ...(userType === 'admin' ? [{
      icon: '🛠️',
      title: 'Admin Account Approval',
      body: 'Manage and approve registered user accounts.',
      to: '/admin_account_approval',
      link: 'View Admin Approval'
    }] : [])
  ];

  return (
    <div className="home">
      <span className="badge">Michigan State University</span>
      <h1>Welcome to the MSU Engineering Engagement Hub</h1>
      <p className="lede">
        A platform to unify engineering resources and opportunities.
      <br/>
      Track your relationships with companies, persons, and portfolios in one place.
      </p>
     
      <div className="card-grid">
        {cards.map((card) => (
          <div className="card" key={card.title}>
            <div className="card-head">
            <span className="card-icon">{card.icon}</span>
          </div>
          <h2>{card.title}</h2>
          <p>{card.body}</p>
          <Link to={card.to}>{card.link}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;