// 2D Lambda vs MSE Visualization: Lambda vs MSE (Plotly style)
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Plot from 'react-plotly.js';
import type { CoefficientPathData } from '../../services/api';

interface LambdaVsMSE2DProps {
  pathData: CoefficientPathData;
  selectedLambda?: number;
  onLambdaChange?: (lambda: number) => void;
}

const LambdaVsMSE2D: React.FC<LambdaVsMSE2DProps> = ({ 
  pathData, 
  selectedLambda,
  onLambdaChange 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight || 500;
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

  if (!pathData || !pathData.lambdas || pathData.lambdas.length === 0 || !pathData.mse_values) {
    return (
      <div className="plot-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No data available for visualization</p>
      </div>
    );
  }

  const lambdas = pathData.lambdas;
  const mseValues = pathData.mse_values;

  // Find optimal lambda (minimum MSE)
  const minMSEIdx = mseValues.reduce((minIdx, mse, idx) => 
    mse < mseValues[minIdx] ? idx : minIdx, 0
  );
  const optimalLambda = lambdas[minMSEIdx];

  // Create traces
  const traces: Plotly.Data[] = [];
  
  // Add Fold lines (dashed, different colors, opacity 0.5)
  const foldColors = [
    '#8b5cf6', // purple
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // orange
    '#3b82f6', // blue
    '#ec4899', // pink
  ];
  
  if (pathData.mse_path_folds && pathData.mse_path_folds.length > 0) {
    pathData.mse_path_folds.forEach((foldMseValues, foldIdx) => {
      traces.push({
        x: lambdas,
        y: foldMseValues,
        type: 'scatter',
        mode: 'lines',
        name: `Fold: ${foldIdx + 1}`,
        line: {
          color: foldColors[foldIdx % foldColors.length],
          width: 1.5,
          dash: 'dash',
        },
        opacity: 0.5,
        hovertemplate: `<b>Fold: ${foldIdx + 1}</b><br>alpha: %{x:.4e}<br>MSE: %{y:.4f}<extra></extra>`,
        hoverinfo: 'skip', // Use hovertemplate instead
        hoverlabel: {
          bgcolor: foldColors[foldIdx % foldColors.length],
          bordercolor: foldColors[foldIdx % foldColors.length],
          font: { color: 'white', size: 12 },
          align: 'left',
        },
        // Ensure hover works even when zoomed
        connectgaps: false,
      } as Plotly.Data);
    });
  }
  
  // Mean MSE line (solid black, thick) - always on top
  traces.push({
    x: lambdas,
    y: mseValues,
    type: 'scatter',
    mode: 'lines',
    name: 'Mean',
    line: {
      color: 'black',
      width: 3,
    },
    hovertemplate: '<b>Mean</b><br>alpha: %{x:.4e}<br>MSE: %{y:.4f}<extra></extra>',
    hoverinfo: 'skip', // Use hovertemplate instead
    hoverlabel: {
      bgcolor: 'black',
      bordercolor: 'black',
      font: { color: 'white', size: 12 },
      align: 'left',
    },
    // Ensure hover works even when zoomed
    connectgaps: false,
  } as Plotly.Data);

  // Add vertical line for optimal lambda (or selected lambda)
  const lambdaToShow = selectedLambda !== undefined ? selectedLambda : optimalLambda;
  const shapes: Partial<Plotly.Shape>[] = [
    {
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: lambdaToShow,
      y0: 0,
      x1: lambdaToShow,
      y1: 1,
      line: {
        color: 'black',
        width: 2,
        dash: 'dash',
      },
    },
  ];

  const layout = {
    autosize: true,
    width: dimensions.width > 0 ? dimensions.width : undefined,
    height: dimensions.height > 0 ? dimensions.height : undefined,
    xaxis: {
      title: {
        text: 'alpha',
      },
      type: 'log',
      autorange: true, // Autoscale
      fixedrange: false, // Allow zooming
    },
    yaxis: {
      title: {
        text: 'Mean Square Error (MSE)',
      },
      autorange: true, // Autoscale
      fixedrange: false, // Allow zooming
    },
    shapes: shapes,
    hovermode: 'closest' as const, // Show only the closest point (single fold on hover) - works even when zoomed
    showlegend: true,
    // Ensure hover works properly when zoomed
    hoverdistance: -1, // Use default hover distance calculation
    legend: {
      x: 0.7,
      y: 0.95,
    },
    margin: { l: 70, r: 30, t: 50, b: 60 }, // Increase top margin for toolbar
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    // Enable drag-to-zoom
    dragmode: 'zoom', // Enable drag to zoom
  } as Partial<Plotly.Layout>;

  const config = {
    displayModeBar: true, // Show toolbar for zoom, pan, autoscale, etc.
    modeBarButtonsToRemove: ['lasso2d', 'select2d'], // Remove lasso and select
    modeBarButtonsToAdd: [
      // @ts-ignore - Plotly custom button type
      {
        name: 'Reset Axes',
        icon: {
          width: 857.1,
          height: 1000,
          path: 'm214-7h429v71h-429v-71z m500 178h-500v71h500v-71z m-500 178h500v71h-500v-71z m500 178h-500v71h500v-71z m-500 178h500v71h-500v-71z m500 178h-500v71h500v-71z',
          transform: 'matrix(1 0 0 -1 0 1000)',
        },
        click: function(gd: any) {
          // Reset to autoscale
          Plotly.relayout(gd, {
            'xaxis.autorange': true,
            'yaxis.autorange': true,
          });
        },
      },
    ],
    responsive: true,
    useResizeHandler: true,
    autosizable: true,
    displaylogo: false, // Hide Plotly logo
    toImageButtonOptions: {
      format: 'png',
      filename: 'lambda_vs_mse',
      height: 500,
      width: 800,
      scale: 1,
    },
  } as any; // Use 'any' to allow custom button configuration

  // Handle plot click to update selected lambda
  const handlePlotClick = (event: Readonly<Plotly.PlotMouseEvent>) => {
    if (event.points && event.points.length > 0 && event.points[0].x) {
      const clickedLambda = event.points[0].x as number;
      if (onLambdaChange) {
        onLambdaChange(clickedLambda);
      }
    }
  };


  return (
    <div 
      ref={containerRef} 
      className="plot-container" 
      style={{ 
        width: '100%', 
        height: '500px',
        minHeight: '500px',
        position: 'relative'
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <Plot
          data={traces}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          onClick={handlePlotClick}
          useResizeHandler={true}
        />
      ) : (
        <div style={{ padding: '20px', color: 'orange' }}>
          ⚠️ Waiting for container dimensions... (width: {dimensions.width}, height: {dimensions.height})
        </div>
      )}
    </div>
  );
};

export default LambdaVsMSE2D;

