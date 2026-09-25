/*Author: Emmanuel Koshy*/
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";  
import '../css/persons_page.css';

const API_BASE  = "http://localhost:8080";

const MONTHS = ['Jan','Feb','Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


function formatDate(iso) {
    if (!iso) return '';
    const [year,month,day] = iso.split('-');
    return  `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}



function formatMoney(amount) {
    return amount.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

}

function initials(name){
    return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}


function humanize(value) {
    const text = value.replaceAll('_', ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function PersonsPage(){
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        setData(null);
        setError(null);

        fetch(`${API_BASE}/api/persons/${id}`)
            .then((res) => {
                if (res.status === 404) throw new Error('Person not found');
                if (!res.ok) throw new Error('Server has returned');
                return res.json();
            })
            .then((json) => {
                setData(json);
                document.title = json.person.display_name; 
            })
            .catch((err) => setError(err.message));
    }, [id]);

    if (error) {
        return <div className="persons-page"><div className="pp-card">{error}</div></div>;

    }
    if (!data){
        return <div className="persons-page"><div className="pp-card">Loading...</div></div>;
    }

    const { person, current_affiliation: current, affiliations, activities } = data;
    const attrs = person.attributes ?? {};
    const title = current?.title ?? attrs.title;
    const location = [attrs.city, attrs.state].filter(Boolean).join(', ');

    const flags = [
        attrs.deceased && 'Deceased',
        attrs.do_not_contact && 'Do not contact',
        attrs.do_not_solicit && 'Do not solicit',
    ].filter(Boolean)

    
    // count and the most recent date per activity type
    const summary = {};
    for (const act of activities) {
        summary[act.activity_type] ??= {count: 0, latest: act.occurred_on};
        summary[act.activity_type].count +=1;
    }

    const openAsks = activities.filter((a) => a.activity_type === 'ask' && a.status === 'open').length;
    const touchpoints = activities.filter((a) => a.activity_type === 'touchpoint').length;
    const giving = activities
        .filter((a) => a.activity_type === 'gift')
        .reduce((sum, a) => sum + (a.amount ?? 0), 0);
    
    return (
        <div className="persons-page">
            <div className="pp-main">
                <div className="pp-card pp-header">
                    <div className="pp-avatar">{initials(person.display_name)}</div>
                    <div className="pp-header-text">
                        <div className="pp-name">{person.display_name}</div>
                        {title && <div className="pp-title">{title}</div>}
                        {current && <div className="pp-company">{current.company}</div>}
                        {location && <div className="pp-label">{location}</div>}
                        {flags.length > 0 &&  (
                            <div className="pp-flags">
                                {flags.map((flag) => <span className="pp-flag" key={flag}>{flag}</span>)}
                            </div>
                        )}
                    </div>
                    <div className="pp-owner">
                        <div className="pp-label"> MSU Owner</div>
                        <div>Not assigned</div>
                    </div>
                </div>
                
                <div className="pp-card">
                    <div className="pp-section-title">Engagement Summary</div>
                    {Object.keys(summary).length === 0 ? (
                        <div className="pp-empty">No engagement recorded</div>
                    ) : ( 
                        Object.entries(summary).map(([type, row]) =>(
                            <div className="pp-row" key={type}>
                                <span className="pp-row-main">{humanize(type)}</span>
                                <span>{row.count}</span>
                                <span className="pp-label">Latest {formatDate(row.latest)}</span>
                            </div>

                        ))
                    )}

                </div>
                <div className="pp-card">
                    <div className="pp-section-title">Affiliation History</div>
                    {affiliations.length ===0 ? (
                        <div className="pp-empty">No employment history on record.</div>
                    ) : (
                        affiliations.map((aff) => (
                            <div className="pp-row" key={`${aff.id}-${aff.valid_from}`}>
                                <div>
                                    <div className="pp-row-main">{aff.company}</div>
                                    {aff.title && <div className="pp-label">{aff.title}</div>}
                                </div>
                                <span className="pp-label">
                                    {aff.valid_from.slice(0, 4)} to {aff.valid_to ? aff.valid_to.slice(0, 4) : 'present'}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="pp-card">
                    <div className="pp-section-title">Activity History</div>
                    {activities.length ===0 ? (
                        <div className="pp-empty">No activity history on record.</div>
                    ) : (
                        activities.map((act) => (
                            
                            <div className="pp-activity" key={act.id}>
                               <div className="pp-activity-meta">
                                    <span className="pp-activity-type">
                                        {humanize(act.activity_type)}
                                        {act.company && ` · ${act.company}`}
                                        {act.amount != null && ` · ${formatMoney(act.amount)}`}
                                    </span>
                                    <span>{formatDate(act.occurred_on)}</span>
                                </div>
                                {act.notes && <p className="pp-activity-notes">{act.notes}</p>}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="pp-side">
                <div className="pp-card">
                    <div className="pp-section-title">Open Asks</div>
                    <div className="pp-big-number">{openAsks}</div>
                </div>

                <div className="pp-card">
                    <div className="pp-section-title">Quick Stats</div>
                    <div className="pp-stat-row"><span>Email</span><span>{person.email ?? 'None'}</span></div>
                    <div className="pp-stat-row"><span>Touchpoints</span><span>{touchpoints}</span></div>
                    <div className="pp-stat-row"><span>Lifetime giving</span><span>{formatMoney(giving)}</span></div>
                </div>
            </div>
        </div>


    );
}


export default PersonsPage;