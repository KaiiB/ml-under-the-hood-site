from pydantic import BaseModel
from typing import Optional


class EMDatasetParams(BaseModel):
    K: int = 4 # number of Gaussian clusters to sample from
    seed: int = 7
    n: int = 600
    cov_diag_min: float = 0.2
    cov_diag_max: float = 1.0
    mean_min: float = -4.0
    mean_max: float = 4.0


class EMAlgoParams(BaseModel):
    C: int = 4            # components used by EM
    num_iters: int = 20   # EM iterations

# Standard format of a frontend EM POST request
class EMRequest(BaseModel):
    dataset: EMDatasetParams
    algo: EMAlgoParams
