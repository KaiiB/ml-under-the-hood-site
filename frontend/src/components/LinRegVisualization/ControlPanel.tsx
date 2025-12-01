// Control Panel Component for Linear Regression Configuration
import React from 'react';
import type { DatasetConfig, AlgorithmConfig, VisualizationConfig } from '../../types/linreg';
import '../KMeansVisualization/ControlPanel.css';

interface ControlPanelProps {
  datasetConfig: DatasetConfig;
  algorithmConfig: AlgorithmConfig;
  visualizationConfig: VisualizationConfig;
  onDatasetConfigChange: (config: Partial<DatasetConfig>) => void;
  onAlgorithmConfigChange: (config: Partial<AlgorithmConfig>) => void;
  onVisualizationConfigChange: (config: Partial<VisualizationConfig>) => void;
  onInitialize: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  datasetConfig,
  algorithmConfig,
  visualizationConfig,
  onDatasetConfigChange,
  onAlgorithmConfigChange,
  onVisualizationConfigChange,
  onInitialize,
}) => {
  return (
    <div>
      <div className="control-section">
        <h3>Dataset Configuration</h3>
        
        <div className="control-group">
          <label htmlFor="n">Number of Samples</label>
          <input
            id="n"
            type="number"
            min="50"
            max="1000"
            value={datasetConfig.n}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 50 && val <= 1000) {
                onDatasetConfigChange({ n: val });
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
            max="9999"
            value={datasetConfig.seed}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0) {
                onDatasetConfigChange({ seed: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="trueSlope">True Slope</label>
          <input
            id="trueSlope"
            type="number"
            step="0.1"
            value={datasetConfig.trueSlope}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onDatasetConfigChange({ trueSlope: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="trueIntercept">True Intercept</label>
          <input
            id="trueIntercept"
            type="number"
            step="0.1"
            value={datasetConfig.trueIntercept}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                onDatasetConfigChange({ trueIntercept: val });
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
              min="0.1"
              max="2.0"
              step="0.1"
              value={datasetConfig.noiseStd}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0.1 && val <= 2.0) {
                  onDatasetConfigChange({ noiseStd: val });
                }
              }}
            />
            <span className="slider-value">{datasetConfig.noiseStd.toFixed(1)}</span>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="dimensions">Dimensions</label>
          <select
            id="dimensions"
            value={datasetConfig.dimensions}
            onChange={(e) => {
              const val = parseInt(e.target.value) as 2 | 3;
              if (val === 2 || val === 3) {
                onDatasetConfigChange({ dimensions: val });
              }
            }}
          >
            <option value={2}>2D</option>
            <option value={3}>3D</option>
          </select>
        </div>
      </div>

      <div className="control-section">
        <h3>Algorithm Configuration</h3>

        <div className="control-group">
          <label htmlFor="learningRate">Learning Rate</label>
          <input
            id="learningRate"
            type="number"
            min="0.001"
            max="1.0"
            step="0.001"
            value={algorithmConfig.learningRate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0.001 && val <= 1.0) {
                onAlgorithmConfigChange({ learningRate: val });
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
                onAlgorithmConfigChange({ numIters: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="fitIntercept">Fit Intercept</label>
          <div className="checkbox-group">
            <div className="checkbox-item">
              <input
                id="fitIntercept"
                type="checkbox"
                checked={algorithmConfig.fitIntercept}
                onChange={(e) =>
                  onAlgorithmConfigChange({ fitIntercept: e.target.checked })
                }
              />
              <label htmlFor="fitIntercept">Include intercept term</label>
            </div>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Visualization Options</h3>

        <div className="checkbox-group">
          <div className="checkbox-item">
            <input
              id="showTrueLine"
              type="checkbox"
              checked={visualizationConfig.showTrueLine}
              onChange={(e) =>
                onVisualizationConfigChange({ showTrueLine: e.target.checked })
              }
            />
            <label htmlFor="showTrueLine">Show True Line</label>
          </div>

          <div className="checkbox-item">
            <input
              id="showDataPoints"
              type="checkbox"
              checked={visualizationConfig.showDataPoints}
              onChange={(e) =>
                onVisualizationConfigChange({ showDataPoints: e.target.checked })
              }
            />
            <label htmlFor="showDataPoints">Show Data Points</label>
          </div>

          <div className="checkbox-item">
            <input
              id="showPredictionLine"
              type="checkbox"
              checked={visualizationConfig.showPredictionLine}
              onChange={(e) =>
                onVisualizationConfigChange({ showPredictionLine: e.target.checked })
              }
            />
            <label htmlFor="showPredictionLine">Show Prediction Line</label>
          </div>
        </div>
      </div>

      <div className="control-section actions">
        <div className="button-group">
          <button className="btn btn-primary" onClick={onInitialize}>
            Run Linear Regression
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

