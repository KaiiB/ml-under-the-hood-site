# ====================
# Dependencies
# ====================

from typing import Dict, Any
import numpy as np
import pandas as pd
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
        for i in range(num_sets):
            if not isSymmetric(covs[i]):
                print("Covariance matrix is not symmetric.")

    if means is None:
        means = np.random.randn(num_sets, dim)
    else:
        means = np.array(means)

    all_data = []
    for i in range(num_sets):
        data = np.random.multivariate_normal(means[i], covs[i], size=num_points)
        all_data.append(data)

    return np.vstack(all_data)  # Shape: (num_sets*num_points, dim)

# Data Extraction
def loadData(path, dtype=None):
    if dtype=='csv':
        df = pd.read_csv(path)
        df = df.dropna()
        return df
    elif dtype=='pickle':
        return pd.read_pickle(path)
    elif dtype=='numpy':
        return np.load(path)

def standardize(data):
    return (data - data.mean(axis=0)) / data.std(ddof=0, axis=0)

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
    def __init__(self, data=None, num_components=2):
        self.data = data
        self.num_components = num_components

        eigvals, eigvecs = computePCA(self.data)
        self.eigvals = eigvals
        self.eigvecs = eigvecs[:, :num_components]
        eigvals_vis = eigvals[:2]
        self.center, self.width, self.height = pcaEllipse2D(
            eigvals_vis, self.data
        )

    def transform(self, data):
        return (data - self.center) @ self.eigvecs

def run_pca_trace(dataset_params: dict, algo_params: dict):
    data = generateGaussian(**dataset_params)
    pca = PCA(data, algo_params["num_components"])

    trace = {
        "schema_version": 1,
        "algo": "pca_gaussian",
        "meta": {
            "n": int(pca.data.shape[0]),
            "d": int(pca.data.shape[1]),
            "ellipse": {
                "ellipse_center": pca.center.tolist(),
                "ellipse_width": float(pca.width),
                "ellipse_height": float(pca.height)
            },
            "eigens": {
                "eigvals": pca.eigvals.tolist(),
                "eigvecs": pca.eigvecs.tolist()
            },
            "data": pca.data.tolist()
        },
        "params": {
            "num_components": algo_params["num_components"],
            "seed": dataset_params.get("seed", None),
        },
        "params_full": {
            "dataset": dataset_params,
            "algo": algo_params,
        }
    }

    return trace
