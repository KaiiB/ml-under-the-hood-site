// Standard Regularization Coefficient Path Visualization
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { regularizationAPI } from '../services/api';
import type { CoefficientPathData } from '../services/api';
import CoefficientPath2D from '../components/RegularizationVisualization/CoefficientPath2D';
import CoefficientPath3D from '../components/RegularizationVisualization/CoefficientPath3D';
import LambdaVsMSE2D from '../components/RegularizationVisualization/LambdaVsMSE2D';
import LossSurface3D from '../components/RegularizationVisualization/LossSurface3D';
import '../styles/globals.css';
import '../styles/components.css';

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

const Regularization: React.FC = () => {
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
    <div className="kmeans-container">
      <div className="header">
        <h1>Regularization Coefficient Path</h1>
        <p>Visualize how coefficients change as regularization strength (λ) varies</p>
      </div>

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
    </div>
  );
};

export default Regularization;
