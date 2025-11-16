from pydantic import BaseModel
from .common import DatasetParams


class KMeansRequest(DatasetParams):
    n_clusters: int = 3
    max_iter: int = 300
