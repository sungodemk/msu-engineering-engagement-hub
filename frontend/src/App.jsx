import {BrowserRouter, Routes, Route} from 'react-router-dom';
import Layout from './pages/layout';
import Home from './pages/Home';
import Placeholder from './pages/placeholder';
import CompanyPage from './pages/company_page';


function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/persons" element={<Placeholder title="Persons" />} />
          <Route path="/portfolio" element={<Placeholder title="Portfolio" />} />
          <Route path="/stewardship" element={<Placeholder title="Stewardship" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App
