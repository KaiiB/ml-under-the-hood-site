// Control Panel Component for K-Means Configuration
import React from 'react';
import type { DatasetConfig, AlgorithmConfig, VisualizationConfig } from '../../types/kmeans';
import './ControlPanel.css';

interface ControlPanelProps {
  datasetConfig: DatasetConfig;
  algorithmConfig: AlgorithmConfig;
  visualizationConfig: VisualizationConfig;
  placementMode: boolean;
  onDatasetConfigChange: (config: Partial<DatasetConfig>) => void;
  onAlgorithmConfigChange: (config: Partial<AlgorithmConfig>) => void;
  onVisualizationConfigChange: (config: Partial<VisualizationConfig>) => void;
  onPlacementModeChange: (enabled: boolean) => void;
  onInitialize: () => void;
  onClearManualCentroids: () => void;
  manualCentroidsCount: number;
  nClusters: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  datasetConfig,
  algorithmConfig,
  visualizationConfig,
  placementMode,
  onDatasetConfigChange,
  onAlgorithmConfigChange,
  onVisualizationConfigChange,
  onPlacementModeChange,
  onInitialize,
  onClearManualCentroids,
  manualCentroidsCount,
  nClusters,
}) => {
  return (
    <div>
      <div className="control-section">
        <h3>Dataset Configuration</h3>
        
        <div className="control-group">
          <label htmlFor="dataType">Data Type</label>
          <select
            id="dataType"
            value={datasetConfig.dataType}
            onChange={(e) =>
              onDatasetConfigChange({ dataType: e.target.value as DatasetConfig['dataType'] })
            }
          >
            <option value="blobs">Blobs</option>
            <option value="moons">Moons</option>
            <option value="circles">Circles</option>
            <option value="random">Random</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="nSamples">Number of Samples</label>
          <input
            id="nSamples"
            type="number"
            min="50"
            max="1000"
            value={datasetConfig.nSamples}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 50 && val <= 1000) {
                onDatasetConfigChange({ nSamples: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="nClusters">Number of Clusters</label>
          <input
            id="nClusters"
            type="number"
            min="2"
            max="10"
            value={nClusters}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 3;
              if (val >= 2 && val <= 10) {
                onDatasetConfigChange({ nClusters: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="nFeatures">Dimensions</label>
          <select
            id="nFeatures"
            value={datasetConfig.nFeatures}
            onChange={(e) => {
              const val = parseInt(e.target.value) as 2 | 3;
              if (val === 2 || val === 3) {
                onDatasetConfigChange({ nFeatures: val });
              }
            }}
          >
            <option value={2}>2D</option>
            <option value={3}>3D</option>
          </select>
        </div>

        {datasetConfig.dataType === 'blobs' && (
          <div className="control-group">
            <label htmlFor="blobVariance">Blob Variance (Spread)</label>
            <div className="slider-container">
              <input
                id="blobVariance"
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={datasetConfig.blobVariance}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0.1 && val <= 2) {
                onDatasetConfigChange({ blobVariance: val });
              }
            }}
              />
              <span className="slider-value">{datasetConfig.blobVariance.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="control-section">
        <h3>Algorithm Configuration</h3>

        <div className="control-group">
          <label htmlFor="initMethod">Initialization Method</label>
          <select
            id="initMethod"
            value={algorithmConfig.initMethod}
            onChange={(e) =>
              onAlgorithmConfigChange({
                initMethod: e.target.value as 'kmeans++' | 'random',
              })
            }
          >
            <option value="kmeans++">K-Means++</option>
            <option value="random">Random</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="maxIters">Max Iterations</label>
          <input
            id="maxIters"
            type="number"
            min="1"
            max="100"
            value={algorithmConfig.maxIters}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 100) {
                onAlgorithmConfigChange({ maxIters: val });
              }
            }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="tolerance">Tolerance</label>
          <input
            id="tolerance"
            type="number"
            min="0.0001"
            max="1"
            step="0.0001"
            value={algorithmConfig.tolerance}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0.0001 && val <= 1) {
                onAlgorithmConfigChange({ tolerance: val });
              }
            }}
          />
        </div>
      </div>

      <div className="control-section">
        <h3>Visualization Options</h3>

        <div className="checkbox-group">
          <div className="checkbox-item">
            <input
              id="showVoronoi"
              type="checkbox"
              checked={visualizationConfig.showVoronoi}
              onChange={(e) =>
                onVisualizationConfigChange({ showVoronoi: e.target.checked })
              }
            />
            <label htmlFor="showVoronoi">Show Voronoi Regions</label>
          </div>

          <div className="checkbox-item">
            <input
              id="showTrajectories"
              type="checkbox"
              checked={visualizationConfig.showTrajectories}
              onChange={(e) =>
                onVisualizationConfigChange({ showTrajectories: e.target.checked })
              }
            />
            <label htmlFor="showTrajectories">Show Centroid Trajectories</label>
          </div>

          <div className="checkbox-item">
            <input
              id="showDistances"
              type="checkbox"
              checked={visualizationConfig.showDistances}
              onChange={(e) =>
                onVisualizationConfigChange({ showDistances: e.target.checked })
              }
            />
            <label htmlFor="showDistances">Show Distance Lines</label>
          </div>

          <div className="checkbox-item">
            <input
              id="showLabels"
              type="checkbox"
              checked={visualizationConfig.showLabels}
              onChange={(e) =>
                onVisualizationConfigChange({ showLabels: e.target.checked })
              }
            />
            <label htmlFor="showLabels">Show Cluster Labels</label>
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>Manual Placement</h3>

        <div className="checkbox-group">
          <div className="checkbox-item">
            <input
              id="placementMode"
              type="checkbox"
              checked={placementMode}
              onChange={(e) => onPlacementModeChange(e.target.checked)}
            />
            <label htmlFor="placementMode">Manual Centroid Placement</label>
          </div>
        </div>

        {placementMode && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              Placed: {manualCentroidsCount} / {nClusters}
            </p>
            {manualCentroidsCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={onClearManualCentroids}
                style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
              >
                Clear Placed Centroids
              </button>
            )}
          </div>
        )}
      </div>

      <div className="control-section actions">
        <div className="button-group">
          <button className="btn btn-primary" onClick={onInitialize}>
            Initialize K-Means
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

