from pydantic import BaseModel
from typing import List


class RegularizationDatasetParams(BaseModel):
    n: int = 100  # number of samples
    seed: int = 42
    true_coefficients: List[float] = [0.0, 1.0, -0.5, 0.1]  # polynomial coefficients [a0, a1, a2, ...]
    noise_std: float = 0.5
    x_min: float = -3.0
    x_max: float = 3.0


class RegularizationAlgoParams(BaseModel):
    regularization_type: str = "ridge"  # "ridge" or "lasso"
    learning_rate: float = 0.001  # Smaller default for normalized features
    lambda_reg: float = 0.1  # regularization strength
    num_iters: int = 100
    fit_intercept: bool = True


class CoefficientPathParams(BaseModel):
    lambda_min: float = 0.01
    lambda_max: float = 10.0
    num_lambdas: int = 50
    n_folds: int = 6  # Number of cross-validation folds


class LossSurfaceParams(BaseModel):
    noise_level: float = 1.0
    alpha: float = 0.0
    n_samples: int = 50
    seed: int = 42
    w0_range_min: float = -2.0
    w0_range_max: float = 6.0
    w1_range_min: float = -1.0
    w1_range_max: float = 7.0
    grid_size: int = 50


# Standard format of a frontend Regularization POST request
class RegularizationRequest(BaseModel):
    dataset: RegularizationDatasetParams
    algo: RegularizationAlgoParams
    compute_path: bool = False  # If True, compute coefficient path instead of single trace
    path_params: CoefficientPathParams = None  # Optional: parameters for coefficient path
    compute_loss_surface: bool = False  # If True, compute loss surface instead
    loss_surface_params: LossSurfaceParams = None  # Optional: parameters for loss surface

