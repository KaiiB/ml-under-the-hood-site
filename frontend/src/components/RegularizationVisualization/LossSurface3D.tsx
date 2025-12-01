// 3D Loss Surface Visualization Component for Ridge Regression
import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore - react-plotly.js doesn't have complete type definitions
import Plot from 'react-plotly.js';
import type { LossSurfaceData } from '../../services/api';

// Plotly types are complex, using any for flexibility
type PlotlyData = any;
type PlotlyLayout = any;
type PlotlyConfig = any;

interface LossSurface3DProps {
  lossSurfaceData: LossSurfaceData | null;
}

const LossSurface3D: React.FC<LossSurface3DProps> = ({ lossSurfaceData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
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

  if (!lossSurfaceData) {
    return (
      <div className="plot-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>No loss surface data available</p>
      </div>
    );
  }

  const {
    loss_surface,
    w0_grid,
    w1_grid,
    true_intercept,
    true_coef,
    optimal_intercept,
    optimal_coef,
    min_loss,
  } = lossSurfaceData;

  // Prepare Plotly traces
  const traces: PlotlyData[] = [];

  // A. Loss Surface (transparent to see inside)
  traces.push({
    type: 'surface',
    z: loss_surface,
    x: w0_grid,
    y: w1_grid,
    colorscale: 'Viridis',
    opacity: 0.7,
    name: 'Loss Surface',
    hoverinfo: 'skip',
    contours: {
      z: {
        show: true,
        start: 0,
        end: Math.max(...loss_surface.flat()),
        size: 20,
        project_z: true,
        color: 'gray',
      },
    },
  });

  // B. True Parameters (Green X)
  traces.push({
    type: 'scatter3d',
    x: [true_intercept],
    y: [true_coef],
    z: [0],
    mode: 'markers',
    marker: {
      size: 10,
      color: '#00FF00',
      symbol: 'x',
      line: {
        color: 'white',
        width: 2,
      },
    },
    name: 'True Parameters',
    hovertemplate: '<b>[True Parameters]</b><br>Intercept: %{x}<br>Slope: %{y}<extra></extra>',
  });

  // C. Ridge Estimate (Red Diamond)
  traces.push({
    type: 'scatter3d',
    x: [optimal_intercept],
    y: [optimal_coef],
    z: [min_loss],
    mode: 'markers+text',
    marker: {
      size: 15,
      color: '#FF0000',
      symbol: 'diamond',
      line: {
        color: 'white',
        width: 2,
      },
    },
    text: ['Ridge Estimate'],
    textposition: 'top center',
    textfont: {
      size: 12,
      color: 'black',
      family: 'Arial Black',
    },
    name: 'Ridge Estimate',
    hovertemplate:
      '<b>[Ridge Estimate]</b><br>Intercept: %{x:.2f}<br>Slope: %{y:.2f}<br>Loss: %{z:.2f}<extra></extra>',
  });

  // D. Regularization Target (Black Circle)
  traces.push({
    type: 'scatter3d',
    x: [0],
    y: [0],
    z: [0],
    mode: 'markers',
    marker: {
      size: 8,
      color: 'black',
      symbol: 'circle',
      line: {
        color: 'yellow',
        width: 2,
      },
    },
    name: 'Reg. Target (Zero)',
    hovertemplate: '<b>[Reg. Target]</b><br>Origin (0,0)<extra></extra>',
  });

  const layout: PlotlyLayout = {
    title: {
      text: 'Parameter Space (Intercept vs Slope)',
      font: { size: 16 },
    },
    uirevision: 'constant', // Keep view fixed when sliders move
    scene: {
      xaxis: {
        title: 'Intercept (w0)',
        backgroundcolor: 'white',
        gridcolor: 'lightgray',
      },
      yaxis: {
        title: 'Slope (w1)',
        backgroundcolor: 'white',
        gridcolor: 'lightgray',
      },
      zaxis: {
        title: 'Loss Function',
        backgroundcolor: 'white',
        gridcolor: 'lightgray',
      },
      camera: {
        eye: { x: -1.5, y: -1.5, z: 1 },
      },
    },
    width: dimensions.width > 0 ? dimensions.width : undefined,
    height: dimensions.height > 0 ? dimensions.height : undefined,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    autosize: true,
    legend: {
      x: 0.7,
      y: 0.9,
      bgcolor: 'rgba(255,255,255,0.8)',
    },
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

export default LossSurface3D;

