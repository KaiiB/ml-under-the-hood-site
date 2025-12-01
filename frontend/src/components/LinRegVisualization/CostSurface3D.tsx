// 3D Plane Visualization Component for Linear Regression (2 features: x1, x2, y)
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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle window resize with ResizeObserver for better performance
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight || 600;
        setDimensions({
          width: containerWidth,
          height: containerHeight,
        });
      }
    };

    // Initial update
    updateDimensions();

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  if (!traceData) {
    return (
      <div className="plot-container" ref={containerRef} style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">Initialize Linear Regression to see 3D Plane</div>
      </div>
    );
  }

  // Check if we have 2D features (x1, x2) for 3D plane visualization
  const numFeatures = traceData.meta?.d || 1;
  const X = traceData.X; // Raw X data for 3D visualization
  const y = traceData.y; // Raw y data

  if (!X || !y || X.length === 0 || y.length === 0) {
    return (
      <div className="plot-container" ref={containerRef} style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
          ⚠️ 3D Plane visualization requires 2 features (x1, x2).<br />
          <small>Debug: numFeatures={numFeatures}, hasX={X ? 'yes' : 'no'}, hasY={y ? 'yes' : 'no'}</small><br />
          Please set num_features=2 in dataset configuration and click "Run Linear Regression".
        </div>
      </div>
    );
  }

  // Check if X has 2 columns
  if (X[0] && X[0].length !== 2) {
    return (
      <div className="plot-container" ref={containerRef} style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
          ⚠️ 3D Plane visualization requires 2 features (x1, x2).<br />
          <small>Current data has {X[0]?.length || 0} features. Please select 3D mode and run again.</small>
        </div>
      </div>
    );
  }

  // Get current weights from current iteration
  // Find step with weights (skip converged steps that might not have weights)
  let currentStep = traceData.steps?.find(step => step.t === currentIteration && step.payload?.weights);
  if (!currentStep) {
    // Fallback: find the last step with weights
    for (let i = traceData.steps.length - 1; i >= 0; i--) {
      const step = traceData.steps[i];
      if (step.payload?.weights && step.payload.weights.length > 0) {
        currentStep = step;
        break;
      }
    }
  }
  
  if (!currentStep || !currentStep.payload || !currentStep.payload.weights || currentStep.payload.weights.length < 3) {
    return (
      <div className="plot-container" ref={containerRef} style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="error" style={{ padding: '20px', textAlign: 'center' }}>
          ⚠️ Unable to load weights for 3D visualization.<br />
          <small>Please ensure you selected 3D mode and clicked "Run Linear Regression".</small>
        </div>
      </div>
    );
  }

  const weights = currentStep.payload.weights;
  const intercept = weights[0] || 0;
  const w1 = weights[1] || 0;
  const w2 = weights[2] || 0;

  // Extract x1, x2, y from data
  const x1 = X.map((row: number[]) => row[0]);
  const x2 = X.map((row: number[]) => row[1]);
  const yValues = y;

  // Create plane surface
  const x1Range = [Math.min(...x1), Math.max(...x1)];
  const x2Range = [Math.min(...x2), Math.max(...x2)];
  const gridSize = 20;
  
  const x1Grid: number[] = [];
  const x2Grid: number[] = [];
  const yGrid: number[][] = [];
  const xMesh: number[][] = []; // 2D array for x coordinates (x2 values)
  const yMesh: number[][] = []; // 2D array for y coordinates (x1 values)

  // Generate grid values
  for (let i = 0; i < gridSize; i++) {
    const x1Val = x1Range[0] + (x1Range[1] - x1Range[0]) * (i / (gridSize - 1));
    x1Grid.push(x1Val);
    yGrid.push([]);
    xMesh.push([]);
    yMesh.push([]);
    
    for (let j = 0; j < gridSize; j++) {
      const x2Val = x2Range[0] + (x2Range[1] - x2Range[0]) * (j / (gridSize - 1));
      if (i === 0) x2Grid.push(x2Val);
      
      // Plane equation: y = w1*x1 + w2*x2 + b
      const yVal = w1 * x1Val + w2 * x2Val + intercept;
      yGrid[i].push(yVal);
      
      // For Plotly surface: x[i][j] = x2 value, y[i][j] = x1 value
      xMesh[i].push(x2Val);
      yMesh[i].push(x1Val);
    }
  }

  // Prepare Plotly traces
  const traces: PlotlyData[] = [];

  // 1. Data points (scatter3d)
  traces.push({
    type: 'scatter3d',
    mode: 'markers',
    x: x1,
    y: x2,
    z: yValues,
    marker: {
      size: 5,
      color: '#3b82f6',
      opacity: 0.8,
    },
    name: 'Data Points',
  });

  // 2. Predicted plane (surface)
  // For Plotly surface plots, x, y, z must all be 2D arrays
  // x[i][j] = x2 coordinate at grid position (i, j)
  // y[i][j] = x1 coordinate at grid position (i, j)
  // z[i][j] = predicted y value at grid position (i, j)
  traces.push({
    type: 'surface',
    x: xMesh, // 2D array: x2 values
    y: yMesh, // 2D array: x1 values
    z: yGrid, // 2D array: predicted y values
    colorscale: 'Viridis',
    showscale: false,
    opacity: 0.7,
    name: 'Fitted Plane',
  });

  // 3. Residual lines (optional - showing vertical distance from points to plane)
  const residualLines: { x: number[], y: number[], z: number[] }[] = [];
  for (let i = 0; i < x1.length; i++) {
    const x1Val = x1[i];
    const x2Val = x2[i];
    const yActual = yValues[i];
    const yPred = w1 * x1Val + w2 * x2Val + intercept;
    
    // Draw line from point to plane
    residualLines.push({
      x: [x1Val, x1Val],
      y: [x2Val, x2Val],
      z: [yActual, yPred],
    });
  }

  // Add residual lines as a single trace
  if (residualLines.length > 0) {
    residualLines.forEach((line, idx) => {
      traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: line.x,
        y: line.y,
        z: line.z,
        line: {
          color: '#ef4444',
          width: 2,
        },
        showlegend: idx === 0, // Only show legend for first line
        name: 'Residuals (Error)',
        opacity: 0.5,
      });
    });
  }

  const layout: PlotlyLayout = {
    title: {
      text: `3D Plane Regression (Iteration ${currentIteration})<br><sub>y = ${w1.toFixed(3)}·x₁ + ${w2.toFixed(3)}·x₂ + ${intercept.toFixed(3)}</sub>`,
      font: { size: 16 },
    },
    scene: {
      xaxis: { title: 'x₁ (Feature 1)' },
      yaxis: { title: 'x₂ (Feature 2)' },
      zaxis: { title: 'y (Target)' },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 },
      },
    },
    width: dimensions.width > 0 ? dimensions.width : undefined,
    height: dimensions.height > 0 ? dimensions.height : undefined,
    margin: { l: 0, r: 0, t: 60, b: 0 },
    autosize: true,
  };

  const config: PlotlyConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    useResizeHandler: true,
    autosizable: true,
  };

  return (
    <div
      ref={containerRef}
      className="plot-container"
      style={{
        width: '100%',
        height: '600px',
        minHeight: '600px',
        position: 'relative',
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Plot
          ref={plotRef}
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      )}
    </div>
  );
};

export default CostSurface3D;
