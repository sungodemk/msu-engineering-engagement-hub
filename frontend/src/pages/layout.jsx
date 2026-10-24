import '../css/footer.css';
import '../css/main.css';
import '../css/navbar.css';
import { useEffect, useState } from 'react';
import SidebarSearch from '../components/SidebarSearch';
import { NavLink, Outlet } from 'react-router-dom';
import { apiFetch } from '../api';

/* Emmanuel Koshy */
const navItems = [
    {to: '/', label: 'Home'},
    {to: '/persons', label: 'Persons', icon:"👤"},
    {to: '/portfolio', label: 'Portfolio', icon:"📂"},
    {to: '/stewardship', label: 'Stewardship Queue',icon:"📝"},
    {to: '/temporal', label: 'Temporal Graph',icon:"📈"},
    {to: '/relationship', label: 'Relationship Graph',icon:"🔗"},
    // Added Admin's Account Approval page (Zhixiang Miao)
    {to: '/admin_account_approval', label: 'Admin Account Approval', icon:"🛠️"},
    // Added logout button (Zhixiang Miao)
    {to: '/login', label: 'Logout'}
];

function Layout() {

    const [userType, setUserType] = useState(null);

    // Fetch the user's role (Zhixiang Miao)
    useEffect(() => {
        apiFetch('/api/me')
          .then(response => response.json())
          .then(data => {
            setUserType(data.role);
          });
      }, []);

    return (
        <div className="shell">
           {/* Sidebar nav */}
           <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">M</div>
                    <div>
                        <div className="brand-name">MSU</div>
                        <div className="brand-sub">Engagement Hub</div>
                    </div>
                </div>

               <SidebarSearch />


                <div className="section-label">Navigation</div>
                <nav className="side-nav">
                    {/* Filter the navigation items based on user's type, so account approval page can be only visible to admins (Zhixiang Miao) */}
                    {(userType === 'admin' ? navItems : navItems.filter(item => item.to !== '/admin_account_approval')).map((item) => (
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
                <main> <Outlet /></main>
            <footer>
                <p>&copy; 2026 MSU Engagement Hub. All rights reserved.</p>
            </footer>
        </div>

    </div>
    );  

        
}

export default Layout;