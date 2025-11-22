# app/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_em import router as em_router
from app.api.routes_kmeans import router as kmeans_router
# from app.api.routes_pca import router as pca_router
# etc.

app = FastAPI(
    title="ML Under The Hood API",
    version="0.1.0",
)

# CORS – in prod, replace "*" with frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# Mount routers under a common prefix
app.include_router(em_router, prefix="/api/trace", tags=["em"]) # reachable at /api/trace/em, POST body as EMRequest formatted JSON 
app.include_router(kmeans_router, prefix="/api/trace", tags=["kmeans"]) # reachable at /api/trace/kmeans, POST body as KMeansRequest formatted JSON
# app.include_router(pca_router, prefix="/api/trace", tags=["pca"])
