import EM from "./scripts/EM.tsx";
import PCA from "./scripts/PCA.tsx";
import LinReg from './scripts/LinReg';
import KMeans from './scripts/KMeans';
import Regularization from './scripts/Regularization';
import { useState } from "react";

type Page = "home" | "em" | "pca" | "linreg" | "kmeans" | "regularization";

function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">ML Under the Hood</h1>
          <p className="hero-subtitle">Visualize and explore the inner workings of machine learning algorithms</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission">
        <div className="container">
          <h2>Our Mission</h2>
          <p>
            Machine learning can feel like a black box. We believe that understanding how algorithms work—from
            the math to the step-by-step execution—is crucial for building intuition and confidence. This site
            provides interactive visualizations and detailed traces of popular ML algorithms to demystify their
            inner workings.
          </p>
        </div>
      </section>

      {/* Algorithms Overview */}
      <section className="algorithms">
        <div className="container">
          <h2>Explore Our Algorithms</h2>
          <div className="algo-grid">
            {/* EM Algorithm Card */}
            <div className="algo-card em-card">
              <div className="algo-icon">🔄</div>
              <h3>Expectation-Maximization (EM)</h3>
              <p>
                Discover how EM finds patterns in unlabeled data. Watch as it iteratively refines its
                understanding of hidden components, perfect for clustering and density estimation.
              </p>
              <div className="algo-tags">
                <span className="tag">Unsupervised</span>
                <span className="tag">Clustering</span>
                <span className="tag">Iterative</span>
              </div>
            </div>

            {/* PCA Algorithm Card */}
            <div className="algo-card pca-card">
              <div className="algo-icon">📊</div>
              <h3>Principal Component Analysis (PCA)</h3>
              <p>
                Learn how PCA reduces dimensionality while preserving the most important variance in your data.
                Visualize how data is transformed into a new coordinate system.
              </p>
              <div className="algo-tags">
                <span className="tag">Dimensionality</span>
                <span className="tag">Unsupervised</span>
                <span className="tag">Linear</span>
              </div>
            </div>

            {/* KMeans */}
            <div className="algo-card kmeans-card">
              <div className="algo-icon">⏳</div>
              <h3>K-Means Clustering</h3>
              <p>
                Explore the simplest and most popular clustering algorithm. See how it partitions data into
                K clusters by minimizing within-cluster variance.
              </p>
              <div className="algo-tags">
                <span className="tag">Unsupervised</span>
                <span className="tag">Clustering</span>
              </div>
            </div>

            {/* Linear Regression */}
            <div className="algo-card linreg-card">
              <div className="algo-icon">📈</div>
              <h3>Linear Regression</h3>
              <p>
                Understand the foundations of supervised learning. See how linear regression finds the best-fit
                line through your data using gradient descent or closed-form solutions.
              </p>
              <div className="algo-tags">
                <span className="tag">Supervised</span>
                <span className="tag">Regression</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Explore Section */}
      <section className="how-to-explore">
        <div className="container">
          <h2>How to Explore</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h4>Choose an Algorithm</h4>
              <p>Pick an algorithm from the navigation bar or the cards above to dive into its visualization.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h4>Adjust Parameters</h4>
              <p>Use interactive sliders to tweak algorithm parameters and see how your choices affect the execution.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h4>Watch the Magic</h4>
              <p>Observe the algorithm's step-by-step execution with detailed visualizations and explanations.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h4>Learn & Experiment</h4>
              <p>Experiment with different settings to build intuition about how algorithms respond to various inputs.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h1 className="brand-title">ML Under the Hood</h1>
          </div>
          <div className="navbar-links">
            <button
              className={`nav-button ${page === "home" ? "active" : ""}`}
              onClick={() => setPage("home")}
            >
              Home
            </button>
            <button
              className={`nav-button ${page === "em" ? "active" : ""}`}
              onClick={() => setPage("em")}
            >
              EM
            </button>
            <button
              className={`nav-button ${page === "pca" ? "active" : ""}`}
              onClick={() => setPage("pca")}
            >
              PCA
            </button>
            <button
              className={`nav-button ${page === "kmeans" ? "active" : ""}`}
              onClick={() => setPage("kmeans")}
            >
              K-Means
            </button>
            <button
              className={`nav-button ${page === "linreg" ? "active" : ""}`}
              onClick={() => setPage("linreg")}
            >
              Linear Regression
            </button>
            <button
              className={`nav-button ${page === "regularization" ? "active" : ""}`}
              onClick={() => setPage("regularization")}
            >
              Regularization
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {page === "home" && <HomePage />}
        {page === "em" && <EM />}
        {page === "pca" && <PCA />}
        {page === "kmeans" && <KMeans />}
        {page === "linreg" && <LinReg />}
        {page === "regularization" && <Regularization />}
      </main>
    </>
  );
}

export default App;
