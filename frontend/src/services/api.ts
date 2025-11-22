// API Service for K-Means Visualization
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
      const response = await fetch(`${this.baseUrl}/api/trace/kmeans`, {
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
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const kmeansAPI = new KMeansAPI();

