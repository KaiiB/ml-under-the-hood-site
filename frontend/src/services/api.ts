// API Service for ML Algorithms
// Handles all API calls to the FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiUrl();

function getDefaultApiUrl(): string {
  if (import.meta.env.DEV) {
    // Development: try to detect the backend
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    return `${window.location.protocol}//${hostname}:8000`;
  }
  // Production: use same origin or environment variable
  return window.location.origin;
}

// ========== Linear Regression Types ==========

export interface LinRegDatasetParams {
  n: number;
  seed: number;
  true_slope: number;
  true_intercept: number;
  noise_std: number;
  x_min: number;
  x_max: number;
  num_features?: number; // 1 for 2D plot, 2 for 3D plane
  true_weights?: number[] | null; // For 2D features: [w1, w2] or [b, w1, w2]
}

export interface LinRegAlgoParams {
  learning_rate: number;
  num_iters: number;
  fit_intercept: boolean;
}

export interface LinRegRequest {
  dataset: LinRegDatasetParams;
  algo: LinRegAlgoParams;
}

export interface LinRegStepPayload {
  weights: number[];
  gradient?: number[];
  cost: number;
}

export interface LinRegTraceStep {
  t: number;
  type: string;
  payload: LinRegStepPayload;
}

export interface LinRegTrace {
  schema_version: number;
  algo: string;
  meta: {
    n: number;
    d: number;
    data: {
      true_slope?: number | null;
      true_intercept: number;
      noise_std: number;
      x_min: number;
      x_max: number;
      num_features?: number;
      true_weights?: number[];
    };
  };
  params: {
    learning_rate: number;
    num_iters: number;
    fit_intercept: boolean;
    seed: number;
  };
  params_full: {
    dataset: LinRegDatasetParams;
    algo: LinRegAlgoParams;
  };
  steps: LinRegTraceStep[];
  cost_history: number[];
  final_weights: {
    intercept: number;
    slope?: number;
    w1?: number;
    w2?: number;
  };
  X?: number[][]; // Raw X data for 3D visualization (when num_features=2)
  y?: number[]; // Raw y data for 3D visualization
}

// ========== K-Means Types ==========

export interface KMeansDatasetParams {
  data_type: 'blobs' | 'moons' | 'circles' | 'random';
  n_samples: number;
  n_centers: number;
  random_state: number;
  n_features: number;
  noise?: number;
  separation?: number;
  bounds?: number[];
  factor?: number;
}

export interface KMeansAlgoParams {
  n_clusters: number;
  max_iters: number;
  tolerance: number;
  random_state?: number | null;
  init_method: 'kmeans++' | 'random';
  initial_centroids?: number[][];
}

export interface KMeansRequest {
  dataset: KMeansDatasetParams;
  algo: KMeansAlgoParams;
}

export interface Centroid {
  position: number[];
  cluster_size: number;
}

export interface StepPayload {
  centroids: Centroid[];
  labels: number[];
  cluster_sizes: number[];
  inertia: number;
  movement?: number;
  converged: boolean;
  old_centroids?: Centroid[];
  iteration?: number;
}

export interface TraceStep {
  type: string;
  payload: StepPayload;
}

export interface KMeansTrace {
  schema_version: number;
  algo: string;
  meta: {
    n: number;
    d: number;
    data_type: string;
    data_points: number[][];
  };
  params: {
    n_clusters: number;
    max_iters: number;
    tolerance: number;
    random_state: number | null;
  };
  params_full: {
    dataset: KMeansDatasetParams;
    algo: KMeansAlgoParams;
  };
  steps: TraceStep[];
  inertia_history: number[];
  summary: {
    iterations: number;
    converged: boolean;
    final_inertia: number;
    runtime_ms: number;
  };
}

// ========== API Classes ==========

export class LinRegAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async runLinRegTrace(request: LinRegRequest): Promise<LinRegTrace> {
    try {
      const response = await fetch(`${this.baseUrl}api/trace/linreg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}, `);
      }

      const data: LinRegTrace = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Linear Regression API:', error);
      throw error;
    }
  }
}

export class KMeansAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Run K-Means algorithm and get step-by-step trace
   */
  async runKMeansTrace(request: KMeansRequest): Promise<KMeansTrace> {
    try {
      const response = await fetch(`${this.baseUrl}api/trace/kmeans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: KMeansTrace = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling K-Means API:', error);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ========== Regularization Types ==========

export interface RegularizationDatasetParams {
  n: number;
  seed: number;
  true_coefficients: number[];
  noise_std: number;
  x_min: number;
  x_max: number;
}

export interface RegularizationAlgoParams {
  regularization_type: 'ridge' | 'lasso';
  learning_rate: number;
  lambda_reg: number;
  num_iters: number;
  fit_intercept: boolean;
}

export interface RegularizationRequest {
  dataset: RegularizationDatasetParams;
  algo: RegularizationAlgoParams;
  compute_path?: boolean;
  path_params?: {
    lambda_min?: number;
    lambda_max?: number;
    num_lambdas?: number;
  };
}

export interface RegularizationStepPayload {
  weights: number[];
  gradient?: number[];
  cost: number;
  mse: number;
  regularization: number;
}

export interface RegularizationTraceStep {
  t: number;
  type: string;
  payload: RegularizationStepPayload;
}

export interface RegularizationTrace {
  schema_version: number;
  algo: string;
  meta: {
    n: number;
    d: number;
    data: {
      true_coefficients: number[];
      degree: number;
      noise_std: number;
      x_min: number;
      x_max: number;
      n: number;
    };
  };
  params: {
    regularization_type: string;
    learning_rate: number;
    lambda_reg: number;
    num_iters: number;
    fit_intercept: boolean;
    seed: number;
  };
  params_full: {
    dataset: RegularizationDatasetParams;
    algo: RegularizationAlgoParams;
  };
  steps: RegularizationTraceStep[];
  cost_history: number[];
  final_weights: number[];
}

export interface CoefficientPathData {
  lambdas: number[];
  weights_path: number[][];  // Each inner array is weights for one lambda
  losses: number[];
  mse_values: number[];  // Mean MSE across folds
  mse_path_folds?: number[][];  // Optional: MSE values for each fold (n_folds x num_lambdas)
  reg_values: number[];
  regularization_type: string;
  fit_intercept: boolean;
  num_features: number;
}

export interface LossSurfaceData {
  loss_surface: number[][];  // 2D array: loss values (Z)
  w0_grid: number[][];  // 2D array: intercept values (X)
  w1_grid: number[][];  // 2D array: slope values (Y)
  true_intercept: number;
  true_coef: number;
  optimal_intercept: number;
  optimal_coef: number;
  min_loss: number;
  X: number[];
  y: number[];
  noise_level: number;
  alpha: number;
}

export interface LossSurfaceRequest {
  noise_level?: number;
  alpha?: number;
  n_samples?: number;
  seed?: number;
  w0_range_min?: number;
  w0_range_max?: number;
  w1_range_min?: number;
  w1_range_max?: number;
  grid_size?: number;
}

// ========== Regularization API ==========

export class RegularizationAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Run Regularization (Ridge/Lasso) algorithm and get step-by-step trace
   */
  async runRegularizationTrace(request: RegularizationRequest): Promise<RegularizationTrace> {
    try {
      const response = await fetch(`${this.baseUrl}api/trace/regularization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: RegularizationTrace = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Regularization API:', error);
      throw error;
    }
  }

  /**
   * Compute coefficient path for multiple lambda values
   */
  async computeCoefficientPath(request: RegularizationRequest): Promise<CoefficientPathData> {
    try {
      const requestWithPath = {
        ...request,
        compute_path: true,
      };
      const response = await fetch(`${this.baseUrl}api/trace/regularization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestWithPath),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: CoefficientPathData = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Regularization Coefficient Path API:', error);
      throw error;
    }
  }

  /**
   * Compute 3D Loss Surface for Ridge Regression
   */
  async computeLossSurface(params: LossSurfaceRequest): Promise<LossSurfaceData> {
    try {
      const request = {
        dataset: {
          n: 100,
          seed: 42,
          true_coefficients: [0.0, 1.0],
          noise_std: 0.5,
          x_min: -3.0,
          x_max: 3.0,
        },
        algo: {
          regularization_type: 'ridge',
          learning_rate: 0.001,
          lambda_reg: 0.1,
          num_iters: 100,
          fit_intercept: true,
        },
        compute_loss_surface: true,
        loss_surface_params: params,
      };
      const response = await fetch(`${this.baseUrl}api/trace/regularization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data: LossSurfaceData = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Loss Surface API:', error);
      throw error;
    }
  }
}

// Export singleton instances
export const linRegAPI = new LinRegAPI();
export const kmeansAPI = new KMeansAPI();
export const regularizationAPI = new RegularizationAPI();

