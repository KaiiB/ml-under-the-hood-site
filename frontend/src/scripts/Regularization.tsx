// Regularization Visualization Component
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import * as d3 from 'd3';
import { regularizationAPI } from '../services/api';
import type { CoefficientPathData } from '../services/api';
import CoefficientPath2D from '../components/RegularizationVisualization/CoefficientPath2D';
import CoefficientPath3D from '../components/RegularizationVisualization/CoefficientPath3D';
import LambdaVsMSE2D from '../components/RegularizationVisualization/LambdaVsMSE2D';
import LossSurface3D from '../components/RegularizationVisualization/LossSurface3D';
import '../styles/globals.css';
import '../styles/components.css';

// ==================== HELPER FUNCTIONS ====================

function generatePolyData(seed: number): { X: number[], y: number[] } {
  let seedValue = seed;
  function seededRandom() {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  }
  
  const X: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 30; i++) {
    const x = -3 + (6 * i) / 29;
    const yTrue = 1.0 * x - 0.5 * x * x + 0.1 * x * x * x;
    const noise = (seededRandom() - 0.5) * 1.0;
    X.push(x);
    y.push(yTrue + noise);
  }
  return { X, y };
}

function polynomialFeatures(x: number, deg: number): number[] {
  const features = [1];
  for (let i = 1; i <= deg; i++) {
    features.push(Math.pow(x, i));
  }
  return features;
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < A[0].length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = augmented[i];
    augmented[i] = augmented[maxRow];
    augmented[maxRow] = temp;
    
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  
  return x;
}

function ridgeRegression(X: number[], y: number[], deg: number, lam: number): number[] {
  const p = deg + 1;
  
  const Phi = X.map(x => polynomialFeatures(x, deg));
  const PhiT = transpose(Phi);
  const PhiTPhi = matrixMultiply(PhiT, Phi);
  
  for (let i = 0; i < p; i++) {
    PhiTPhi[i][i] += lam;
  }
  
  const PhiTy = PhiT.map(row => 
    row.reduce((sum, val, i) => sum + val * y[i], 0)
  );
  
  const coeffs = solveLinearSystem(PhiTPhi, PhiTy);
  return coeffs;
}

function lassoRegression(X: number[], y: number[], deg: number, lam: number): number[] {
  let coeffs = ridgeRegression(X, y, deg, lam * 0.1);
  
  const threshold = lam * 0.5;
  coeffs = coeffs.map(c => {
    if (Math.abs(c) < threshold) return 0;
    return c > 0 ? c - threshold : c + threshold;
  });
  
  return coeffs;
}

// ==================== INTERACTIVE D3 VISUALIZATION ====================

function RegularizationViz() {
  const [lambda, setLambda] = useState(0.1);
  const [degree, setDegree] = useState(10);
  const [regType, setRegType] = useState<'ridge' | 'lasso'>('ridge');
  const [showInfo, setShowInfo] = useState(true);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const coeffRef = useRef<SVGSVGElement>(null);
  const errorRef = useRef<SVGSVGElement>(null);
  
  const data = useMemo(() => generatePolyData(42), []);
  
  // Main regression curve plot
  useEffect(() => {
    if (!svgRef.current) return;
    
    const X = data.X;
    const y = data.y;
    const coeffs = regType === 'ridge' 
      ? ridgeRegression(X, y, degree, lambda)
      : lassoRegression(X, y, degree, lambda);
    
    const width = 700;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const xScale = d3.scaleLinear().domain([-3, 3]).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain([-5, 5]).range([height - margin.bottom, margin.top]);
    
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#ffffff');
    
    // Grid
    svg.selectAll('.hgrid').data(yScale.ticks(10)).enter()
      .append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#ecf0f1');
    
    svg.selectAll('.vgrid').data(xScale.ticks(10)).enter()
      .append('line')
      .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
      .attr('y1', margin.top).attr('y2', height - margin.bottom)
      .attr('stroke', '#ecf0f1');
    
    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .attr('color', '#2c3e50');
    
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');
    
    // True function (dashed green)
    const trueLine = d3.line<{x: number, y: number}>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveNatural);
    
    const trueData: {x: number, y: number}[] = [];
    for (let x = -3; x <= 3; x += 0.1) {
      const yTrue = 1.0 * x - 0.5 * x * x + 0.1 * x * x * x;
      trueData.push({ x, y: yTrue });
    }
    
    svg.append('path')
      .datum(trueData)
      .attr('d', trueLine)
      .attr('fill', 'none')
      .attr('stroke', '#27ae60')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.7);
    
    // Predicted curve
    const predData: {x: number, y: number}[] = [];
    for (let x = -3; x <= 3; x += 0.05) {
      const features = polynomialFeatures(x, degree);
      let yPred = 0;
      for (let i = 0; i < Math.min(features.length, coeffs.length); i++) {
        yPred += features[i] * coeffs[i];
      }
      predData.push({ x, y: Math.max(-5, Math.min(5, yPred)) });
    }
    
    svg.append('path')
      .datum(predData)
      .attr('d', trueLine)
      .attr('fill', 'none')
      .attr('stroke', regType === 'ridge' ? '#3498db' : '#e67e22')
      .attr('stroke-width', 3);
    
    // Data points
    svg.selectAll('.data-point')
      .data(X.map((x, i) => ({ x, y: y[i] })))
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5)
      .attr('fill', '#60a5fa')
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    
    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('X');
    
    svg.append('text')
      .attr('x', 20)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 20, ${height / 2})`)
      .text('y');
    
  }, [lambda, degree, regType, data]);
  
  // Coefficient bar chart
  useEffect(() => {
    if (!coeffRef.current) return;
    
    const X = data.X;
    const y = data.y;
    const coeffs = regType === 'ridge' 
      ? ridgeRegression(X, y, degree, lambda)
      : lassoRegression(X, y, degree, lambda);
    
    const width = 700;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    
    const svg = d3.select(coeffRef.current);
    svg.selectAll('*').remove();
    
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#ffffff');
    
    const xScale = d3.scaleBand<number>()
      .domain(coeffs.map((_, i) => i))
      .range([margin.left, width - margin.right])
      .padding(0.2);
    
    const maxAbs = Math.max(Math.abs(Math.min(...coeffs)), Math.abs(Math.max(...coeffs)), 1);
    const yScale = d3.scaleLinear()
      .domain([-maxAbs, maxAbs])
      .range([height - margin.bottom, margin.top]);
    
    // Zero line
    svg.append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#bdc3c7').attr('stroke-width', 2);
    
    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(i => `θ${i}`))
      .attr('color', '#2c3e50');
    
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');
    
    // Bars
    svg.selectAll('.coeff-bar')
      .data(coeffs)
      .enter()
      .append('rect')
      .attr('x', (_, i) => xScale(i) || 0)
      .attr('y', d => d >= 0 ? yScale(d) : yScale(0))
      .attr('width', xScale.bandwidth())
      .attr('height', d => Math.abs(yScale(d) - yScale(0)))
      .attr('fill', (d) => Math.abs(d) < 0.01 ? '#e74c3c' : (regType === 'ridge' ? '#3498db' : '#e67e22'))
      .attr('opacity', 0.8);
    
    // Count zeros
    const numZeros = coeffs.filter(c => Math.abs(c) < 0.01).length;
    
    svg.append('text')
      .attr('x', width - margin.right - 10)
      .attr('y', margin.top + 15)
      .attr('text-anchor', 'end')
      .attr('fill', '#e74c3c')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px')
      .text(`Near-zero coefficients: ${numZeros}/${coeffs.length}`);
    
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('Coefficient Index');
    
    svg.append('text')
      .attr('x', 20)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 20, ${height / 2})`)
      .text('Weight Value');
    
  }, [lambda, degree, regType, data]);
  
  // Train/Test error plot
  useEffect(() => {
    if (!errorRef.current) return;
    
    const lambdaRange: number[] = [];
    const trainErrors: number[] = [];
    const testErrors: number[] = [];
    
    for (let l = 0.001; l <= 10; l *= 1.5) {
      const X = data.X;
      const y = data.y;
      const trainSize = Math.floor(X.length * 0.7);
      
      const XTrain = X.slice(0, trainSize);
      const yTrain = y.slice(0, trainSize);
      const XTest = X.slice(trainSize);
      const yTest = y.slice(trainSize);
      
      const coeffs = regType === 'ridge'
        ? ridgeRegression(XTrain, yTrain, degree, l)
        : lassoRegression(XTrain, yTrain, degree, l);
      
      let trainError = 0;
      XTrain.forEach((x, i) => {
        const features = polynomialFeatures(x, degree);
        let pred = 0;
        for (let j = 0; j < Math.min(features.length, coeffs.length); j++) {
          pred += features[j] * coeffs[j];
        }
        trainError += Math.pow(pred - yTrain[i], 2);
      });
      trainError /= XTrain.length;
      
      let testError = 0;
      XTest.forEach((x, i) => {
        const features = polynomialFeatures(x, degree);
        let pred = 0;
        for (let j = 0; j < Math.min(features.length, coeffs.length); j++) {
          pred += features[j] * coeffs[j];
        }
        testError += Math.pow(pred - yTest[i], 2);
      });
      testError /= XTest.length;
      
      lambdaRange.push(l);
      trainErrors.push(trainError);
      testErrors.push(testError);
    }
    
    const width = 700;
    const height = 250;
    const margin = { top: 20, right: 120, bottom: 50, left: 60 };
    
    const svg = d3.select(errorRef.current);
    svg.selectAll('*').remove();
    
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#ffffff');
    
    const xScale = d3.scaleLog().domain([0.001, 10]).range([margin.left, width - margin.right]);
    const yMax = Math.max(...trainErrors, ...testErrors, 1);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height - margin.bottom, margin.top]);
    
    // Grid
    svg.selectAll('.hgrid').data(yScale.ticks(5)).enter()
      .append('line')
      .attr('x1', margin.left).attr('x2', width - margin.right)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', '#ecf0f1');
    
    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5, '.3f'))
      .attr('color', '#2c3e50');
    
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .attr('color', '#2c3e50');
    
    const line = d3.line<number>()
      .x((_, i) => xScale(lambdaRange[i]))
      .y(d => yScale(d));
    
    // Train error line
    svg.append('path')
      .datum(trainErrors)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#3498db')
      .attr('stroke-width', 3);
    
    // Test error line
    svg.append('path')
      .datum(testErrors)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#e74c3c')
      .attr('stroke-width', 3);
    
    // Current lambda marker
    svg.append('line')
      .attr('x1', xScale(lambda))
      .attr('x2', xScale(lambda))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#f39c12')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');
    
    // Legend
    svg.append('circle').attr('cx', width - 100).attr('cy', 30).attr('r', 5).attr('fill', '#3498db');
    svg.append('text').attr('x', width - 90).attr('y', 35).attr('fill', '#34495e').attr('font-size', '12px').text('Train Error');
    
    svg.append('circle').attr('cx', width - 100).attr('cy', 50).attr('r', 5).attr('fill', '#e74c3c');
    svg.append('text').attr('x', width - 90).attr('y', 55).attr('fill', '#34495e').attr('font-size', '12px').text('Test Error');
    
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .text('Lambda (λ)');
    
    svg.append('text')
      .attr('x', 20)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#34495e')
      .attr('transform', `rotate(-90, 20, ${height / 2})`)
      .text('MSE');
    
  }, [lambda, degree, regType, data]);
  
  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
      {/* Info Panel */}
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
              <h3 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '12px' }}>What is Regularization?</h3>
              <p style={{ color: '#34495e', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                Regularization prevents overfitting by adding a penalty for model complexity. 
                It forces the model to keep weights small, leading to simpler, more generalizable predictions.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ backgroundColor: '#e8f4fd', padding: '12px', borderRadius: '6px', border: '1px solid #bdd7f1' }}>
                  <strong style={{ color: '#2980b9' }}>Ridge (L2)</strong>
                  <p style={{ color: '#5d6d7e', marginTop: '4px', fontSize: '13px' }}>
                    Shrinks coefficients toward zero but never exactly zero. Keeps all features.
                  </p>
                </div>
                <div style={{ backgroundColor: '#fdf2e9', padding: '12px', borderRadius: '6px', border: '1px solid #f5cba7' }}>
                  <strong style={{ color: '#d35400' }}>Lasso (L1)</strong>
                  <p style={{ color: '#5d6d7e', marginTop: '4px', fontSize: '13px' }}>
                    Can push coefficients to exactly zero. Performs automatic feature selection.
                  </p>
                </div>
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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', color: '#34495e', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              Regularization Type
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setRegType('ridge')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: regType === 'ridge' ? '2px solid #3498db' : '1px solid #bdc3c7',
                  backgroundColor: regType === 'ridge' ? '#e8f4fd' : '#fff',
                  color: regType === 'ridge' ? '#2980b9' : '#7f8c8d',
                  fontWeight: regType === 'ridge' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Ridge (L2)
              </button>
              <button
                onClick={() => setRegType('lasso')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: regType === 'lasso' ? '2px solid #e67e22' : '1px solid #bdc3c7',
                  backgroundColor: regType === 'lasso' ? '#fdf2e9' : '#fff',
                  color: regType === 'lasso' ? '#d35400' : '#7f8c8d',
                  fontWeight: regType === 'lasso' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Lasso (L1)
              </button>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', color: '#34495e', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              Lambda (λ): {lambda.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="10"
              step="0.01"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              <span>Weak regularization</span>
              <span>Strong regularization</span>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', color: '#34495e', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
              Polynomial Degree: {degree}
            </label>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={degree}
              onChange={(e) => setDegree(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              <span>Simple</span>
              <span>Complex</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Regression Curve Plot */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Regression Curve Fitting</h4>
        <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
          Green dashed: True function | {regType === 'ridge' ? 'Blue' : 'Orange'} solid: Regularized prediction | Blue dots: Training data
        </p>
        <svg ref={svgRef} width="700" height="400" style={{ width: '100%' }} />
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '13px', color: '#856404', border: '1px solid #ffc107' }}>
          <strong>Observation:</strong> As you increase λ, the curve becomes smoother and simpler. 
          Too large = underfitting (misses the pattern). Too small = overfitting (follows noise)!
        </div>
      </div>
      
      {/* Coefficient Plot */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Model Coefficients (Weights)</h4>
        <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
          Each bar represents a coefficient. Red bars indicate near-zero coefficients.
        </p>
        <svg ref={coeffRef} width="700" height="250" style={{ width: '100%' }} />
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '13px', color: '#856404', border: '1px solid #ffc107' }}>
          <strong>Observation:</strong>{' '}
          <span style={{ color: '#2980b9' }}>Ridge</span> shrinks all coefficients but never to exactly zero.{' '}
          <span style={{ color: '#d35400' }}>Lasso</span> pushes some coefficients to exactly zero — automatic feature selection!
        </div>
      </div>
      
      {/* Error Plot */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px' }}>
        <h4 style={{ color: '#2c3e50', fontWeight: 'bold', marginBottom: '8px' }}>Bias-Variance Tradeoff</h4>
        <p style={{ color: '#7f8c8d', fontSize: '12px', marginBottom: '12px' }}>
          Blue: Train error | Red: Test error | Yellow dashed: Current λ value
        </p>
        <svg ref={errorRef} width="700" height="250" style={{ width: '100%' }} />
        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '13px', color: '#856404', border: '1px solid #ffc107' }}>
          <strong>Observation:</strong> The optimal λ is where Test Error is minimized! 
          The smaller the gap between Train Error and Test Error, the better your model generalizes.
        </div>
      </div>
    </div>
  );
}

interface DatasetConfig {
  n: number;
  seed: number;
  trueCoefficients: number[];
  noiseStd: number;
  xMin: number;
  xMax: number;
}

interface AlgorithmConfig {
  regularizationType: 'ridge' | 'lasso';
  learningRate: number;
  numIters: number;
  fitIntercept: boolean;
}

interface PathConfig {
  lambdaMin: number;
  lambdaMax: number;
  numLambdas: number;
}

// Internal component that handles all the interactive state management
function RegularizationInteractive() {
  // State management
  const [pathData, setPathData] = useState<CoefficientPathData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<'coefficient-path-2d' | 'lambda-vs-mse-2d' | '3d' | 'loss-surface-3d'>('coefficient-path-2d');
  const [selectedLambda, setSelectedLambda] = useState<number | undefined>(undefined);
  const [lossSurfaceData, setLossSurfaceData] = useState<any>(null);
  
  // Loss Surface specific state
  const [lossSurfaceConfig, setLossSurfaceConfig] = useState({
    noiseLevel: 1.0,
    alpha: 0.0,
  });

  // Configuration state
  const [datasetConfig, setDatasetConfig] = useState<DatasetConfig>({
    n: 50,
    seed: 42,
    trueCoefficients: [0.0, 1.0, -0.5, 0.1], // polynomial: y = 0 + 1*x - 0.5*x^2 + 0.1*x^3
    noiseStd: 0.5,
    xMin: -3.0,
    xMax: 3.0,
  });

  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig>({
    regularizationType: 'ridge',
    learningRate: 0.001,
    numIters: 100,
    fitIntercept: true,
  });

  const [pathConfig, setPathConfig] = useState<PathConfig>({
    lambdaMin: 0.01,
    lambdaMax: 10.0,
    numLambdas: 50,
  });

  const [nFolds, setNFolds] = useState<number>(6);

  const [autoCompute, setAutoCompute] = useState<boolean>(false);
  const computeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lossSurfaceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute coefficient path
  const handleComputePath = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        dataset: {
          n: datasetConfig.n,
          seed: datasetConfig.seed,
          true_coefficients: datasetConfig.trueCoefficients,
          noise_std: datasetConfig.noiseStd,
          x_min: datasetConfig.xMin,
          x_max: datasetConfig.xMax,
        },
        algo: {
          regularization_type: algorithmConfig.regularizationType,
          learning_rate: algorithmConfig.learningRate,
          lambda_reg: 0.1, // Not used when compute_path=true, but required by API
          num_iters: algorithmConfig.numIters,
          fit_intercept: algorithmConfig.fitIntercept,
        },
        compute_path: true,
        path_params: {
          lambda_min: pathConfig.lambdaMin,
          lambda_max: pathConfig.lambdaMax,
          num_lambdas: pathConfig.numLambdas,
          n_folds: nFolds, // Number of cross-validation folds
        },
      };

      const data = await regularizationAPI.computeCoefficientPath(request);
      setPathData(data);
      // Set initial selected lambda to optimal lambda (minimum MSE)
      if (data.lambdas && data.lambdas.length > 0 && data.mse_values && data.mse_values.length > 0) {
        const minMSEIdx = data.mse_values.reduce((minIdx, mse, idx) => 
          mse < data.mse_values[minIdx] ? idx : minIdx, 0
        );
        setSelectedLambda(data.lambdas[minMSEIdx]);
      }
    } catch (err) {
      console.error('Failed to compute coefficient path:', err);
      setError(err instanceof Error ? err.message : 'Failed to compute coefficient path');
    } finally {
      setLoading(false);
    }
  }, [datasetConfig, algorithmConfig, pathConfig, nFolds]);

  // Auto-compute when parameters change (with debounce)
  useEffect(() => {
    if (!autoCompute) return;

    // Clear previous timeout
    if (computeTimeoutRef.current) {
      clearTimeout(computeTimeoutRef.current);
    }

    // Set new timeout for debounced computation
    computeTimeoutRef.current = setTimeout(() => {
      handleComputePath();
    }, 500); // 500ms debounce

    return () => {
      if (computeTimeoutRef.current) {
        clearTimeout(computeTimeoutRef.current);
      }
    };
  }, [datasetConfig, algorithmConfig, pathConfig, nFolds, autoCompute, handleComputePath]);

  // Auto-compute when parameters change in 3D mode (with debounce)
  // Only trigger when parameters actually change, not when pathData changes
  useEffect(() => {
    if (visualizationMode === '3d' && pathData) {
      // Clear previous timeout
      if (computeTimeoutRef.current) {
        clearTimeout(computeTimeoutRef.current);
      }

      // Set new timeout for debounced computation
      computeTimeoutRef.current = setTimeout(() => {
        handleComputePath();
      }, 500);

      return () => {
        if (computeTimeoutRef.current) {
          clearTimeout(computeTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nFolds, datasetConfig.n, datasetConfig.noiseStd, pathConfig.lambdaMin, pathConfig.lambdaMax, visualizationMode]);

  // Compute Loss Surface
  const handleComputeLossSurface = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await regularizationAPI.computeLossSurface({
        noise_level: lossSurfaceConfig.noiseLevel,
        alpha: lossSurfaceConfig.alpha,
        n_samples: 50,
        seed: 42,
        w0_range_min: -2.0,
        w0_range_max: 6.0,
        w1_range_min: -1.0,
        w1_range_max: 7.0,
        grid_size: 50,
      });
      setLossSurfaceData(data);
    } catch (err) {
      console.error('Failed to compute loss surface:', err);
      setError(err instanceof Error ? err.message : 'Failed to compute loss surface');
    } finally {
      setLoading(false);
    }
  }, [lossSurfaceConfig]);

  // Auto-compute loss surface when parameters change (with debounce)
  useEffect(() => {
    if (visualizationMode !== 'loss-surface-3d') return;

    // Clear previous timeout
    if (lossSurfaceTimeoutRef.current) {
      clearTimeout(lossSurfaceTimeoutRef.current);
    }

    // Set new timeout for debounced computation
    lossSurfaceTimeoutRef.current = setTimeout(() => {
      handleComputeLossSurface();
    }, 300); // 300ms debounce

    return () => {
      if (lossSurfaceTimeoutRef.current) {
        clearTimeout(lossSurfaceTimeoutRef.current);
      }
    };
  }, [lossSurfaceConfig, visualizationMode, handleComputeLossSurface]);

  // Compute loss surface when switching to loss-surface-3d mode
  useEffect(() => {
    if (visualizationMode === 'loss-surface-3d' && !lossSurfaceData) {
      handleComputeLossSurface();
    }
  }, [visualizationMode]);

  // Find closest lambda index and get corresponding data
  const selectedLambdaData = React.useMemo(() => {
    if (!pathData || !selectedLambda) return null;
    
    const lambdaIdx = pathData.lambdas.reduce((closest, lambda, idx) => {
      return Math.abs(lambda - selectedLambda) < Math.abs(pathData.lambdas[closest] - selectedLambda)
        ? idx
        : closest;
    }, 0);
    
    const weights = pathData.weights_path[lambdaIdx];
    const startIdx = pathData.fit_intercept ? 1 : 0;
    const weightMagnitude = Math.sqrt(
      weights.slice(startIdx).reduce((sum, w) => sum + w * w, 0)
    );
    
    return {
      lambda: pathData.lambdas[lambdaIdx],
      weights,
      loss: pathData.losses[lambdaIdx],
      mse: pathData.mse_values[lambdaIdx],
      reg: pathData.reg_values[lambdaIdx],
      weightMagnitude,
    };
  }, [pathData, selectedLambda]);

  return (
    <div className="main-grid">
      <div className="sidebar">
        <div className="control-section">
          <h3>Dataset Configuration</h3>
          <div className="control-group">
            <label htmlFor="n">Number of Samples</label>
            <input
              id="n"
              type="number"
              min="0"
              max="1000"
              value={datasetConfig.n}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0 && val <= 1000) {
                  setDatasetConfig({ ...datasetConfig, n: val });
                }
              }}
            />
          </div>

          <div className="control-group">
            <label htmlFor="seed">Random Seed</label>
            <input
              id="seed"
              type="number"
              min="0"
              value={datasetConfig.seed}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  setDatasetConfig({ ...datasetConfig, seed: val });
                }
              }}
            />
          </div>

          <div className="control-group">
            <label htmlFor="noiseStd">Noise Standard Deviation</label>
            <div className="slider-container">
              <input
                id="noiseStd"
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={datasetConfig.noiseStd}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 10) {
                    setDatasetConfig({ ...datasetConfig, noiseStd: val });
                  }
                }}
              />
              <span className="slider-value">{datasetConfig.noiseStd.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h3>Algorithm Configuration</h3>
          <div className="control-group">
            <label htmlFor="regularizationType">Regularization Type</label>
            <select
              id="regularizationType"
              value={algorithmConfig.regularizationType}
              onChange={(e) => {
                setAlgorithmConfig({
                  ...algorithmConfig,
                  regularizationType: e.target.value as 'ridge' | 'lasso',
                });
              }}
            >
              <option value="ridge">Ridge (L2)</option>
              <option value="lasso">Lasso (L1)</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="learningRate">Learning Rate</label>
            <input
              id="learningRate"
              type="number"
              min="0.0001"
              max="0.1"
              step="0.0001"
              value={algorithmConfig.learningRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0.0001 && val <= 0.1) {
                  setAlgorithmConfig({ ...algorithmConfig, learningRate: val });
                }
              }}
            />
          </div>

          <div className="control-group">
            <label htmlFor="numIters">Max Iterations</label>
            <input
              id="numIters"
              type="number"
              min="10"
              max="1000"
              value={algorithmConfig.numIters}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 10 && val <= 1000) {
                  setAlgorithmConfig({ ...algorithmConfig, numIters: val });
                }
              }}
            />
          </div>
        </div>

        <div className="control-section">
          <h3>Path Configuration</h3>
          <div className="control-group">
            <label htmlFor="lambdaMin">Lambda Min</label>
            <input
              id="lambdaMin"
              type="number"
              min="0.001"
              max="1.0"
              step="0.001"
              value={pathConfig.lambdaMin}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0.001 && val <= 1.0) {
                  setPathConfig({ ...pathConfig, lambdaMin: val });
                }
              }}
            />
          </div>

          <div className="control-group">
            <label htmlFor="lambdaMax">Lambda Max</label>
            <input
              id="lambdaMax"
              type="number"
              min="1.0"
              max="100.0"
              step="0.1"
              value={pathConfig.lambdaMax}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 1.0 && val <= 100.0) {
                  setPathConfig({ ...pathConfig, lambdaMax: val });
                }
              }}
            />
          </div>

          <div className="control-group">
            <label htmlFor="numLambdas">Number of Lambda Values</label>
            <input
              id="numLambdas"
              type="number"
              min="10"
              max="200"
              value={pathConfig.numLambdas}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 10 && val <= 200) {
                  setPathConfig({ ...pathConfig, numLambdas: val });
                }
              }}
            />
          </div>

        </div>

        <div className="control-section actions">
          <div className="control-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoCompute}
                onChange={(e) => setAutoCompute(e.target.checked)}
              />
              <span>Auto-compute on parameter change</span>
            </label>
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleComputePath} disabled={loading}>
              {loading ? 'Computing...' : 'Compute Coefficient Path'}
            </button>
          </div>
        </div>
      </div>

      <div className="visualization-area">
        {loading && (
          <div className="loading">
            ⏳ Computing coefficient path for {pathConfig.numLambdas} lambda values...
          </div>
        )}

        {error && <div className="error">❌ {error}</div>}

        {!loading && !error && (
          <div>
            {pathData ? (
              <>
                <div className="visualization-mode-selector" style={{ marginBottom: '20px' }}>
                  <button
                    className={`btn ${visualizationMode === 'coefficient-path-2d' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVisualizationMode('coefficient-path-2d')}
                    style={{ marginRight: '10px' }}
                  >
                    2D: Coefficient Path
                  </button>
                  <button
                    className={`btn ${visualizationMode === 'lambda-vs-mse-2d' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVisualizationMode('lambda-vs-mse-2d')}
                    style={{ marginRight: '10px' }}
                  >
                    2D: Alpha vs MSE
                  </button>
                  <button
                    className={`btn ${visualizationMode === '3d' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVisualizationMode('3d')}
                    style={{ marginRight: '10px' }}
                  >
                    3D: Alpha vs MSE
                  </button>
                  <button
                    className={`btn ${visualizationMode === 'loss-surface-3d' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVisualizationMode('loss-surface-3d')}
                  >
                    3D: Loss Surface
                  </button>
                </div>

                {visualizationMode === 'coefficient-path-2d' ? (
                  <CoefficientPath2D
                    pathData={pathData}
                    selectedLambda={selectedLambda}
                    onLambdaChange={setSelectedLambda}
                  />
                ) : visualizationMode === 'lambda-vs-mse-2d' ? (
                  <LambdaVsMSE2D
                    pathData={pathData}
                    selectedLambda={selectedLambda}
                    onLambdaChange={setSelectedLambda}
                  />
                ) : visualizationMode === '3d' ? (
                  <>
                    <div className="control-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', fontWeight: '600', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                        Interactive Controls
                      </h3>
                      
                      <div className="control-group" style={{ marginBottom: '20px' }}>
                        <label htmlFor="n-samples-3d" style={{ fontWeight: '500', fontSize: '14px', display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                          Number of Samples
                        </label>
                        <p style={{ fontSize: '12px', color: '#718096', marginTop: '0', marginBottom: '10px' }}>
                          Adjust the number of data samples used for training and validation.
                        </p>
                        <div className="slider-container">
                          <input
                            id="n-samples-3d"
                            type="range"
                            min="0"
                            max="1000"
                            step="10"
                            value={datasetConfig.n}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 1000) {
                                setDatasetConfig({ ...datasetConfig, n: val });
                              }
                            }}
                          />
                          <span className="slider-value">{datasetConfig.n}</span>
                        </div>
                      </div>

                      <div className="control-group" style={{ marginBottom: '20px' }}>
                        <label htmlFor="noise-std-3d" style={{ fontWeight: '500', fontSize: '14px', display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                          Noise Standard Deviation
                        </label>
                        <p style={{ fontSize: '12px', color: '#718096', marginTop: '0', marginBottom: '10px' }}>
                          Higher noise increases data variability and affects model performance across folds.
                        </p>
                        <div className="slider-container">
                          <input
                            id="noise-std-3d"
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={datasetConfig.noiseStd}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 10) {
                                setDatasetConfig({ ...datasetConfig, noiseStd: val });
                              }
                            }}
                          />
                          <span className="slider-value">{datasetConfig.noiseStd.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="control-group">
                        <label htmlFor="n-folds" style={{ fontWeight: '500', fontSize: '14px', display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                          Number of Folds (K)
                        </label>
                        <p style={{ fontSize: '12px', color: '#718096', marginTop: '0', marginBottom: '10px' }}>
                          Adjust the number of cross-validation folds to see how different data splits affect the MSE across folds.
                        </p>
                        <div className="slider-container">
                          <input
                            id="n-folds"
                            type="range"
                            min="3"
                            max="20"
                            step="1"
                            value={nFolds}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 3 && val <= 20) {
                                setNFolds(val);
                              }
                            }}
                          />
                          <span className="slider-value">{nFolds}</span>
                        </div>
                      </div>
                    </div>

                    <CoefficientPath3D pathData={pathData} nFolds={nFolds} />

                    {/* Student Guide Section for 3D Alpha vs MSE */}
                    <div style={{
                      margin: '20px 0 0',
                      padding: '30px 40px',
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      lineHeight: '1.8',
                      fontFamily: 'sans-serif',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#1a202c' }}>
                        Study Guide: Cross-Validation & Alpha Selection
                      </h3>
                      <p style={{ marginBottom: '20px', color: '#4a5568' }}>
                        This visualization shows how Mean Square Error (MSE) changes across different alpha (regularization strength) values and cross-validation folds.
                      </p>
                      
                      <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                        1. Understanding the 3D Plot
                      </h4>
                      <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#4a5568' }}>
                        <li style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#2d3748' }}>X-axis (Alpha):</strong> Regularization strength on a logarithmic scale. Lower values mean less regularization.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#2d3748' }}>Y-axis (Fold Index):</strong> Each fold represents a different data split used for cross-validation.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#2d3748' }}>Z-axis (MSE):</strong> Mean Square Error - lower values indicate better model performance.
                        </li>
                      </ul>
                      
                      <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                        2. Interpreting Fold Variations
                      </h4>
                      <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#4a5568' }}>
                        <li style={{ marginBottom: '8px' }}>
                          Each colored line represents one fold's MSE across different alpha values.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          The black line shows the mean MSE across all folds, helping identify the optimal alpha value.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          Large variations between folds at a specific alpha indicate model instability or insufficient data.
                        </li>
                      </ul>
                      
                      <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                        3. Adjusting the Number of Folds
                      </h4>
                      <ul style={{ marginBottom: '0', paddingLeft: '20px', color: '#4a5568' }}>
                        <li style={{ marginBottom: '8px' }}>
                          Use the <strong>"Number of Folds (K)"</strong> slider above to change how many times the data is split.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          More folds (higher K) provide more robust estimates but require more computation. Fewer folds are faster but may be less reliable.
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                          After changing the number of folds, click <strong>"Compute Coefficient Path"</strong> to update the visualization.
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    {visualizationMode === 'loss-surface-3d' && (
                      <>
                        <div className="control-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                          <h3 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>Control Panel</h3>
                          
                          <div className="control-group" style={{ marginBottom: '20px' }}>
                            <label htmlFor="noise-level" style={{ fontWeight: 'bold', fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                              1. Noise Level
                            </label>
                            <p style={{ fontSize: '13px', color: '#555', marginTop: '5px', marginBottom: '10px', fontStyle: 'italic' }}>
                              Higher noise flattens the valley, making the solution unstable.
                            </p>
                            <div className="slider-container">
                              <input
                                id="noise-level"
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={lossSurfaceConfig.noiseLevel}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 10) {
                                    setLossSurfaceConfig({ ...lossSurfaceConfig, noiseLevel: val });
                                  }
                                }}
                              />
                              <span className="slider-value">{lossSurfaceConfig.noiseLevel.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="control-group">
                            <label htmlFor="alpha" style={{ fontWeight: 'bold', fontSize: '16px', display: 'block', marginBottom: '5px' }}>
                              2. Regularization Alpha (λ)
                            </label>
                            <p style={{ fontSize: '13px', color: '#555', marginTop: '5px', marginBottom: '10px', fontStyle: 'italic' }}>
                              Stronger regularization pulls the solution towards the origin (Zero).
                            </p>
                            <div className="slider-container">
                              <input
                                id="alpha"
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={lossSurfaceConfig.alpha}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0 && val <= 20) {
                                    setLossSurfaceConfig({ ...lossSurfaceConfig, alpha: val });
                                  }
                                }}
                              />
                              <span className="slider-value">{lossSurfaceConfig.alpha.toFixed(1)}</span>
                            </div>
                          </div>

                        </div>

                        <LossSurface3D lossSurfaceData={lossSurfaceData} />

                        {/* Student Guide Section */}
                        <div style={{
                          margin: '20px 0 0',
                          padding: '30px 40px',
                          width: '100%',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          lineHeight: '1.8',
                          fontFamily: 'sans-serif',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}>
                          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#1a202c' }}>
                            Study Guide: Strong Regularization & Underfitting
                          </h3>
                          <p style={{ marginBottom: '20px', color: '#4a5568' }}>
                            This simulator demonstrates <strong>"How the model changes when Regularization is too strong."</strong>
                          </p>
                          
                          <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                            1. Meaning of the Three Markers
                          </h4>
                          <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#4a5568' }}>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>True Parameters (Green X):</strong> The actual answer (2.0, 3.0) where the data was generated. This is our target destination.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>Regularization Target (Black Circle):</strong> The origin (0,0) where regularization pulls the weights.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>Ridge Estimate (Red Diamond):</strong> The optimal solution calculated by the current model.
                            </li>
                          </ul>
                          
                          <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                            2. Observing "Underfitting"
                          </h4>
                          <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#4a5568' }}>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>Setup:</strong> Set <code style={{ backgroundColor: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>Noise Level</code> to <strong>0</strong> and increase <code style={{ backgroundColor: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>Alpha</code> above <strong>10</strong>.
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>Observation:</strong> The Red Diamond (Model) ignores the True Parameters (Green X) and moves towards the Black Circle (Origin).
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              <strong style={{ color: '#2d3748' }}>Reason:</strong> The model decided that <strong>"Keeping weights close to zero (Regularization)"</strong> is more important than <strong>"Fitting the data correctly."</strong> This is called <strong>Underfitting</strong>.
                            </li>
                          </ul>
                          
                          <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
                            3. Try It Yourself (Shrinkage Effect)
                          </h4>
                          <ul style={{ marginBottom: '0', paddingLeft: '20px', color: '#4a5568' }}>
                            <li style={{ marginBottom: '8px' }}>
                              Slowly move the <code style={{ backgroundColor: '#f7fafc', padding: '2px 6px', borderRadius: '4px' }}>Alpha</code> slider to the left (towards 0).
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                              Watch the Red Diamond escape the Black Circle's gravity and move back towards the Green X. This visualizes the <strong>Shrinkage and Recovery process</strong>.
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </>
                )}

                {selectedLambdaData && visualizationMode !== 'lambda-vs-mse-2d' && visualizationMode !== 'loss-surface-3d' && visualizationMode !== '3d' && (
                  <div className="metric-cards" style={{ marginTop: '20px' }}>
                    <div className="metric-card">
                      <h4>SELECTED LAMBDA</h4>
                      <div className="value">{selectedLambdaData.lambda.toFixed(4)}</div>
                    </div>
                    <div className="metric-card">
                      <h4>LOSS</h4>
                      <div className="value">{selectedLambdaData.loss.toFixed(4)}</div>
                    </div>
                    <div className="metric-card">
                      <h4>MSE</h4>
                      <div className="value">{selectedLambdaData.mse.toFixed(4)}</div>
                    </div>
                    <div className="metric-card">
                      <h4>REGULARIZATION</h4>
                      <div className="value">{selectedLambdaData.reg.toFixed(4)}</div>
                    </div>
                    <div className="metric-card">
                      <h4>WEIGHT MAGNITUDE</h4>
                      <div className="value">{selectedLambdaData.weightMagnitude.toFixed(4)}</div>
                    </div>
                    <div className="metric-card">
                      <h4>COEFFICIENTS</h4>
                      <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                        {selectedLambdaData.weights
                          .slice(pathData.fit_intercept ? 1 : 0)
                          .map((w, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              w{i + 1}: {w.toFixed(4)}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="loading">
                Configure parameters and click "Compute Coefficient Path" to start
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== EDUCATIONAL GUIDE ====================

function RegularizationGuide() {
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
          1. The Problem: Overfitting
        </h2>
        <div className="main-text">
          <p>
            Imagine you're a student who memorizes every answer on past exams instead of understanding the concepts.
            You score perfectly on practice tests, but fail the real exam because you only memorized—you didn't learn.
          </p>
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #e74c3c',
            margin: '20px 0'
          }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: '1.1em' }}>
              Machine learning models face the same problem. A model that fits training data <b>too perfectly</b> 
              often fails on new, unseen data. This is called <b style={{ color: '#e74c3c' }}>Overfitting</b>.
            </p>
          </div>
          <p>
            The key insight: a complex model can memorize noise in the training data. What we want is a model 
            that captures the <b>true underlying pattern</b>, not the random noise.
          </p>
        </div>
      </section>
      
      {/* Section 2: The Solution */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          2. The Solution: Regularization
        </h2>
        <div className="main-text">
          <p>
            Regularization tells the model: <em>"Don't try too hard to fit every point. Keep it simple!"</em>
          </p>
          <p>
            It adds a <b>penalty</b> for complexity to the loss function. The model must balance:
          </p>
          <ul>
            <li><b>Fitting the data well</b> (low prediction error)</li>
            <li><b>Staying simple</b> (small weights)</li>
          </ul>
          <p>
            The regularized loss function becomes:
          </p>
          <BlockMath math={String.raw`J(\theta) = \underbrace{\frac{1}{2m} \sum_{i=1}^{m} \left( h_\theta(x^{(i)}) - y^{(i)} \right)^2}_{\text{Prediction Error (MSE)}} + \underbrace{\lambda \cdot R(\theta)}_{\text{Complexity Penalty}}`} />
          <p>
            where <InlineMath math={String.raw`\lambda`} /> (lambda) controls the tradeoff. Higher <InlineMath math={String.raw`\lambda`} /> = simpler model.
          </p>
        </div>
      </section>
      
      {/* Section 3: Ridge vs Lasso */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          3. Two Flavors: Ridge and Lasso
        </h2>
        <div className="main-text">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={{ padding: '25px', backgroundColor: '#e8f4fd', borderRadius: '12px', border: '2px solid #3498db' }}>
              <h4 style={{ color: '#2980b9', marginBottom: '12px' }}>Ridge Regression (L2)</h4>
              <BlockMath math={String.raw`R(\theta) = \sum_{j=1}^{p} \theta_j^2`} />
              <p style={{ fontSize: '14px', color: '#34495e', marginTop: '12px' }}>
                Penalizes the <b>sum of squared</b> weights. All coefficients shrink toward zero, 
                but <b>never exactly zero</b>. Keeps all features in the model.
              </p>
              <p style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '8px' }}>
                <b>Best for:</b> When you believe all features are relevant but want to reduce their impact.
              </p>
            </div>
            <div style={{ padding: '25px', backgroundColor: '#fdf2e9', borderRadius: '12px', border: '2px solid #e67e22' }}>
              <h4 style={{ color: '#d35400', marginBottom: '12px' }}>Lasso Regression (L1)</h4>
              <BlockMath math={String.raw`R(\theta) = \sum_{j=1}^{p} |\theta_j|`} />
              <p style={{ fontSize: '14px', color: '#34495e', marginTop: '12px' }}>
                Penalizes the <b>sum of absolute</b> weights. Can push coefficients to <b>exactly zero</b>, 
                effectively removing features from the model.
              </p>
              <p style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '8px' }}>
                <b>Best for:</b> When you want automatic feature selection and a sparse model.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Section 4: Interactive Visualization */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          4. See It in Action
        </h2>
        <div className="main-text" style={{ marginBottom: '20px' }}>
          <p>
            The interactive visualization below lets you experiment with regularization in real-time:
          </p>
          <ul>
            <li><b>Polynomial Degree:</b> Higher = more complex model (more potential for overfitting)</li>
            <li><b>Lambda (λ):</b> Higher = stronger regularization (simpler model)</li>
            <li><b>Regularization Type:</b> Compare how Ridge and Lasso affect the coefficients</li>
          </ul>
          <div style={{ 
            backgroundColor: '#d4edda', 
            padding: '15px', 
            borderRadius: '8px', 
            border: '1px solid #28a745',
            marginTop: '15px'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
              <b>Try This:</b> Set the polynomial degree to 10+, then gradually increase λ. 
              Watch how the wiggly overfitted curve becomes smooth!
            </p>
          </div>
        </div>
        
        <RegularizationViz />
      </section>
      
      {/* Section 5: Bias-Variance Tradeoff */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          5. The Bias-Variance Tradeoff
        </h2>
        <div className="main-text">
          <p>
            Regularization controls the fundamental <b>bias-variance tradeoff</b>:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <h5 style={{ color: '#856404', marginBottom: '8px' }}>Low λ (Weak Regularization)</h5>
              <ul style={{ fontSize: '14px', color: '#856404', paddingLeft: '20px', marginBottom: '0' }}>
                <li><b>Low Bias:</b> Model fits training data well</li>
                <li><b>High Variance:</b> Sensitive to noise, poor generalization</li>
                <li>Risk: <b style={{ color: '#e74c3c' }}>Overfitting</b></li>
              </ul>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#cce5ff', borderRadius: '8px', border: '1px solid #007bff' }}>
              <h5 style={{ color: '#004085', marginBottom: '8px' }}>High λ (Strong Regularization)</h5>
              <ul style={{ fontSize: '14px', color: '#004085', paddingLeft: '20px', marginBottom: '0' }}>
                <li><b>High Bias:</b> Model is too simple</li>
                <li><b>Low Variance:</b> Stable but misses patterns</li>
                <li>Risk: <b style={{ color: '#dc3545' }}>Underfitting</b></li>
              </ul>
            </div>
          </div>
          <p>
            The optimal <InlineMath math={String.raw`\lambda`} /> minimizes <b>total error</b> = Bias² + Variance. 
            Use cross-validation to find this sweet spot in practice!
          </p>
        </div>
      </section>
      
      {/* Key Takeaways */}
      <section style={{ marginBottom: '50px' }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '25px', 
          borderRadius: '12px', 
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '16px' }}>Key Takeaways</h3>
          <ol style={{ paddingLeft: '20px', lineHeight: '2', color: '#34495e' }}>
            <li><b>Overfitting</b> happens when models are too complex—they memorize instead of learn.</li>
            <li><b>Regularization</b> adds a penalty for complexity, forcing simpler models.</li>
            <li><b>Ridge (L2)</b> shrinks all weights; <b>Lasso (L1)</b> can eliminate features entirely.</li>
            <li>The optimal <b>λ</b> balances fitting the data vs. staying simple (bias-variance tradeoff).</li>
            <li>Use <b>cross-validation</b> in practice to find the best λ for your data!</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function Regularization() {
  return (
    <div className="container">
      <div className="header">
        <h1>Regularization</h1>
        <p>Preventing Overfitting with Ridge & Lasso</p>
      </div>
      
      {/* Intro Section */}
      <div className="main-text" style={{ marginBottom: '30px' }}>
        <p style={{ fontSize: '1.1em', lineHeight: '1.6' }}>
          In machine learning, more complex models aren't always better. <b>Regularization</b> is a powerful 
          technique that prevents models from becoming overly complex and overfitting to training data.
          It's one of the most important tools in a data scientist's toolkit.
        </p>
      </div>
      
      {/* Educational Content */}
      <RegularizationGuide />
      
      {/* Advanced Interactive Visualization */}
      <div style={{ marginTop: '60px' }}>
        <h2 className="section-title" style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>
          Advanced: Coefficient Path Analysis
        </h2>
        <p className="main-text" style={{ marginBottom: '20px' }}>
          The visualization below shows how coefficients change across the entire range of λ values.
          This is useful for understanding which features remain important as regularization increases.
        </p>
        <RegularizationInteractive />
      </div>
    </div>
  );
}

export default Regularization;
