/* Aayush Jagtap */
import {useEffect, useState} from 'react';
import '../css/stewardship_queue.css';


function StewardshipQueue() {
    const [pending, setPending] = useState([]);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        document.title = "Stewardship Queue";

        // load company matcher results
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
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }, []);


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


    function valuesDiffer(left, right) {
        return left !== right;
    }


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
                    {pending.length} pending
                </div>
            </div>


            <div className="queue-controls">
                <div className="queue-tabs">
                    <button className="queue-tab active" type="button">
                        All
                    </button>
                    <button className="queue-tab" type="button">
                        Company
                    </button>
                    <button className="queue-tab" type="button">
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

                {pending.length === 0 ? (
                    <div className="empty-message">
                        No matches waiting for review
                    </div>
                ) : (
                    <div className="match-list">
                        {pending.map(match => {
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
                                            >
                                                Reject
                                            </button>

                                            <button
                                                className="accept-button"
                                                type="button"
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
                                                const different = valuesDiffer(
                                                    field.left,
                                                    field.right
                                                );

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