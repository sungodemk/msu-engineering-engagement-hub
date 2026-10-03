/* Aayush Jagtap */
import {useEffect, useState} from 'react';
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


    function formatScore(score) {
        return `${Math.round(score * 100)}%`;
    }


    function formatReason(reason) {
        return reason
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }


    function formatDecision(status) {
        if (status === "auto_accepted") {
            return "Auto-accepted";
        }

        return status.charAt(0).toUpperCase() + status.slice(1);
    }


    function formatSource(source) {
        if (!source) {
            return "Unknown";
        }

        return source.charAt(0).toUpperCase() + source.slice(1);
    }


    function showValue(value) {
        return value || "—";
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
                    <span>Below 60% not shown</span>
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
                        {filteredPending.map(match => {
                            // define fields compared side by side so that adding a another field only needs one new entry
                            const fields = [
                                {
                                    label: "Name",
                                    left: match.left_name,
                                    right: match.right_name,
                                },
                                {
                                    label: "City",
                                    left: match.left_city,
                                    right: match.right_city,
                                },
                                {
                                    label: "State",
                                    left: match.left_state,
                                    right: match.right_state,
                                },
                                {
                                    label: "Record Type",
                                    left: match.left_record_type,
                                    right: match.right_record_type,
                                },
                            ];

                            return (
                                <div className="match-card" key={match.match_id}>
                                    <div className="match-card-header">
                                        <div className="match-details">
                                            <span className="score-pill">
                                                {formatScore(match.score)}
                                            </span>

                                            {match.match_reasons.map(reason => (
                                                <span
                                                    className="reason-chip"
                                                    key={reason}
                                                >
                                                    {formatReason(reason)}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="match-actions">
                                            <button
                                                className="reject-button"
                                                type="button"
                                                onClick={() => handleDecision(match.match_id, "reject")}
                                            >
                                                Reject
                                            </button>

                                            <button
                                                className="accept-button"
                                                type="button"
                                                onClick={() => handleDecision(match.match_id, "accept")}
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    </div>


                                    <table className="match-table">
                                        <thead>
                                            <tr>
                                                <th>Field</th>
                                                <th>
                                                    {formatSource(match.left_source_system)}
                                                    {" — "}
                                                    {match.left_external_id}
                                                </th>
                                                <th>
                                                    {formatSource(match.right_source_system)}
                                                    {" — "}
                                                    {match.right_external_id}
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {fields.map(field => {
                                                // highlight mismatch fields so reviewers can see where the two records differ easily
                                                const different = field.left !== field.right;

                                                return (
                                                    <tr key={field.label}>
                                                        <td>{field.label}</td>
                                                        <td className={different ? "different-value" : ""}>
                                                            {showValue(field.left)}
                                                        </td>
                                                        <td className={different ? "different-value" : ""}>
                                                            {showValue(field.right)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
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
                                </tr>
                            ))}

                            {recent.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="recent-empty">
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