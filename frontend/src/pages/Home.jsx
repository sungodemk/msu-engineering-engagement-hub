import { Link } from 'react-router-dom';
import '../css/home.css';

function Home() {

  document.title = 'MSU Engineering Hub';

  return (
      <div className="home-body">
        <div className="home-nav">
          <Link to="/company">Company Page</Link>
          <Link to="/persons">Person Page</Link>
          <Link to="/stewardship">Stewardship Page</Link>
        </div>
        <h1>MSU Engineering Engagement Hub</h1>
        <p>Welcome to the MSU Engineering Engagement Hub!</p>
      </div>
  );
}

export default Home;