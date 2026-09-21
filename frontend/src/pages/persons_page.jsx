import { useEffect } from "react";  
import '../css/persons_page.css';

function PersonsPage() {
    useEffect(() => {
        document.title = 'Persons Page';
    }, []);

    return (
        <div className="persons-page">
            <div className="pp-main">
                <div className="pp-card pp-header">
                    <div className="pp-avatar">PN</div>
                    <div className="pp-header-text">
                        <div className="pp-name">Person Name</div>
                        <div className="pp-title">Title</div>
                        <div className="pp-company">Company</div>
                    </div>
                    <div className="pp-owners">
                        <div className="pp-label">MSU Owner</div>
                        <div>Owner Name</div>
                    </div>
                </div>

            <div className="pp-card pp-alumni">
                <div className="pp-section-title">Alumni Record</div>
                <div className="pp-alumni-row">
                    <div><div className="pp-label">Degree</div><div>Degree</div></div>
                    <div><div className="pp-label">Graduation Year</div><div>Year</div></div>
                    <div><div className="pp-label">Alumni ID</div><div>ID</div></div>
                </div>
            </div>

            <div className="pp-card">
                <div className="pp-section-title">Engagement Summary</div>
                <div className="pp-empty">No engagement recorded yet.</div>
            </div>
            <div className="pp-card">
                <div className="pp-section-title">Affiliation History</div>
                <div className="pp-empty">No employment history on record.</div>
            </div>
            <div className="pp-card">
                <div className="pp-section-title">Full Activity History</div>
                <div className="pp-empty">No activity history logged.</div>
            </div>
        </div>

        <div className="pp-side">
            <div className="pp-card">
                <div className="pp-section-title">Open Asks</div>
                <div className="pp-big-number">0</div>
            </div>
        </div>

            <div className="pp-card">
                <div className="pp-section-title">Quick Stats</div>
                <div className="pp-big-number">Placeholder</div>
            </div>
        </div>
    );



}

export default PersonsPage;