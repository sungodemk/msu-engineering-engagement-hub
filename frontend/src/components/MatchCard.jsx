/* Aayush Jagtap */

// shared match card used by the stewardship queue and discarded pages
function MatchCard({match, onDecision}) {
    function formatScore(score) {
        return `${Math.round(score * 100)}%`;
    }


    function formatReason(reason) {
        return reason
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
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


    // define fields compared side by side so that adding another field only needs one new entry
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
        <div className="match-card">
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
                        onClick={() => onDecision(match.match_id, "reject")}
                    >
                        Reject
                    </button>

                    <button
                        className="accept-button"
                        type="button"
                        onClick={() => onDecision(match.match_id, "accept")}
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
                        // highlight mismatch fields so reviewers can see where the two records differ 
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
}


export default MatchCard;