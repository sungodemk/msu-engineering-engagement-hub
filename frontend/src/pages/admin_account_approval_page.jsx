// Zhixiang Miao

import { useState, useEffect } from 'react';
import '../css/admin_account_approval_page.css';
import { apiFetch } from '../api';

function AdminAccountApprovalPage() {
    const [inactiveAccounts, setInactiveAccounts] = useState(null);
    const [error, setError] = useState(null);
    async function fetchInactiveAccounts() {
        setInactiveAccounts(null);
        setError(null);
        try {
            const response = await apiFetch('/api/inactive_accounts');
            if (!response.ok) {
                setError('Failed to fetch inactive accounts');
                console.error('Failed to fetch inactive accounts');
                return;
            }
            const data = await response.json();
            setInactiveAccounts(data);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching inactive accounts:', error);
        }
    }

    useEffect(() => {
        fetchInactiveAccounts();
    }, []);

    

    async function approveAccount(userId, role) {
        try {
            const response = await apiFetch('/api/approve_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId, role: role })
            });
            if (!response.ok) {
                setError('Failed to approve account');
                console.error('Failed to approve account');
                return;
            }
            fetchInactiveAccounts();
        } catch (error) {
            setError(error.message);
            console.error('Error approving account:', error);
        }
    }

    async function denyAccount(userId) {
        try {
            const response = await apiFetch('/api/deny_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            if (!response.ok) {
                setError('Failed to deny account');
                console.error('Failed to deny account');
                return;
            }
            fetchInactiveAccounts();
        } catch (error) {
            setError(error.message);
            console.error('Error denying account:', error);
        }
    }

    if (error) {
        return <div className="acc_approval_page"><div className="acc_app_page">{error}</div></div>;
    }

    if (!inactiveAccounts) {
        return <div className="acc_approval_page"><div className="acc_app_page">Loading Accounts...</div></div>;
    }

    return (
        <div className="authentication_page"> 
            <div className="accounts_box">
                <div className="account_title_box">
                    <div className="account_box_title">
                        Accounts Pending Approval
                    </div>
                </div>
                <div className="accounts-table-wrap">
                        <table className="accounts-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Pending accounts will be dynamically rendered here */}
                                {inactiveAccounts.map(account => (
                                    <tr key={account.id}>
                                        <td>{account.email}</td>
                                        <td>
                                            <select className="role_dropdown" value={account.role} onChange={(e) => setInactiveAccounts(prev => prev.map(acc => acc.id === account.id ? {...acc, role: e.target.value} : acc))}>
                                                <option value="viewer">Viewer</option>
                                                <option value="staff">Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="app_deni_buttons">
                                                {(account.role === 'admin' || account.role === 'staff') && (
                                                    <button className="approval_button" onClick={() => { approveAccount(account.id, account.role) }}>Approve</button>
                                                )}
                                                <button className="denial_button" onClick={() => denyAccount(account.id)}>Deny</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {inactiveAccounts.length === 0 && (
                                <tbody> 
                                    <tr>
                                        <td colSpan='3'>No inactive account available</td>
                                    </tr>
                                </tbody>
                            )}
                        </table>
                    </div>
            </div>
        </div>
    )
}

export default AdminAccountApprovalPage;