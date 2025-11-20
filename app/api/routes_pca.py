# app/api/routes_pca.py
from fastapi import APIRouter, HTTPException
from app.models.pca_requests import PCARequest
from app.algos.pca import run_pca_trace

router = APIRouter()

#@router.get("/")
@router.post("/pca", summary="Get PCA Trace")
def read_pca_trace(req: PCARequest):
    """
    Accepts dataset + algo params, calls PCA and returns a StepTrace JSON
    for the PCA algorithm on a Gaussian-distributed dataset.

    req: PCARequest from app/models/pca_requests.py
    """
    try:
        dataset_params = req.dataset.model_dump()
        algo_params = req.algo.model_dump()

        trace = run_pca_trace(dataset_params, algo_params)

        # run_em_trace must already return a JSON-serializable dict:
        # {
        #   "schema_version": 1,
        #   "algo": "pca_gaussian",
        #   "meta": {...},
        #   "params": {...},
        #   "params_full": {...}
        # }
        
        # return {"status": "ok", "algo": "pca", "note": "placeholder"}
        if trace is None:
            raise ValueError("run_pca_trace returned None")
        
        return trace

    except Exception as e:
        print("Error running PCA:", e)  # log for dev debugging
        raise HTTPException(status_code=500, detail=str(e))