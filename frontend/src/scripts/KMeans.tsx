// Main K-Means Visualization Component
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { kmeansAPI } from '../services/api';
import type { KMeansTrace } from '../services/api';
import type { DatasetConfig, AlgorithmConfig, VisualizationConfig } from '../types/kmeans';
import ControlPanel from '../components/KMeansVisualization/ControlPanel';
import D3Plot2D from '../components/KMeansVisualization/D3Plot2D';
import Plot3D from '../components/KMeansVisualization/Plot3D';
import IterationControls from '../components/KMeansVisualization/IterationControls';
import MetricCards from '../components/KMeansVisualization/MetricCards';
import Tabs from '../components/KMeansVisualization/Tabs';
import WCSSPlot from '../components/KMeansVisualization/WCSSPlot';
import MathematicalDetails from '../components/KMeansVisualization/MathematicalDetails';
import '../styles/globals.css';
import '../styles/components.css';
import './KMeans.css';

const KMeans: React.FC = () => {
  // State management
  const [traceData, setTraceData] = useState<KMeansTrace | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<boolean>(false);
  const [manualCentroids, setManualCentroids] = useState<number[][]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'wcss' | 'math'>('main');

  // Configuration state
  const [datasetConfig, setDatasetConfig] = useState<DatasetConfig>({
    dataType: 'blobs',
    nSamples: 300,
    nClusters: 3,
    nFeatures: 3, // Default to 3D for better visualization
    blobVariance: 0.5,
    randomState: 42,
  });

  const [algorithmConfig, setAlgorithmConfig] = useState<AlgorithmConfig>({
    maxIters: 50,
    tolerance: 0.0001,
    initMethod: 'kmeans++',
    randomState: 42,
  });

  const [visualizationConfig, setVisualizationConfig] = useState<VisualizationConfig>({
    showVoronoi: false,
    showTrajectories: true,
    showDistances: false,
    showLabels: true,
  });

  // Computed values - use datasetConfig.nClusters directly to avoid stale closures
  const nClusters = datasetConfig.nClusters || 3;
  const currentStep = useMemo(() => {
    if (!traceData || !traceData.steps || traceData.steps.length === 0) {
      return null;
    }
    return traceData.steps[Math.min(currentIteration, traceData.steps.length - 1)];
  }, [traceData, currentIteration]);

  const totalIterations = useMemo(() => {
    return traceData ? traceData.steps.length - 1 : 0;
  }, [traceData]);

  const isConverged = useMemo(() => {
    return currentStep?.payload?.converged || false;
  }, [currentStep]);

  // Reset manual centroids when dimensions change
  useEffect(() => {
    setManualCentroids([]);
    // Clear trace data when switching dimensions to force fresh data fetch
    if (traceData) {
      setTraceData(null);
      setCurrentIteration(0);
    }
  }, [datasetConfig.nFeatures]);

  // Handle placement mode toggle
  useEffect(() => {
    if (placementMode) {
      // When entering placement mode, clear old trace data and fetch just data points
      setTraceData(null);
      setCurrentIteration(0);
      setError(null);
      
      // Fetch minimal trace (just data points, no centroids)
      const fetchDataForPlacement = async () => {
        try {
          const currentNClusters = datasetConfig.nClusters || 3;
          
          // Use appropriate noise values for different data types
          let noise = datasetConfig.blobVariance;
          if (datasetConfig.dataType === 'moons' || datasetConfig.dataType === 'circles') {
            noise = Math.max(0.05, Math.min(0.2, datasetConfig.blobVariance * 0.1));
          }
          
          const request = {
            dataset: {
              data_type: datasetConfig.dataType,
              n_samples: datasetConfig.nSamples,
              n_centers: currentNClusters,
              random_state: datasetConfig.randomState,
              n_features: datasetConfig.nFeatures,
              noise: noise,
              separation: 1.0,
              bounds: [-10, 10],
              factor: 0.5,
            },
            algo: {
              n_clusters: currentNClusters,
              max_iters: 1, // Minimal trace - just to get data points
              tolerance: algorithmConfig.tolerance,
              random_state: algorithmConfig.randomState,
              init_method: algorithmConfig.initMethod,
            },
          };

          const minimalTrace = await kmeansAPI.runKMeansTrace(request);
          setTraceData(minimalTrace);
          setCurrentIteration(0);
        } catch (err) {
          console.error('Failed to fetch data for placement:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch data for placement');
        }
      };
      
      fetchDataForPlacement();
    } else {
      // When exiting placement mode, clear manual centroids
      setManualCentroids([]);
    }
  }, [placementMode]);

  // Initialize K-Means
  const handleInitialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use datasetConfig.nClusters directly to ensure we have the latest value
      const currentNClusters = datasetConfig.nClusters || 3;
      
      console.log('Initializing with:', {
        nClusters: currentNClusters,
        datasetConfig: datasetConfig.nClusters,
        computedNClusters: nClusters,
      });

      // If in placement mode and centroids are placed, use them
      let initialCentroids: number[][] | undefined;
      if (placementMode && manualCentroids.length > 0) {
        if (manualCentroids.length !== currentNClusters) {
          setError(`Please place exactly ${currentNClusters} centroids. Currently placed: ${manualCentroids.length}`);
          setLoading(false);
          return;
        }
        initialCentroids = manualCentroids;
      } else if (placementMode && manualCentroids.length === 0) {
        // In placement mode but no centroids placed - just fetch data
        // Use appropriate noise values for different data types
        let noise = datasetConfig.blobVariance;
        if (datasetConfig.dataType === 'moons' || datasetConfig.dataType === 'circles') {
          // For moons and circles, noise should be much smaller (0.05-0.2 range)
          noise = Math.max(0.05, Math.min(0.2, datasetConfig.blobVariance * 0.1));
        }
        
        const request = {
          dataset: {
            data_type: datasetConfig.dataType,
            n_samples: datasetConfig.nSamples,
            n_centers: currentNClusters,
            random_state: datasetConfig.randomState,
            n_features: datasetConfig.nFeatures,
            noise: noise,
            separation: 1.0,
            bounds: [-10, 10],
            factor: 0.5,
          },
          algo: {
            n_clusters: currentNClusters,
            max_iters: 1, // Minimal trace
            tolerance: algorithmConfig.tolerance,
            random_state: algorithmConfig.randomState,
            init_method: algorithmConfig.initMethod,
          },
        };

        const minimalTrace = await kmeansAPI.runKMeansTrace(request);
        setTraceData(minimalTrace);
        setCurrentIteration(0);
        setLoading(false);
        return;
      }

      // Build full request
      // Use appropriate noise values for different data types
      let noise = datasetConfig.blobVariance;
      if (datasetConfig.dataType === 'moons' || datasetConfig.dataType === 'circles') {
        // For moons and circles, noise should be much smaller (0.05-0.2 range)
        // Convert blobVariance (0.1-2.0) to appropriate noise (0.05-0.2)
        noise = Math.max(0.05, Math.min(0.2, datasetConfig.blobVariance * 0.1));
      }
      
      const request = {
        dataset: {
          data_type: datasetConfig.dataType,
          n_samples: datasetConfig.nSamples,
          n_centers: currentNClusters,
          random_state: datasetConfig.randomState,
          n_features: datasetConfig.nFeatures,
          noise: noise,
          separation: 1.0,
          bounds: [-10, 10],
          factor: 0.5, // Inner/outer circle ratio for circles
        },
        algo: {
          n_clusters: currentNClusters,
          max_iters: algorithmConfig.maxIters,
          tolerance: algorithmConfig.tolerance,
          random_state: algorithmConfig.randomState,
          init_method: placementMode && initialCentroids ? 'kmeans++' : algorithmConfig.initMethod,
          initial_centroids: initialCentroids,
        },
      };

      console.log('Sending request with n_clusters:', currentNClusters);
      const trace = await kmeansAPI.runKMeansTrace(request);
      setTraceData(trace);
      setCurrentIteration(0);
      
      // Clear manual centroids after initialization
      if (placementMode && initialCentroids) {
        setManualCentroids([]);
        setPlacementMode(false);
      }
    } catch (err) {
      console.error('Failed to initialize K-Means:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize K-Means');
    } finally {
      setLoading(false);
    }
  }, [datasetConfig, algorithmConfig, placementMode, manualCentroids]);

  // Manual centroid handlers
  const handleManualCentroidAdd = useCallback(
    (centroid: [number, number] | [number, number, number]) => {
      // Use functional update to get the latest state
      setManualCentroids((currentCentroids) => {
        console.log('🟢 KMeans: handleManualCentroidAdd called', {
          placementMode,
          currentCount: currentCentroids.length,
          nClusters,
          canAdd: placementMode && currentCentroids.length < nClusters,
          centroid,
          willBeIndex: currentCentroids.length,
        });
        
        if (placementMode && currentCentroids.length < nClusters) {
          // Check for duplicate centroids (same position)
          const isDuplicate = currentCentroids.some((c) => {
            if (c.length !== centroid.length) return false;
            const tolerance = 0.01;
            return c.every((coord, i) => Math.abs(coord - centroid[i]) < tolerance);
          });
          
          if (isDuplicate) {
            console.log('🟡 KMeans: Duplicate centroid detected - ignoring', {
              centroid,
              existingCentroids: currentCentroids,
            });
            return currentCentroids; // Return unchanged
          }
          
          const newCentroids = [...currentCentroids, centroid];
          console.log('🟢 KMeans: Adding centroid', {
            oldCount: currentCentroids.length,
            newCount: newCentroids.length,
            newCentroid: centroid,
            allCentroids: newCentroids,
          });
          return newCentroids;
        } else {
          console.log('🟡 KMeans: Cannot add centroid', {
            placementMode,
            currentCount: currentCentroids.length,
            nClusters,
            reason: !placementMode ? 'not in placement mode' : 'already have enough centroids',
          });
          return currentCentroids; // Return unchanged
        }
      });
    },
    [placementMode, nClusters]
  );

  const handleManualCentroidUpdate = useCallback(
    (index: number, centroid: [number, number] | [number, number, number]) => {
      if (placementMode) {
        const updated = [...manualCentroids];
        updated[index] = centroid;
        setManualCentroids(updated);
      }
    },
    [placementMode, manualCentroids]
  );

  const handleManualCentroidRemove = useCallback(
    (index: number) => {
      if (placementMode) {
        const updated = manualCentroids.filter((_, i) => i !== index);
        setManualCentroids(updated);
      }
    },
    [placementMode, manualCentroids]
  );

  const handleClearManualCentroids = useCallback(() => {
    setManualCentroids([]);
  }, []);

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
    if (traceData) {
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
    <div className="kmeans-container">
      <div className="header">
        <h1>K-Means Clustering</h1>
        <p>Interactive Step-by-Step Visualization & Learning Platform</p>
      </div>

      <div className="main-grid">
        <div className="sidebar">
          <ControlPanel
            datasetConfig={datasetConfig}
            algorithmConfig={algorithmConfig}
            visualizationConfig={visualizationConfig}
            placementMode={placementMode}
            onDatasetConfigChange={(config) => {
              console.log('Dataset config change:', config);
              setDatasetConfig({ ...datasetConfig, ...config });
            }}
            onAlgorithmConfigChange={(config) => {
              console.log('Algorithm config change:', config);
              setAlgorithmConfig({ ...algorithmConfig, ...config });
            }}
            onVisualizationConfigChange={(config) => {
              console.log('Visualization config change:', config);
              setVisualizationConfig({ ...visualizationConfig, ...config });
            }}
            onPlacementModeChange={setPlacementMode}
            onInitialize={handleInitialize}
            onClearManualCentroids={handleClearManualCentroids}
            manualCentroidsCount={manualCentroids.length}
            nClusters={nClusters}
          />
        </div>

        <div className="visualization-area">
          {loading && (
            <div className="loading">
              ⏳ Loading data and running K-Means...
            </div>
          )}

          {error && <div className="error">❌ {error}</div>}

          {!loading && !error && (
            <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
              {/* Main Visualization Tab */}
              <div className={`tab-content ${activeTab === 'main' ? 'active' : ''}`}>
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
                      isConverged={isConverged}
                    />

                    <MetricCards
                      traceData={traceData}
                      step={currentStep}
                      currentIteration={currentIteration}
                    />

                    {datasetConfig.nFeatures === 2 ? (
                      <D3Plot2D
                        traceData={traceData}
                        step={currentStep}
                        currentIteration={currentIteration}
                        config={visualizationConfig}
                        placementMode={placementMode}
                        manualCentroids={manualCentroids}
                        onManualCentroidAdd={handleManualCentroidAdd as (c: [number, number]) => void}
                        onManualCentroidUpdate={handleManualCentroidUpdate as (i: number, c: [number, number]) => void}
                        onManualCentroidRemove={handleManualCentroidRemove}
                      />
                    ) : (
                      <Plot3D
                        traceData={traceData}
                        step={currentStep}
                        currentIteration={currentIteration}
                        config={visualizationConfig}
                        placementMode={placementMode}
                        manualCentroids={manualCentroids}
                        onManualCentroidAdd={handleManualCentroidAdd as (c: [number, number, number]) => void}
                        onManualCentroidUpdate={handleManualCentroidUpdate as (i: number, c: [number, number, number]) => void}
                        onManualCentroidRemove={handleManualCentroidRemove}
                      />
                    )}

                    {placementMode && manualCentroids.length < nClusters && (
                      <div style={{
                        marginTop: 'var(--spacing-md)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                      }}>
                        💡 Click on the plot to place centroids ({manualCentroids.length} / {nClusters} placed)
                      </div>
                    )}
                  </>
                )}

                {!traceData && (
                  <div className="loading">
                    Configure parameters and click "Initialize K-Means" to start
                  </div>
                )}
              </div>

              {/* WCSS Optimization Tab */}
              <div className={`tab-content ${activeTab === 'wcss' ? 'active' : ''}`}>
                <WCSSPlot 
                  traceData={traceData} 
                  currentIteration={currentIteration}
                  isActive={activeTab === 'wcss'}
                />
              </div>

              {/* Mathematical Details Tab */}
              <div className={`tab-content ${activeTab === 'math' ? 'active' : ''}`}>
                <MathematicalDetails
                  traceData={traceData}
                  step={currentStep}
                  currentIteration={currentIteration}
                />
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default KMeans;

