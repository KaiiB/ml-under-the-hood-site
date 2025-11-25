import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import KMeans from './scripts/KMeans';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kmeans" element={<KMeans />} />
      </Routes>
    </Router>
  );
}

export default App;
