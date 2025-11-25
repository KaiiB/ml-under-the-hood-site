// 2D D3.js Visualization Component for Linear Regression
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { LinRegTrace, LinRegTraceStep } from '../../services/api';
import type { VisualizationConfig } from '../../types/linreg';

interface D3Plot2DProps {
  traceData: LinRegTrace | null;
  step: LinRegTraceStep | null;
  currentIteration: number;
  config: VisualizationConfig;
  seed: number;
}

const D3Plot2D: React.FC<D3Plot2DProps> = ({
  traceData,
  step,
  currentIteration,
  config,
  seed,
}) => {
  const plotRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!traceData || !step || !plotRef.current) return;

    const svg = d3.select(plotRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const xMin = traceData.meta.data.x_min;
    const xMax = traceData.meta.data.x_max;
    const nPoints = traceData.meta.n;
    
    const xValues: number[] = [];
    for (let i = 0; i < nPoints; i++) {
      xValues.push(xMin + (xMax - xMin) * (i / (nPoints - 1)));
    }

    const trueY = xValues.map(x => 
      traceData.meta.data.true_slope * x + traceData.meta.data.true_intercept
    );

    const intercept = step.payload.weights[0];
    const slope = step.payload.weights[1] || 0;

    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, plotWidth]);

    const yMin = Math.min(...trueY) - 2;
    const yMax = Math.max(...trueY) + 2;
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([plotHeight, 0]);

    const rng = d3.randomNormal.source(d3.randomLcg(seed))(0, traceData.meta.data.noise_std);
    const dataPoints = xValues.map((x, i) => {
      const noise = rng();
      return { x, y: trueY[i] + noise };
    });

    const xAxis = d3.axisBottom(xScale).ticks(8);
    const yAxis = d3.axisLeft(yScale).ticks(8);

    g.append('g')
      .attr('transform', `translate(0,${plotHeight})`)
      .call(xAxis)
      .append('text')
      .attr('x', plotWidth / 2)
      .attr('y', 45)
      .attr('fill', 'var(--text-primary)')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('X');

    g.append('g')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -plotHeight / 2)
      .attr('fill', 'var(--text-primary)')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Y');

    // True line
    if (config.showTrueLine) {
      const trueLine = d3.line<{ x: number; y: number }>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

      g.append('path')
        .datum(dataPoints.map((_, i) => ({ x: xValues[i], y: trueY[i] })))
        .attr('fill', 'none')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7)
        .attr('d', trueLine);

      g.append('text')
        .attr('x', plotWidth - 10)
        .attr('y', 15)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#94a3b8')
        .text('True Line');
    }

    // Prediction line
    if (config.showPredictionLine) {
      const predY = xValues.map(x => slope * x + intercept);
      const predLine = d3.line<{ x: number; y: number }>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

      g.append('path')
        .datum(dataPoints.map((_, i) => ({ x: xValues[i], y: predY[i] })))
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 3)
        .attr('d', predLine);

      g.append('text')
        .attr('x', plotWidth - 10)
        .attr('y', config.showTrueLine ? 30 : 15)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#3b82f6')
        .style('font-weight', '600')
        .text('Prediction Line');
    }

    // Data points
    if (config.showDataPoints) {
      g.selectAll('.data-point')
        .data(dataPoints)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', 4)
        .attr('fill', '#64748b')
        .attr('opacity', 0.6);
    }

    // Title
    g.append('text')
      .attr('x', plotWidth / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text(`Linear Regression - Iteration ${currentIteration}`);

    // Cost display
    g.append('text')
      .attr('x', plotWidth / 2)
      .attr('y', plotHeight + 50)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'var(--text-secondary)')
      .text(`Cost (MSE): ${step.payload.cost.toFixed(4)}`);
  }, [traceData, step, currentIteration, config, seed]);

  return (
    <div className="plot-container">
      <svg ref={plotRef}></svg>
    </div>
  );
};

export default D3Plot2D;

