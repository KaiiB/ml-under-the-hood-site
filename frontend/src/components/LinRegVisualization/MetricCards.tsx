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
  const intercept = weights[0];
  const slope = weights[1] || 0;
  const trueIntercept = traceData.meta.data.true_intercept;
  const trueSlope = traceData.meta.data.true_slope;

  return (
    <div className="metric-cards">
      <div className="metric-card">
        <h4>Iteration</h4>
        <div className="value">{currentIteration}</div>
      </div>

      <div className="metric-card">
        <h4>Cost (MSE)</h4>
        <div className="value">{cost.toFixed(4)}</div>
      </div>

      <div className="metric-card">
        <h4>Slope</h4>
        <div className="value">{slope.toFixed(4)}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          True: {trueSlope.toFixed(4)}
        </div>
      </div>

      <div className="metric-card">
        <h4>Intercept</h4>
        <div className="value">{intercept.toFixed(4)}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          True: {trueIntercept.toFixed(4)}
        </div>
      </div>
    </div>
  );
};

export default MetricCards;

