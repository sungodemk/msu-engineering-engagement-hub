import { useEffect } from 'react';
import Layout from './layout.jsx';
import '../css/home.css';

function Home() {
  useEffect(() => {
    document.title = 'MSU Engineering Hub';
  }, []);

  return (
    <Layout>
      <div className="home-body">
        <div className="home-nav">
          <a href="/company">Company Page</a>
          <a href="/persons">Person Page</a>
          <a href="/stewardship">Stewardship Page</a>
        </div>
        <h1>MSU Engineering Engagement Hub</h1>
        <p>Welcome to the MSU Engineering Engagement Hub!</p>
      </div>
    </Layout>
  );
}

export default Home;