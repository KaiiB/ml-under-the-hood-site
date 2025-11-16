from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_pca_trace():
    """Placeholder endpoint for PCA trace."""
    return {"status": "ok", "algo": "pca", "note": "placeholder"}
