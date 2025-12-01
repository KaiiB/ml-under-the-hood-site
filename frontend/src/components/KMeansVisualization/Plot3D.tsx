// 3D Plotly Visualization Component for K-Means
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import type { KMeansTrace, TraceStep } from '../../services/api';
import type { VisualizationConfig } from '../../types/kmeans';

// Plotly types are complex, using any for flexibility
type PlotlyData = any;
type PlotlyLayout = any;
type PlotlyConfig = any;

interface Plot3DProps {
  traceData: KMeansTrace | null;
  step: TraceStep | null;
  currentIteration: number;
  config: VisualizationConfig;
  placementMode: boolean;
  manualCentroids: number[][];
  onManualCentroidAdd?: (centroid: [number, number, number]) => void;
  onManualCentroidUpdate?: (index: number, centroid: [number, number, number]) => void;
  onManualCentroidRemove?: (index: number) => void;
}

const Plot3D: React.FC<Plot3DProps> = ({
  traceData,
  step,
  currentIteration,
  placementMode,
  manualCentroids,
  onManualCentroidAdd,
  onManualCentroidUpdate,
  onManualCentroidRemove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);
  const clickHandledRef = React.useRef<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number; z: number } | null>(null);

  // Color scale for clusters
  const colorScale = React.useMemo(() => {
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    return (i: number) => colors[i % colors.length];
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.min(600, window.innerHeight - 400),
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prepare Plotly traces
  const traces = React.useMemo(() => {
    const traces: PlotlyData[] = [];

    // If in placement mode, show data points and manual centroids
    // This works whether we have step data or not
    if (placementMode) {
      if (!traceData || !traceData.meta || !traceData.meta.data_points) {
        return [];
      }
      
      const dataPoints = traceData.meta.data_points;
      
      // Data points (greyed out)
      traces.push({
        x: dataPoints.map((d) => d[0]),
        y: dataPoints.map((d) => d[1]),
        z: dataPoints.map((d) => d[2]),
        mode: 'markers',
        type: 'scatter3d',
        name: 'Data Points',
        marker: {
          size: 5,
          color: '#94a3b8',
          opacity: 0.6,
          line: {
            color: 'white',
            width: 0.5,
          },
        },
        hoverinfo: 'text',
        hovertext: dataPoints.map(
          (d, i) =>
            `Point ${i}<br>X: ${d[0].toFixed(2)}<br>Y: ${d[1].toFixed(2)}<br>Z: ${d[2].toFixed(2)}`
        ),
      } as unknown as PlotlyData);

      // Manual centroids
      if (manualCentroids.length > 0) {
        traces.push({
          x: manualCentroids.map((c) => c[0]),
          y: manualCentroids.map((c) => c[1]),
          z: manualCentroids.map((c) => c[2] || 0),
          mode: 'markers+text',
          type: 'scatter3d',
          name: 'Manual Centroids',
          marker: {
            size: 12,
            color: manualCentroids.map((_, i) => colorScale(i)),
            symbol: 'diamond',
            opacity: 0.9,
            line: {
              color: 'black',
              width: 2,
            },
          },
          text: manualCentroids.map((_, i) => `M${i + 1}`),
          textposition: 'top center',
          textfont: {
            color: 'black',
            size: 14,
          },
          hoverinfo: 'text',
          hovertext: manualCentroids.map(
            (centroid, i) =>
              `Manual Centroid ${i + 1}<br>X: ${centroid[0].toFixed(2)}<br>Y: ${centroid[1].toFixed(2)}<br>Z: ${(centroid[2] || 0).toFixed(2)}`
          ),
        } as unknown as PlotlyData);
      }

      // Helper grid points for clicking anywhere in 3D space
      if (traceData.meta.data_points.length > 0) {
        const xExtent: [number, number] = [
          Math.min(...dataPoints.map((d) => d[0])),
          Math.max(...dataPoints.map((d) => d[0])),
        ];
        const yExtent: [number, number] = [
          Math.min(...dataPoints.map((d) => d[1])),
          Math.max(...dataPoints.map((d) => d[1])),
        ];
        const zExtent: [number, number] = [
          Math.min(...dataPoints.map((d) => d[2])),
          Math.max(...dataPoints.map((d) => d[2])),
        ];

        // Create helper grid points
        const gridSize = 15;
        const helperPoints: { x: number; y: number; z: number }[] = [];
        
        for (let i = 0; i <= gridSize; i++) {
          for (let j = 0; j <= gridSize; j++) {
            for (let k = 0; k <= gridSize; k++) {
              helperPoints.push({
                x: xExtent[0] + (xExtent[1] - xExtent[0]) * (i / gridSize),
                y: yExtent[0] + (yExtent[1] - yExtent[0]) * (j / gridSize),
                z: zExtent[0] + (zExtent[1] - zExtent[0]) * (k / gridSize),
              });
            }
          }
        }

        // Make helper points larger and more clickable
        traces.push({
          x: helperPoints.map((p) => p.x),
          y: helperPoints.map((p) => p.y),
          z: helperPoints.map((p) => p.z),
          mode: 'markers',
          type: 'scatter3d',
          name: '_helper_points',
          marker: {
            size: 20, // Larger size for easier clicking
            opacity: 0.01, // Almost invisible but still clickable
            color: '#94a3b8',
            line: { width: 0 },
          },
          hoverinfo: 'text',
          hovertext: helperPoints.map(
            (point) =>
              `Click to place centroid here<br>X: ${point.x.toFixed(2)}<br>Y: ${point.y.toFixed(2)}<br>Z: ${point.z.toFixed(2)}`
          ),
          showlegend: false,
        } as unknown as PlotlyData);
      }

      return traces;
    }

    // Normal mode (not in placement mode): show data and centroids from step
    if (!traceData || !traceData.meta || !traceData.meta.data_points) {
      console.warn('Plot3D: No traceData or data points');
      return [];
    }

    const dataPoints = traceData.meta.data_points;
    
    // Check if data points have 3 dimensions
    if (dataPoints.length === 0) {
      console.error('Plot3D: Empty data points array');
      return [];
    }
    
    if (dataPoints[0].length < 3) {
      console.error('Plot3D: Data points do not have 3 dimensions', {
        pointLength: dataPoints[0].length,
        firstPoint: dataPoints[0],
        metaD: traceData.meta.d,
      });
      // If meta says it's 3D but points are 2D, return empty to show error
      if (traceData.meta.d === 3) {
        return [];
      }
    }

    // If we don't have step data yet, show just data points
    if (!step || !step.payload) {
      console.log('Plot3D: No step data, showing data points only');
      // Ensure we have 3D data
      if (dataPoints[0].length >= 3) {
        traces.push({
          x: dataPoints.map((d) => d[0]),
          y: dataPoints.map((d) => d[1]),
          z: dataPoints.map((d) => d[2]),
          mode: 'markers',
          type: 'scatter3d',
          name: 'Data Points',
          marker: {
            size: 5,
            color: '#94a3b8',
            opacity: 0.6,
            line: {
              color: 'white',
              width: 0.5,
            },
          },
          hoverinfo: 'text',
          hovertext: dataPoints.map(
            (d, i) =>
              `Point ${i}<br>X: ${d[0].toFixed(2)}<br>Y: ${d[1].toFixed(2)}<br>Z: ${d[2].toFixed(2)}`
          ),
        } as unknown as PlotlyData);
      }
      return traces;
    }

    const centroids = step.payload.centroids.map((centroid) => centroid.position);
    const labels = step.payload.labels || [];
    const nClusters = centroids.length;

    // Verify centroids have 3 dimensions
    if (centroids.length > 0 && centroids[0].length < 3) {
      console.error('Plot3D: Centroids do not have 3 dimensions', {
        centroidLength: centroids[0].length,
        firstCentroid: centroids[0],
      });
      return [];
    }

    // Data points grouped by cluster
    for (let k = 0; k < nClusters; k++) {
      const clusterPoints = dataPoints.filter((_, i) => labels[i] === k);
      if (clusterPoints.length > 0) {
        // Ensure all points have 3 dimensions
        const validPoints = clusterPoints.filter((p) => p.length >= 3);
        if (validPoints.length > 0) {
          traces.push({
            x: validPoints.map((d) => d[0]),
            y: validPoints.map((d) => d[1]),
            z: validPoints.map((d) => d[2]),
            mode: 'markers',
            type: 'scatter3d',
            name: `Cluster ${k + 1}`,
            marker: {
              size: 5,
              color: colorScale(k),
              opacity: 0.7,
              line: {
                color: 'white',
                width: 0.5,
              },
            },
            text: validPoints.map(
              (point, i) =>
                `Point ${i}<br>Cluster: ${k + 1}<br>X: ${point[0].toFixed(2)}<br>Y: ${point[1].toFixed(2)}<br>Z: ${point[2].toFixed(2)}`
            ),
            hoverinfo: 'text',
          } as unknown as PlotlyData);
        }
      }
    }

    // Centroids (ensure they have 3 dimensions)
    // In placement mode, don't show algorithm centroids, show manual ones instead
    if (!placementMode && centroids.length > 0 && centroids[0].length >= 3) {
      traces.push({
        x: centroids.map((centroid) => centroid[0]),
        y: centroids.map((centroid) => centroid[1]),
        z: centroids.map((centroid) => centroid[2]),
        mode: 'markers+text',
        type: 'scatter3d',
        name: 'Centroids',
        marker: {
          size: 12,
          color: centroids.map((_, i) => colorScale(i)),
          symbol: 'diamond',
          opacity: 0.9,
          line: {
            color: 'black',
            width: 2,
          },
        },
        text: centroids.map((_centroid, i) => `C${i + 1}`),
        textposition: 'top center',
        textfont: {
          color: 'black',
          size: 14,
        },
        hoverinfo: 'text',
        hovertext: centroids.map(
          (centroid, i) =>
            `Centroid ${i + 1}<br>X: ${centroid[0].toFixed(2)}<br>Y: ${centroid[1].toFixed(2)}<br>Z: ${centroid[2].toFixed(2)}<br>Cluster Size: ${step.payload.cluster_sizes[i]}`
        ),
      } as unknown as PlotlyData);
    }

    // Manual centroids in placement mode (even if we have step data)
    if (placementMode && manualCentroids.length > 0) {
      traces.push({
        x: manualCentroids.map((c) => c[0]),
        y: manualCentroids.map((c) => c[1]),
        z: manualCentroids.map((c) => c[2] || 0),
        mode: 'markers+text',
        type: 'scatter3d',
        name: 'Manual Centroids',
        marker: {
          size: 12,
          color: manualCentroids.map((_, i) => colorScale(i)),
          symbol: 'diamond',
          opacity: 0.9,
          line: {
            color: 'black',
            width: 2,
          },
        },
        text: manualCentroids.map((_, i) => `M${i + 1}`),
        textposition: 'top center',
        textfont: {
          color: 'black',
          size: 14,
        },
        hoverinfo: 'text',
        hovertext: manualCentroids.map(
          (centroid, i) =>
            `Manual Centroid ${i + 1}<br>X: ${centroid[0].toFixed(2)}<br>Y: ${centroid[1].toFixed(2)}<br>Z: ${(centroid[2] || 0).toFixed(2)}<br>Double-click to remove`
        ),
      } as unknown as PlotlyData);
    }

    return traces;
  }, [traceData, step, colorScale, placementMode, manualCentroids, currentIteration, onManualCentroidUpdate, onManualCentroidRemove]);

  // Track last click time for double-click detection
  const lastClickTimeRef = React.useRef<number>(0);
  const lastClickPointRef = React.useRef<{ x: number; y: number; z: number; index?: number } | null>(null);
  // Track the last centroid that was added to prevent duplicates
  const lastAddedCentroidRef = React.useRef<{ x: number; y: number; z: number; time: number } | null>(null);

  // Handle Plotly click events
  const handlePlotClick = useCallback(
    (data: any) => {
      console.log('🔵 Plot3D: Plotly onClick event received', {
        placementMode,
        hasPoints: !!(data.points && data.points.length > 0),
        pointsCount: data.points?.length || 0,
        clickHandled: clickHandledRef.current,
        currentManualCentroids: manualCentroids.length,
        data: data.points?.[0] ? {
          traceName: data.points[0].data?.name,
          x: data.points[0].x,
          y: data.points[0].y,
          z: data.points[0].z,
          pointNumber: data.points[0].pointNumber,
        } : null,
      });
      
      if (!placementMode) {
        console.log('🔵 Plot3D: Not in placement mode, ignoring click');
        return;
      }

      if (!data.points || data.points.length === 0) {
        console.log('🔵 Plot3D: No points in click data - this means click was on empty space');
        return;
      }

      const point = data.points[0];
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTimeRef.current;
      const isDoubleClick = timeSinceLastClick < 300; // 300ms threshold for double-click

      console.log('🔵 Plot3D: Processing click on point', {
        traceName: point.data?.name,
        pointNumber: point.pointNumber,
        coordinates: { x: point.x, y: point.y, z: point.z },
        isDoubleClick,
        timeSinceLastClick,
      });

      // Check if clicking on a manual centroid
      if (point.data && (point.data as any).name === 'Manual Centroids' && point.pointNumber !== undefined) {
        const clickedPoint = {
          x: point.x as number,
          y: point.y as number,
          z: point.z as number,
          index: point.pointNumber,
        };

        console.log('🔵 Plot3D: Clicked on manual centroid', clickedPoint);

        // Check if this is a double-click on the same manual centroid
        if (
          isDoubleClick &&
          lastClickPointRef.current &&
          lastClickPointRef.current.index === clickedPoint.index &&
          onManualCentroidRemove
        ) {
          // Double-click detected - remove the centroid
          console.log('🔵 Plot3D: Double-click detected - removing centroid', clickedPoint.index);
          onManualCentroidRemove(clickedPoint.index);
          lastClickTimeRef.current = 0;
          lastClickPointRef.current = null;
          return;
        }

        // Single click on manual centroid - just track it
        console.log('🔵 Plot3D: Single click on manual centroid - tracking for potential double-click');
        lastClickTimeRef.current = currentTime;
        lastClickPointRef.current = clickedPoint;
        return;
      }

      // Handle clicks for adding new centroids (only if clicking directly on a point)
      // The container click handler will handle clicks on empty space using hoveredCoords
      if (onManualCentroidAdd) {
        // Check if it's a helper point or data point
        if (point.data && (point.data as any).name === '_helper_points') {
          // Helper point clicked directly
          if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
            const centroid = [point.x as number, point.y as number, point.z as number];
            
            // Check if this is a duplicate add (same coordinates within 200ms)
            const isDuplicate = lastAddedCentroidRef.current &&
              lastAddedCentroidRef.current.x === centroid[0] &&
              lastAddedCentroidRef.current.y === centroid[1] &&
              lastAddedCentroidRef.current.z === centroid[2] &&
              (currentTime - lastAddedCentroidRef.current.time) < 200;
            
            if (isDuplicate) {
              console.log('🔵 Plot3D: Duplicate click detected - ignoring', {
                centroid,
                lastAdded: lastAddedCentroidRef.current,
                timeSinceLastAdd: currentTime - lastAddedCentroidRef.current!.time,
              });
              return;
            }
            
            console.log('🟢 Plot3D: Helper point clicked directly - ADDING CENTROID', {
              x: point.x,
              y: point.y,
              z: point.z,
              currentCount: manualCentroids.length,
              willBeIndex: manualCentroids.length,
            });
            clickHandledRef.current = true; // Mark as handled to prevent container handler from also firing
            lastAddedCentroidRef.current = {
              x: centroid[0],
              y: centroid[1],
              z: centroid[2],
              time: currentTime,
            };
            onManualCentroidAdd(centroid as [number, number, number]);
          }
        } else if (point.data && (point.data as any).name !== 'Manual Centroids' && point.x !== undefined && point.y !== undefined && point.z !== undefined) {
          // Data point clicked directly (not a manual centroid)
          const centroid = [point.x as number, point.y as number, point.z as number];
          
          // Check if this is a duplicate add (same coordinates within 200ms)
          const isDuplicate = lastAddedCentroidRef.current &&
            lastAddedCentroidRef.current.x === centroid[0] &&
            lastAddedCentroidRef.current.y === centroid[1] &&
            lastAddedCentroidRef.current.z === centroid[2] &&
            (currentTime - lastAddedCentroidRef.current.time) < 200;
          
          if (isDuplicate) {
            console.log('🔵 Plot3D: Duplicate click detected - ignoring', {
              centroid,
              lastAdded: lastAddedCentroidRef.current,
              timeSinceLastAdd: currentTime - lastAddedCentroidRef.current!.time,
            });
            return;
          }
          
          console.log('🟢 Plot3D: Data point clicked directly - ADDING CENTROID', {
            x: point.x,
            y: point.y,
            z: point.z,
            currentCount: manualCentroids.length,
            willBeIndex: manualCentroids.length,
            traceName: point.data?.name,
          });
          clickHandledRef.current = true; // Mark as handled to prevent container handler from also firing
          lastAddedCentroidRef.current = {
            x: centroid[0],
            y: centroid[1],
            z: centroid[2],
            time: currentTime,
          };
          onManualCentroidAdd(centroid as [number, number, number]);
        } else {
          console.log('🔵 Plot3D: Point clicked but not adding - conditions not met', {
            hasData: !!point.data,
            traceName: point.data?.name,
            hasCoords: point.x !== undefined && point.y !== undefined && point.z !== undefined,
          });
        }
      }
      
      // Reset the flag after a short delay to allow for next click
      setTimeout(() => {
        clickHandledRef.current = false;
        console.log('🔵 Plot3D: Reset clickHandled flag');
      }, 100);

      // Reset click tracking for non-centroid clicks
      lastClickTimeRef.current = currentTime;
      lastClickPointRef.current = null;
    },
    [placementMode, onManualCentroidAdd, onManualCentroidRemove, manualCentroids.length]
  );


  // Handle clicks on the plot container - only use hovered coordinates (no auto-placement)
  useEffect(() => {
    console.log('🟡 Plot3D: Setting up container click handler', {
      placementMode,
      hasOnAdd: !!onManualCentroidAdd,
      hasContainer: !!containerRef.current,
    });
    
    if (!placementMode || !onManualCentroidAdd || !containerRef.current) {
      return;
    }

    const handleContainerClick = (event: MouseEvent) => {
      // Only handle clicks on the plot area itself
      const target = event.target as HTMLElement;
      const plotElement = target.closest('.js-plotly-plot');
      if (!plotElement) {
        return;
      }

      // Check if this click is on a Plotly point (if so, let Plotly's onClick handle it)
      const isPlotlyPoint = target.closest('.point, .scatterlayer, .scatter3d');
      if (isPlotlyPoint) {
        // Let Plotly's onClick handler deal with it - don't handle here
        return;
      }

      // Only place centroid if we have hovered coordinates and haven't already handled this click
      // This ensures the user is actually hovering over a point/helper point
      // Use a small delay to let Plotly's onClick run first
      setTimeout(() => {
        if (hoveredCoords && !clickHandledRef.current) {
          console.log('Plot3D: Container clicked (empty space) - using hovered coordinates', hoveredCoords, 'Current manual centroids count:', manualCentroids.length);
          clickHandledRef.current = true;
          onManualCentroidAdd([hoveredCoords.x, hoveredCoords.y, hoveredCoords.z]);
        } else if (!hoveredCoords) {
          console.log('Plot3D: Click ignored - no hovered coordinates. Hover over a point first.');
        } else if (clickHandledRef.current) {
          console.log('Plot3D: Click already handled by Plotly onClick');
        }
      }, 10);
    };

    const container = containerRef.current;
    // Use bubble phase (not capture) so Plotly's handler runs first
    container.addEventListener('click', handleContainerClick, false);
    
    return () => {
      container.removeEventListener('click', handleContainerClick, false);
    };
  }, [placementMode, onManualCentroidAdd, hoveredCoords, manualCentroids.length]);

  // Handle Plotly hover events
  const handlePlotHover = useCallback((data: any) => {
    if (data.points && data.points.length > 0 && placementMode) {
      const point = data.points[0];
      console.log('Plot3D: Hover event', { point, traceName: point.data?.name });
      
      // Get coordinates from helper points or data points
      if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
        setHoveredCoords({
          x: point.x as number,
          y: point.y as number,
          z: point.z as number,
        });
      } else if (point.data && (point.data as any).name === '_helper_points') {
        // Helper point hovered
        const helperIndex = point.pointNumber;
        if (helperIndex !== undefined && traceData && traceData.meta && traceData.meta.data_points) {
          const dataPoints = traceData.meta.data_points;
          const xExtent: [number, number] = [
            Math.min(...dataPoints.map((d) => d[0])),
            Math.max(...dataPoints.map((d) => d[0])),
          ];
          const yExtent: [number, number] = [
            Math.min(...dataPoints.map((d) => d[1])),
            Math.max(...dataPoints.map((d) => d[1])),
          ];
          const zExtent: [number, number] = [
            Math.min(...dataPoints.map((d) => d[2])),
            Math.max(...dataPoints.map((d) => d[2])),
          ];
          const gridSize = 15;
          const i = Math.floor(helperIndex / ((gridSize + 1) * (gridSize + 1)));
          const j = Math.floor((helperIndex % ((gridSize + 1) * (gridSize + 1))) / (gridSize + 1));
          const k = helperIndex % (gridSize + 1);
          setHoveredCoords({
            x: xExtent[0] + (xExtent[1] - xExtent[0]) * (i / gridSize),
            y: yExtent[0] + (yExtent[1] - yExtent[0]) * (j / gridSize),
            z: zExtent[0] + (zExtent[1] - zExtent[0]) * (k / gridSize),
          });
        }
      }
    } else if (placementMode) {
      // Clear hovered coords when not hovering over a point
      setHoveredCoords(null);
    }
  }, [placementMode, traceData]);

  const layout: Partial<PlotlyLayout> = {
    title: {
      text: `K-Means Clustering - Iteration ${currentIteration}`,
    },
    scene: {
      xaxis: { title: 'X-axis', autorange: true, showbackground: false, backgroundcolor: 'rgba(0,0,0,0)' },
      yaxis: { title: 'Y-axis', autorange: true, showbackground: false, backgroundcolor: 'rgba(0,0,0,0)' },
      zaxis: { title: 'Z-axis', autorange: true, showbackground: false, backgroundcolor: 'rgba(0,0,0,0)' },
      aspectmode: 'auto',
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 },
      },
      bgcolor: 'rgba(0,0,0,0)',
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { l: 0, r: 0, b: 0, t: 50, pad: 0 },
    height: dimensions.height,
    width: dimensions.width,
    showlegend: true,
    legend: {
      x: 1,
      y: 1,
      xanchor: 'right',
      yanchor: 'top',
      bgcolor: 'rgba(255,255,255,0.7)',
      bordercolor: '#ccc',
      borderwidth: 1,
    },
    hovermode: 'closest',
  };

  const config: Partial<PlotlyConfig> = {
    displayModeBar: false,
    displaylogo: false,
    responsive: true,
  };

  // Show loading message if no data
  if (!traceData) {
    return (
      <div className="plot-container" ref={containerRef} style={{ position: 'relative', minHeight: '600px' }}>
        <div className="loading">Loading 3D visualization...</div>
      </div>
    );
  }

  // Check if we have any traces to render
  if (traces.length === 0) {
    console.warn('Plot3D: No traces to render', {
      traceData: !!traceData,
      step: !!step,
      placementMode,
      manualCentroids: manualCentroids.length,
    });
    return (
      <div className="plot-container" ref={containerRef} style={{ position: 'relative', minHeight: '600px' }}>
        <div className="error">No data to display. Please initialize K-Means first.</div>
      </div>
    );
  }

  const placementLayout: Partial<PlotlyLayout> = placementMode && (!step || !step.payload)
    ? {
        ...layout,
        title: {
          text: 'Click anywhere in the 3D space to place centroids, or enter coordinates manually.',
        },
      }
    : layout;

  console.log('Plot3D: Rendering', {
    tracesCount: traces.length,
    placementMode,
    hasStep: !!(step && step.payload),
    manualCentroids: manualCentroids.length,
  });

  return (
    <div className="plot-container" ref={containerRef} style={{ position: 'relative', minHeight: '600px', overflow: 'visible' }}>
      <Plot
        ref={plotRef}
        data={traces}
        layout={placementLayout}
        config={config}
        style={{ width: '100%', height: '100%', minHeight: '600px', position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
        onClick={(data: any) => {
          // Handle clicks on actual data points (helper points or data points)
          handlePlotClick(data);
        }}
        onHover={handlePlotHover}
        useResizeHandler={true}
      />
      {placementMode && hoveredCoords && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          border: '2px solid rgba(59, 130, 246, 1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          📍 Hovering: X={hoveredCoords.x.toFixed(2)}, Y={hoveredCoords.y.toFixed(2)}, Z={hoveredCoords.z.toFixed(2)}
          <br />
          <span style={{ fontSize: '11px', opacity: 0.9 }}>Click to place centroid here</span>
        </div>
      )}
      {placementMode && manualCentroids.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          border: '1px solid #cbd5e1',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          Placed: {manualCentroids.length} / {traceData?.params?.n_clusters || 3}
        </div>
      )}
    </div>
  );
};

export default Plot3D;

