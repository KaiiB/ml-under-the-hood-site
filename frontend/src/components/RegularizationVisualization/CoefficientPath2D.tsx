// 2D Coefficient Path Visualization: Log(Lambda) vs Coefficient Value
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CoefficientPathData } from '../../services/api';

interface CoefficientPath2DProps {
  pathData: CoefficientPathData;
  selectedLambda?: number;
  onLambdaChange?: (lambda: number) => void;
}

const CoefficientPath2D: React.FC<CoefficientPath2DProps> = ({ 
  pathData, 
  selectedLambda,
  onLambdaChange 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pathData || !pathData.weights_path || pathData.weights_path.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 60, left: 80 };

    svg.attr('width', width).attr('height', height);

    const lambdas = pathData.lambdas;
    const numCoeffs = pathData.weights_path[0].length;
    const startIdx = pathData.fit_intercept ? 1 : 0; // Skip bias if fit_intercept
    const numFeatures = numCoeffs - startIdx;

    // Extract coefficient values for each lambda
    const coefficientPaths: number[][] = [];
    for (let i = 0; i < numFeatures; i++) {
      coefficientPaths.push(
        pathData.weights_path.map((weights) => weights[startIdx + i])
      );
    }

    // Create scales
    const xScale = d3
      .scaleLog()
      .domain(d3.extent(lambdas) as [number, number])
      .nice()
      .range([margin.left, width - margin.right]);

    // Find min and max coefficient values across all features
    const allCoeffs = coefficientPaths.flat();
    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(allCoeffs) as [number, number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 45)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text('Lambda (λ) - Log Scale');

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text('Coefficient Value');

    // Color scale for different coefficients
    const colors = d3.schemeCategory10;
    
    // Draw paths for each coefficient
    coefficientPaths.forEach((coeffPath, coeffIdx) => {
      const line = d3
        .line<number>()
        .x((_, i) => xScale(lambdas[i]))
        .y((d) => yScale(d))
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(coeffPath)
        .attr('fill', 'none')
        .attr('stroke', colors[coeffIdx % colors.length])
        .attr('stroke-width', 2)
        .attr('d', line)
        .style('opacity', 0.8);

      // Add label for each coefficient
      if (coeffPath.length > 0) {
        const lastX = xScale(lambdas[lambdas.length - 1]);
        const lastY = yScale(coeffPath[coeffPath.length - 1]);
        
        svg
          .append('text')
          .attr('x', lastX + 5)
          .attr('y', lastY)
          .attr('fill', colors[coeffIdx % colors.length])
          .style('font-size', '12px')
          .style('font-weight', '600')
          .text(`w${coeffIdx + 1}`);
      }
    });

    // Draw vertical line for selected lambda
    if (selectedLambda !== undefined) {
      const selectedX = xScale(selectedLambda);
      svg
        .append('line')
        .attr('x1', selectedX)
        .attr('x2', selectedX)
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .style('opacity', 0.7);
    }

    // Add interactive lambda selector
    const lambdaSelector = svg
      .append('rect')
      .attr('x', margin.left)
      .attr('y', height - margin.bottom - 20)
      .attr('width', width - margin.left - margin.right)
      .attr('height', 20)
      .attr('fill', 'rgba(59, 130, 246, 0.1)')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    const initialLambda = selectedLambda !== undefined 
      ? selectedLambda 
      : lambdas[Math.floor(lambdas.length / 2)];
    
    const lambdaIndicator = svg
      .append('circle')
      .attr('cx', xScale(initialLambda))
      .attr('cy', height - margin.bottom - 10)
      .attr('r', 6)
      .attr('fill', '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    const updateLambda = (event: MouseEvent) => {
      const [x] = d3.pointer(event, container);
      const lambda = xScale.invert(x);
      const clampedLambda = Math.max(lambdas[0], Math.min(lambdas[lambdas.length - 1], lambda));
      
      lambdaIndicator.attr('cx', xScale(clampedLambda));
      
      if (onLambdaChange) {
        onLambdaChange(clampedLambda);
      }
    };

    lambdaSelector.on('click', updateLambda);
    lambdaSelector.on('mousemove', function(event) {
      if (event.buttons === 1) {
        updateLambda(event);
      }
    });

    // Add title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', margin.top)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', 'var(--text-primary)')
      .text(`Coefficient Path: ${pathData.regularization_type.toUpperCase()} Regularization`);

    // Add description
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height - 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'var(--text-secondary)')
      .text(
        'Drag the blue indicator or click on the slider to select a lambda value. As λ increases, coefficients shrink toward zero.'
      );
  }, [pathData, selectedLambda, onLambdaChange]);

  return (
    <div ref={containerRef} className="plot-container" style={{ width: '100%', height: '500px' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </div>
  );
};

export default CoefficientPath2D;
