/* Aayush Jagtap */
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import MatchCard from '../components/MatchCard.jsx';
import '../css/stewardship_queue.css';


function DiscardedMatches() {
    const [discarded, setDiscarded] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [decisionError, setDecisionError] = useState("");


    function loadDiscarded() {
        fetch("http://localhost:8080/api/stewardship-queue/discarded")
            .then(result => {
                if (!result.ok) {
                    throw new Error("Failed to load discarded matches");
                }

                return result.json();
            })
            .then(data => {
                setDiscarded(data.discarded);
                setError(false);
                setLoading(false);
            })
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    }


    useEffect(() => {
        document.title = "Discarded Matches";

        loadDiscarded();
    }, []);


    // sends decision then reloads so reviewed cards disappear from the discarded page
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
                loadDiscarded();
            })
            .catch(() => {
                setDecisionError("Unable to update match decision.");
            });
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
                <p>Unable to load discarded matches.</p>
            </div>
        );
    }


    return (
        <div className="stewardship-page">
            <Link
                className="stewardship-link"
                to="/stewardship"
            >
                ← Back to Stewardship Queue
            </Link>


            <div className="stewardship-header">
                <div>
                    <h1>Discarded Matches</h1>
                    <p>
                        These matches scored below 60% and weren't sent to review.
                    </p>
                </div>

                <div className="pending-count">
                    Showing top {discarded.length}
                </div>
            </div>


            {decisionError && (
                <p>{decisionError}</p>
            )}


            <section className="pending-section">
                <h2>Closest to the threshold</h2>

                {discarded.length === 0 ? (
                    <div className="empty-message">
                        No discarded matches
                    </div>
                ) : (
                    <div className="match-list">
                        {discarded.map(match => (
                            <MatchCard
                                key={match.match_id}
                                match={match}
                                onDecision={handleDecision}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}


export default DiscardedMatches;