# 📘 sk-learn: Under the Hood: PCA Side — Documentation

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