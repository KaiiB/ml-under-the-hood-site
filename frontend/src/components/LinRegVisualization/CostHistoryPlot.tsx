// Cost History Plot Component for Linear Regression
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { LinRegTrace } from '../../services/api';

interface CostHistoryPlotProps {
  traceData: LinRegTrace | null;
  currentIteration: number;
  isActive?: boolean; // Optional for backward compatibility
}

const CostHistoryPlot: React.FC<CostHistoryPlotProps> = ({
  traceData,
  currentIteration,
  isActive = true, // Default to true
}) => {
  const plotRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!traceData || !plotRef.current) return;

    const svg = d3.select(plotRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const costHistory: number[] = traceData.cost_history;
    if (costHistory.length === 0) return;

    const xScale = d3.scaleLinear()
      .domain([0, costHistory.length - 1])
      .range([0, plotWidth]);

    const extent = d3.extent(costHistory);
    const yMin = extent[0] ?? 0;
    const yMax = extent[1] ?? 1;
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([plotHeight, 0]);

    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y((d: number) => yScale(d))
      .curve(d3.curveMonotoneX);

    const xAxis = d3.axisBottom(xScale).ticks(10);
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
      .text('Iteration');

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
      .text('Cost (MSE)');

    // Cost line
    g.append('path')
      .datum(costHistory)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Current iteration marker
    if (currentIteration < costHistory.length) {
      g.append('circle')
        .attr('cx', xScale(currentIteration))
        .attr('cy', yScale(costHistory[currentIteration]))
        .attr('r', 6)
        .attr('fill', '#ef4444')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    }

    // Title
    g.append('text')
      .attr('x', plotWidth / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .text('Cost History (MSE)');

    // Current cost annotation
    if (currentIteration < costHistory.length) {
      g.append('text')
        .attr('x', xScale(currentIteration))
        .attr('y', yScale(costHistory[currentIteration]) - 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#ef4444')
        .style('font-weight', '600')
        .text(`Iter ${currentIteration}: ${costHistory[currentIteration].toFixed(4)}`);
    }
  }, [traceData, currentIteration]);

  return (
    <div className="plot-container">
      <svg ref={plotRef}></svg>
    </div>
  );
};

export default CostHistoryPlot;

