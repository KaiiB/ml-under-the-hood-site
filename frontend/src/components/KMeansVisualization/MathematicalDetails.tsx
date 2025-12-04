import React from 'react';
import type { KMeansTrace, TraceStep } from '../../services/api';
import './MathematicalDetails.css';
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathematicalDetailsProps {
  traceData: KMeansTrace | null;
  step: TraceStep | null;
  currentIteration: number;
}

const MathematicalDetails: React.FC<MathematicalDetailsProps> = ({
  traceData,
  step,
  currentIteration,
}) => {
  const getStepExplanation = () => {
    if (!traceData || !step || !step.payload) {
      return (
        <p style={{ color: 'var(--gray-500)' }}>
          Initialize the algorithm to see step-by-step explanations.
        </p>
      );
    }

    const stepType = step.type;
    const iteration = step.payload.iteration;

    if (stepType === 'initialization') {
      return (
        <div>
          <h5 style={{ color: 'var(--primary)', marginBottom: '10px', fontWeight: '600', fontSize: '1rem' }}>
            Initialization Step
          </h5>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            K-Means begins by randomly placing{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {traceData.params.n_clusters} centroids
            </strong>{' '}
            in the data space.
          </p>
          <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            What's happening:
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>
              {traceData.params.n_clusters} initial centroids are randomly selected from data points
            </li>
            <li>Each point is assigned to its nearest centroid</li>
            <li>
              Initial WCSS (Within-Cluster Sum of Squares):{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {step.payload.inertia.toFixed(2)}
              </strong>
            </li>
          </ul>
        </div>
      );
    } else if (stepType === 'iteration') {
      const hasMovement = step.payload.movement && step.payload.movement > 0.0001;
      return (
        <div>
          <h5 style={{ color: 'var(--primary)', marginBottom: '12px', fontWeight: '600', fontSize: '1rem' }}>
            Iteration {iteration ?? currentIteration}
          </h5>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Assignment Step:</strong> Each point is
            assigned to the nearest centroid based on Euclidean distance.
          </p>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Update Step:</strong> Centroids are
            recalculated as the mean of all points in their cluster.
          </p>
          {hasMovement && step.payload.movement !== undefined && (
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Centroid movement: <strong style={{ color: 'var(--text-primary)' }}>{step.payload.movement.toFixed(4)}</strong>
            </p>
          )}
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            WCSS: <strong style={{ color: 'var(--text-primary)' }}>{step.payload.inertia.toFixed(2)}</strong>
            {(iteration ?? currentIteration) > 1 && (
              <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                {' '}(decreased from previous)
              </span>
            )}
          </p>
        </div>
      );
    } else if (stepType === 'convergence') {
      return (
        <div>
          <h5 style={{ color: 'var(--success)', marginBottom: '12px', fontWeight: '600', fontSize: '1rem' }}>
            ✓ Convergence Achieved
          </h5>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            The algorithm has converged! Centroids have stopped moving significantly.
          </p>
          <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Final Results:
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>Total iterations: {iteration}</li>
            <li>
              Final WCSS: <strong style={{ color: 'var(--text-primary)' }}>{step.payload.inertia.toFixed(2)}</strong>
            </li>
            <li>All centroids have stabilized</li>
          </ul>
        </div>
      );
    }

    return null;
  };

  const getHighlightedStep = (): 'step1' | 'step2' | 'step3' | 'step4' | null => {
    if (!step) return null;
    const stepType = step.type;
    if (stepType === 'initialization') return 'step1';
    if (stepType === 'iteration') {
      // Alternate between step2 and step3 for iterations
      const iteration = step.payload.iteration ?? currentIteration;
      return iteration % 2 === 1 ? 'step2' : 'step3';
    }
    if (stepType === 'convergence') return 'step4';
    return null;
  };

  const highlightedStep = getHighlightedStep();

  return (
    <div className="mathematical-details">
      <div className="info-panel">
        <h4>📖 Current Step Explanation</h4>
        <div className="step-explanation">{getStepExplanation()}</div>
      </div>

      <div className="info-panel">
        <h4>📐 Mathematical Formulas</h4>
        <div className="formula-box">
          <strong>Euclidean Distance:</strong>
          <br />
          <BlockMath math={String.raw`d(x, c) = \sqrt{(x_1 - c_1)^2 + (x_2 - c_2)^2 + \cdots + (x_n - c_n)^2}`} />
        </div>
        <div className="formula-box">
          <strong>Centroid Update:</strong>
          <br />
          <BlockMath math={String.raw`c_{\text{new}} = \frac{1}{n} \sum_{i=1}^{n} x_i`} />
        </div>
        <div className="formula-box">
          <strong>WCSS Objective Function:</strong>
          <br />
          <BlockMath math={String.raw`J = \sum_{i=1}^{n} \sum_{j=1}^{k} \lVert x_i - \mu_j \rVert^2`} />
        </div>
      </div>

      <div className="info-panel">
        <h4>📚 Algorithm Steps (Lloyd's Algorithm)</h4>
        <ol className="algorithm-steps">
          <li id="step1" className={highlightedStep === 'step1' ? 'highlighted' : ''}>
            <strong>Initialization:</strong> Randomly place k centroids
          </li>
          <li id="step2" className={highlightedStep === 'step2' ? 'highlighted' : ''}>
            <strong>Assignment Step:</strong> Assign each point to nearest centroid
          </li>
          <li id="step3" className={highlightedStep === 'step3' ? 'highlighted' : ''}>
            <strong>Update Step:</strong> Recalculate centroids as cluster means
          </li>
          <li id="step4" className={highlightedStep === 'step4' ? 'highlighted' : ''}>
            <strong>Convergence Check:</strong> Stop if centroids don't move significantly
          </li>
        </ol>
      </div>
    </div>
  );
};

export default MathematicalDetails;

