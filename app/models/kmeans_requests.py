from pydantic import BaseModel
from typing import Optional, Literal, List


class KMeansDatasetParams(BaseModel):
    """Dataset generation parameters for K-Means."""
    data_type: Literal["blobs", "moons", "circles", "random"] = "blobs"
    n_samples: int = 300
    n_centers: int = 3  # For blobs data type
    random_state: int = 42
    n_features: int = 2  # 2 or 3 dimensions
    noise: float = 0.1  # For moons/circles
    separation: float = 1.0  # For blobs
    bounds: list = [-10, 10]  # For random data type
    factor: float = 0.5  # For circles data type


class KMeansAlgoParams(BaseModel):
    """Algorithm parameters for K-Means."""
    n_clusters: int = 3
    max_iters: int = 100
    tolerance: float = 1e-4
    random_state: Optional[int] = None  # If None, uses dataset random_state
    init_method: Literal["kmeans++", "random"] = "kmeans++"  # Initialization method
    initial_centroids: Optional[List[List[float]]] = None  # Manual centroid positions


class KMeansRequest(BaseModel):
    """Standard format of a frontend K-Means POST request."""
    dataset: KMeansDatasetParams
    algo: KMeansAlgoParams
