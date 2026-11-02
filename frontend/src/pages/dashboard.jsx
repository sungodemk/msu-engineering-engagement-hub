/* Author : Emmanuel Koshy */
import '../css/dashboard.css';

function Dashboard() {
    return (
        <div className="dashboard-pages">
            <h1 className="db-title">Dashboard</h1>
            <div className="db-layout">
                <aside className="db-card db-companies">
                    <div className="db-section-title">Followed Companies</div>
                    <div className="db-empty">You are not following any companies.</div>
                </aside>
                <section className="db-card db-charts">
                    <div className="db-section-title">Charts</div>
                    <div className="db-empty">Select a company to compare them.</div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
 