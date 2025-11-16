# app/api/routes_em.py
from fastapi import APIRouter
from app.models.em_requests import EMRequest
from app.algos.em import run_em_trace

router = APIRouter()


@router.post("/em", summary="Get EM StepTrace")
def get_em_trace(req: EMRequest):
    """
    Accepts dataset + algo params, calls EM and returns a StepTrace JSON
    for the EM algorithm on a 3D GMM dataset.

    req: EMRequest from app/models/em_requests.py
    """
    dataset_params = req.dataset.model_dump()
    algo_params = req.algo.model_dump()

    trace = run_em_trace(dataset_params, algo_params)

    # run_em_trace must already return a JSON-serializable dict:
    # {
    #   "schema_version": 1,
    #   "algo": "em_gmm_3d",
    #   "meta": {...},
    #   "params": {...},
    #   "params_full": {...},
    #   "steps": [...]
    # }
    return trace
