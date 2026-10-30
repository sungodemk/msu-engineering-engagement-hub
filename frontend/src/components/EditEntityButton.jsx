// opens a form for editing a person's or company's fields (Aayush)
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

function fieldLabel(field) {
    return field.replace(/_/g, ' ');
}


function EditEntityButton({ entityId }) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function handleOpen() {
        setLoading(true);
        setError('');

        apiFetch(`/api/entities/${entityId}/edit`)
            .then(readJson)
            .then((data) => {
                const fields = {};

                for (const [field, value] of Object.entries(data)) {
                    if (field !== 'id' && field !== 'entity_type') {
                        fields[field] = value ?? '';
                    }
                }

                setValues(fields);
                setOpen(true);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }

    function handleChange(field, value) {
        setValues((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleSave(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        apiFetch(`/api/entities/${entityId}`, {
            method: 'PATCH',
            body: JSON.stringify(values),
        })
            .then(readJson)
            .then(() => {
                // reloads the page so its existing data updates (Aayush)
                window.location.reload();
            })
            .catch((err) => setError(err.message))
            .finally(() => setSaving(false));
    }

    function handleCancel() {
        setOpen(false);
        setError('');
    }

    return (
        <div className="entity-edit">
            <button
                type="button"
                className="entity-edit-button"
                title="Edit"
                onClick={handleOpen}
                disabled={loading || saving}
            >
                ✎
            </button>

            {!open && error && (
                <span className="entity-edit-load-error">{error}</span>
            )}

            <Dialog open_dialog={open}>
                <form className="entity-edit-form" onSubmit={handleSave}>
                    <h2>Edit details</h2>

                    {Object.entries(values).map(([field, value]) => (
                        <label key={field} className="entity-edit-field">
                            <span>{fieldLabel(field)}</span>
                            <input
                                type={field === 'email' ? 'email' : 'text'}
                                value={value}
                                onChange={(event) => handleChange(field, event.target.value)}
                                disabled={saving}
                            />
                        </label>
                    ))}

                    {error && (
                        <div className="entity-edit-form-error">{error}</div>
                    )}

                    <div className="entity-edit-actions">
                        <button
                            type="button"
                            className="entity-edit-cancel"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="entity-edit-save"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}

export default EditEntityButton;