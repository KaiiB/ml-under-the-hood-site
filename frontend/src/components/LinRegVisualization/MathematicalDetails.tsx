import React from 'react';
import type { LinRegTrace, LinRegTraceStep } from '../../services/api';
import '../KMeansVisualization/MathematicalDetails.css';

interface MathematicalDetailsProps {
  traceData: LinRegTrace | null;
  step: LinRegTraceStep | null;
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

    const iteration = step.t;

    if (iteration === 0) {
      return (
        <div>
          <h5 style={{ color: 'var(--primary)', marginBottom: '10px', fontWeight: '600', fontSize: '1rem' }}>
            Initialization Step
          </h5>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Linear Regression begins by initializing weights{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              (intercept, slope)
            </strong>{' '}
            to random or zero values.
          </p>
          <p style={{ marginTop: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
            What's happening:
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '8px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>
              Initial weights: intercept = {step.payload.weights[0].toFixed(4)}, slope = {(step.payload.weights[1] || 0).toFixed(4)}
            </li>
            <li>Initial cost (MSE): <strong style={{ color: 'var(--text-primary)' }}>{step.payload.cost.toFixed(4)}</strong></li>
            <li>Gradient descent will minimize this cost function</li>
          </ul>
        </div>
      );
    } else {
      const prevCost = currentIteration > 0 && traceData.cost_history[currentIteration - 1] !== undefined
        ? traceData.cost_history[currentIteration - 1]
        : null;
      const costDecreased = prevCost !== null && step.payload.cost < prevCost;
      
      return (
        <div>
          <h5 style={{ color: 'var(--primary)', marginBottom: '12px', fontWeight: '600', fontSize: '1rem' }}>
            Iteration {iteration}
          </h5>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Gradient Computation:</strong> Calculate the gradient of the cost function with respect to weights.
          </p>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Weight Update:</strong> Update weights using gradient descent:
            <br />
            <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.875rem' }}>
              w_new = w_old - learning_rate × gradient
            </code>
          </p>
          {step.payload.gradient && (
            <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Gradient: intercept = {step.payload.gradient[0]?.toFixed(4) || 'N/A'}, slope = {step.payload.gradient[1]?.toFixed(4) || 'N/A'}
            </p>
          )}
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Current weights: intercept = <strong style={{ color: 'var(--text-primary)' }}>{step.payload.weights[0].toFixed(4)}</strong>, 
            slope = <strong style={{ color: 'var(--text-primary)' }}>{(step.payload.weights[1] || 0).toFixed(4)}</strong>
          </p>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Cost (MSE): <strong style={{ color: 'var(--text-primary)' }}>{step.payload.cost.toFixed(4)}</strong>
            {costDecreased && (
              <span style={{ color: 'var(--success)', fontSize: '0.875rem', marginLeft: '8px' }}>
                ↓ (decreased from {prevCost?.toFixed(4)})
              </span>
            )}
          </p>
        </div>
      );
    }
  };

  return (
    <div className="mathematical-details">
      <div className="detail-section">
        <h4>
          <span style={{ marginRight: '8px' }}>📖</span>
          Current Step Explanation
        </h4>
        {getStepExplanation()}
      </div>

      <div className="detail-section">
        <h4>
          <span style={{ marginRight: '8px' }}>📐</span>
          Mathematical Formulas
        </h4>
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
              Hypothesis Function:
            </h5>
            <code style={{ display: 'block', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace' }}>
              h(x) = θ₀ + θ₁x
            </code>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              where θ₀ is the intercept and θ₁ is the slope
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
              Cost Function (Mean Squared Error):
            </h5>
            <code style={{ display: 'block', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace' }}>
              J(θ) = (1/2m) × Σ(h(xᵢ) - yᵢ)²
            </code>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              where m is the number of training examples
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '0.9375rem', fontWeight: '600' }}>
              Gradient Descent Update:
            </h5>
            <code style={{ display: 'block', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.875rem', fontFamily: 'monospace' }}>
              θⱼ := θⱼ - α × (∂J/∂θⱼ)
            </code>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              where α is the learning rate
            </p>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>
          <span style={{ marginRight: '8px' }}>🔄</span>
          Algorithm Steps (Gradient Descent)
        </h4>
        <ol style={{ marginLeft: '20px', marginTop: '12px', color: 'var(--text-secondary)', lineHeight: '2' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Initialize:</strong> Set initial weights (θ₀, θ₁) to small random values or zeros</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Compute Cost:</strong> Calculate J(θ) using current weights</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Compute Gradient:</strong> Calculate partial derivatives ∂J/∂θ₀ and ∂J/∂θ₁</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Update Weights:</strong> Update θ₀ and θ₁ using gradient descent rule</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Repeat:</strong> Repeat steps 2-4 until convergence or max iterations</li>
        </ol>
      </div>
    </div>
  );
};

export default MathematicalDetails;

