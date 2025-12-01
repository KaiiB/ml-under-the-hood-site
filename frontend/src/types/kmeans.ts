// TypeScript types for K-Means visualization
import * as d3 from 'd3';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type DataPoint = [number, number] | [number, number, number];

export interface ManualCentroid {
  id: number;
  position: DataPoint;
}

export interface PlotBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin?: number;
  zMax?: number;
}

export interface D3Scales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  zScale?: d3.ScaleLinear<number, number>;
}

export interface VisualizationConfig {
  showVoronoi: boolean;
  showTrajectories: boolean;
  showDistances: boolean;
  showLabels: boolean;
}

export interface DatasetConfig {
  dataType: 'blobs' | 'moons' | 'circles' | 'random';
  nSamples: number;
  nClusters: number;
  nFeatures: number;
  blobVariance: number;
  randomState: number;
}

export interface AlgorithmConfig {
  maxIters: number;
  tolerance: number;
  initMethod: 'kmeans++' | 'random';
  randomState?: number | null;
}

