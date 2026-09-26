import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './pages/layout';
import Home from './pages/Home';
import Placeholder from './pages/placeholder';
import PersonsList from './pages/persons_list.jsx';
import PersonsPage from './pages/persons_page';
import CompanyPage from './pages/company_page';
import TemporalPage from "./pages/graph_page.jsx";
import Portfolio from "./pages/portfolio.jsx";


function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/company_page" element={<CompanyPage />} />
          <Route path="/persons" element={< PersonsList />} />
          <Route path="/persons/:id" element={<PersonsPage />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/stewardship" element={<Placeholder title="Stewardship" />} />
          <Route path="/temporal" element={<TemporalPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App
