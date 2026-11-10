// Zhixiang Miao
import {useEffect, useState} from 'react';
import "../css/admin_account_deletion_page.css"
import "../css/company_page.css"
import { apiFetch } from '../api';

function AccountDeletionPage() {
    const [activeAccounts, setActiveAccounts] = useState(null);
    const [error, setError] = useState(null);

    async function fetchActiveAccounts() {
        setActiveAccounts(null);
        setError(null);
        try {
            const response = await apiFetch('/api/active_accounts');
            if (!response.ok) {
                setError('Failed to fetch active accounts');
                console.error('Failed to fetch active accounts');
                return;
            }
            const data = await response.json();
            setActiveAccounts(data);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching active accounts:', error);
        }
    }

    useEffect(() => {
        fetchActiveAccounts();
    }, []);

    async function deleteAccount(userId) {
        try {
            const response = await apiFetch('/api/delete_active_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId })
            });
            if (!response.ok) {
                setError('Failed to delete account');
                console.error('Failed to delete account');
                return;
            }
            fetchActiveAccounts();
        } catch (error) {
            setError(error.message);
            console.error('Error deleting account:', error);
        }
    }

    if (error) {
        return <div className="admin_account_deletion_page">{error}</div>;
    }

    if (!activeAccounts) {
        return <div className="admin_account_deletion_page">Loading Accounts...</div>;
    }

    return (
        <div className="admin_account_deletion_page"> 
            <div className="deletion_box">
                <div className="deletion-table-wrap">
                        <table className="deletion-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Active accounts will be dynamically rendered here */}
                                {activeAccounts.map(account => (
                                    <tr key={account.id}>
                                        <td>{account.email}</td>
                                        <td>{account.display_name}</td>
                                        <td>{account.role}</td>
                                        <td>
                                            <button className="deletion_button" onClick={() => deleteAccount(account.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {activeAccounts.length === 0 && (
                            <div className='not_available_message'>No active account available</div>
                        )}
                    </div>
            </div>
        </div>
    )
}

export default AccountDeletionPage;