from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_kmeans_trace():
    """Placeholder endpoint for KMeans trace."""
    return {"status": "ok", "algo": "kmeans", "note": "placeholder"}
