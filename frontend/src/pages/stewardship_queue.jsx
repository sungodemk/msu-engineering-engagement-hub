/* Aayush Jagtap */
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import MatchCard from '../components/MatchCard.jsx';
import '../css/stewardship_queue.css';


function StewardshipQueue() {
    const [pending, setPending] = useState([]);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [decisionError, setDecisionError] = useState("");
    const [activeTab, setActiveTab] = useState("all");


    function loadQueue() {
        // load company and person matcher results
        fetch("http://localhost:8080/api/stewardship-queue")
            .then(result => {
                if (!result.ok) {
                    throw new Error("Failed to load stewardship queue");
                }

                return result.json();
            })
            .then(data => {
                setPending(data.pending);
                setRecent(data.recent);
                setError(false);
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }


    useEffect(() => {
        document.title = "Stewardship Queue";

        loadQueue();
    }, []);


    // sends the decision then reloads so the card moves to recently reviewed
    function handleDecision(matchId, decision) {
        setDecisionError("");

        fetch(`http://localhost:8080/api/matches/${matchId}/decision`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({decision}),
        })
            .then(result => {
                if (!result.ok) {
                    throw new Error("Failed to update match");
                }

                return result.json();
            })
            .then(() => {
                loadQueue();
            })
            .catch(() => {
                setDecisionError("Unable to update match decision.");
            });
    }


    function handleUndo(matchId) {
        setDecisionError("");

        fetch(`http://localhost:8080/api/matches/${matchId}/undo`, {
            method: "POST",
        })
            .then(result => {
                if (!result.ok) {
                    throw new Error("Failed to undo match");
                }

                return result.json();
            })
            .then(() => {
                loadQueue();
            })
            .catch(() => {
                setDecisionError("Unable to update match decision.");
            });
    }


    function formatScore(score) {
        return `${Math.round(score * 100)}%`;
    }


    function formatDecision(status) {
        if (status === "auto_accepted") {
            return "Auto-accepted";
        }

        return status.charAt(0).toUpperCase() + status.slice(1);
    }


    const filteredPending = activeTab === "all"
        ? pending
        : pending.filter(match => match.entity_type === activeTab);


    if (loading) {
        return (
            <div className="stewardship-page">
                <p>Loading...</p>
            </div>
        );
    }


    if (error) {
        return (
            <div className="stewardship-page">
                <p>Unable to load the stewardship queue.</p>
            </div>
        );
    }


    return (
        <div className="stewardship-page">
            <div className="stewardship-header">
                <div>
                    <h1>Stewardship Queue</h1>
                    <p>
                        Review possible duplicate records found across our data sources.
                    </p>
                </div>

                <div className="pending-count">
                    {filteredPending.length} pending
                </div>
            </div>


            {decisionError && (
                <p>{decisionError}</p>
            )}


            <div className="queue-controls">
                <div className="queue-tabs">
                    <button
                        className={activeTab === "all" ? "queue-tab active" : "queue-tab"}
                        type="button"
                        onClick={() => setActiveTab("all")}
                    >
                        All
                    </button>
                    <button
                        className={activeTab === "organization" ? "queue-tab active" : "queue-tab"}
                        type="button"
                        onClick={() => setActiveTab("organization")}
                    >
                        Company
                    </button>
                    <button
                        className={activeTab === "person" ? "queue-tab active" : "queue-tab"}
                        type="button"
                        onClick={() => setActiveTab("person")}
                    >
                        Person
                    </button>
                </div>

                <div className="threshold-legend">
                    <span>≥ 90% auto-accept</span>
                    <Link to="/stewardship/discarded">
                        Below 60%: view discarded
                    </Link>
                </div>
            </div>


            <section className="pending-section">
                <h2>Pending Review</h2>

                {filteredPending.length === 0 ? (
                    <div className="empty-message">
                        No matches waiting for review
                    </div>
                ) : (
                    <div className="match-list">
                        {filteredPending.map(match => (
                            <MatchCard
                                key={match.match_id}
                                match={match}
                                onDecision={handleDecision}
                            />
                        ))}
                    </div>
                )}
            </section>


            <section className="recent-section">
                <h2>Recently Reviewed</h2>

                <div className="recent-table-container">
                    <table className="recent-table">
                        <thead>
                            <tr>
                                <th>Record Pair</th>
                                <th>Score</th>
                                <th>Decision</th>
                                <th>Reviewer</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {recent.map(match => (
                                <tr key={match.match_id}>
                                    <td>
                                        {match.left_name} / {match.right_name}
                                    </td>
                                    <td>{formatScore(match.score)}</td>
                                    <td>
                                        <span
                                            className={`decision-badge ${match.status}`}
                                        >
                                            {formatDecision(match.status)}
                                        </span>
                                    </td>
                                    <td>{match.reviewer}</td>
                                    <td>{match.date}</td>
                                    <td>
                                        {match.status === "auto_accepted" ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDecision(match.match_id, "reject")}
                                            >
                                                Reject
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleUndo(match.match_id)}
                                            >
                                                Undo
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {recent.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="recent-empty">
                                        No recently reviewed matches
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}


export default StewardshipQueue;