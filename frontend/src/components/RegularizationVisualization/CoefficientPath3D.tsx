// 3D Alpha vs MSE Visualization: Alpha vs Fold Index vs MSE
import React, { useEffect, useRef } from 'react';
// @ts-ignore
import Plot from 'react-plotly.js';
import type { CoefficientPathData } from '../../services/api';

interface CoefficientPath3DProps {
  pathData: CoefficientPathData;
  nFolds?: number;
}

const CoefficientPath3D: React.FC<CoefficientPath3DProps> = ({ pathData, nFolds = 6 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

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

  if (!pathData || !pathData.lambdas || !pathData.mse_path_folds || pathData.mse_path_folds.length === 0) {
    return (
      <div className="plot-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No data available for 3D visualization</p>
      </div>
    );
  }

  // Prepare data for 3D surface plot
  // x-axis: alpha (lambda)
  // y-axis: fold index (1-6)
  // z-axis: MSE

  const lambdas = pathData.lambdas;
  const msePathFolds = pathData.mse_path_folds;
  // Use nFolds prop to limit the number of folds displayed, or use all available folds if nFolds is greater
  const numFolds = Math.min(nFolds, msePathFolds.length);

  // Create traces for each fold
  const traces: Plotly.Data[] = [];

  const foldColors = [
    '#8b5cf6', // purple
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // orange
    '#3b82f6', // blue
    '#ec4899', // pink
  ];

  // Only display folds up to numFolds
  msePathFolds.slice(0, numFolds).forEach((foldMseValues, foldIdx) => {
    traces.push({
      x: lambdas,
      y: Array(lambdas.length).fill(foldIdx + 1), // Fold index (1-numFolds)
      z: foldMseValues,
      type: 'scatter3d',
      mode: 'lines+markers',
      name: `Fold ${foldIdx + 1}`,
      line: {
        color: foldColors[foldIdx % foldColors.length],
        width: 4,
      },
      marker: {
        size: 3,
        color: foldColors[foldIdx % foldColors.length],
      },
      hovertemplate: `<b>Fold ${foldIdx + 1}</b><br>alpha: %{x:.4e}<br>MSE: %{z:.4f}<extra></extra>`,
      hoverlabel: {
        bgcolor: foldColors[foldIdx % foldColors.length],
        bordercolor: foldColors[foldIdx % foldColors.length],
        font: { color: 'white', size: 12 },
        align: 'left',
      },
    } as Plotly.Data);
  });

  // Add mean MSE line (black, thicker) - calculate mean from displayed folds only
  if (msePathFolds.length > 0 && numFolds > 0) {
    // Calculate mean MSE from only the displayed folds
    const displayedFolds = msePathFolds.slice(0, numFolds);
    const meanMseValues = lambdas.map((_, lambdaIdx) => {
      const foldValues = displayedFolds.map(fold => fold[lambdaIdx]);
      return foldValues.reduce((sum, val) => sum + val, 0) / foldValues.length;
    });
    
    const meanYPosition = numFolds > 0 ? (numFolds + 1) / 2 : 0;
    traces.push({
      x: lambdas,
      y: Array(lambdas.length).fill(meanYPosition), // Mean line at center of folds
      z: meanMseValues,
      type: 'scatter3d',
      mode: 'lines+markers',
      name: 'Mean',
      line: {
        color: 'black',
        width: 6,
      },
      marker: {
        size: 4,
        color: 'black',
      },
      hovertemplate: '<b>Mean</b><br>alpha: %{x:.4e}<br>MSE: %{z:.4f}<extra></extra>',
      hoverlabel: {
        bgcolor: 'black',
        bordercolor: 'black',
        font: { color: 'white', size: 12 },
        align: 'left',
      },
    } as Plotly.Data);
  }

  const layout = {
    autosize: true,
    width: dimensions.width > 0 ? dimensions.width : undefined,
    height: dimensions.height > 0 ? dimensions.height : undefined,
    scene: {
      xaxis: {
        title: 'alpha',
        type: 'log',
      },
      yaxis: {
        title: 'Fold Index',
        tickmode: 'linear',
        tick0: 1,
        dtick: 1,
        range: [0.5, numFolds + 1.5], // Show all folds with mean line
      },
      zaxis: {
        title: 'Mean Square Error (MSE)',
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 },
      },
    },
    title: {
      text: `Alpha vs MSE: ${pathData.regularization_type.toUpperCase()} Regularization`,
      font: { size: 16 },
    },
    margin: { l: 0, r: 0, t: 50, b: 0 },
    showlegend: true,
    legend: {
      x: 0.7,
      y: 0.95,
    },
  } as Partial<Plotly.Layout>;

  const config = {
    displayModeBar: true,
    responsive: true,
    useResizeHandler: true,
    autosizable: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false, // Hide Plotly logo
  } as unknown as Plotly.Config;

  return (
    <div 
      ref={containerRef} 
      className="plot-container" 
      style={{ 
        width: '100%', 
        height: '600px',
        minHeight: '600px',
        position: 'relative'
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Plot 
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

export default CoefficientPath3D;
