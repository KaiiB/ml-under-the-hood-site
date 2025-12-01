from pydantic import BaseModel
from typing import Optional, List


class LinRegDatasetParams(BaseModel):
    n: int = 100  # number of samples
    seed: int = 42
    true_slope: float = 2.0
    true_intercept: float = -1.0
    noise_std: float = 0.5
    x_min: float = -5.0
    x_max: float = 5.0
    num_features: int = 1  # 1 for 2D plot, 2 for 3D plane
    true_weights: Optional[list] = None  # For 2D features: [w1, w2] or [b, w1, w2]


class LinRegAlgoParams(BaseModel):
    learning_rate: float = 0.01
    num_iters: int = 100
    fit_intercept: bool = True


# Standard format of a frontend Linear Regression POST request
class LinRegRequest(BaseModel):
    dataset: LinRegDatasetParams
    algo: LinRegAlgoParams
