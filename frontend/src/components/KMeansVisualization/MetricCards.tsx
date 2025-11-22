// Metric Cards Component for displaying K-Means metrics
import React from 'react';
import type { KMeansTrace, TraceStep } from '../../services/api';
import './MetricCards.css';

interface MetricCardsProps {
  traceData: KMeansTrace | null;
  step: TraceStep | null;
  currentIteration: number;
}

const MetricCards: React.FC<MetricCardsProps> = ({ traceData, step, currentIteration }) => {
  if (!traceData || !step || !step.payload) {
    return null;
  }

  const { inertia, cluster_sizes } = step.payload;
  const totalInertia = inertia;
  const avgClusterSize = cluster_sizes.reduce((a, b) => a + b, 0) / cluster_sizes.length;
  const minClusterSize = Math.min(...cluster_sizes);
  const maxClusterSize = Math.max(...cluster_sizes);

  return (
    <div className="metric-cards">
      <div className="metric-card">
        <h4>Iteration</h4>
        <div className="value">{currentIteration}</div>
      </div>

      <div className="metric-card">
        <h4>Total Inertia (WCSS)</h4>
        <div className="value">{totalInertia.toFixed(2)}</div>
      </div>

      <div className="metric-card">
        <h4>Avg Cluster Size</h4>
        <div className="value">{avgClusterSize.toFixed(1)}</div>
      </div>

      <div className="metric-card">
        <h4>Cluster Size Range</h4>
        <div className="value">
          {minClusterSize} - {maxClusterSize}
        </div>
      </div>
    </div>
  );
};

export default MetricCards;

