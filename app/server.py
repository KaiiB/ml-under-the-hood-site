# app/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_em import router as em_router
from app.api.routes_pca import router as pca_router
from app.api.routes_linreg import router as linreg_router
from app.api.routes_kmeans import router as kmeans_router
from app.api.routes_regularization import router as regularization_router

app = FastAPI(
    title="ML Under The Hood API",
    version="0.1.0",
)

# CORS – in prod, replace "*" with frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def home():
    return {"message": "ML Under the Hood API is running"}


# Mount routers under a common prefix
app.include_router(em_router, prefix="/api/trace", tags=["em"]) # reachable at /api/trace/em, POST body as EMRequest formatted JSON 
app.include_router(pca_router, prefix="/api/trace", tags=["pca"])
app.include_router(linreg_router, prefix="/api/trace", tags=["linreg"]) # reachable at /api/trace/linreg, POST body as LinRegRequest formatted JSON
app.include_router(kmeans_router, prefix="/api/trace", tags=["kmeans"]) # reachable at /api/trace/kmeans, POST body as KMeansRequest formatted JSON
app.include_router(regularization_router, prefix="/api/trace", tags=["regularization"]) # reachable at /api/trace/regularization, POST body as RegularizationRequest formatted JSON
