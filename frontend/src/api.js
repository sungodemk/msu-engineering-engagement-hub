import { auth } from './firebase';

const API_BASE = 'http://localhost:8080';

export async function apiFetch(path, options = {}) {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
        },
    });
}