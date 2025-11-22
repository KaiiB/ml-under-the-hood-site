# ====================
# Dependencies
# ====================

from typing import Dict, Any
import numpy as np
# import pandas as pd
from scipy.stats import zscore

# ====================
# Data Builder Stuff
# ====================

# Generate covariance matrices
def generateCovariances(n, dim):
    covs = []
    for _ in range(n):
        A = np.random.randn(dim, dim)
        Sigma = A @ A.T  # ensures symmetric + PSD
        covs.append(Sigma)
    return np.array(covs)

def isSymmetric(A, tol=1e-8):
    return np.allclose(A, A.T, atol=tol)

def generateGaussian(
        num_sets=None,
        num_points=None,
        dim=None,
        seed=None,
        means=None,
        covs=None):
    """
    Generates multivariate Gaussian dataset
    shape returned: (num_sets * num_points, dim)
    """

    np.random.seed(seed)

    if num_sets is None:
        num_sets = np.random.randint(2, 10)

    if num_points is None:
        num_points = np.random.randint(50, 500)

    if dim is None:
        dim = np.random.randint(2, 10)

    if covs is None:
        covs = generateCovariances(num_sets, dim)
    else:
        covs = np.array(covs)
        assert covs.shape[1:] == (dim, dim), "Cov matrix must be dim x dim"
        for i in range(num_sets):
            assert isSymmetric(covs[i]), "Covariance matrix is not symmetric."
            '''
            if not isSymmetric(covs[i]):
                print("Covariance matrix is not symmetric.")
            '''

    if means is None:
        means = np.random.randn(num_sets, dim)
    else:
        means = np.array(means)
        assert means.shape[1] == dim, "Mean must match dim"

    all_data = []
    for i in range(num_sets):
        data = np.random.multivariate_normal(means[i], covs[i], size=num_points)
        all_data.append(data)

    return np.array(all_data)  # Shape: (num_sets*num_points, dim)

# Data Extraction
def loadData(path, dtype=None):
    '''
    if dtype=='csv':
        df = pd.read_csv(path)
        df = df.dropna()
        return df
    elif dtype=='pickle':
        return pd.read_pickle(path)
    '''
    if dtype=='numpy':
        return np.load(path)

def standardize(data):
    return data / data.std(ddof=0, axis=0)

def projection(u, v):
    v = v / np.linalg.norm(v)
    return np.dot(u, v) * v

def zPrune(df):
    df_copy = df.copy()
    z_scores = np.abs(zscore(df_copy, nan_policy='omit'))
    df_copy = df_copy[(z_scores < 3).all(axis=1)]
    return df_copy

# ====================
# PCA Stuff
# ====================

def computePCA(data):
    S = np.cov(data, rowvar=False)
    eigvals, eigvecs = np.linalg.eigh(S)
    idx = np.argsort(eigvals)[::-1]
    return eigvals[idx], eigvecs[:, idx]

def pcaEllipse2D(eigvals, data, z=2.0):
    center = np.mean(data, axis=0)
    width = 2 * z * np.sqrt(eigvals[0])
    height = 2 * z * np.sqrt(eigvals[1])
    return center, width, height

class PCA:
    def __init__(self, data=None):
        # Standardize per entire dataset
        flat_data = np.vstack(data)
        flat_data = standardize(flat_data)

        self.data = flat_data.reshape(*data.shape)
        self.num_sets, self.num_points, self.dim = self.data.shape
        self.num_components = self.dim - 1

        eigvals, eigvecs = computePCA(flat_data)
        self.eigvals = eigvals[:self.num_components]
        self.eigvecs = eigvecs[:, :self.num_components]

        eigvals_vis = eigvals[:2]
        self.center, self.width, self.height = pcaEllipse2D(
            eigvals_vis, flat_data
        )

    def transform(self, data):
        flat = np.vstack(data)
        proj = flat @ self.eigvecs
        return proj.reshape(self.num_sets, self.num_points, self.num_components)
    
def run_pca_trace(dataset_params: dict):
    data = generateGaussian(**dataset_params)
    pca = PCA(data)

    trace = {
        "schema_version": 1,
        "algo": "pca_gaussian",
        "data": pca.data.tolist(),
        "projected": pca.transform(pca.data).tolist(),
        "meta": {
            "num_sets": pca.num_sets,
            "num_points": pca.num_points,
            "dim": pca.dim,
            "ellipse": {
                "ellipse_center": pca.center.tolist(),
                "ellipse_width": float(pca.width),
                "ellipse_height": float(pca.height)
            },
            "eigens": {
                "eigvals": pca.eigvals.tolist(),
                "eigvecs": pca.eigvecs.tolist()
            }
        },
        "params": {
            "num_components": pca.num_components,
            "seed": dataset_params.get("seed", None),
        },
        "params_full": {
            "dataset": dataset_params
        }
    }

    return trace
