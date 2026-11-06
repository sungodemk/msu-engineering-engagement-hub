// Zhixiang Miao
import { useState, useEffect } from 'react';
import '../css/account_management_page.css'
import AccountApprovalPage from './admin_account_approval_page'
import AccountDeletionPage from './admin_account_deletion_page'

function AccountManagementPage() {
    useEffect(() => {
        document.title = "Account Management Page";
    }, []);

    const [activeTab, setActiveTab] = useState("admin_account_approval");

    return (
        <div className="account_management_page">
            <div className="account_management_header">
                <div>
                    <h1>Account Management Page</h1>
                    <p>Approve or deny registered but inactive account or delete an active account</p>
                </div>
            </div>

            <div className="acc_management_box">
                <div className="acc_management_header_box">
                    <div className="management_tabs">
                        <button className={activeTab === "admin_account_approval" ? "management_tab active" : "management_tab"}
                            type="button"
                            onClick={() => setActiveTab("admin_account_approval")}>Registered Pending Accounts  
                        </button>
                        <button className={activeTab === "admin_account_deletion" ? "management_tab active" : "management_tab"}
                            type="button"
                            onClick={() => setActiveTab("admin_account_deletion")}>Active Accounts 
                        </button>
                    </div>
                </div>
                {activeTab === "admin_account_approval" ? (
                    <AccountApprovalPage />
                ): <AccountDeletionPage />}
            </div>
                
        </div>
    );
}

export default AccountManagementPage;