import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './pages/layout';
import Home from './pages/Home';
import PersonsList from './pages/persons_list.jsx';
import PersonsPage from './pages/persons_page';
import CompanyPage from './pages/company_page';
import TemporalPage from "./pages/temporal_page.jsx";
import Portfolio from "./pages/portfolio.jsx";
import StewardshipQueue from "./pages/stewardship_queue.jsx";
import DiscardedMatches from "./pages/discarded_matches.jsx";
import LoginPage from './pages/login_page.jsx';
import SignUpPage from './pages/sign_up_page.jsx';
import ChangePasswordPage from './pages/change_password_page.jsx';
import ForgotPasswordPage from './pages/forgot_password_page.jsx'
import RequireAuth from './components/RequireAuth.jsx';
import AccountManagementPage from './pages/account_management_page.jsx';
import AdminAccountApprovalPage from './pages/admin_account_approval_page.jsx';
import AdminAccountDeletionPage from './pages/admin_account_deletion_page.jsx'
import Dashboard from './pages/dashboard.jsx';
import RelationshipPage from './pages/relationship_page.jsx';
import ProfilePage from './pages/profile_page.jsx';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign_up" element={<SignUpPage />} />
        <Route path="/forgot_password" element={<ForgotPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/company_page/:id" element={<CompanyPage />} />
            <Route path="/persons" element={<PersonsList />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change_password" element={<ChangePasswordPage />} />
            <Route path="/persons/:id" element={<PersonsPage />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stewardship" element={<StewardshipQueue />} />
            <Route path="/stewardship/discarded" element={<DiscardedMatches />} />
            <Route path="/temporal" element={<TemporalPage />} />
            <Route path="/account_management" element={<AccountManagementPage />} />
            <Route path="/admin_account_approval" element={<AdminAccountApprovalPage />} />
            <Route path="/admin_account_deletion" element={<AdminAccountDeletionPage />} />
            <Route path="/relationship" element={<RelationshipPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;