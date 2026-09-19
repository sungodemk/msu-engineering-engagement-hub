import { Link } from 'react-router-dom';
import '../css/footer.css';
import '../css/main.css';
import '../css/navbar.css';

function Layout({ children }) {
    return (
        <>
        {/* The navigation bar */}
        <nav>
            <div className="nav_left">
                <span className="title">MSU Engagement Hub</span>
            </div>
            {/* Navigation Links */}
            <div className="nav_right" id="nav_links">
                <Link to="/">Home</Link>
                <Link to="/company">Company</Link>
                <Link to="/persons">Persons</Link>
                <Link to="/portfolio">Portfolio</Link>
            </div>
        </nav>
        {/* main content */}
        <main>{children}</main>

        {/* footer */}
        <footer>
            <p>&copy; 2026 MSU Engineering</p>
        </footer>
        </>
    );
}

export default Layout;