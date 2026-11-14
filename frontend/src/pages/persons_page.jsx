/*Author: Emmanuel Koshy*/
import { useEffect, useState } from "react";
import {Link,useParams } from "react-router-dom";  
import '../css/persons_page.css';
import { apiFetch } from'../api';
import EditEntityButton from '../components/EditEntityButton.jsx';
import AffiliationEditButton from '../components/AffiliationEditButton';
import { API_BASE } from "../api";

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

    const today = new Date().toISOString().slice(0, 10);
    const [notes, setNotes] = useState([]);
    const [noteDate, setNoteDate] = useState(today);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [noteError, setNoteError] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);

    useEffect(() => {
        apiFetch(`/api/persons/${id}/notes`)
            .then((r) => (r.ok ? r.json() : []))
            .then(setNotes)
            .catch(() => setNotes([]));
    }, [id]);

    async function addNote(e) {
        e.preventDefault();
        setNoteError('');
        const res = await apiFetch(`/api/persons/${id}/notes`, {
            method: 'POST',
            body: JSON.stringify({ note_date: noteDate, title: noteTitle, body: noteBody }),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return setNoteError(body.error || 'Could not save note.');
        }

        setNotes(await res.json());
        setNoteTitle('');
        setNoteBody('');
        setNoteDate(today);

    }

    async function deleteNote(noteId) {
        const res = await apiFetch(`/api/notes/${noteId}`, { method: 'DELETE' });
        if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }

    async function downloadPdf() {
        setPdfBusy(true);
        try{
            const { pdf } = await import('@react-pdf/renderer');
            const { default: PersonReport } = await import('../components/PersonReport.jsx');
            const blob = await pdf(<PersonReport data={data} notes={notes} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.person.display_name} - Engagement Report.pdf`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } finally {
            setPdfBusy(false);
        }
    }

    if (error) {
        return <div className="persons-page"><div className="pp-card">{error}</div></div>;

    }
    if (!data){
        return <div className="persons-page"><div className="pp-card">Loading...</div></div>;
    }

    const { person, current_affiliation: current, affiliations, activities } = data;
    const { owner, degrees = [], capstones = [] } = data;
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
                        <div className="pp-print-only pp-label">
                            Printed {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} from MSU Engagement Hub
                        </div>
                        {flags.length > 0 &&  (
                            <div className="pp-flags">
                                {flags.map((flag) => <span className="pp-flag" key={flag}>{flag}</span>)}
                            </div>
                        )}
                    </div>
                    <div className="pp-owner">
                        <div className="pp-label">MSU Owner</div>
                        {owner ? (
                            <>
                                <Link to={`/persons/${owner.id}`} className="pp-person-name">{owner.name}</Link>
                                <div className="pp-label">
                                    {owner.source ==='company' ? `via ${current.company}` : owner.role}
                                </div>

                            </>
                        ) : (
                            <div>Not assigned</div>
                        )}
                    </div>
                    <div className="no-print">
                        <EditEntityButton key={id} entityId={id} />
                        <button type="button" className="pp-print-btn" onClick={downloadPdf} disabled= {pdfBusy}>
                            {pdfBusy ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                </div>
                {degrees.length > 0 && (
                    <div className="pp-card pp-alumni">
                        <div className="pp-section-title">Alumni Record</div>
                        {degrees.map((d) => (
                            <div className="pp-alumni-row" key={d.id}>
                                <div><div className="pp-label">Degrees</div><div>{d.degree_type} {d.major}</div></div>
                                <div><div className="pp-label">College</div><div>{d.college}</div></div>
                                <div><div className="pp-label">Class Year</div><div>{d.class_year}</div></div>
                            </div>
                        ))}
                    </div>
                )}

                {capstones.length > 0 && (
                    <div className="pp-card">
                        <div className= "pp-section-title">Capstone Projects</div>
                        {capstones.map((cp) => (
                            <div className="pp-activity" key={cp.id}>
                                <div className="pp-activity-meta">
                                    <span className="pp-activity-type">
                                        {cp.title}
                                        {cp.status && `. ${humanize(cp.status)}`}
                                    </span>
                                    <span>{cp.semester}</span>
                                </div>
                                <div className="pp-label">
                                    {cp.company_id 
                                        ? <Link to={`/company_page/${cp.company_id}`} className="pp-person-name">{cp.company}</Link>
                                        : 'No sponsor'}
                                    {cp.msu_unit && ` · ${cp.msu_unit}`}
                                    {cp.amount != null && ` · ${formatMoney(cp.amount)}`}
                                </div>
                                {cp.notes && <p className="pp-activity-notes">{cp.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}
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
                    {/* edits affiliation history in its own dialog (Aayush) */}
                    <AffiliationEditButton key={id} personId={id} />
                    {affiliations.length ===0?(
                        <div className="pp-empty">No employment history.</div>
                    ) : (
                        affiliations.map((aff) => (
                            <div className="pp-row" key={`${aff.id}-${aff.valid_from}`}>
                                <div>
                                    <div className="pp-row-main">{aff.company}</div>
                                    {aff.title && <div className="pp-label">{aff.title}</div>}
                                </div>
                                <span className="pp-label">
                                    {aff.valid_from.slice(0, 4)} to {aff.last_day ? aff.last_day.slice(0, 4) : 'present'} 
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
                <div className="pp-card">
                    <div className="pp-section-title">Notes</div>
                    <form className="pp-note-form" onSubmit={addNote}>
                        <div className="pp-note-form-row">
                            <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required />
                            <input type="text" placeholder="Title" value={noteTitle}
                                   onChange={(e) => setNoteTitle(e.target.value)} required />
                        </div>
                        <textarea rows={4} placeholder="Notes" value={noteBody}
                                  onChange={(e) => setNoteBody(e.target.value)} />
                        {noteError && <div className="pp-note-error">{noteError}</div>}
                        <button type="submit" className="pp-note-save">Add note</button>
                    </form>

                    {notes.length === 0 ? (
                        <div className="pp-empty">No notes yet.</div>
                    ) : ( 
                        notes.map((n) => (
                            <div className="pp-activity" key={n.id}>
                                <div className="pp-activity-meta">
                                    <span className="pp-activity-type">{n.title}</span>
                                    <span>{formatDate(n.note_date)}{n.author && ` · ${n.author}`}</span>
                                </div> 
                                {n.body && <p className="pp-activity-notes pp-note-body">{n.body}</p>}
                                <button type="button" className="pp-note-delete" onClick={() =>deleteNote(n.id)}>Delete</button>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>


    );
}


export default PersonsPage;