import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ConfigMessages from './pages/ConfigMessages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="config/messages" element={<ConfigMessages />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
