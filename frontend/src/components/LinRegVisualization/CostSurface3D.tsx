// 3D Cost Surface Visualization Component for Linear Regression
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore - react-plotly.js doesn't have complete type definitions
import Plot from 'react-plotly.js';
import type { LinRegTrace } from '../../services/api';

// Plotly types are complex, using any for flexibility
type PlotlyData = any;
type PlotlyLayout = any;
type PlotlyConfig = any;

interface CostSurface3DProps {
  traceData: LinRegTrace | null;
  currentIteration: number;
}

const CostSurface3D: React.FC<CostSurface3DProps> = ({
  traceData,
  currentIteration,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.min(600, window.innerHeight - 400),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const computeCostSurface = (traceData: LinRegTrace) => {
    if (!traceData || traceData.steps.length === 0) return null;

    // Get weight ranges from trace
    const intercepts: number[] = [];
    const slopes: number[] = [];
    const costs: number[] = [];

    traceData.steps.forEach((step) => {
      intercepts.push(step.payload.weights[0]);
      slopes.push(step.payload.weights[1] || 0);
      costs.push(step.payload.cost);
    });

    // Find ranges
    const interceptMin = Math.min(...intercepts) - 1;
    const interceptMax = Math.max(...intercepts) + 1;
    const slopeMin = Math.min(...slopes) - 1;
    const slopeMax = Math.max(...slopes) + 1;

    // Create grid
    const gridSize = 30;
    const interceptRange = interceptMax - interceptMin;
    const slopeRange = slopeMax - slopeMin;
    const interceptStep = interceptRange / gridSize;
    const slopeStep = slopeRange / gridSize;

    const interceptGrid: number[] = [];
    const slopeGrid: number[] = [];
    const costGrid: number[][] = [];

    // Get true values for reference
    const trueIntercept = traceData.meta.data.true_intercept;
    const trueSlope = traceData.meta.data.true_slope;

    // Approximate cost surface (simplified - in real implementation, would compute actual cost)
    for (let i = 0; i < gridSize; i++) {
      const intercept = interceptMin + i * interceptStep;
      interceptGrid.push(intercept);
      costGrid.push([]);
      
      for (let j = 0; j < gridSize; j++) {
        const slope = slopeMin + j * slopeStep;
        if (i === 0) slopeGrid.push(slope);
        
        // Simplified cost approximation (distance from true values)
        const interceptDiff = intercept - trueIntercept;
        const slopeDiff = slope - trueSlope;
        const cost = interceptDiff * interceptDiff + slopeDiff * slopeDiff;
        costGrid[i].push(cost);
      }
    }

    return {
      interceptGrid,
      slopeGrid,
      costGrid,
      interceptMin,
      interceptMax,
      slopeMin,
      slopeMax,
    };
  };

  const getGradientDescentPath = (traceData: LinRegTrace, upToIteration: number) => {
    const intercepts: number[] = [];
    const slopes: number[] = [];
    const costs: number[] = [];

    for (let i = 0; i <= Math.min(upToIteration, traceData.steps.length - 1); i++) {
      const step = traceData.steps[i];
      intercepts.push(step.payload.weights[0]);
      slopes.push(step.payload.weights[1] || 0);
      costs.push(step.payload.cost);
    }

    return { intercepts, slopes, costs };
  };

  if (!traceData) {
    return (
      <div className="plot-container" ref={containerRef}>
        <div className="loading">Initialize Linear Regression to see 3D Cost Surface</div>
      </div>
    );
  }

  const surfaceData = computeCostSurface(traceData);
  if (!surfaceData) {
    return (
      <div className="plot-container" ref={containerRef}>
        <div className="loading">Computing cost surface...</div>
      </div>
    );
  }

  const pathData = getGradientDescentPath(traceData, currentIteration);

  // Prepare Plotly traces
  const traces: PlotlyData[] = [];

  // Cost surface
  traces.push({
    type: 'surface',
    x: surfaceData.slopeGrid,
    y: surfaceData.interceptGrid,
    z: surfaceData.costGrid,
    colorscale: 'Viridis',
    showscale: true,
    opacity: 0.8,
    name: 'Cost Surface',
  });

  // Gradient descent path
  if (pathData.intercepts.length > 0) {
    traces.push({
      type: 'scatter3d',
      mode: 'lines+markers',
      x: pathData.slopes,
      y: pathData.intercepts,
      z: pathData.costs,
      line: {
        color: '#ef4444',
        width: 4,
      },
      marker: {
        size: 5,
        color: '#ef4444',
      },
      name: 'Gradient Descent Path',
    });

    // Current point
    if (currentIteration < pathData.intercepts.length) {
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: [pathData.slopes[currentIteration]],
        y: [pathData.intercepts[currentIteration]],
        z: [pathData.costs[currentIteration]],
        marker: {
          size: 10,
          color: '#fbbf24',
          symbol: 'diamond',
        },
        name: `Current (Iter ${currentIteration})`,
      });
    }
  }

  // Optimal point (true values)
  const trueIntercept = traceData.meta.data.true_intercept;
  const trueSlope = traceData.meta.data.true_slope;
  const optimalCost = traceData.cost_history[traceData.cost_history.length - 1] || 0;

  traces.push({
    type: 'scatter3d',
    mode: 'markers',
    x: [trueSlope],
    y: [trueIntercept],
    z: [optimalCost],
    marker: {
      size: 12,
      color: '#10b981',
      symbol: 'star',
    },
    name: 'Optimal (True Values)',
  });

  const layout: PlotlyLayout = {
    title: {
      text: 'Cost Surface (3D) - Parameter Space',
      font: { size: 18 },
    },
    scene: {
      xaxis: { title: 'Slope (w)', range: [surfaceData.slopeMin, surfaceData.slopeMax] },
      yaxis: { title: 'Intercept (b)', range: [surfaceData.interceptMin, surfaceData.interceptMax] },
      zaxis: { title: 'Cost (MSE)' },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 },
      },
    },
    width: dimensions.width,
    height: dimensions.height,
    margin: { l: 0, r: 0, t: 40, b: 0 },
    autosize: true,
  };

  const config: PlotlyConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
  };

  return (
    <div className="plot-container" ref={containerRef}>
      <Plot
        ref={plotRef}
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default CostSurface3D;

