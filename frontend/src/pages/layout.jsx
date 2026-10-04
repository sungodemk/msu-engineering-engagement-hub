import { NavLink } from 'react-router-dom';
import '../css/footer.css';
import '../css/main.css';
import '../css/navbar.css';
import SidebarSearch from '../components/SidebarSearch';

/* Emmanuel Koshy */
const navItems = [
    {to: '/', label: 'Home'},
    {to: '/persons', label: 'Persons', icon:"👤"},
    {to: '/portfolio', label: 'Portfolio', icon:"📂"},
    {to: '/stewardship', label: 'Stewardship Queue',icon:"📝"},
    {to: '/temporal', label: 'Temporal Graph',icon:"📈"},
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

               <SidebarSearch />


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