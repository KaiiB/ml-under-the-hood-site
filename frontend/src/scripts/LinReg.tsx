// Main Linear Regression Visualization Component
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { linRegAPI } from '../services/api';
import type { LinRegTrace } from '../services/api';
import type { DatasetConfig, AlgorithmConfig, VisualizationConfig } from '../types/linreg';
import ControlPanel from '../components/LinRegVisualization/ControlPanel';
import D3Plot2D from '../components/LinRegVisualization/D3Plot2D';
import IterationControls from '../components/LinRegVisualization/IterationControls';
import MetricCards from '../components/LinRegVisualization/MetricCards';
import Tabs from '../components/LinRegVisualization/Tabs';
import CostHistoryPlot from '../components/LinRegVisualization/CostHistoryPlot';
import CostSurface3D from '../components/LinRegVisualization/CostSurface3D';
import MathematicalDetails from '../components/LinRegVisualization/MathematicalDetails';
import '../styles/globals.css';
import '../styles/components.css';

const LinReg: React.FC = () => {
  // State management
  const [traceData, setTraceData] = useState<LinRegTrace | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'math'>('main');

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
    return traceData.steps[Math.min(currentIteration, traceData.steps.length - 1)];
  }, [traceData, currentIteration]);

  const totalIterations = useMemo(() => {
    return traceData ? traceData.steps.length - 1 : 0;
  }, [traceData]);

  // Reset trace data when dimensions change
  useEffect(() => {
    if (traceData) {
      setTraceData(null);
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
        <h1>Linear Regression</h1>
        <p>Interactive Step-by-Step Visualization & Learning Platform</p>
      </div>

      <div className="main-grid">
        <div className="sidebar">
          <ControlPanel
            datasetConfig={datasetConfig}
            algorithmConfig={algorithmConfig}
            visualizationConfig={visualizationConfig}
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
                    />

                    <MetricCards
                      traceData={traceData}
                      step={currentStep}
                      currentIteration={currentIteration}
                    />

                    {datasetConfig.dimensions === 2 ? (
                      <>
                        <D3Plot2D
                          traceData={traceData}
                          step={currentStep}
                          currentIteration={currentIteration}
                          config={visualizationConfig}
                          seed={datasetConfig.seed}
                        />
                        <div style={{ marginTop: '0.33rem' }}>
                          <CostHistoryPlot 
                            traceData={traceData} 
                            currentIteration={currentIteration}
                          />
                        </div>
                      </>
                    ) : (
                      <CostSurface3D 
                        traceData={traceData} 
                        currentIteration={currentIteration}
                      />
                    )}
                  </>
                )}

                {!traceData && (
                  <div className="loading">
                    Configure parameters and click "Run Linear Regression" to start
                  </div>
                )}
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

export default LinReg;
