// Main Linear Regression Visualization Component
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import Plot from 'react-plotly.js';
import * as d3 from 'd3';
import { linRegAPI, type LinRegTrace } from '../services/api';
import type { DatasetConfig, AlgorithmConfig, VisualizationConfig } from '../types/linreg';
import ControlPanel from '../components/LinRegVisualization/ControlPanel';
import D3Plot2D from '../components/LinRegVisualization/D3Plot2D';
import IterationControls from '../components/LinRegVisualization/IterationControls';
import MetricCards from '../components/LinRegVisualization/MetricCards';
import CostHistoryPlot from '../components/LinRegVisualization/CostHistoryPlot';
import CostSurface3D from '../components/LinRegVisualization/CostSurface3D';
import '../styles/globals.css';
import '../styles/components.css';

// Helper function to compute cost
function computeCost(X: number[], y: number[], theta0: number, theta1: number): number {
  const m = X.length;
  let sum = 0;
  for (let i = 0; i < m; i++) {
    const prediction = theta0 + theta1 * X[i];
    const error = prediction - y[i];
    sum += error * error;
  }
  return sum / (2 * m);
}

// Helper function to generate data (US style: sqft and price in $1000s)
function generateData(
  n: number = 50,
  seed: number = 42,
  trueSlope: number = 0.15,
  trueIntercept: number = 2.0,
  noiseStd: number = 1.5,
  xMin: number = 500.0,
  xMax: number = 1000.0
): { X: number[], y: number[] } {
  // Seeded random number generator (same as numpy)
  let seedValue = seed;
  const randomValues: number[] = [];
  
  // Pre-generate enough random values
  for (let i = 0; i < n * 3; i++) {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    randomValues.push(seedValue / 233280);
  }
  
  let randomIdx = 0;
  function seededRandom() {
    return randomValues[randomIdx++];
  }
  
  const X: number[] = [];
  const y: number[] = [];
  
  // Generate X uniformly
  for (let i = 0; i < n; i++) {
    const x = xMin + (xMax - xMin) * seededRandom();
    X.push(x);
  }
  
  // Generate y with noise
  for (let i = 0; i < n; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.max(0.0001, seededRandom()); // Avoid log(0)
    const u2 = seededRandom();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const noise = z0 * noiseStd;
    y.push(trueIntercept + trueSlope * X[i] + noise);
  }
  
  return { X, y };
}

// Helper function to extract X and y from trace data or use defaults
function extractDataFromTrace(traceData: LinRegTrace | null): { X: number[], y: number[], meta: any } {
  // If traceData exists, try to extract from it
  if (traceData && traceData.meta?.data) {
    const meta = traceData.meta.data;
    const n = traceData.meta.n || 50;
    const xMin = meta.x_min ?? 500.0;
    const xMax = meta.x_max ?? 1000.0;
    const seed = traceData.params?.seed || 42;
    const trueSlope = meta.true_slope ?? 0.15;
    const trueIntercept = meta.true_intercept ?? 2.0;
    const noiseStd = meta.noise_std ?? 1.5;
    
    const data = generateData(n, seed, trueSlope, trueIntercept, noiseStd, xMin, xMax);
    return { ...data, meta };
  }
  
  // Default data (US style: sqft and price in $1000s)
  return {
    ...generateData(50, 42, 0.15, 2.0, 1.5, 500.0, 1000.0),
    meta: {
      true_slope: 0.15,
      true_intercept: 2.0,
      noise_std: 1.5,
      x_min: 500.0,
      x_max: 1000.0
    }
  };
}

// Individual plot components with improved styling
function ScatterPlot({ X, y }: { X: number[], y: number[] }) {
  const plotData = useMemo(() => [{
    x: X,
    y: y,
    mode: 'markers' as const,
    type: 'scatter' as const,
    marker: {
      color: '#3498db',
      size: 10,
      opacity: 0.7,
      line: { color: '#2980b9', width: 1 }
    },
    name: 'Data Points'
  }], [X, y]);
  
  const layout = useMemo(() => ({
    title: {
      text: 'Apartment Size vs Price',
      font: { size: 18, family: 'Arial, sans-serif', color: '#2c3e50' }
    },
    xaxis: { 
      title: { text: 'Size (sq ft)', font: { size: 14, color: '#34495e' } },
      showgrid: true, 
      gridcolor: '#ecf0f1',
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: '#bdc3c7',
      linewidth: 2
    },
    yaxis: { 
      title: { text: 'Price ($1000s)', font: { size: 14, color: '#34495e' } },
      showgrid: true, 
      gridcolor: '#ecf0f1',
      gridwidth: 1,
      zeroline: false,
      showline: true,
      linecolor: '#bdc3c7',
      linewidth: 2
    },
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#f8f9fa',
    margin: { l: 70, r: 30, t: 60, b: 60 },
    height: 450,
    showlegend: false
  }), []);
  
  return <Plot 
    data={plotData} 
    layout={layout} 
    config={{ 
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false,
      responsive: true,
      toImageButtonOptions: {
        format: 'png',
        filename: 'scatter-plot',
        height: 450,
        width: 800,
        scale: 1
      }
    }} 
    style={{ width: '100%' }} 
  />;
}

function CandidateLinesPlot({ xMin, xMax }: { xMin: number, xMax: number }) {
  const [slope, setSlope] = useState<number>(0.15);
  const [yAtCenter, setYAtCenter] = useState<number>(115.0); // y-value at x=750 (center)
  
  // Center point for rotation - makes slope changes more intuitive
  const xCenter = (xMin + xMax) / 2; // 750 for range 500-1000
  
  // Generate data with higher variance for better residual visualization
  const spreadData = useMemo(() => {
    const newX: number[] = [];
    const newY: number[] = [];
    const trueSlope = 0.15;
    const trueYAtCenter = 115.0; // y at x=750
    const highNoiseStd = 25; // Much higher noise for visible residuals
    
    // Seeded random for consistency
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    // Generate 30 points with high variance
    for (let i = 0; i < 30; i++) {
      const x = xMin + (xMax - xMin) * (i / 29) + (seededRandom() - 0.5) * 100;
      // y = y_center + slope * (x - x_center)
      const yTrue = trueYAtCenter + trueSlope * (x - xCenter);
      const noise = (seededRandom() - 0.5) * 2 * highNoiseStd;
      newX.push(x);
      newY.push(yTrue + noise);
    }
    return { X: newX, y: newY };
  }, [xMin, xMax, xCenter]);
  
  const plotData = useMemo(() => {
    const dataX = spreadData.X;
    const dataY = spreadData.y;
    
    const xLine = Array.from({ length: 100 }, (_, i) => {
      const t = i / 99;
      return xMin + (xMax - xMin) * t;
    });
    // Line pivots around (xCenter, yAtCenter) - slope changes rotate, yAtCenter changes shift
    const yLine = xLine.map(x => yAtCenter + slope * (x - xCenter));
    
    // Calculate errors using centered equation
    const errors = dataX.map((x, i) => {
      const pred = yAtCenter + slope * (x - xCenter);
      return dataY[i] - pred;
    });
    const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
    
    // Error lines (residuals) - thicker and more visible
    const errorLines: any[] = [];
    dataX.forEach((x, i) => {
      const pred = yAtCenter + slope * (x - xCenter);
      const isAbove = dataY[i] > pred;
      errorLines.push({
        x: [x, x],
        y: [dataY[i], pred],
        mode: 'lines' as const,
        type: 'scatter' as const,
        line: { 
          color: isAbove ? '#e74c3c' : '#9b59b6', // Red above, purple below
          width: 3, 
          dash: 'dash' 
        },
        showlegend: false,
        opacity: 0.8,
        hoverinfo: 'skip' as const
      });
    });
    
    return {
      data: [
        ...errorLines,
        {
          x: dataX,
          y: dataY,
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: { color: '#3498db', size: 12, opacity: 0.8, line: { color: '#2980b9', width: 2 } },
          name: 'Data Points'
        },
        {
          x: xLine,
          y: yLine,
          mode: 'lines' as const,
          type: 'scatter' as const,
          line: { color: '#2ecc71', width: 4 },
          name: `ŷ = ${yAtCenter.toFixed(1)} + ${slope.toFixed(3)}(x - ${xCenter.toFixed(0)})`
        }
      ],
      layout: {
        title: {
          text: `MSE = ${mse.toFixed(2)} | Adjust the line to minimize residuals!`,
          font: { size: 16, family: 'Arial, sans-serif', color: '#2c3e50' }
        },
        xaxis: { 
          title: { text: 'Size (sq ft)', font: { size: 14, color: '#34495e' } },
          showgrid: true, 
          gridcolor: '#ecf0f1',
          showline: true,
          linecolor: '#bdc3c7',
          linewidth: 2
        },
        yaxis: { 
          title: { text: 'Price ($1000s)', font: { size: 14, color: '#34495e' } },
          showgrid: true, 
          gridcolor: '#ecf0f1',
          showline: true,
          linecolor: '#bdc3c7',
          linewidth: 2
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#f8f9fa',
        margin: { l: 70, r: 30, t: 80, b: 60 },
        height: 450,
        showlegend: true,
        legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(255,255,255,0.9)' },
        annotations: [
          {
            x: 0.5,
            y: -0.15,
            xref: 'paper',
            yref: 'paper',
            text: '🔴 Red = Point above line | 🟣 Purple = Point below line',
            showarrow: false,
            font: { size: 12, color: '#7f8c8d' }
          }
        ]
      },
      mse
    };
  }, [spreadData, xMin, xMax, xCenter, slope, yAtCenter]);
  
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        gap: '30px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#34495e' }}>
            Slope (θ₁): {slope.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.05"
            max="0.25"
            step="0.001"
            value={slope}
            onChange={(e) => setSlope(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '11px', color: '#7f8c8d' }}>Rotates line angle</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#34495e' }}>
            Y at center (θ₀): {yAtCenter.toFixed(1)}
          </label>
          <input
            type="range"
            min="80"
            max="150"
            step="1"
            value={yAtCenter}
            onChange={(e) => setYAtCenter(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '11px', color: '#7f8c8d' }}>Shifts line up/down</span>
        </div>
      </div>
      <Plot 
        data={plotData.data} 
        layout={plotData.layout} 
        config={{ 
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          displaylogo: false,
          responsive: true
        }} 
        style={{ width: '100%' }} 
      />
    </div>
  );
}

function CostFunctionPlots({ X, y, trueIntercept, trueSlope }: { X: number[], y: number[], trueIntercept: number, trueSlope: number }) {
  const costSurface = useMemo(() => {
    const theta0Min = Math.max(-5, trueIntercept - 3);
    const theta0Max = Math.min(10, trueIntercept + 5);
    const theta1Min = Math.max(0, trueSlope - 0.1);
    const theta1Max = Math.min(0.5, trueSlope + 0.2);
    
    const theta0Range = Array.from({ length: 50 }, (_, i) => theta0Min + (theta0Max - theta0Min) * i / 49);
    const theta1Range = Array.from({ length: 50 }, (_, i) => theta1Min + (theta1Max - theta1Min) * i / 49);
    
    const costValues: number[][] = [];
    const theta0Grid: number[][] = [];
    
    theta1Range.forEach((theta1) => {
      const costRow: number[] = [];
      const theta0Row: number[] = [];
      
      theta0Range.forEach((theta0) => {
        costRow.push(computeCost(X, y, theta0, theta1));
        theta0Row.push(theta0);
      });
      
      costValues.push(costRow);
      theta0Grid.push(theta0Row);
    });
    
    return {
      data: [{
        z: costValues,
        x: theta0Grid[0],
        y: theta1Range,
        type: 'surface' as const,
        colorscale: 'Viridis',
        showscale: true,
        colorbar: { title: { text: 'Cost J(θ)', font: { size: 12 } } }
      }],
      layout: {
        title: {
          text: 'Cost Function Surface',
          font: { size: 18, family: 'Arial, sans-serif', color: '#2c3e50' }
        },
        scene: {
          xaxis: { title: { text: 'θ₀ (Intercept)', font: { size: 12 } }, backgroundcolor: '#ffffff', gridcolor: '#ecf0f1' },
          yaxis: { title: { text: 'θ₁ (Slope)', font: { size: 12 } }, backgroundcolor: '#ffffff', gridcolor: '#ecf0f1' },
          zaxis: { title: { text: 'Cost J(θ)', font: { size: 12 } }, backgroundcolor: '#ffffff', gridcolor: '#ecf0f1' },
          camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
          bgcolor: '#f8f9fa'
        },
        margin: { l: 0, r: 0, t: 60, b: 0 },
        height: 500,
        paper_bgcolor: '#f8f9fa'
      }
    };
  }, [X, y, trueIntercept, trueSlope]);
  
  return (
    <div style={{ marginTop: '20px' }}>
      <Plot 
        data={costSurface.data} 
        layout={costSurface.layout} 
        config={{ 
          displayModeBar: true,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          displaylogo: false,
          responsive: true
        }} 
        style={{ width: '100%' }} 
      />
    </div>
  );
}

// Interactive D3-based Gradient Descent Visualization
function GradientDescentViz() {
  const [isRunning, setIsRunning] = useState(false);
  const [learningRate, setLearningRate] = useState(0.01); // Lower default for stability
  const [showInfo, setShowInfo] = useState(true);
  const [theta0, setTheta0] = useState(-1);
  const [theta1, setTheta1] = useState(0);
  const [history, setHistory] = useState<{ t0: number, t1: number, loss: number }[]>([]);
  const [iteration, setIteration] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  
  const lossLandscapeRef = useRef<SVGSVGElement>(null);
  const convergenceRef = useRef<SVGSVGElement>(null);
  const regressionRef = useRef<SVGSVGElement>(null);
  const lrComparisonRef = useRef<SVGSVGElement>(null);

  // Generate seeded data for consistent visualization
  const vizData = useMemo(() => {
    const vizX: number[] = [];
    const vizY: number[] = [];
    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    for (let i = 0; i < 30; i++) {
      const x = i / 3;
      const yTrue = 2 * x + 1; // True: y = 2x + 1
      const noise = (seededRandom() - 0.5) * 2;
      vizX.push(x);
      vizY.push(yTrue + noise);
    }
    return { X: vizX, y: vizY };
  }, []);

  const computeLoss = (t0: number, t1: number, dataX: number[], dataY: number[]) => {
    let loss = 0;
    for (let i = 0; i < dataX.length; i++) {
      const pred = t0 + t1 * dataX[i];
      loss += Math.pow(pred - dataY[i], 2);
    }
    return loss / (2 * dataX.length);
  };

  const computeGradient = (t0: number, t1: number, dataX: number[], dataY: number[]) => {
    let grad0 = 0;
    let grad1 = 0;
    const m = dataX.length;
    
    for (let i = 0; i < m; i++) {
      const pred = t0 + t1 * dataX[i];
      const error = pred - dataY[i];
      grad0 += error;
      grad1 += error * dataX[i];
    }
    
    return { dt0: grad0 / m, dt1: grad1 / m };
  };

  const step = () => {
    const grad = computeGradient(theta0, theta1, vizData.X, vizData.y);
    const newTheta0 = theta0 - learningRate * grad.dt0;
    const newTheta1 = theta1 - learningRate * grad.dt1;
    
    // Prevent divergence - stop if parameters become too large or NaN
    if (isNaN(newTheta0) || isNaN(newTheta1) || Math.abs(newTheta0) > 100 || Math.abs(newTheta1) > 100) {
      setIsRunning(false);
      return;
    }
    
    setTheta0(newTheta0);
    setTheta1(newTheta1);
    setHistory(prev => [...prev, { t0: newTheta0, t1: newTheta1, loss: computeLoss(newTheta0, newTheta1, vizData.X, vizData.y) }]);
    setIteration(prev => prev + 1);
    
    const loss = computeLoss(newTheta0, newTheta1, vizData.X, vizData.y);
    setCurrentLoss(loss);
    
    if (Math.abs(grad.dt0) < 0.001 && Math.abs(grad.dt1) < 0.001) {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setTheta0(-1);
    setTheta1(0);
    setHistory([]);
    setIteration(0);
    setCurrentLoss(computeLoss(-1, 0, vizData.X, vizData.y));
  };

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => step(), 100);
    return () => clearInterval(timer);
  }, [isRunning, theta0, theta1, learningRate]);

  // Loss Landscape D3 Visualization
  useEffect(() => {
    if (!lossLandscapeRef.current) return;

    const width = 400;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    const svg = d3.select(lossLandscapeRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff');

    const dataX = vizData.X;
    const dataY = vizData.y;
    const n = dataX.length;
    const sumX = dataX.reduce((a, b) => a + b, 0);
    const sumY = dataY.reduce((a, b) => a + b, 0);
    const sumXY = dataX.reduce((sum, x, i) => sum + x * dataY[i], 0);
    const sumX2 = dataX.reduce((sum, x) => sum + x * x, 0);
    
    const optTheta1 = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const optTheta0 = (sumY - optTheta1 * sumX) / n;

    const t0Scale = d3.scaleLinear().domain([-3, 5]).range([margin.left, width - margin.right]);
    const t1Scale = d3.scaleLinear().domain([-1, 5]).range([height - margin.bottom, margin.top]);

    // Draw contour levels
    const contourLevels = [1, 2, 5, 10, 20, 40, 80];
    contourLevels.forEach((level, idx) => {
      const points: [number, number][] = [];
      for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
        const dt0 = Math.sqrt(level * 0.5) * Math.cos(angle);
        const dt1 = Math.sqrt(level * 0.2) * Math.sin(angle);
        points.push([t0Scale(optTheta0 + dt0), t1Scale(optTheta1 + dt1)]);
      }
      
      svg.append('path')
        .datum(points)
        .attr('d', d3.line())
        .attr('fill', 'none')
        .attr('stroke', d3.interpolateBlues(0.3 + idx * 0.1))
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.6);
    });

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(t0Scale))
      .attr('color', '#2c3e50');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(t1Scale))
      .attr('color', '#2c3e50');

    // Optimal point (green)
    svg.append('circle')
      .attr('cx', t0Scale(optTheta0))
      .attr('cy', t1Scale(optTheta1))
      .attr('r', 6)
      .attr('fill', '#22c55e')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Path history (orange)
    if (history.length > 0) {
      const pathLine = d3.line<{ t0: number, t1: number }>()
        .x(d => t0Scale(d.t0))
        .y(d => t1Scale(d.t1));

      svg.append('path')
        .datum(history)
        .attr('d', pathLine)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);

      history.forEach((point, i) => {
        if (i % 5 === 0 || i === history.length - 1) {
          svg.append('circle')
            .attr('cx', t0Scale(point.t0))
            .attr('cy', t1Scale(point.t1))
            .attr('r', 3)
            .attr('fill', '#f59e0b')
            .attr('opacity', 0.6);
        }
      });
    }

    // Current position (red)
    svg.append('circle')
      .attr('cx', t0Scale(theta0))
      .attr('cy', t1Scale(theta1))
      .attr('r', 8)
      .attr('fill', '#ef4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Gradient arrow (blue)
    const grad = computeGradient(theta0, theta1, vizData.X, vizData.y);
    const arrowLen = 0.5;
    
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#3b82f6');

    svg.append('line')
      .attr('x1', t0Scale(theta0))
      .attr('y1', t1Scale(theta1))
      .attr('x2', t0Scale(theta0 - grad.dt0 * arrowLen))
      .attr('y2', t1Scale(theta1 - grad.dt1 * arrowLen))
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead)');

    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('θ₀ (intercept)');

    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 15, ${height / 2})`)
      .text('θ₁ (slope)');

  }, [theta0, theta1, history, vizData]);

  // Convergence Graph
  useEffect(() => {
    if (!convergenceRef.current) return;

    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const svg = d3.select(convergenceRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff');

    if (history.length === 0) return;

    const xScale = d3.scaleLinear()
      .domain([0, history.length - 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...history.map(h => h.loss))])
      .range([height - margin.bottom, margin.top]);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#2c3e50');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');

    const line = d3.line<{ loss: number }>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d.loss));

    svg.append('path')
      .datum(history)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    svg.selectAll('.loss-point')
      .data(history)
      .enter()
      .append('circle')
      .attr('cx', (_, i) => xScale(i))
      .attr('cy', d => yScale(d.loss))
      .attr('r', 3)
      .attr('fill', '#60a5fa')
      .attr('opacity', 0.6);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('Iteration');

    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 15, ${height / 2})`)
      .text('Loss (MSE)');

  }, [history]);

  // Regression Line Plot
  useEffect(() => {
    if (!regressionRef.current) return;

    const width = 400;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };

    const svg = d3.select(regressionRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff');

    const dataX = vizData.X;
    const dataY = vizData.y;

    const xScale = d3.scaleLinear()
      .domain([0, Math.max(...dataX)])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, Math.max(...dataY) + 2])
      .range([height - margin.bottom, margin.top]);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#2c3e50');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');

    // Data points
    svg.selectAll('.data-point')
      .data(dataX.map((x, i) => ({ x, y: dataY[i] })))
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5)
      .attr('fill', '#60a5fa')
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Current regression line (red)
    const x0 = 0;
    const x1 = Math.max(...dataX);
    const y0 = theta0 + theta1 * x0;
    const y1 = theta0 + theta1 * x1;

    svg.append('line')
      .attr('x1', xScale(x0))
      .attr('y1', yScale(y0))
      .attr('x2', xScale(x1))
      .attr('y2', yScale(y1))
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3);

    // Optimal line (green dashed)
    const n = dataX.length;
    const sumX = dataX.reduce((a, b) => a + b, 0);
    const sumY = dataY.reduce((a, b) => a + b, 0);
    const sumXY = dataX.reduce((sum, x, i) => sum + x * dataY[i], 0);
    const sumX2 = dataX.reduce((sum, x) => sum + x * x, 0);
    
    const optTheta1 = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const optTheta0 = (sumY - optTheta1 * sumX) / n;

    const optY0 = optTheta0 + optTheta1 * x0;
    const optY1 = optTheta0 + optTheta1 * x1;

    svg.append('line')
      .attr('x1', xScale(x0))
      .attr('y1', yScale(optY0))
      .attr('x2', xScale(x1))
      .attr('y2', yScale(optY1))
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('X');

    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 15, ${height / 2})`)
      .text('y');

  }, [theta0, theta1, vizData]);

  // Learning Rate Comparison
  useEffect(() => {
    if (!lrComparisonRef.current) return;

    const width = 820;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };

    const svg = d3.select(lrComparisonRef.current);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#ffffff');

    const learningRates = [0.01, 0.1, 0.5, 1.0];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const maxIter = 50;

    const allLosses: { lr: number, losses: number[], color: string }[] = [];

    learningRates.forEach((lr, idx) => {
      let t0 = -2;
      let t1 = 3;
      const losses: number[] = [];

      for (let i = 0; i < maxIter; i++) {
        const loss = computeLoss(t0, t1, vizData.X, vizData.y);
        losses.push(loss);
        
        const grad = computeGradient(t0, t1, vizData.X, vizData.y);
        t0 = t0 - lr * grad.dt0;
        t1 = t1 - lr * grad.dt1;

        if (loss > 1000 || isNaN(loss)) break;
      }

      allLosses.push({ lr, losses, color: colors[idx] });
    });

    const xScale = d3.scaleLinear()
      .domain([0, maxIter - 1])
      .range([margin.left, width - margin.right]);

    const maxLoss = Math.min(100, Math.max(...allLosses.flatMap(a => a.losses)));
    const yScale = d3.scaleLinear()
      .domain([0, maxLoss])
      .range([height - margin.bottom, margin.top]);

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#2c3e50');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');

    allLosses.forEach(({ losses, color }) => {
      const line = d3.line<number>()
        .x((_, i) => xScale(i))
        .y(d => yScale(Math.min(d, maxLoss)));

      svg.append('path')
        .datum(losses)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2);
    });

    // Legend
    learningRates.forEach((lr, idx) => {
      svg.append('circle')
        .attr('cx', width - 150)
        .attr('cy', 30 + idx * 20)
        .attr('r', 5)
        .attr('fill', colors[idx]);

      svg.append('text')
        .attr('x', width - 140)
        .attr('y', 35 + idx * 20)
        .attr('fill', '#34495e')
        .attr('font-size', '12px')
        .text(`LR = ${lr}`);
    });

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('Iteration');

    svg.append('text')
      .attr('x', 15)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 15, ${height / 2})`)
      .text('Loss (MSE)');

  }, [vizData]);

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
      {/* Pseudocode Panel - Collapsible */}
      {showInfo && (
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '24px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '12px' }}>Gradient Descent Algorithm</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px', 
                fontFamily: 'monospace', 
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#2c3e50'
              }}>
                <div><span style={{ color: '#7f8c8d' }}>while</span> not converged:</div>
                <div style={{ marginLeft: '20px' }}>gradient = compute_gradient(data, θ)</div>
                <div style={{ marginLeft: '20px' }}>θ_new = θ_old - learning_rate × gradient</div>
              </div>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              style={{ color: '#7f8c8d', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', marginLeft: '12px' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '16px' }}>Controls</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#34495e', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              Learning Rate (α): {learningRate.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="0.1"
              step="0.001"
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              <span>Slow (stable)</span>
              <span>Fast (risky)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: isRunning ? '#e74c3c' : '#3498db'
              }}
            >
              {isRunning ? 'Pause' : 'Run'}
            </button>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #bdc3c7',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#7f8c8d',
                backgroundColor: '#fff'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: 600 }}>Iterations</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{iteration}</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: 600 }}>Current Loss</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{currentLoss.toFixed(4)}</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px', fontWeight: 600 }}>Parameters</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>θ₀={theta0.toFixed(2)}, θ₁={theta1.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Visualizations - 2x2 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Loss Landscape */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Loss Landscape (Contour Map)</h4>
          <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
            Red: Current | Green: Optimal | Orange: Path | Blue Arrow: Gradient
          </p>
          <svg ref={lossLandscapeRef} width="400" height="400" style={{ width: '100%' }} />
        </div>

        {/* Convergence Graph */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Loss Over Iterations</h4>
          <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
            Loss decreases as parameters converge to optimal values
          </p>
          <svg ref={convergenceRef} width="400" height="300" style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Regression Line */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Regression Fit (Real-time)</h4>
          <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
            Red: Current model | Green dashed: Optimal fit
          </p>
          <svg ref={regressionRef} width="400" height="300" style={{ width: '100%' }} />
        </div>

        {/* Learning Rate Comparison */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
          <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Learning Rate Comparison</h4>
          <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
            Different learning rates affect convergence speed
          </p>
          <svg ref={lrComparisonRef} width="820" height="300" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

function FinalFitPlot({ X, y, traceData, xMin, xMax, trueIntercept, trueSlope }: { X: number[], y: number[], traceData: LinRegTrace | null, xMin: number, xMax: number, trueIntercept: number, trueSlope: number }) {
  const plotData = useMemo(() => {
    let finalIntercept = 0;
    let finalSlope = 0;
    
    if (traceData && traceData.final_weights) {
      finalIntercept = traceData.final_weights.intercept ?? 0;
      finalSlope = traceData.final_weights.slope ?? 0;
    } else if (traceData && traceData.steps && traceData.steps.length > 0) {
      // Extract from last step with weights
      for (let i = traceData.steps.length - 1; i >= 0; i--) {
        const step = traceData.steps[i];
        if (step.payload && step.payload.weights && step.payload.weights.length >= 2) {
          finalIntercept = step.payload.weights[0] ?? 0;
          finalSlope = step.payload.weights[1] ?? 0;
          break;
        }
      }
    }
    
    // Fallback: compute using gradient descent
    if ((finalIntercept === 0 && finalSlope === 0) || isNaN(finalIntercept) || isNaN(finalSlope)) {
      let theta0 = 0.0;
      let theta1 = 0.0;
      const learningRate = 0.001;
      const m = X.length;
      
      for (let iter = 0; iter < 1000; iter++) {
        let dTheta0 = 0;
        let dTheta1 = 0;
        
        for (let i = 0; i < m; i++) {
          const prediction = theta0 + theta1 * X[i];
          const error = prediction - y[i];
          dTheta0 += error;
          dTheta1 += error * X[i];
        }
        
        dTheta0 /= m;
        dTheta1 /= m;
        
        theta0 -= learningRate * dTheta0;
        theta1 -= learningRate * dTheta1;
      }
      
      finalIntercept = theta0;
      finalSlope = theta1;
    }
    
    const xLine = Array.from({ length: 100 }, (_, i) => {
      const t = i / 99;
      return xMin + (xMax - xMin) * t;
    });
    const yPred = xLine.map(x => finalIntercept + finalSlope * x);
    const yTrue = xLine.map(x => trueIntercept + trueSlope * x);
    
    return {
      data: [
        {
          x: X,
          y: y,
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: { color: '#3498db', size: 10, opacity: 0.7, line: { color: '#2980b9', width: 1 } },
          name: 'Data'
        },
        {
          x: xLine,
          y: yPred,
          mode: 'lines' as const,
          type: 'scatter' as const,
          line: { color: '#e74c3c', width: 4 },
          name: `Predicted: y = ${finalIntercept.toFixed(2)} + ${finalSlope.toFixed(3)}x`,
          hovertemplate: 'Predicted: %{y:.2f}<extra></extra>'
        },
        {
          x: xLine,
          y: yTrue,
          mode: 'lines' as const,
          type: 'scatter' as const,
          line: { color: '#3498db', width: 4, dash: 'dash' as const },
          name: `True: y = ${trueIntercept.toFixed(2)} + ${trueSlope.toFixed(3)}x`,
          hovertemplate: 'True: %{y:.2f}<extra></extra>'
        }
      ],
      layout: {
        title: {
          text: 'Final Linear Regression Fit',
          font: { size: 18, family: 'Arial, sans-serif', color: '#2c3e50' }
        },
        xaxis: { 
          title: { text: 'Size (sq ft)', font: { size: 14, color: '#34495e' } },
          showgrid: true, 
          gridcolor: '#ecf0f1',
          showline: true,
          linecolor: '#bdc3c7',
          linewidth: 2
        },
        yaxis: { 
          title: { text: 'Price ($1000s)', font: { size: 14, color: '#34495e' } },
          showgrid: true, 
          gridcolor: '#ecf0f1',
          showline: true,
          linecolor: '#bdc3c7',
          linewidth: 2
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#f8f9fa',
        margin: { l: 70, r: 30, t: 60, b: 60 },
        height: 450,
        showlegend: true,
        legend: { x: 1.02, y: 1, bgcolor: 'rgba(255,255,255,0.8)' }
      }
    };
  }, [X, y, traceData, xMin, xMax, trueIntercept, trueSlope]);
  
  return <Plot 
    data={plotData.data} 
    layout={plotData.layout} 
    config={{ 
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false,
      responsive: true
    }} 
    style={{ width: '100%', marginTop: '20px' }} 
  />;
}

// Educational Guide Component - Storytelling Style
function LinearRegressionGuide({ traceData }: { traceData: LinRegTrace | null }) {
  const dataWithMeta = useMemo(() => extractDataFromTrace(traceData), [traceData]);
  const { X, y, meta } = dataWithMeta;
  const trueSlope = meta?.true_slope || 0.15;
  const trueIntercept = meta?.true_intercept || 2.0;
  const xMin = meta?.x_min || 500.0;
  const xMax = meta?.x_max || 1000.0;
  
  return (
    <div style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      color: '#333',
      lineHeight: '1.7'
    }}>
      {/* Section 1: The Problem */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          1. The Problem: Predicting the Unseen
        </h2>
        <div className="main-text">
          <p>
            Imagine you are a data scientist at a real estate firm. You have historical data of 
            <b> Apartment Sizes</b> (in square feet) and their <b>Selling Prices</b> (in thousands of dollars).
          </p>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #2c3e50',
            margin: '20px 0'
          }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: '1.1em' }}>
              "If a new apartment is <b>750 sq ft</b>, how much will it sell for?"
            </p>
          </div>
          <p>
            To answer this, we need a model that describes the relationship between Size (<InlineMath math={String.raw`x`} />) and Price (<InlineMath math={String.raw`y`} />). 
            The simplest model is a <b>straight line</b>.
          </p>
          <p>
            Let's first visualize our data:
          </p>
        </div>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <ScatterPlot X={X} y={y} />
        </div>
      </section>

      {/* Section 2: Which Line is Best */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          2. Which Line is Best?
        </h2>
        <div className="main-text">
          <p>
            We can draw many different lines through the data. But which one is the "best"?
          </p>
          <p>
            Consider three candidate lines, each with different parameters <InlineMath math={String.raw`\theta_0`} /> (intercept) and <InlineMath math={String.raw`\theta_1`} /> (slope):
          </p>
          <BlockMath math={String.raw`h_\theta(x) = \theta_0 + \theta_1 x`} />
          <p>
            The <b style={{ color: '#e74c3c' }}>red dashed lines</b> show the <b>residuals</b> (errors) between our predictions and the actual data points. 
            We want to minimize these errors.
          </p>
          <p>
            The <b>Mean Squared Error (MSE)</b> quantifies how well a line fits the data:
          </p>
          <BlockMath math={String.raw`\text{MSE} = \frac{1}{m} \sum_{i=1}^{m} \left( h_\theta(x^{(i)}) - y^{(i)} \right)^2`} />
          <p>
            The line with the <b>smallest MSE</b> is the best fit. Compare the MSE values below:
          </p>
        </div>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <CandidateLinesPlot xMin={xMin} xMax={xMax} />
        </div>
      </section>

      {/* Section 3: Cost Function */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          3. The Cost Function: Measuring Error
        </h2>
        <div className="main-text">
          <p>
            We define the <b>Cost Function</b> <InlineMath math={String.raw`J(\theta_0, \theta_1)`} /> to measure how "wrong" our line is. 
            For linear regression, we use the Mean Squared Error (with a factor of <InlineMath math={String.raw`\frac{1}{2}`} /> for mathematical convenience):
          </p>
          <BlockMath math={String.raw`J(\theta_0, \theta_1) = \frac{1}{2m} \sum_{i=1}^{m} \left( h_\theta(x^{(i)}) - y^{(i)} \right)^2`} />
          <p>
            Where <InlineMath math={String.raw`m`} /> is the number of data points, and <InlineMath math={String.raw`h_\theta(x) = \theta_0 + \theta_1 x`} /> is our prediction.
          </p>
          <p>
            The 3D surface plot shows how the cost changes as we vary <InlineMath math={String.raw`\theta_0`} /> and <InlineMath math={String.raw`\theta_1`} />. 
            The <b>lowest point</b> in this "bowl" corresponds to the optimal parameters.
          </p>
          <p>
            The contour plot shows the same information from above—the concentric circles represent lines of equal cost. 
            Our goal is to reach the center (the minimum).
          </p>
        </div>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <CostFunctionPlots X={X} y={y} trueIntercept={trueIntercept} trueSlope={trueSlope} />
        </div>
      </section>

      {/* Section 4: Gradient Descent */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          4. Finding the Minimum: Gradient Descent
        </h2>
        <div className="main-text">
          <p>
            Instead of trying every possible combination of <InlineMath math={String.raw`\theta_0`} /> and <InlineMath math={String.raw`\theta_1`} />, 
            we use <b>Gradient Descent</b> to automatically find the minimum.
          </p>
          <p>
            The algorithm works like this:
          </p>
          <ol>
            <li>Start at a random point on the cost surface</li>
            <li>Look at the <b>gradient</b> (slope) to see which direction goes "downhill"</li>
            <li>Take a small step in that direction</li>
            <li>Repeat until you reach the bottom</li>
          </ol>
          <p>
            The update rule is:
          </p>
          <BlockMath math={String.raw`\theta_j := \theta_j - \alpha \frac{\partial}{\partial \theta_j} J(\theta)`} />
          <p>
            For linear regression, the partial derivatives are:
          </p>
          <BlockMath math={String.raw`\begin{aligned}
            \frac{\partial J}{\partial \theta_0} &= \frac{1}{m}\sum_{i=1}^{m}\left(h_\theta(x^{(i)}) - y^{(i)}\right) \\[10pt]
            \frac{\partial J}{\partial \theta_1} &= \frac{1}{m}\sum_{i=1}^{m}\left(h_\theta(x^{(i)}) - y^{(i)}\right) \cdot x^{(i)}
          \end{aligned}`} />
          <p>
            So the update equations become:
          </p>
          <BlockMath math={String.raw`\begin{aligned}
            \theta_0 &:= \theta_0 - \alpha \frac{1}{m}\sum_{i=1}^{m}\left(h_\theta(x^{(i)}) - y^{(i)}\right) \\[10pt]
            \theta_1 &:= \theta_1 - \alpha \frac{1}{m}\sum_{i=1}^{m}\left(h_\theta(x^{(i)}) - y^{(i)}\right) \cdot x^{(i)}
          \end{aligned}`} />
          <p>
            The 3D surface plot below shows the <b>cost landscape</b>. Imagine a ball rolling down this bowl-shaped surface. 
            Gradient descent finds the path that takes the ball from any starting point to the bottom (minimum cost). 
            The <b>lowest point</b> in this "bowl" corresponds to the optimal parameters where our model fits the data best.
          </p>
        </div>
        
        <GradientDescentViz />
      </section>

      {/* Section 5: Final Fit */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          5. The Final Model
        </h2>
        <div className="main-text">
          <p>
            After running gradient descent, we obtain the optimal parameters <InlineMath math={String.raw`\theta_0^*`} /> and <InlineMath math={String.raw`\theta_1^*`} />. 
            The final model is:
          </p>
          <BlockMath math={String.raw`h_{\theta^*}(x) = \theta_0^* + \theta_1^* x`} />
          <p>
            Compare the <b style={{ color: '#e74c3c' }}>predicted line</b> (red) with the <b style={{ color: '#3498db' }}>true line</b> (blue dashed). 
            How close did we get?
          </p>
        </div>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
          <FinalFitPlot X={X} y={y} traceData={traceData} xMin={xMin} xMax={xMax} trueIntercept={trueIntercept} trueSlope={trueSlope} />
        </div>
      </section>

      {/* Section 6: Learning Rate */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          6. The Learning Rate: Step Size Matters
        </h2>
        <div className="main-text">
          <p>
            The <b>learning rate</b> <InlineMath math={String.raw`\alpha`} /> controls how big each step is during gradient descent. 
            Think of it like walking down a hill:
          </p>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '25px', 
            borderRadius: '12px', 
            margin: '25px 0',
            borderLeft: '4px solid #3498db'
          }}>
            <ul style={{ margin: 0, paddingLeft: '25px', lineHeight: '2' }}>
              <li style={{ marginBottom: '15px' }}>
                <b>Too Small</b> (<InlineMath math={String.raw`\alpha = 0.0001`} />): 
                Like taking tiny steps. You'll eventually reach the bottom, but it takes forever! 
                The algorithm converges very slowly, requiring many iterations.
              </li>
              <li style={{ marginBottom: '15px' }}>
                <b>Too Large</b> (<InlineMath math={String.raw`\alpha = 0.1`} />): 
                Like taking giant leaps. You might overshoot the bottom and bounce around, or even jump out of the valley entirely! 
                The algorithm might overshoot the minimum and never settle, or even diverge.
              </li>
              <li>
                <b>Just Right</b> (<InlineMath math={String.raw`\alpha = 0.01`} />): 
                Like taking confident, steady steps. You move efficiently toward the bottom without overshooting. 
                This gives steady, efficient convergence to the minimum.
              </li>
            </ul>
          </div>
          <p>
            In the interactive tool below, you can experiment with different learning rates and see how they affect 
            the convergence speed. Watch how the prediction line evolves: with a good learning rate, it smoothly 
            approaches the true line. With a learning rate that's too high, it might oscillate or diverge. 
            With one that's too low, it moves painfully slowly.
          </p>
        </div>
      </section>

    </div>
  );
}

// Internal component that handles all the interactive state management
function LinRegInteractive() {
  // State management
  const [traceData, setTraceData] = useState<LinRegTrace | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration state
  const [datasetConfig, setDatasetConfig] = useState<DatasetConfig>({
    n: 100,
    seed: 42,
    trueSlope: 2.0,
    trueIntercept: -1.0,
    noiseStd: 0.5,
    xMin: -5.0,
    xMax: 5.0,
    dimensions: 2, // Default to 2D
  });

  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig>({
    learningRate: 0.01,
    numIters: 100,
    fitIntercept: true,
  });

  const [visualizationConfig, setVisualizationConfig] = useState<VisualizationConfig>({
    showTrueLine: true,
    showDataPoints: true,
    showPredictionLine: true,
  });

  // Computed values
  const currentStep = useMemo(() => {
    if (!traceData || !traceData.steps || traceData.steps.length === 0) {
      return null;
    }
    // Find the step at currentIteration, but skip "converged" steps that don't have weights
    const step = traceData.steps[Math.min(currentIteration, traceData.steps.length - 1)];
    // If the step doesn't have weights, find the last valid step
    if (step && (!step.payload || !step.payload.weights)) {
      // Find the last step with weights
      for (let i = Math.min(currentIteration, traceData.steps.length - 1); i >= 0; i--) {
        const s = traceData.steps[i];
        if (s.payload && s.payload.weights && s.payload.weights.length > 0) {
          return s;
        }
      }
    }
    return step;
  }, [traceData, currentIteration]);

  const totalIterations = useMemo(() => {
    if (!traceData || !traceData.steps) return 0;
    // Find the last "update" step (not "converged" which has no weights)
    for (let i = traceData.steps.length - 1; i >= 0; i--) {
      if (traceData.steps[i].type === 'update' || traceData.steps[i].type === 'init') {
        return i;
      }
    }
    return traceData.steps.length - 1;
  }, [traceData]);

  // Don't reset trace data when dimensions change - same data can be viewed in 2D or 3D
  // Just reset iteration to 0 when switching dimensions
  useEffect(() => {
    if (traceData) {
      setCurrentIteration(0);
    }
  }, [datasetConfig.dimensions]);

  // Initialize Linear Regression
  const handleInitialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        dataset: {
          n: datasetConfig.n,
          seed: datasetConfig.seed,
          true_slope: datasetConfig.trueSlope,
          true_intercept: datasetConfig.trueIntercept,
          noise_std: datasetConfig.noiseStd,
          x_min: datasetConfig.xMin,
          x_max: datasetConfig.xMax,
          num_features: datasetConfig.dimensions === 3 ? 2 : 1, // 3D mode uses 2 features
          true_weights: datasetConfig.dimensions === 3 ? [datasetConfig.trueSlope, 1.0] : null,
        },
        algo: {
          learning_rate: algorithmConfig.learningRate,
          num_iters: algorithmConfig.numIters,
          fit_intercept: algorithmConfig.fitIntercept,
        },
      };

      const trace = await linRegAPI.runLinRegTrace(request);
      setTraceData(trace);
      setCurrentIteration(0);
    } catch (err) {
      console.error('Failed to initialize Linear Regression:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Linear Regression');
    } finally {
      setLoading(false);
    }
  }, [datasetConfig, algorithmConfig]);

  // Iteration navigation
  const handleIterationChange = useCallback((iteration: number) => {
    if (traceData && iteration >= 0 && iteration <= totalIterations) {
      setCurrentIteration(iteration);
    }
  }, [traceData, totalIterations]);

  const handlePrevious = useCallback(() => {
    if (currentIteration > 0) {
      setCurrentIteration(currentIteration - 1);
    }
  }, [currentIteration]);

  const handleNext = useCallback(() => {
    if (currentIteration < totalIterations) {
      setCurrentIteration(currentIteration + 1);
    }
  }, [currentIteration, totalIterations]);

  const handleFirst = useCallback(() => {
    setCurrentIteration(0);
  }, []);

  const handleLast = useCallback(() => {
    if (traceData && totalIterations >= 0) {
      setCurrentIteration(totalIterations);
    }
  }, [traceData, totalIterations]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevious, handleNext]);

  return (
    <div className="main-grid">
      <div className="sidebar">
        <ControlPanel
          datasetConfig={datasetConfig}
          algorithmConfig={algorithmConfig}
          visualizationConfig={visualizationConfig}
          onDatasetConfigChange={(config) => {
            setDatasetConfig({ ...datasetConfig, ...config });
          }}
          onAlgorithmConfigChange={(config) => {
            setAlgorithmConfig({ ...algorithmConfig, ...config });
          }}
          onVisualizationConfigChange={(config) => {
            setVisualizationConfig({ ...visualizationConfig, ...config });
          }}
          onInitialize={handleInitialize}
        />
      </div>

      <div className="visualization-area">
        {loading && (
          <div className="loading">
            ⏳ Loading data and running Linear Regression...
          </div>
        )}

        {error && <div className="error">❌ {error}</div>}

        {!loading && !error && (
          <div>
            {traceData && (
              <>
                <IterationControls
                  currentIteration={currentIteration}
                  totalIterations={totalIterations}
                  onIterationChange={handleIterationChange}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onFirst={handleFirst}
                  onLast={handleLast}
                />

                <MetricCards
                  traceData={traceData}
                  step={currentStep}
                  currentIteration={currentIteration}
                />

                <div style={{ marginTop: '0' }}>
                  {datasetConfig.dimensions === 2 ? (
                  <>
                    {currentStep ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <D3Plot2D
                          traceData={traceData}
                          step={currentStep}
                          currentIteration={currentIteration}
                          config={visualizationConfig}
                          seed={datasetConfig.seed}
                        />
                        <CostHistoryPlot 
                          traceData={traceData} 
                          currentIteration={currentIteration}
                        />
                      </div>
                    ) : (
                      <div className="loading">Loading visualization...</div>
                    )}
                  </>
                ) : (
                  traceData ? (
                    <CostSurface3D 
                      traceData={traceData} 
                      currentIteration={currentIteration}
                    />
                  ) : (
                    <div className="loading">Loading 3D visualization...</div>
                  )
                )}
                </div>
              </>
            )}

            {!traceData && (
              <div className="loading">
                Configure parameters and click "Run Linear Regression" to start
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LinReg() {
  const [traceData, setTraceData] = useState<LinRegTrace | null>(null);

  // Load initial data for educational visualizations
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const request = {
          dataset: {
            n: 50,
            seed: 42,
            true_slope: 0.15,
            true_intercept: 2.0,
            noise_std: 1.5,
            x_min: 500.0,
            x_max: 1000.0,
            num_features: 1,
            true_weights: null,
          },
          algo: {
            learning_rate: 0.001,
            num_iters: 1000,
            fit_intercept: true,
          },
        };
        const trace = await linRegAPI.runLinRegTrace(request);
        setTraceData(trace);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>Linear Regression</h1>
        <p>Interactive Step-by-Step Visualization & Learning Platform</p>
      </div>

      {/* Intro Section */}
      <div className="main-text" style={{ marginBottom: '30px' }}>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
          Linear Regression is one of the most fundamental algorithms in machine learning. 
          It models the relationship between variables by fitting a straight line to data, 
          allowing us to make predictions about future observations.
        </p>
      </div>

      {/* Educational Content with Visualizations */}
      <LinearRegressionGuide traceData={traceData} />

      {/* Interactive Visualization */}
      <div style={{ marginTop: '60px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
          Interactive Experimentation
        </h2>
        <p className="main-text" style={{ marginBottom: '20px' }}>
          Now that you understand the theory, experiment with the interactive tool below. 
          Adjust parameters and watch how gradient descent finds the optimal line.
        </p>
        <LinRegInteractive />
      </div>

      {/* Understanding the Interactive Controls - Card Slider */}
      <InteractiveControlsGuide />
    </div>
  );
}

// Interactive Controls Guide Component with Card Slider
function InteractiveControlsGuide() {
  const [currentCard, setCurrentCard] = useState<number>(0);
  
  const cards = [
    {
      title: 'Learning Rate (α)',
      color: '#2980b9',
      content: (
        <>
          <p style={{ fontSize: '1.1em', margin: 0, lineHeight: '1.8' }}>
            Determines the <b>step size</b> during gradient descent optimization.
          </p>
          <br />
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            <b>Too Small:</b> The algorithm converges very slowly, requiring many iterations.
          </p>
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            <b>Too Large:</b> The algorithm might overshoot the minimum and fail to converge.
          </p>
        </>
      )
    },
    {
      title: 'Noise Standard Deviation',
      color: '#27ae60',
      content: (
        <>
          <p style={{ fontSize: '1.1em', margin: 0, lineHeight: '1.8' }}>
            Controls the amount of randomness added to the data points.
          </p>
          <br />
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            <b>Low Noise:</b> Data points form a clear linear pattern. Easy to fit.
          </p>
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            <b>High Noise:</b> Data points are scattered. The underlying relationship is harder to discover.
          </p>
        </>
      )
    },
    {
      title: 'Number of Iterations',
      color: '#8e44ad',
      content: (
        <>
          <p style={{ fontSize: '1.1em', margin: 0, lineHeight: '1.8' }}>
            How many gradient descent steps the algorithm takes.
          </p>
          <br />
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            Watch how the prediction line evolves from a random initial guess to the optimal fit as you step through iterations.
          </p>
        </>
      )
    },
    {
      title: 'True Slope & Intercept',
      color: '#e67e22',
      content: (
        <>
          <p style={{ fontSize: '1.1em', margin: 0, lineHeight: '1.8' }}>
            The actual parameters used to generate the data.
          </p>
          <br />
          <p style={{ fontSize: '1em', margin: 0, lineHeight: '1.8' }}>
            Compare these with the final learned parameters to see how well the algorithm recovered the true relationship.
          </p>
        </>
      )
    }
  ];
  
  return (
    <div style={{ marginTop: '60px', marginBottom: '60px' }}>
      <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
        Understanding the Interactive Controls
      </h2>
      
      <div style={{ 
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        padding: '60px 80px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {/* Card Content */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h3 style={{ 
            fontSize: '2em', 
            fontWeight: 600, 
            color: cards[currentCard].color,
            marginBottom: '30px'
          }}>
            {cards[currentCard].title}
          </h3>
          <div style={{ fontSize: '1.1em', lineHeight: '1.8', color: '#333' }}>
            {cards[currentCard].content}
          </div>
        </div>
        
        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '20px',
          marginTop: '40px'
        }}>
          <button
            onClick={() => setCurrentCard((prev) => (prev > 0 ? prev - 1 : cards.length - 1))}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#34495e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c3e50'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
          >
            ← Previous
          </button>
          
          <div style={{ 
            display: 'flex', 
            gap: '10px',
            alignItems: 'center'
          }}>
            {cards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentCard(idx)}
                style={{
                  width: idx === currentCard ? '30px' : '12px',
                  height: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: idx === currentCard ? cards[currentCard].color : '#bdc3c7',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentCard((prev) => (prev < cards.length - 1 ? prev + 1 : 0))}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#34495e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c3e50'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34495e'}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default LinReg;
