# app/api/routes_linreg.py
from fastapi import APIRouter
from app.models.linreg_requests import LinRegRequest
from app.algos.linreg import run_linreg_trace

router = APIRouter()


@router.post("/linreg", summary="Get Linear Regression StepTrace")
def get_linreg_trace(req: LinRegRequest):
    """
    Accepts dataset + algo params, calls Linear Regression and returns a StepTrace JSON
    for the Linear Regression algorithm using gradient descent.

    req: LinRegRequest from app/models/linreg_requests.py
    """
    dataset_params = req.dataset.model_dump()
    algo_params = req.algo.model_dump()

    trace = run_linreg_trace(dataset_params, algo_params)

    # run_linreg_trace must already return a JSON-serializable dict:
    # {
    #   "schema_version": 1,
    #   "algo": "linear_regression",
    #   "meta": {...},
    #   "params": {...},
    #   "params_full": {...},
    #   "steps": [...],
    #   "cost_history": [...],
    #   "final_weights": {...}
    # }
    return trace
