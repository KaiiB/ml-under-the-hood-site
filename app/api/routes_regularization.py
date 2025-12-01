# app/api/routes_regularization.py
from fastapi import APIRouter
from app.models.regularization_requests import RegularizationRequest
from app.algos.regularization import run_regularization_trace, compute_coefficient_path, compute_loss_surface

router = APIRouter()


@router.post("/regularization", summary="Get Regularization (Ridge/Lasso) StepTrace, Coefficient Path, or Loss Surface")
def get_regularization_trace(req: RegularizationRequest):
    """
    Accepts dataset + algo params, calls Ridge or Lasso regularization and returns a StepTrace JSON.
    If compute_path=True, returns coefficient path data instead.
    If compute_loss_surface=True, returns loss surface data instead.
    
    req: RegularizationRequest from app/models/regularization_requests.py
    """
    dataset_params = req.dataset.model_dump()
    algo_params = req.algo.model_dump()
    
    if req.compute_loss_surface:
        # Compute loss surface
        loss_surface_params = req.loss_surface_params.model_dump() if req.loss_surface_params else {}
        loss_surface_data = compute_loss_surface(
            noise_level=loss_surface_params.get("noise_level", 1.0),
            alpha=loss_surface_params.get("alpha", 0.0),
            n_samples=loss_surface_params.get("n_samples", 50),
            seed=loss_surface_params.get("seed", 42),
            w0_range=(loss_surface_params.get("w0_range_min", -2.0), loss_surface_params.get("w0_range_max", 6.0)),
            w1_range=(loss_surface_params.get("w1_range_min", -1.0), loss_surface_params.get("w1_range_max", 7.0)),
            grid_size=loss_surface_params.get("grid_size", 50),
        )
        return loss_surface_data
    elif req.compute_path:
        # Compute coefficient path
        path_params = req.path_params.model_dump() if req.path_params else {}
        path_data = compute_coefficient_path(
            dataset_params,
            algo_params,
            lambda_min=path_params.get("lambda_min", 0.01),
            lambda_max=path_params.get("lambda_max", 10.0),
            num_lambdas=path_params.get("num_lambdas", 50),
            n_folds=path_params.get("n_folds", 6),
        )
        return path_data
    else:
        # Regular trace
        trace = run_regularization_trace(dataset_params, algo_params)
        return trace

