import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './pages/layout';
import Home from './pages/Home';
import Placeholder from './pages/placeholder';
import PersonsPage from './pages/persons_page';
import CompanyPage from './pages/company_page';
import TemporalPage from "./pages/graph_page.jsx";


function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/company_page" element={<CompanyPage />} />
          <Route path="/persons" element={< PersonsPage />} />
          <Route path="/portfolio" element={<Placeholder title="Portfolio" />} />
          <Route path="/stewardship" element={<Placeholder title="Stewardship" />} />
          <Route path="/company/:id" element={<TemporalPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App
