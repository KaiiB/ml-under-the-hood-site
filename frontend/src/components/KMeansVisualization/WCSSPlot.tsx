import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { KMeansTrace } from '../../services/api';
import './WCSSPlot.css';

interface WCSSPlotProps {
  traceData: KMeansTrace | null;
  currentIteration: number;
  isActive?: boolean;
}

const WCSSPlot: React.FC<WCSSPlotProps> = ({ traceData, currentIteration, isActive = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderPlot = React.useCallback(() => {
    if (!isActive || !traceData || !traceData.inertia_history || !containerRef.current) {
      return;
    }

    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 70, left: 70 };
    const containerNode = containerRef.current;
    
    // Ensure we have a valid width - wait for container to be visible
    let w = containerNode.clientWidth - margin.left - margin.right;
    if (w <= 0) {
      // Fallback: use parent width or default
      const parent = containerNode.parentElement;
      if (parent) {
        w = parent.clientWidth - margin.left - margin.right - 40; // 40 for padding
      }
      if (w <= 0) {
        w = 800; // Default fallback
      }
    }
    
    const h = 400 - margin.top - margin.bottom;

      const xScaleWCSS = d3
      .scaleLinear()
      .domain([0, Math.max(0, traceData.inertia_history.length - 1)])
      .range([0, w]);

    const yScaleWCSS = d3
      .scaleLog()
      .domain(d3.extent(traceData.inertia_history) as [number, number])
      .range([h, 0]);

    const svg = container
      .append('svg')
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svgRef.current = svg.node() as SVGSVGElement;

    // Line generator
    const line = d3
      .line<number>()
      .x((_d, i) => xScaleWCSS(i))
      .y((d) => yScaleWCSS(d))
      .curve(d3.curveMonotoneX);

    // Add line with animation
    const path = svg
      .append('path')
      .datum(traceData.inertia_history)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', function () {
        const totalLength = (this as SVGPathElement).getTotalLength();
        return `${totalLength} ${totalLength}`;
      })
      .attr('stroke-dashoffset', function () {
        return (this as SVGPathElement).getTotalLength();
      });

    path
      .transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .attr('stroke-dashoffset', 0);

    // Add dots with animation
    const dots = svg
      .selectAll('.wcss-dot')
      .data(traceData.inertia_history)
      .enter()
      .append('circle')
      .attr('class', 'wcss-dot')
      .attr('cx', (_d, i) => xScaleWCSS(i))
      .attr('cy', (d) => yScaleWCSS(d))
      .attr('r', 0)
      .attr('fill', '#6366f1')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function (event) {
        const d = d3.select(this).datum() as number;
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 8);
        const tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);
        tooltip
          .html(`Iteration: ${traceData.inertia_history.indexOf(d)}<br>WCSS: ${d.toFixed(2)}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .transition()
          .duration(200)
          .style('opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 5);
        d3.selectAll('.tooltip').remove();
      });

    // Apply transition
    dots
      .transition()
      .delay((_d, i) => i * 50)
      .duration(300)
      .ease(d3.easeElasticOut)
      .attr('r', 5);

    // Highlight current iteration
    if (currentIteration < traceData.inertia_history.length) {
      const highlight = svg
        .append('circle')
        .attr('cx', xScaleWCSS(currentIteration))
        .attr('cy', yScaleWCSS(traceData.inertia_history[currentIteration]))
        .attr('r', 0)
        .attr('fill', '#f59e0b')
        .attr('stroke', 'white')
        .attr('stroke-width', 3);

      highlight
        .transition()
        .duration(500)
        .ease(d3.easeElasticOut)
        .attr('r', 10);
    }

    // Axes
    const xAxis = d3.axisBottom(xScaleWCSS)
      .ticks(Math.min(traceData.inertia_history.length, 10))
      .tickFormat(d3.format('d'));

    svg
      .append('g')
      .attr('transform', `translate(0,${h})`)
      .call(xAxis);

    const yAxis = d3.axisLeft(yScaleWCSS);
    svg
      .append('g')
      .call(yAxis);

    // X-axis label
    svg
      .append('text')
      .attr('x', w / 2)
      .attr('y', h + margin.bottom - 10)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-weight', '600')
      .style('font-size', '14px')
      .text('Iteration');

    // Y-axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -h / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .style('font-weight', '600')
      .style('font-size', '14px')
      .text('WCSS (Log Scale)');
  }, [traceData, currentIteration, isActive]);

  useEffect(() => {
    // Clear any pending render
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    // Only render when tab is active and we have data
    if (!isActive || !traceData || !traceData.inertia_history || !containerRef.current) {
      return;
    }

    // Small delay to ensure container has proper dimensions after tab switch
    renderTimeoutRef.current = setTimeout(() => {
      renderPlot();
    }, 100);

    // Also set up ResizeObserver to handle dimension changes
    const resizeObserver = new ResizeObserver(() => {
      if (isActive && traceData && traceData.inertia_history) {
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
        }
        renderTimeoutRef.current = setTimeout(() => {
          renderPlot();
        }, 50);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [traceData, currentIteration, isActive, renderPlot]);

  if (!traceData || !traceData.inertia_history) {
    return (
      <div className="plot-container">
        <div className="plot-title">Within-Cluster Sum of Squares (WCSS) Optimization</div>
        <div className="wcss-plot" ref={containerRef} style={{ minHeight: '400px' }}>
          <div className="loading">Initialize K-Means to see WCSS optimization</div>
        </div>
      </div>
    );
  }

  return (
    <div className="plot-container">
      <div className="plot-title">Within-Cluster Sum of Squares (WCSS) Optimization</div>
      <div className="wcss-plot" ref={containerRef} style={{ minHeight: '400px' }}></div>
    </div>
  );
};

export default WCSSPlot;

