import { NavLink } from 'react-router-dom';
import '../css/footer.css';
import '../css/main.css';
import '../css/navbar.css';

/* Emmanuel Koshy */S
const navItems = [
    {to: '/', label: 'Home'},
    {to: '/company', label: 'Company'},
    {to: '/persons', label: 'Persons'},
    {to: '/portfolio', label: 'Portfolio'},
    {to: '/stewardship', label: 'Stewardship Queue'}
];

function Layout({ children }) {
    return (
        <div className="shell">
           {/* Sidebar nav */}
           <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">M</div>
                    <div>
                        <div className="brand-name">MSU</div>
                        <div className="brand-sub">Relationships</div>
                    </div>
                </div>

                <input className= "sidebar-search" placeholder="Search..." type="text" />


                <div className="section-label">Navigation</div>
                <nav className="side-nav">
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'active' : ''}>
                            
                            <span>{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="section-label">Recent Companies</div>
                <ul className="recent">
                    <li className="recent-empty">No recent companies</li>
                   
                </ul>
            </aside>

            <div className="pane">
                <main> {children} </main>
            <footer>
                <p>&copy; 2026 MSU Relationships. All rights reserved.</p>
            </footer>
        </div>

    </div>
    );  

        
}

export default Layout;