// TypeScript types for Linear Regression visualization

export interface DatasetConfig {
  n: number;
  seed: number;
  trueSlope: number;
  trueIntercept: number;
  noiseStd: number;
  xMin: number;
  xMax: number;
  dimensions: 2 | 3; // 2D or 3D visualization
}

export interface AlgorithmConfig {
  learningRate: number;
  numIters: number;
  fitIntercept: boolean;
}

export interface VisualizationConfig {
  showTrueLine: boolean;
  showDataPoints: boolean;
  showPredictionLine: boolean;
}

