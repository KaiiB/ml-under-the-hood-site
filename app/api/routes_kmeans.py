from fastapi import APIRouter
from app.models.kmeans_requests import KMeansRequest
from app.algos.kmeans import run_kmeans_trace

router = APIRouter()


@router.post("/kmeans", summary="Get K-Means StepTrace")
def get_kmeans_trace(req: KMeansRequest):
    """
    Accepts dataset + algo params, calls K-Means and returns a StepTrace JSON
    for the K-Means algorithm on various dataset types (blobs, moons, circles, random).
    
    req: KMeansRequest from app/models/kmeans_requests.py
    """
    dataset_params = req.dataset.model_dump()
    algo_params = req.algo.model_dump()
    
    # Debug logging
    print(f"DEBUG: Received init_method: {algo_params.get('init_method', 'NOT PROVIDED')}")
    
    # Convert bounds list to tuple for the algorithm
    if "bounds" in dataset_params and isinstance(dataset_params["bounds"], list):
        dataset_params["bounds"] = tuple(dataset_params["bounds"])
    
    # Use dataset random_state if algo random_state is None
    if algo_params.get("random_state") is None:
        algo_params["random_state"] = dataset_params.get("random_state")
    
    # Extract initial_centroids if provided
    initial_centroids = algo_params.pop("initial_centroids", None)
    if initial_centroids:
        initial_centroids = [tuple(c) for c in initial_centroids]  # Convert to tuples
    
    trace = run_kmeans_trace(dataset_params, algo_params, initial_centroids=initial_centroids)
    
    # Debug: log initial centroids
    if trace.get('steps') and len(trace['steps']) > 0:
        init_centroids = trace['steps'][0]['payload']['centroids']
        print(f"DEBUG: Initial centroids positions:")
        for i, c in enumerate(init_centroids):
            print(f"  C{i+1}: {c['position']}")
    
    return trace
