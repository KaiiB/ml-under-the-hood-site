from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_linreg_trace():
    """Placeholder endpoint for Linear Regression trace."""
    return {"status": "ok", "algo": "linreg", "note": "placeholder"}
