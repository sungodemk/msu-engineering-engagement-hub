import { useState } from 'react';
import { apiFetch } from '../api';
import Dialog from './Dialog';
import '../css/profile_page.css';


function readJson(response) {
    return response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    });
}


// edits a person's jobs without changing the shared person page (Aayush)
function AffiliationEditButton({ personId }) {
    const [open, setOpen] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState('');

    function openEditor() {
        setOpen(true);
        setLoading(true);
        setJobs([]);
        setError('');

        apiFetch(`/api/persons/${personId}/affiliations/edit`)
            .then(readJson)
            .then(setJobs)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }

    function updateJob(edgeId, field, value) {
        setJobs((current) => current.map((job) =>
            job.id === edgeId ? { ...job, [field]: value } : job
        ));
    }

    function saveJob(job) {
        setSavingId(job.id);
        setError('');

        apiFetch(`/api/edges/${job.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                title: job.title,
                start_date: job.start_date,
                end_date: job.end_date || null,
            }),
        })
            .then(readJson)
            .then(() => window.location.reload())
            .catch((err) => setError(err.message))
            .finally(() => setSavingId(null));
    }

    return (
        <div className="entity-edit affiliation-edit">
            <button
                type="button"
                className="entity-edit-button"
                title="Edit affiliation history"
                aria-label="Edit affiliation history"
                onClick={openEditor}
            >
                ✎
            </button>

            <Dialog open_dialog={open}>
                <div className="entity-edit-form">
                    <h2>Edit Affiliation History</h2>

                    {loading && <div>Loading...</div>}

                    {!loading && jobs.length === 0 && !error && (
                        <div>No affiliations found.</div>
                    )}

                    {!loading && jobs.map((job) => (
                        <div className="affiliation-edit-job" key={job.id}>
                            <div className="affiliation-edit-company">
                                {job.company}
                            </div>

                            <label className="entity-edit-field">
                                <span>Title</span>
                                <input
                                    type="text"
                                    value={job.title || ''}
                                    onChange={(e) => updateJob(job.id, 'title', e.target.value)}
                                />
                            </label>

                            <label className="entity-edit-field">
                                <span>Start Date</span>
                                <input
                                    type="date"
                                    required
                                    value={job.start_date || ''}
                                    onChange={(e) => updateJob(job.id, 'start_date', e.target.value)}
                                />
                            </label>

                            <label className="entity-edit-field">
                                <span>End Date</span>
                                <input
                                    type="date"
                                    value={job.end_date || ''}
                                    onChange={(e) => updateJob(job.id, 'end_date', e.target.value)}
                                />
                            </label>

                            <div className="affiliation-edit-actions">
                                <button
                                    type="button"
                                    className="entity-edit-save"
                                    disabled={savingId !== null || !job.start_date}
                                    onClick={() => saveJob(job)}
                                >
                                    {savingId === job.id ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ))}

                    {error && (
                        <div className="entity-edit-form-error">
                            {error}
                        </div>
                    )}

                    <div className="entity-edit-actions">
                        <button
                            type="button"
                            className="entity-edit-cancel"
                            disabled={savingId !== null}
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}


export default AffiliationEditButton;