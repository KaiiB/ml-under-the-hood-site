import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">ML Under the Hood</h1>
        <p className="home-subtitle">Interactive Visualizations for Machine Learning Algorithms</p>
        
        <div className="algorithms-grid">
          <Link to="/kmeans" className="algorithm-card">
            <div className="algorithm-icon">📊</div>
            <h2>K-Means Clustering</h2>
            <p>Visualize how K-Means clustering algorithm works step-by-step with interactive 2D and 3D plots</p>
            <span className="algorithm-link">Explore →</span>
          </Link>

          <div className="algorithm-card coming-soon">
            <div className="algorithm-icon">📈</div>
            <h2>Linear Regression</h2>
            <p>Coming soon...</p>
            <span className="algorithm-link">Coming Soon</span>
          </div>

          <div className="algorithm-card coming-soon">
            <div className="algorithm-icon">🔍</div>
            <h2>PCA</h2>
            <p>Coming soon...</p>
            <span className="algorithm-link">Coming Soon</span>
          </div>

          <div className="algorithm-card coming-soon">
            <div className="algorithm-icon">⚡</div>
            <h2>EM Algorithm</h2>
            <p>Coming soon...</p>
            <span className="algorithm-link">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

