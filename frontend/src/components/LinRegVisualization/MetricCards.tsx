// Metric Cards Component for displaying Linear Regression metrics
import React from 'react';
import type { LinRegTrace, LinRegTraceStep } from '../../services/api';
import '../KMeansVisualization/MetricCards.css';

interface MetricCardsProps {
  traceData: LinRegTrace | null;
  step: LinRegTraceStep | null;
  currentIteration: number;
}

const MetricCards: React.FC<MetricCardsProps> = ({ traceData, step, currentIteration }) => {
  if (!traceData || !step || !step.payload) {
    return null;
  }

  const { cost, weights } = step.payload;
  
  // Add null/undefined checks before using values
  if (cost === null || cost === undefined || !weights || !Array.isArray(weights) || weights.length === 0) {
    return null;
  }

  const intercept = weights[0] ?? 0;
  const slope = weights[1] ?? 0;
  const trueIntercept = traceData.meta?.data?.true_intercept ?? null;
  const trueSlope = traceData.meta?.data?.true_slope ?? null;

  return (
    <div className="metric-cards">
      <div className="metric-card">
        <h4>Iteration</h4>
        <div className="value">{currentIteration}</div>
      </div>

      <div className="metric-card">
        <h4>Cost (MSE)</h4>
        <div className="value">{typeof cost === 'number' ? cost.toFixed(4) : 'N/A'}</div>
      </div>

      <div className="metric-card">
        <h4>Slope</h4>
        <div className="value">{typeof slope === 'number' ? slope.toFixed(4) : 'N/A'}</div>
        {trueSlope !== null && typeof trueSlope === 'number' && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            True: {trueSlope.toFixed(4)}
          </div>
        )}
      </div>

      <div className="metric-card">
        <h4>Intercept</h4>
        <div className="value">{typeof intercept === 'number' ? intercept.toFixed(4) : 'N/A'}</div>
        {trueIntercept !== null && typeof trueIntercept === 'number' && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            True: {trueIntercept.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCards;


