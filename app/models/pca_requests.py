from pydantic import BaseModel
from .common import DatasetParams
from typing import List, Optional


class PCADatasetParams(BaseModel):
    num_sets: int = 1
    num_points: int = 100
    dim: int = 2
    seed: int = 42
    means: List[List[float]] = [[6.0, 10.0]]
    covs: List[List[List[float]]] = [
        [
            [5.0, 4.0],
            [4.0, 12.0]
        ]
    ]



class PCARequest(BaseModel):
    dataset: PCADatasetParams