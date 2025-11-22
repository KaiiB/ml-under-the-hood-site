// 2D D3.js Visualization Component for K-Means
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { KMeansTrace, TraceStep } from '../../services/api';
import type { VisualizationConfig } from '../../types/kmeans';
import type { PlotBounds } from '../../types/kmeans';
import './D3Plot2D.css';

interface D3Plot2DProps {
  traceData: KMeansTrace | null;
  step: TraceStep | null;
  currentIteration: number;
  config: VisualizationConfig;
  placementMode: boolean;
  manualCentroids: number[][];
  onManualCentroidAdd?: (centroid: [number, number]) => void;
  onManualCentroidUpdate?: (index: number, centroid: [number, number]) => void;
  onManualCentroidRemove?: (index: number) => void;
}

const D3Plot2D: React.FC<D3Plot2DProps> = ({
  traceData,
  step,
  currentIteration,
  config,
  placementMode,
  manualCentroids,
  onManualCentroidAdd,
  onManualCentroidUpdate,
  onManualCentroidRemove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Color scale for clusters
  const colorScale = React.useMemo(() => {
    if (!traceData || !traceData.steps || traceData.steps.length === 0) {
      return d3.scaleOrdinal(d3.schemeCategory10);
    }
    const nClusters = traceData.params.n_clusters;
    return d3.scaleOrdinal<string>(d3.schemeCategory10).domain(d3.range(nClusters).map(String));
  }, [traceData]);

  // Calculate fixed bounds from all iterations to prevent shifting
  // Use useMemo to calculate synchronously (no race condition)
  const fixedBounds: PlotBounds | null = React.useMemo(() => {
    if (!traceData || !traceData.meta || !traceData.steps || !traceData.meta.data_points) {
      return null;
    }

    const dataPoints = traceData.meta.data_points;
    
    if (!dataPoints || dataPoints.length === 0) {
      console.warn('D3Plot2D: No data points found');
      return null;
    }
    
    // Collect all centroids from all iterations
    const allCentroidsX: number[] = [];
    const allCentroidsY: number[] = [];
    
    traceData.steps.forEach((s) => {
      if (s.payload && s.payload.centroids) {
        s.payload.centroids.forEach((c) => {
          allCentroidsX.push(c.position[0]);
          allCentroidsY.push(c.position[1]);
        });
      }
    });

    // Combine data points and all centroids
    const allX = [...dataPoints.map((d) => d[0]), ...allCentroidsX];
    const allY = [...dataPoints.map((d) => d[1]), ...allCentroidsY];

    const xExtent = d3.extent(allX) as [number, number];
    const yExtent = d3.extent(allY) as [number, number];

    if (!xExtent[0] || !xExtent[1] || !yExtent[0] || !yExtent[1]) {
      console.warn('D3Plot2D: Invalid extent', { xExtent, yExtent });
      return null;
    }

    const xPadding = Math.max(2, (xExtent[1] - xExtent[0]) * 0.15);
    const yPadding = Math.max(2, (yExtent[1] - yExtent[0]) * 0.15);

    const bounds = {
      xMin: xExtent[0] - xPadding,
      xMax: xExtent[1] + xPadding,
      yMin: yExtent[0] - yPadding,
      yMax: yExtent[1] + yPadding,
    };

    console.log('D3Plot2D: Calculated fixedBounds', bounds);
    return bounds;
  }, [traceData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerStyle = window.getComputedStyle(containerRef.current);
        const containerPadding =
          parseFloat(containerStyle.paddingLeft) +
          parseFloat(containerStyle.paddingRight);
        const availableWidth = containerWidth - containerPadding;
        
        setDimensions({
          width: Math.max(400, availableWidth - margin.left - margin.right),
          height: Math.min(600, window.innerHeight - 400) - margin.top - margin.bottom,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render D3 visualization
  useEffect(() => {
    // In placement mode, we might not have step data yet, but we should still show the plot
    if (!traceData || !containerRef.current) {
      console.log('D3Plot2D: Missing requirements', {
        traceData: !!traceData,
        container: !!containerRef.current,
        placementMode,
      });
      return;
    }

    // If in placement mode and no step data, we still want to show data points and manual centroids
    if (placementMode && (!step || !step.payload)) {
      // We'll render just the data points and manual centroids
      if (!fixedBounds) {
        console.log('D3Plot2D: Waiting for fixedBounds in placement mode');
        return;
      }
    } else if (!step || !step.payload) {
      console.log('D3Plot2D: Missing step data');
      return;
    }

    if (!fixedBounds) {
      console.log('D3Plot2D: No fixedBounds calculated yet');
      return;
    }

    const container = d3.select(containerRef.current);
    const containerNode = container.node();
    if (!containerNode) {
      console.error('D3Plot2D: Container node not found');
      return;
    }

    const dataPoints = traceData.meta.data_points;
    if (!dataPoints || dataPoints.length === 0) {
      console.error('D3Plot2D: No data points in traceData.meta');
      return;
    }

    // In placement mode, we might not have step data yet
    // In that case, show only data points and manual centroids
    let centroids: number[][] = [];
    let labels: number[] = [];
    let nClusters = 0;
    
    if (placementMode && (!step || !step.payload)) {
      // Placement mode without step data - just show data points and manual centroids
      nClusters = manualCentroids.length || 3; // Use manual centroids count or default
      labels = new Array(dataPoints.length).fill(0); // Dummy labels for display
    } else if (step && step.payload) {
      centroids = step.payload.centroids.map((c) => c.position);
      labels = step.payload.labels || [];
      nClusters = centroids.length;
    } else {
      return; // Can't render without data
    }

    console.log('D3Plot2D: Rendering', {
      dataPoints: dataPoints.length,
      centroids: centroids.length,
      nClusters,
      fixedBounds,
    });

    // Calculate available width
    const containerStyle = window.getComputedStyle(containerNode);
    const containerPadding =
      parseFloat(containerStyle.paddingLeft) +
      parseFloat(containerStyle.paddingRight);
    const availableWidth = containerNode.clientWidth - containerPadding;
    const mainWidth = Math.max(400, availableWidth - margin.left - margin.right);
    const mainHeight = Math.min(600, window.innerHeight - 400) - margin.top - margin.bottom;
    
    const maxSvgWidth = availableWidth || containerNode.clientWidth;
    const svgWidth = Math.min(mainWidth + margin.left + margin.right, maxSvgWidth);

    // Create or update SVG
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    
    // Remove any existing SVG first
    container.select('svg').remove();
    
    svg = container
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', mainHeight + margin.top + margin.bottom)
      .style('max-width', '100%')
      .style('overflow', 'visible')
      .style('display', 'block');
    
    svgRef.current = svg.node();
    
    console.log('D3Plot2D: SVG created', {
      width: svgWidth,
      height: mainHeight + margin.top + margin.bottom,
      containerWidth: containerNode.clientWidth,
    });

    // Create main group (always recreate to ensure clean state)
    svg.select('.main-group').remove();
    const g = svg
      .append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3
      .scaleLinear()
      .domain([fixedBounds.xMin, fixedBounds.xMax])
      .range([0, mainWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([fixedBounds.yMin, fixedBounds.yMax])
      .range([mainHeight, 0]);

    // Bounds are available from fixedBounds for coordinate conversion

    // Remove existing elements
    g.selectAll('.voronoi-group').remove();
    g.selectAll('.trajectory-group').remove();
    g.selectAll('.distance-group').remove();
    g.selectAll('.old-centroid-group').remove();
    g.selectAll('.manual-centroid-group').remove();
    g.selectAll('.legend').remove();
    g.selectAll('.legend-background').remove();
    g.selectAll('.axis').remove();
    g.selectAll('.clickable-background').remove();
    
    // In placement mode, don't remove data points and centroids yet - we'll handle them separately
    if (!placementMode) {
      g.selectAll('.data-point').remove();
      g.selectAll('.centroid').remove();
    } else {
      // In placement mode, remove old centroids but keep data points
      g.selectAll('.centroid').remove();
    }

    // Add clickable background for manual placement
    if (placementMode) {
      g.selectAll('.clickable-background').remove();
      g.append('rect')
        .attr('class', 'clickable-background')
        .attr('width', mainWidth)
        .attr('height', mainHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .style('pointer-events', 'all')
        .on('click', function (event) {
          if (placementMode && onManualCentroidAdd) {
            const [x, y] = d3.pointer(event, g.node()!);
            const dataX = xScale.invert(x);
            const dataY = yScale.invert(y);
            onManualCentroidAdd([dataX, dataY]);
          }
        });
    }

    // Add axes (only if not in placement mode without step data, or if we have centroids)
    if (!placementMode || (step && step.payload)) {
      const xAxis = g.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${mainHeight})`)
        .call(d3.axisBottom(xScale));
      
      xAxis.append('text')
        .attr('x', mainWidth / 2)
        .attr('y', 40)
        .attr('fill', 'currentColor')
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('font-size', '12px')
        .text('X');

      const yAxis = g.append('g')
        .attr('class', 'axis y-axis')
        .call(d3.axisLeft(yScale));
      
      yAxis.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -mainHeight / 2)
        .attr('fill', 'currentColor')
        .style('text-anchor', 'middle')
        .style('font-weight', '600')
        .style('font-size', '12px')
        .text('Y');
      
      // Style axes
      g.selectAll('.axis line, .axis path')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1);
      
      g.selectAll('.axis text')
        .attr('fill', '#475569')
        .style('font-size', '11px');
    }

    // Voronoi regions (only if we have centroids and not in placement mode)
    if (config.showVoronoi && currentIteration > 0 && centroids.length > 0 && !placementMode) {
      const voronoi = d3.Delaunay.from(
        centroids.map((c) => [xScale(c[0]), yScale(c[1])])
      );
      const voronoiCells = voronoi.voronoi([0, 0, mainWidth, mainHeight]);

      const voronoiGroup = g
        .append('g')
        .attr('class', 'voronoi-group');

      for (let i = 0; i < centroids.length; i++) {
        const cell = voronoiCells.renderCell(i);
        if (cell) {
          voronoiGroup
            .append('path')
            .attr('d', cell)
            .attr('class', 'voronoi-cell')
            .attr('fill', colorScale(String(i)))
            .attr('opacity', 0)
            .transition()
            .delay(i * 100)
            .duration(500)
            .attr('opacity', 0.1);
        }
      }
    }

    // Centroid trajectories (only if not in placement mode)
    if (config.showTrajectories && currentIteration > 0 && traceData.steps && !placementMode) {
      const trajectoryGroup = g.append('g').attr('class', 'trajectory-group');

      for (let k = 0; k < nClusters; k++) {
        const trajectory: [number, number][] = [];
        for (let i = 0; i <= currentIteration; i++) {
          if (traceData.steps[i] && traceData.steps[i].payload.centroids[k]) {
            const c = traceData.steps[i].payload.centroids[k].position;
            trajectory.push([xScale(c[0]), yScale(c[1])]);
          }
        }

        if (trajectory.length > 1) {
          const line = d3
            .line<[number, number]>()
            .x((d) => d[0])
            .y((d) => d[1])
            .curve(d3.curveCardinal);

          const path = trajectoryGroup
            .append('path')
            .datum(trajectory)
            .attr('d', line)
            .attr('class', 'trajectory')
            .attr('stroke', colorScale(String(k)))
            .attr('fill', 'none')
            .attr('stroke-width', 2)
            .attr('opacity', 0.7)
            .attr('stroke-dasharray', function () {
              const totalLength = this.getTotalLength();
              return `${totalLength} ${totalLength}`;
            })
            .attr('stroke-dashoffset', function () {
              return this.getTotalLength();
            });

          path
            .transition()
            .duration(1000)
            .ease(d3.easeCubicInOut)
            .attr('stroke-dashoffset', 0);
        }
      }
    }

    // Distance lines (only if not in placement mode)
    if (config.showDistances && currentIteration > 0 && !placementMode) {
      const nSamples = Math.min(15, dataPoints.length);
      const stepSize = Math.max(1, Math.floor(dataPoints.length / nSamples));
      const distanceGroup = g.append('g').attr('class', 'distance-group');

      let lineIndex = 0;
      for (let idx = 0; idx < dataPoints.length; idx += stepSize) {
        if (idx >= nSamples * stepSize) break;
        const point = dataPoints[idx];
        const assignedCluster = labels[idx];

        for (let k = 0; k < nClusters; k++) {
          const isAssigned = k === assignedCluster;
          distanceGroup
            .append('line')
            .attr('x1', xScale(point[0]))
            .attr('y1', yScale(point[1]))
            .attr('x2', xScale(point[0]))
            .attr('y2', yScale(point[1]))
            .attr('class', 'distance-line')
            .attr('stroke', isAssigned ? colorScale(String(k)) : '#ccc')
            .attr('stroke-width', isAssigned ? 2 : 1)
            .attr('stroke-dasharray', isAssigned ? 'none' : '3,3')
            .attr('opacity', 0)
            .transition()
            .delay(lineIndex * 20)
            .duration(400)
            .attr('x2', xScale(centroids[k][0]))
            .attr('y2', yScale(centroids[k][1]))
            .attr('opacity', isAssigned ? 0.6 : 0.3);
          lineIndex++;
        }
      }
    }

    // Data points with transitions
    // In placement mode without step data, show all points as grey/unassigned
    const pointLabels = placementMode && (!step || !step.payload) 
      ? new Array(dataPoints.length).fill(0) // All unassigned in placement mode
      : labels;
    
    const points = g
      .selectAll<SVGCircleElement, { point: number[]; label: number; index: number }>('.data-point')
      .data(
        dataPoints.map((d, i) => ({ point: d, label: pointLabels[i] || 0, index: i })),
        (d) => String(d.index)
      );

    const pointsEnter = points
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d) => xScale(d.point[0]))
      .attr('cy', (d) => yScale(d.point[1]))
      .attr('r', 0)
      .attr('fill', (d) => placementMode && (!step || !step.payload) ? '#94a3b8' : colorScale(String(d.label)))
      .attr('opacity', 0)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
    
    const pointsUpdate = pointsEnter.merge(points);
    
    pointsUpdate
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 16)
          .attr('opacity', 1)
          .attr('stroke-width', 3);
        
        if (tooltipRef.current) {
          tooltipRef.current.innerHTML = `
            <strong>Point ${d.index}</strong><br>
            Cluster: ${d.label + 1}<br>
            X: ${d.point[0].toFixed(2)}<br>
            Y: ${d.point[1].toFixed(2)}
          `;
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY - 10}px`;
          tooltipRef.current.classList.add('visible');
        }
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 12)
          .attr('opacity', 0.9)
          .attr('stroke-width', 2);
        
        if (tooltipRef.current) {
          tooltipRef.current.classList.remove('visible');
        }
      })
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('cx', (d) => xScale(d.point[0]))
      .attr('cy', (d) => yScale(d.point[1]))
      .attr('r', 12)
      .attr('opacity', 0.9)
      .attr('stroke-width', 2);

    points.exit().remove();

    // Centroids with transitions (only show if not in placement mode, or if we have step data)
    // In placement mode, we show manual centroids instead
    if (!placementMode && centroids.length > 0 && step && step.payload) {
      const centroidElements = g
        .selectAll<SVGGElement, { pos: number[]; id: number; cluster_size: number }>('.centroid')
        .data(
          centroids.map((c, i) => ({
            pos: c,
            id: i,
            cluster_size: step.payload.cluster_sizes[i],
          })),
          (d) => d.id
        );

      const centroidsEnter = centroidElements
        .enter()
        .append('g')
        .attr('class', 'centroid')
        .attr('transform', (d) => `translate(${xScale(d.pos[0])},${yScale(d.pos[1])})`)
        .attr('opacity', 0);

      centroidsEnter.each(function (d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('r', 0)
          .attr('fill', colorScale(String(d.id)))
          .attr('opacity', 0.2);
        g.append('polygon')
          .attr('points', '-10,-10 10,-10 0,10')
          .attr('fill', colorScale(String(d.id)))
          .attr('stroke', 'black')
          .attr('stroke-width', 2)
          .attr('transform', 'scale(0)');
        g.append('text')
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('font-weight', '700')
          .attr('font-size', '12px')
          .attr('opacity', 0)
          .text(`C${d.id + 1}`);
      });

      const centroidsMerged = centroidsEnter.merge(centroidElements);

      centroidsMerged
        .on('mouseover', function (event, d) {
          d3.select(this)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', 20)
            .attr('opacity', 0.3);
          
          if (tooltipRef.current) {
            tooltipRef.current.innerHTML = `
              <strong>Centroid ${d.id + 1}</strong><br>
              X: ${d.pos[0].toFixed(2)}<br>
              Y: ${d.pos[1].toFixed(2)}<br>
              Cluster Size: ${d.cluster_size}
            `;
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 10}px`;
            tooltipRef.current.classList.add('visible');
          }
        })
        .on('mouseout', function () {
          d3.select(this)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', 15)
            .attr('opacity', 0.2);
          
          if (tooltipRef.current) {
            tooltipRef.current.classList.remove('visible');
          }
        })
        .transition()
        .duration(800)
        .ease(d3.easeElasticOut)
        .attr('transform', (d) => `translate(${xScale(d.pos[0])},${yScale(d.pos[1])})`)
        .attr('opacity', 1);

      centroidsMerged
        .select('circle')
        .transition()
        .duration(800)
        .attr('r', 15);

      centroidsMerged
        .select('polygon')
        .transition()
        .duration(800)
        .ease(d3.easeElasticOut)
        .attr('transform', 'scale(1)');

      centroidsMerged
        .select('text')
        .transition()
        .delay(400)
        .duration(400)
        .attr('opacity', 1);

      centroidElements.exit().remove();
    }

    // Legend (only show if we have centroids and not in placement mode)
    if (!placementMode && centroids.length > 0 && g.select('.legend').empty()) {
      const legendWidth = 85;
      const legendItemHeight = 14;
      const legendPadding = 5;
      const legendHeight = (nClusters * legendItemHeight) + (legendPadding * 2);
      
      const svgParent = svg.node();
      const totalSvgWidth = svgParent ? parseInt(svgParent.getAttribute('width') || '0') : svgWidth;
      const legendX = totalSvgWidth - legendWidth - legendPadding - 10;
      const legendY = margin.top + 5;

      // Legend background
      svg
        .append('rect')
        .attr('class', 'legend-background')
        .attr('x', legendX - legendPadding)
        .attr('y', legendY - legendPadding)
        .attr('width', legendWidth + (legendPadding * 2))
        .attr('height', legendHeight)
        .attr('fill', 'rgba(255, 255, 255, 0.98)')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 1)
        .attr('rx', 4)
        .attr('opacity', 0.98)
        .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))');

      // Legend items
      const legend = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      const legendItems = legend
        .selectAll('.legend-item')
        .data(centroids.map((_, i) => ({ id: i, color: colorScale(String(i)) })))
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (_, i) => `translate(0, ${i * legendItemHeight})`);

      legendItems
        .append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', (d) => d.color)
        .attr('stroke', '#475569')
        .attr('stroke-width', 1)
        .attr('rx', 2);

      legendItems
        .append('text')
        .attr('x', 14)
        .attr('y', 8)
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .attr('fill', '#475569')
        .text((d) => `C${d.id + 1}`);
    }

    // Manual centroids display (only in placement mode)
    // Always show manual centroids when in placement mode
    if (placementMode && manualCentroids.length > 0) {
      // Remove any existing manual centroid group first
      g.selectAll('.manual-centroid-group').remove();
      
      const manualGroup = g.append('g').attr('class', 'manual-centroid-group');
      const tempColorScale = d3.scaleOrdinal<string>(d3.schemeCategory10);

      manualCentroids.forEach((centroid, idx) => {
        const g = manualGroup
          .append('g')
          .attr('class', 'manual-centroid')
          .attr('transform', `translate(${xScale(centroid[0])},${yScale(centroid[1])})`)
          .style('cursor', 'pointer')
          .style('pointer-events', 'all');

        g.append('circle')
          .attr('r', 15)
          .attr('fill', tempColorScale(String(idx)))
          .attr('opacity', 0.3);

        g.append('polygon')
          .attr('points', '-10,-10 10,-10 0,10')
          .attr('fill', tempColorScale(String(idx)))
          .attr('stroke', 'black')
          .attr('stroke-width', 2);

        g.append('text')
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('font-weight', '700')
          .attr('font-size', '12px')
          .text(`M${idx + 1}`);

        // Dragging
        g.call(
          d3
            .drag<SVGGElement, unknown>()
            .on('start', function () {
              d3.select(this).raise().style('opacity', 0.8);
            })
            .on('drag', function (event) {
              const [x, y] = d3.pointer(event, g.node()!);
              const dataX = xScale.invert(x);
              const dataY = yScale.invert(y);
              if (onManualCentroidUpdate) {
                onManualCentroidUpdate(idx, [dataX, dataY]);
              }
              d3.select(this).attr('transform', `translate(${x},${y})`);
            })
            .on('end', function () {
              d3.select(this).style('opacity', 1);
            })
        );

        // Double-click to remove
        g.on('dblclick', function (event) {
          event.stopPropagation();
          if (onManualCentroidRemove) {
            onManualCentroidRemove(idx);
          }
        });
      });
    }
  }, [
    traceData,
    step,
    currentIteration,
    config,
    placementMode,
    manualCentroids,
    fixedBounds,
    dimensions,
    colorScale,
    onManualCentroidAdd,
    onManualCentroidUpdate,
    onManualCentroidRemove,
  ]);

  // In placement mode, we might not have step data yet, but we should still show the plot
  if (!traceData) {
    return (
      <div className="plot-container" ref={containerRef}>
        <div className="loading">Loading visualization...</div>
        <div ref={tooltipRef} className="tooltip"></div>
      </div>
    );
  }
  
  // If in placement mode without step data, that's okay - we'll show data points and manual centroids
  if (!placementMode && (!step || !step.payload)) {
    return (
      <div className="plot-container" ref={containerRef}>
        <div className="loading">Loading visualization...</div>
        <div ref={tooltipRef} className="tooltip"></div>
      </div>
    );
  }

  return (
    <div className="plot-container" ref={containerRef}>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
};

export default D3Plot2D;

