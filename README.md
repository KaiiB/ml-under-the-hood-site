# PCA — Documentation

This document provides a developer-friendly overview of the major React/TypeScript components used for PCA visualization and UFC PCA plotting.  
Moreover, it provides an overview of the major backend Python functions and classes used for PCA dataset generation, processing, and trace computation.

Each section summarizes:

- **Purpose**
- **Inputs (Props / Arguments)**
- **Outputs / Returns**
- **Simple Example**

---

## Table of Contents

### Frontend
- [PCAConfigurator.tsx](#1-pcaconfiguratortsx)
- [PCAPlot.tsx](#2-pcaplottsx)
- [PCASliderInteractive.tsx](#3-pcasliderinteractivetsx)
- [UFCPlot.tsx](#4-ufcplottsx)
- [Summary](#summary)

### Backend
- [Dependencies](#dependencies)
- [Data Builder Functions](#data-builder-functions)
- [PCA Functions & Classes](#pca-functions--classes)
- [run_pca_trace](#run_pca_trace)
- [Summary](#summary)

---
# Frontend
## 1. `PCAConfigurator.tsx`

### Purpose
A full control panel for configuring synthetic PCA datasets, sending them to the backend, and visualizing the results. Handles cluster count, dimensionality, covariance matrices, and randomization.

### Component: `PCAConfigurator()`

### Inputs
This is a top-level component; it receives no props.

Internally it manages:

- `numSets`: number of clusters  
- `numPoints`: number of points per cluster  
- `dim`: dimensionality (2D or 3D)  
- `seed`: RNG seed  
- `means`: array of cluster mean vectors  
- `covs`: array of covariance matrices  

### Returns
A rendered UI containing:

- Dataset controls  
- Mean/covariance editors  
- “Run PCA” and “Randomize All” buttons  
- A `<PCAPlot>` visualization when results are returned  

### Example
```tsx
import PCAConfigurator from "./components/PCAConfigurator";

export default function App() {
  return <PCAConfigurator />;
}
```

## Function: `runPCA()`

### Inputs
No arguments. Uses current local state to build:

```ts
{
  num_sets, num_points, dim, seed, means, covs
}
```

### Returns
A rendered UI containing:

- Sends POST request to `/api/trace/pca`
- Saves backend response into component state

### Example

```tsx
<button onClick={runPCA}>Run PCA</button>
```

## Function: `randomizeAll()`

### Inputs

None.

### Returns
A rendered UI containing:

- Randomizes dimensionality, number of clusters, means, covariances, and seed
- Dispatches `"RANDOMIZE"` state update

### Example

```tsx
<button onClick={randomizeAll}>🎲 Randomize All</button>
```

## 2. `PCAPlot.tsx`

### Purpose
Renders PCA data and PCA projections in 2D or 3D using Plotly.
Includes toggling between original space vs. PCA-projected space.

## Component: `PCAPlot(props)`

### Inputs

```ts
{
  data: number[][][],       // Original clusters
  projected: number[][][],  // PCA-projected clusters
  dim: number,              // Original dimensionality (2 or 3)
  eigvecs: number[][],      // Eigenvectors
  eigvals: number[],        // Eigenvalues
  center: number[]          // Mean/center
}
```

### Returns
A Plotly scatter / scatter3d visualization with:

- Cluster points
- PCA axes (if not in projected mode)
- Button to toggle between original vs. projected views

### Example

```tsx
<PCAPlot
  data={data}
  projected={projected}
  dim={3}
  eigvecs={eigvecs}
  eigvals={eigvals}
  center={center}
/>
```

## 3. `PCASliderInteractive.tsx`

### Purpose
An interactive, educational “rotate-the-axis” PCA demonstrator.
A user rotates a slider to guess the direction of maximal variance.

## Component: `PCAVisualizer(props)`

### Inputs

```ts
{
  showEllipse?: boolean;     // default true
  showEigenvector?: boolean; // default true
}
```

### Returns
- A visual widget allowing user-controlled rotation
- Projection lines
- Residual distance indicators
- Ellipse for variance
- True eigenvector arrows

### Example

```tsx
<PCAVisualizer
  showEllipse={true}
  showEigenvector={false}
/>
```

## Function: `mulberry32(seed)`

### Inputs
- `seed: number`: An interger

### Returns
- A seeded RNG function producing deterministic floats in ``[0,1)``.

### Example

```tsx
const rng = mulberry32(42);
console.log(rng()); // deterministic
```

## Function: `seededSampleIndices(n, k, seed)`

### Inputs
- `n`: size of dataset
- `k`: number of sampled indices
- `seed`: RNG seed

### Returns
Array of `k` pseudo-randomly shuffled indices.

### Example

```tsx
const idx = seededSampleIndices(100, 10, 42);
```

## 4. `UFCPlot.tsx`

### Purpose
Plots UFC fighters in PCA space and highlights specific fighters with customized labels, colors, and markers.

## Components: `UFCPlot(props)`

### Inputs
```tsx
{
  showSelectedLabels?: boolean; // default false
}
```

When:
- `false`: labels appear only on hover
- `true`: a predefined set of fighters has labels always visible

### Returns
A Plotly scatter plot with:

- PCA-projected fighter positions
- Color scale based on wins
- Special highlighting for Zabit Magomedsharipov

### Example

```tsx
<UFCPlot showSelectedLabels={true} />
```

---
Backend
## Dependencies

```python
from typing import Dict, Any
import numpy as np
from scipy.stats import zscore
```

## 1. Data Builder Functions

## ``generateCovariance(n, dim)``

### Purpose
Generates a list of symmetric, positive semi-definite covariance matrices.

### Inputs
- `n`: number of covariance matrices
- `dim`: dimensionality of each covariance matrix 

### Returns

- `np.array` of shape `(n, dim, dim)` containing covariance matrices

### Example

```python
covs = generateCovariances(3, 2)
```

## ``isSymmetric(A, tol=1e-8)``

### Purpose
Checks if a matrix is symmetric within a given tolerance.

### Inputs
- `A`: square matrix
- `tol`: tolerance for symmetry check

### Returns
- `True` if symmetric, else `False`

### Example 

```python
isSymmetric(np.array([[1,2],[2,3]]))  # True
```

## ``isSymmetric(A, tol=1e-8)``

### Purpose
Checks if a matrix is symmetric within a given tolerance.

### Inputs
- `A`: square matrix
- `tol`: tolerance for symmetry check

### Returns
- `True` if symmetric, else `False`

### Example 

```python
isSymmetric(np.array([[1,2],[2,3]]))  # True
```

## `generateGaussian(num_sets=None, num_points=None, dim=None, seed=None, means=None, covs=None)`

### Purpose
Generates a multivariate Gaussian dataset.

### Inputs
- `num_sets`: number of clusters
- `num_points`: points per cluster
- `dim`: dimensionality of data
- `seed`: RNG seed
- `means`: array of cluster means
- `covs`: array of covariance matrices

### Returns
- `np.array` of shape `(num_sets, num_points, dim)` containing dataset

### Example
```python
data = generateGaussian(num_sets=3, num_points=100, dim=2, seed=42)
```

## `loadData(path, dtype=None)`

### Purpose
Loads data from a file.

### Inputs
- `path`: path to the file
- `dtype`: 'numpy' (currently supported)

### Returns
- `np.array` loaded from `.npy` file

## Example
```python
data = loadData("data.npy", dtype="numpy")
```

## `standardize(data)`

### Purpose
Standardizes data to zero mean and unit variance along columns.

### Inputs
- `data`: np.array

### Returns
- Standardized `np.array`

Example
```python
std_data = standardize(data)
```

## `projection(u, v)`

### Purpose
Projects vector u onto vector v.

### Inputs
- `u`: vector
- `v`: vector

## Returns
Projected vector

## Example
```python
proj = projection(u, v)
```

## `zPrune(df)`

### Purpose
Removes rows where any column has a z-score > 3.

### Inputs
- `df`: numpy array or DataFrame

### Returns
Filtered dataset

### Example
cleaned = zPrune(data)

## PCA Functions & Classes

## `computePCA(data)`

## Purpose
Computes eigenvalues and eigenvectors of the covariance matrix.

## Inputs
- `data`: standardized data array (samples, features)

## Returns
- `eigvals`: sorted eigenvalues (descending)
- `eigvecs`: corresponding eigenvectors

## Example
- `eigvals, eigvecs = computePCA(data)`

## `pcaEllipse2D(eigvals, data, z=2.0)`

### Purpose
Computes center, width, and height of 2D PCA ellipse for visualization.

## Inputs
- `eigvals`: eigenvalues
- `data`: standardized data
- `z`: scaling factor for ellipse

## Returns
``center, width, height``

## Example
```python
center, width, height = pcaEllipse2D(eigvals, data)
```

## `PCA(data)`

## Purpose
Encapsulates PCA computation and transformations.

## Inputs
- `data`: numpy array of shape `(num_sets, num_points, dim)`

## Attributes / Returns
- `self.data`: standardized dataset
- `self.num_sets, self.num_points, self.dim`
- `self.num_components`
- `self.eigvals, self.eigvecs`
- `self.center, self.width, self.height` (for 2D visualization)

## Methods
- `transform(data)`: projects input data onto principal components

## Purpose
Project raw data onto principal compoents

## Inputs
- `data`: raw data

## Return
- `projection`: projected data.

## Example
```python
pca = PCA(data)
proj = pca.transform(data)
run_pca_trace(dataset_params: dict)
```

## `run_pca_trace(dataset_params: dict):`

## Purpose
Generates a synthetic PCA dataset and computes PCA trace with metadata.

## Inputs
- `dataset_params`: dictionary containing parameters for generateGaussian

## Returns
- `trace`: dictionary containing
- `data`: standardized dataset
- `projected`: PCA projections
- `meta`: dataset shape, ellipse info, eigenvalues/vectors
- `params`: number of components, seed
- `params_full`: full dataset parameters

## Example
```python
params = {"num_sets": 3, "num_points": 100, "dim": 2, "seed": 42}
trace = run_pca_trace(params)
```

## ✔️ Summary

The frontend portion of this repository includes:

- A full PCA dataset configurator
- PCA visualizer components (standard and interactive slider version)
- A UFC PCA projection plot
- Plotly-based visualization components with interactive controls

This backend portion of this repository provides:

- Functions to generate multivariate Gaussian datasets
- Utilities for standardization, z-score pruning, and projections
- PCA computation, including eigenvectors, eigenvalues, and 2D ellipse info
- PCA class for dataset encapsulation and projection
- run_pca_trace function for end-to-end trace generation for frontend integration

Use this README as a quick reference when extending, debugging, or integrating these components into larger UI flows.

# Linear Regression & Regularization – Documentation

## 1. Linear Regression

**Goal**  
Rebuild 1D/2D linear regression from scratch and make each optimization step visible.

**Key Features**
- **Synthetic data generation** with controllable:
  - number of samples, noise level, true slope/intercept, input range
- **Gradient Descent implementation**  
  Core learning loop is written with NumPy (no `sklearn` in the core logic).
- **Step-by-step trace** of parameters and loss:
  - stores \((w, b)\) and cost at every iteration
  - exposes the full optimization trajectory instead of only the final model
- **Interactive front-end (LinReg.tsx)**
  - 2D plot: data points, true line, model prediction line
  - 3D **cost surface** \(J(w, b)\) with the parameter path moving across the surface
  - Iteration controls (first / previous / next / last) and keyboard shortcuts
  - Metric cards (current MSE, parameters, iteration, convergence info)
  - “Math” tab with formulas and explanations for:
    - MSE loss
    - gradients
    - gradient descent behavior

Overall, this module is designed to show **how linear regression learns**, not just what the final line looks like.

---

## 2. Regularization (Ridge & Lasso)

**Goal**  
Show how **L1/L2 regularization** and **cross-validation** affect model complexity, coefficients, and error.

**Key Ideas**
- Use **polynomial synthetic data** that is easy to overfit.
- Compare **Ridge (L2)** vs **Lasso (L1)** behavior.
- Visualize how **alpha / lambda** changes:
  - coefficient magnitudes
  - training loss and MSE
  - per-fold vs mean performance.

**Backend (regularization.py)**
- Custom implementations of:
  - **RidgeRegression**
  - **LassoRegression**
- Functions to:
  - generate polynomial data with configurable:
    - true coefficients
    - noise level
    - sample size
    - input range
  - compute a **coefficient path** over a grid of lambda values:
    - `lambdas`: tested regularization strengths
    - `weights_path`: weights for each lambda (from the first fold)
    - `mse_path_folds`: MSE per fold, per lambda
    - `mse_values`: mean MSE across folds
    - `reg_values`: regularization penalty term
  - support **N-fold cross-validation** (configurable `n_folds`).

**Front-end (Regularization.tsx)**
- **Dataset & algorithm configuration**
  - samples, noise, seed, polynomial coefficients
  - regularization type (ridge / lasso), learning rate, iterations
  - lambda range \([\lambda_{\min}, \lambda_{\max}]\), number of lambdas
  - number of folds \(K\) for cross-validation

- **Visualizations**
  1. **2D Coefficient Path**
     - X-axis: \(-\log(\alpha)\) (or lambda)
     - Y-axis: coefficient values
     - Shows how weights are shrunk as regularization increases.
  2. **2D Alpha vs MSE**
     - Dashed colored lines: **per-fold MSE** curves
     - Solid black line: **mean MSE** across folds
     - Mimics textbook plots for model selection via cross-validation.
  3. **3D Alpha vs MSE (with folds)**
     - Axes: \(\alpha\) × fold index × MSE
     - Interactive controls (above the plot) for:
       - number of samples
       - noise level
       - number of folds \(K\)
     - Lets users see how more noise or more folds change the “MSE landscape”.
  4. **3D Loss Surface – Ridge Regression**
     - Loss surface over \((w_0, w_1)\)
     - Visual markers for:
       - true parameters
       - ridge solution for a given alpha
       - regularization “target” (origin)
     - Inspired by standard “ridge loss surface + constraint” textbook visuals.

- **Pedagogical Guides**
  - Each major visualization (3D alpha vs MSE, loss surface) includes a **short study guide** in the UI:
    - what each axis means
    - what to look for when adjusting alpha / noise / folds
    - how cross-validation stabilizes model selection.

---

### 3. What This Module Demonstrates

- How **plain linear regression** learns a line via gradient descent.
- How **Ridge vs Lasso** control model complexity by shrinking coefficients.
- How **cross-validation** (K-fold) is used to select a stable regularization strength.
- How **loss surfaces** and **MSE vs alpha** plots connect the math to visual intuition.

The emphasis is not just on matching `sklearn` behavior, but on making the hidden steps of the algorithms **visible, interactive, and teachable**.

# K-Means - Documentation

An educational implementation of K-Means clustering with interactive step-by-step visualization for learning algorithm internals.

## 🎯 Overview

**Features:**
- Step-by-step iteration tracking and visualization
- 2D (D3.js) and 3D (Plotly) visualizations
- Multiple dataset types: blobs, moons, circles, random
- Manual centroid placement
- Mathematical explanations and WCSS optimization plots

## 🔬 Algorithm

K-Means partitions data into K clusters by iteratively:
1. **Initialization**: Place K centroids (K-Means++, random, or manual)
2. **Assignment**: Assign each point to nearest centroid
3. **Update**: Recalculate centroids as mean of assigned points
4. **Convergence**: Repeat until centroid movement < tolerance

**Initialization Methods:**
- **K-Means++** (default): Probability-based selection for better initialization
- **Random**: Random placement in extended data space
- **Manual**: Interactive centroid placement

## 🏗️ Architecture

### Backend (`app/algos/kmeans.py`)

```python
class KMeans:
    def fit(self, X, initial_centroids=None, init_method='kmeans++')
    def step(self, X, centroids, iteration=0)  # Single iteration with tracking

def run_kmeans_trace(dataset_params: dict, algo_params: dict, initial_centroids=None) -> dict
```

**Key Classes:**
- `KMeans`: Core algorithm with step tracking
- `DataGenerator`: Synthetic dataset generation (blobs, moons, circles, random)

### Frontend (`frontend/src/scripts/KMeans.tsx`)

**Components:**
- `ControlPanel`: Dataset/algorithm configuration
- `D3Plot2D` / `Plot3D`: Visualizations
- `IterationControls`: Step navigation
- `MetricCards`: Real-time metrics (WCSS, cluster sizes, movement)
- `WCSSPlot`: Optimization curve
- `MathematicalDetails`: Educational explanations

### API: `POST /api/kmeans`

**Request:**
```json
{
  "dataset": {
    "data_type": "blobs",  // "blobs" | "moons" | "circles" | "random"
    "n_samples": 300,
    "n_centers": 3,
    "n_features": 2,  // 2 or 3
    "random_state": 42,
    "noise": 0.1,
    "separation": 1.0
  },
  "algo": {
    "n_clusters": 3,
    "max_iters": 100,
    "tolerance": 0.0001,
    "init_method": "kmeans++",  // "kmeans++" | "random"
    "initial_centroids": null
  }
}
```

**Response:**
```json
{
  "steps": [
    {
      "t": 0,
      "type": "initialization",
      "payload": {
        "iteration": 0,
        "inertia": 1234.56,
        "centroids": [{"id": 0, "position": [x, y]}, ...],
        "cluster_sizes": [100, 100, 100],
        "labels": [0, 1, 2, ...]
      }
    }
  ],
  "inertia_history": [1234.56, ...],
  "summary": {
    "iterations": 15,
    "converged": true,
    "final_inertia": 456.78
  }
}
```

## 💻 Usage

### Python
```python
from app.algos.kmeans import run_kmeans_trace

dataset_params = {
    "data_type": "blobs",
    "n_samples": 300,
    "n_centers": 3,
    "n_features": 2,
    "random_state": 42
}

algo_params = {
    "n_clusters": 3,
    "max_iters": 100,
    "tolerance": 1e-4,
    "init_method": "kmeans++"
}

trace = run_kmeans_trace(dataset_params, algo_params)
```

### TypeScript
```typescript
import { kmeansAPI } from '../services/api';

const trace = await kmeansAPI.runKMeansTrace({
  dataset: { data_type: 'blobs', n_samples: 300, n_features: 2, ... },
  algo: { n_clusters: 3, max_iters: 100, ... }
});
```

## 📐 Mathematics

**Objective (WCSS):**
\[J = \sum_{i=1}^{n} \sum_{k=1}^{K} w_{ik} \|x_i - \mu_k\|^2\]

**Assignment:**
\[c_i = \arg\min_{k} \|x_i - \mu_k\|\]

**Update:**
\[\mu_k = \frac{1}{|C_k|} \sum_{x_i \in C_k} x_i\]

**Convergence:**
\[\max_k \|\mu_k^{(t+1)} - \mu_k^{(t)}\| < \epsilon\]

## 🚀 Setup

```bash
# Backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

**Dependencies:** numpy, scikit-learn, fastapi, pydantic, react, typescript, d3, plotly.js

# EM for Gaussian Mixtures — Documentation

This section documents the main frontend + backend pieces used for the EM visualization.

---

## Frontend (React / TypeScript) — `EM.tsx`

**Purpose**


- Renders the EM for GMMs page with:
  - Left sidebar controls for dataset + algorithm hyperparameters.
  - Right panel with a 3D Plotly visualization and a log-likelihood chart.
  - Tabs for **EM Explanation** vs **EM Visualization** views. :contentReference[oaicite:0]{index=0}  

**Key components & helpers**

- **`EM` (default export)**  
  - Manages all React state (dataset params, EM params, active tab, iteration slider, view mode, loading/error).  
  - Calls the backend endpoint (`/api/trace/em`) via `runEm()` and stores the returned trace in state.  
  - Renders:
    - Sliders/inputs for dataset + algorithm controls.
    - A “Run EM” button and a “Show Raw Data / Show Model View” toggle.
    - The 3D EM plot + cluster parameter cards.
    - The log-likelihood chart.
    - The text-based EM explanation + formulas (KaTeX). :contentReference[oaicite:1]{index=1}  

- **`runEm()`**
  - Builds a JSON body with:
    - `dataset`: `{ K, seed, n, cov_diag_min, cov_diag_max, mean_min, mean_max }`
    - `algo`: `{ C, num_iters }`
  - Sends a `POST` request to `http://localhost:8000/api/trace/em`.  
  - On success, saves the JSON trace in `trace` and resets the iteration slider. :contentReference[oaicite:2]{index=2}  

- **`renderEmPlot(trace, iter, layout)`**
  - Hard-assigns each data point to the nearest Gaussian mean (using `nearestMeanIndex`).
  - Draws:
    - Cluster-colored 3D scatter of points.
    - Diamond markers for component means.
    - Semi-transparent ellipsoid surfaces using the diagonal entries of Σ. :contentReference[oaicite:3]{index=3}  

- **`renderRawPlot(trace, layout)`**
  - Shows only the raw 3D data as a neutral scatter without cluster structure. :contentReference[oaicite:4]{index=4}  

- **`LogLikelihoodChart({ values, currentIter })`**
  - Uses **D3** to render a custom SVG line chart of log-likelihood over iterations.
  - A red marker + vertical red line track the current iteration while sliding. :contentReference[oaicite:5]{index=5}  

**External resources (frontend)**

- `react-plotly.js` — 3D scatter + surface plots.
- `d3` — SVG log-likelihood chart + scales.
- `react-katex` — nicely rendered EM / GMM formulas.
- Shared CSS in `../styles/global.css` for layout and styling. :contentReference[oaicite:6]{index=6}  

---

## Backend (Python) — `em.py`

**Purpose**

- Generates synthetic 3D GMM data.
- Runs EM for Gaussian Mixture Models.
- Packages a full **trace** (steps + log-likelihoods + metadata) to be consumed by the frontend. :contentReference[oaicite:7]{index=7}  

**Core functions & class**

- **`GMM3d(K, seed, n, cov_diag_min, cov_diag_max, mean_min, mean_max)`**
  - Samples `n` points in 3D from `K` Gaussian components.
  - Returns:
    - `X` of shape `(n, 3)`.
    - `meta` with ground-truth means/covariances. :contentReference[oaicite:8]{index=8}  

- **`initialized_params(X, C)`**
  - Initializes EM parameters:
    - Mixture weights π (uniform).
    - Means μ (random subset of rows of `X`).
    - Covariances Σ (diagonal with per-feature variances). :contentReference[oaicite:9]{index=9}  

- **`multivariate_norm_pdf(X, mu, sigma)`**
  - Computes the multivariate Gaussian density for all rows in `X` under N(μ, Σ). :contentReference[oaicite:10]{index=10}  

- **`class EM`**
  - Holds dataset `X`, number of components `C`, and parameters (π, μ, Σ, γ).  
  - **`expectation()`**
    - Computes responsibilities γ using current parameters.
    - Updates log-likelihood history. :contentReference[oaicite:11]{index=11}  
  - **`maximization()`**
    - Updates π, μ, Σ using responsibility-weighted sums.
    - Adds a small diagonal term for numerical stability. :contentReference[oaicite:12]{index=12}  
  - **`fit_and_trace(num_iters)`**
    - Runs EM for `num_iters` iterations.
    - Returns:
      - `steps`: list of `{ t, type, payload }` snapshots.
      - `log_likelihood_history`: list of log-likelihood values. :contentReference[oaicite:13]{index=13}  

- **`run_em_trace(dataset_params, algo_params)`**
  - Calls `GMM3d(**dataset_params)` to build data.
  - Instantiates `EM` with `C = algo_params["C"]`.
  - Runs `fit_and_trace(num_iters=algo_params["num_iters"])`.
  - Wraps everything into a JSON-serializable trace:
    - `algo`, `meta` (n, d, data, raw_data),
    - `params`, `params_full`,
    - `steps`, `log_likelihoods`.  
  - This is the object returned to the FastAPI `/api/trace/em` endpoint and consumed by the React `EM` component. :contentReference[oaicite:14]{index=14}  