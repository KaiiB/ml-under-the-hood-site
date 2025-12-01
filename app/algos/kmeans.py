import numpy as np
import time
from typing import Dict, Any, Optional, List, Union
from sklearn.datasets import make_blobs, make_moons, make_circles


class KMeans:
    """
    Enhanced K-means clustering with detailed step-by-step tracking for visualization.
    
    Parameters:
    -----------
    n_clusters : int
        Number of clusters to form
    max_iters : int, optional (default=100)
        Maximum number of iterations to perform
    random_state : int, optional
        Random seed for reproducibility
    tolerance : float, optional (default=1e-4)
        Convergence tolerance
    """
    def __init__(self, n_clusters, max_iters=100, random_state=None, tolerance=1e-4, n_features=2):
        self.n_clusters = n_clusters
        self.max_iters = max_iters
        self.random_state = random_state
        # For 3D data, use slightly stricter tolerance to require more iterations
        if n_features == 3:
            self.tolerance = tolerance * 0.5  # Stricter for 3D (half the tolerance)
        else:
            self.tolerance = tolerance
        self.n_features = n_features
        self.inertia_ = None
        self.history = []  # Store complete history of each step
        self.inertia_history_ = []
        
    def initialize_centroids(self, X, method='kmeans++'):
        """
        Initialize centroids using k-means++ for better initialization.
        Methods: 'kmeans++' (default) or 'random' or custom positions.
        """
        np.random.seed(self.random_state)
        if method == 'random':
            # Random initialization: place centroids randomly in the data space
            # Not on data points, but random positions - shows convergence without being extreme
            np.random.seed(self.random_state)
            
            # Get data bounds
            x_min, x_max = X[:, 0].min(), X[:, 0].max()
            y_min, y_max = X[:, 1].min(), X[:, 1].max()
            
            x_range = x_max - x_min
            y_range = y_max - y_min
            
            # Place centroids randomly in extended data space (with larger padding)
            # More extreme positions = more iterations needed for convergence
            # Increased padding to make centroids start further from optimal positions
            centroids = np.zeros((self.n_clusters, X.shape[1]))
            
            # Increased padding for more randomness and more convergence steps
            # For 2D: 50% padding (was 10%) - places centroids well outside data bounds
            # For 3D: 60% padding (was 30%) - even more extreme for 3D
            if X.shape[1] == 3:
                padding_factor = 0.6  # 60% padding for 3D - very extreme initial positions
            else:
                padding_factor = 0.5  # 50% padding for 2D - well outside data bounds
            
            for k in range(self.n_clusters):
                centroids[k, 0] = np.random.uniform(
                    x_min - padding_factor * x_range, 
                    x_max + padding_factor * x_range
                )
                if X.shape[1] > 1:
                    centroids[k, 1] = np.random.uniform(
                        y_min - padding_factor * y_range, 
                        y_max + padding_factor * y_range
                    )
                if X.shape[1] > 2:
                    z_min, z_max = X[:, 2].min(), X[:, 2].max()
                    z_range = z_max - z_min
                    centroids[k, 2] = np.random.uniform(
                        z_min - padding_factor * z_range, 
                        z_max + padding_factor * z_range
                    )
            
            return centroids
        elif method == 'kmeans++':
            # K-means++ initialization: choose first centroid randomly,
            # then choose subsequent centroids with probability proportional to distance^2
            centroids = np.zeros((self.n_clusters, X.shape[1]))
            
            # For 3D data, add some randomness to kmeans++ to show more convergence
            # by slightly perturbing the selected points away from optimal positions
            use_perturbation = (X.shape[1] == 3)
            perturbation_factor = 0.15 if use_perturbation else 0.0  # 15% perturbation for 3D
            
            # First centroid: random
            idx = np.random.choice(X.shape[0])
            centroids[0] = X[idx].copy()
            
            # Add perturbation for 3D to show more convergence
            if use_perturbation:
                ranges = [X[:, i].max() - X[:, i].min() for i in range(X.shape[1])]
                for dim in range(X.shape[1]):
                    perturbation = np.random.uniform(-perturbation_factor * ranges[dim], 
                                                     perturbation_factor * ranges[dim])
                    centroids[0, dim] += perturbation
            
            for k in range(1, self.n_clusters):
                # Compute distances from each point to nearest existing centroid
                distances = np.array([
                    min([np.sum((x - centroids[j])**2) for j in range(k)])
                    for x in X
                ])
                # Choose next centroid with probability proportional to distance^2
                probabilities = distances / distances.sum()
                idx = np.random.choice(X.shape[0], p=probabilities)
                centroids[k] = X[idx].copy()
                
                # Add perturbation for 3D to show more convergence
                if use_perturbation:
                    ranges = [X[:, i].max() - X[:, i].min() for i in range(X.shape[1])]
                    for dim in range(X.shape[1]):
                        perturbation = np.random.uniform(-perturbation_factor * ranges[dim], 
                                                         perturbation_factor * ranges[dim])
                        centroids[k, dim] += perturbation
            
            return centroids
        else:
            # For manual initialization
            return method  # Assume method is already an array of centroids
    
    def compute_distances(self, X, centroids):
        """
        Compute distances from each point to each centroid.
        Returns: (n_clusters, n_samples) array of distances
        """
        # Euclidean distance: d(x,c) = √Σ(xi - ci)²
        distances = np.sqrt(((X - centroids[:, np.newaxis])**2).sum(axis=2))
        return distances
    
    def assign_clusters(self, X, centroids):
        """Assign each point to nearest centroid based on Euclidean distance."""
        distances = self.compute_distances(X, centroids)
        labels = np.argmin(distances, axis=0)
        return labels, distances
    
    def update_centroids(self, X, labels, iteration=0):
        """
        Update centroids as mean of assigned points.
        Formula: c_new = (1/n) * Σxi for all points xi in cluster
        Handles empty clusters by reinitializing them to farthest point from existing centroids.
        """
        centroids = np.zeros((self.n_clusters, X.shape[1]))
        cluster_sizes = np.zeros(self.n_clusters)
        
        for k in range(self.n_clusters):
            cluster_points = X[labels == k]
            if len(cluster_points) > 0:
                centroids[k] = np.mean(cluster_points, axis=0)
                cluster_sizes[k] = len(cluster_points)
            else:
                # Handle empty cluster: reinitialize to point farthest from all existing centroids
                if k > 0:
                    # Find existing non-empty centroids
                    existing_centroids = [centroids[j] for j in range(k) if cluster_sizes[j] > 0]
                    if len(existing_centroids) > 0:
                        # Compute distance from each point to nearest existing centroid
                        distances = np.array([
                            min([np.sum((x - c)**2) for c in existing_centroids])
                            for x in X
                        ])
                        # Choose the farthest point
                        idx = np.argmax(distances)
                    else:
                        # No existing centroids, just pick random
                        idx = np.random.choice(X.shape[0])
                else:
                    # First centroid is empty (shouldn't happen, but handle it)
                    idx = np.random.choice(X.shape[0])
                centroids[k] = X[idx].copy()
                cluster_sizes[k] = 0
        
        return centroids, cluster_sizes
    
    def compute_inertia(self, X, labels, centroids):
        """
        Compute within-cluster sum of squares (WCSS/Inertia).
        Formula: J = Σ Σ ||xi - μj||²
        """
        distances = np.sqrt(((X - centroids[labels])**2).sum(axis=1))
        return np.sum(distances**2)
    
    def compute_centroid_movement(self, old_centroids, new_centroids):
        """Compute how much centroids moved."""
        if old_centroids is None:
            return np.inf
        return np.max(np.linalg.norm(new_centroids - old_centroids, axis=1))
    
    def step(self, X, centroids, iteration=0):
        """
        Perform one iteration of K-Means algorithm.
        Returns detailed information about the step.
        """
        old_centroids = centroids.copy()
        
        # Assignment step
        labels, distances = self.assign_clusters(X, centroids)
        
        # Update step
        new_centroids, cluster_sizes = self.update_centroids(X, labels, iteration)
        
        # Calculate metrics
        inertia = self.compute_inertia(X, labels, new_centroids)
        movement = self.compute_centroid_movement(old_centroids, new_centroids)
        converged = movement < self.tolerance
        
        step_info = {
            'old_centroids': old_centroids,
            'new_centroids': new_centroids,
            'labels': labels,
            'distances': distances,
            'cluster_sizes': cluster_sizes,
            'inertia': inertia,
            'movement': movement,
            'converged': converged
        }
        
        return new_centroids, step_info
    
    def fit(self, X, initial_centroids=None, init_method='kmeans++'):
        """
        Fit K-means clustering to the data with step-by-step tracking.
        
        Parameters:
        -----------
        X : array-like of shape (n_samples, n_features)
            Training data
        initial_centroids : array-like, optional
            Initial centroid positions (for manual placement)
        init_method : str, optional (default='kmeans++')
            Initialization method: 'kmeans++' or 'random'
        """
        self.X = X
        self.history = []
        self.inertia_history_ = []
        
        # Initialize centroids
        if initial_centroids is None:
            self.centroids_ = self.initialize_centroids(X, method=init_method)
        else:
            self.centroids_ = np.array(initial_centroids)
        
        # Store initial state
        _, initial_distances = self.assign_clusters(X, self.centroids_)
        initial_labels = np.argmin(initial_distances, axis=0)
        initial_inertia = self.compute_inertia(X, initial_labels, self.centroids_)
        
        self.history.append({
            'iteration': 0,
            'old_centroids': None,
            'new_centroids': self.centroids_.copy(),
            'labels': initial_labels,
            'distances': initial_distances,
            'cluster_sizes': np.bincount(initial_labels, minlength=self.n_clusters),
            'inertia': initial_inertia,
            'movement': np.inf,
            'converged': False,
            'step_type': 'initialization'
        })
        self.inertia_history_.append(initial_inertia)
        
        # Main loop
        for i in range(self.max_iters):
            self.centroids_, step_info = self.step(X, self.centroids_, iteration=i)
            step_info['iteration'] = i + 1
            step_info['step_type'] = 'iteration'
            self.history.append(step_info)
            self.inertia_history_.append(step_info['inertia'])
            
            if step_info['converged']:
                break
        
        self.inertia_ = self.inertia_history_[-1]
        self.labels_ = self.history[-1]['labels']
        
        return self


class DataGenerator:
    """Generate various datasets for K-Means visualization."""
    
    @staticmethod
    def generate_blobs(n_samples=300, n_centers=3, random_state=42, noise=1.0, separation=1.0, n_features=2):
        """Generate blob dataset with adjustable separation, noise, and dimensionality."""
        X, y = make_blobs(
            n_samples=n_samples,
            centers=n_centers,
            cluster_std=noise,
            random_state=random_state,
            center_box=(-10 * separation, 10 * separation),
            n_features=n_features
        )
        return X, y
    
    @staticmethod
    def generate_moons(n_samples=300, random_state=42, noise=0.1, n_features=2):
        """Generate moon-shaped clusters. Supports 2D and 3D."""
        # Ensure noise is reasonable for moons (typically 0.05-0.2)
        # If noise is too high (from blobVariance), scale it down
        if noise > 0.3:
            noise = 0.1  # Default moon noise
        elif noise < 0.01:
            noise = 0.05  # Minimum noise for visibility
        
        X, y = make_moons(n_samples=n_samples, noise=noise, random_state=random_state)
        # Scale to similar range as blobs (moons are typically in [-1, 1] range)
        X = X * 5
        
        # If 3D, add a third dimension with variation
        if n_features == 3:
            np.random.seed(random_state)
            # Add Z dimension with some spread to create 3D moon shapes
            z = np.random.normal(0, noise * 3, (n_samples, 1))
            X = np.hstack([X, z])
        
        return X, y
    
    @staticmethod
    def generate_circles(n_samples=300, random_state=42, noise=0.1, factor=0.5, n_features=2):
        """Generate circular clusters. Supports 2D and 3D."""
        # Ensure noise is reasonable for circles (typically 0.05-0.2)
        # If noise is too high (from blobVariance), scale it down
        if noise > 0.3:
            noise = 0.1  # Default circle noise
        elif noise < 0.01:
            noise = 0.05  # Minimum noise for visibility
        
        # Ensure factor is reasonable (0.3-0.8 for visible separation)
        if factor < 0.2:
            factor = 0.3  # Minimum for visibility
        elif factor > 0.9:
            factor = 0.7  # Maximum for good separation
        
        X, y = make_circles(n_samples=n_samples, noise=noise, random_state=random_state, factor=factor)
        # Scale to similar range as blobs (circles are typically in [-1, 1] range)
        X = X * 5
        
        # If 3D, add a third dimension with variation
        if n_features == 3:
            np.random.seed(random_state)
            # Add Z dimension with some spread to create 3D circular shapes
            z = np.random.normal(0, noise * 3, (n_samples, 1))
            X = np.hstack([X, z])
        
        return X, y
    
    @staticmethod
    def generate_random(n_samples=300, random_state=42, bounds=(-10, 10), n_features=2):
        """Generate random uniform distribution with configurable dimensionality."""
        np.random.seed(random_state)
        X = np.random.uniform(bounds[0], bounds[1], (n_samples, n_features))
        y = np.zeros(n_samples)
        return X, y


def generate_data(
    data_type='blobs',
    n_samples=300,
    n_centers=3,
    random_state=42,
    n_features=2,
    **kwargs
):
    """Unified data generation function."""
    generator = DataGenerator()
    
    # Note: moons and circles now support 3D by extending 2D shapes with a Z dimension
    
    if data_type == 'blobs':
        return generator.generate_blobs(
            n_samples,
            n_centers,
            random_state,
            kwargs.get('noise', 1.0),
            kwargs.get('separation', 1.0),
            n_features=n_features
        )
    elif data_type == 'moons':
        return generator.generate_moons(
            n_samples, 
            random_state, 
            kwargs.get('noise', 0.1),
            n_features=n_features
        )
    elif data_type == 'circles':
        return generator.generate_circles(
            n_samples,
            random_state,
            kwargs.get('noise', 0.1),
            kwargs.get('factor', 0.5),
            n_features=n_features
        )
    elif data_type == 'random':
        bounds = kwargs.get('bounds', (-10, 10))
        # Convert list to tuple if needed
        if isinstance(bounds, list):
            bounds = tuple(bounds)
        return generator.generate_random(
            n_samples,
            random_state,
            bounds,
            n_features=n_features
        )
    else:
        return generator.generate_blobs(
            n_samples,
            n_centers,
            random_state,
            n_features=n_features
        )


def _to_serializable_array(arr: Optional[np.ndarray]) -> Optional[List]:
    """Convert numpy array to list for JSON serialization."""
    if arr is None:
        return None
    if isinstance(arr, list):
        return arr
    return np.asarray(arr).tolist()


def _serialize_centroids(centroids: np.ndarray) -> List[Dict[str, Any]]:
    """Serialize centroids to JSON-friendly format."""
    return [
        {
            "id": int(idx),
            "position": _to_serializable_array(centroid)
        }
        for idx, centroid in enumerate(centroids)
    ]


def _serialize_step(
    step: Dict[str, Any],
    include_labels: bool = True,
    store_distances: bool = False
) -> Dict[str, Any]:
    """Serialize a single step to JSON-friendly format."""
    serialized: Dict[str, Any] = {
        "t": int(step.get("iteration", 0)),
        "type": step.get("step_type", "iteration"),
        "payload": {
            "iteration": int(step.get("iteration", 0)),
            "inertia": float(step.get("inertia", 0.0)),
            "converged": bool(step.get("converged", False)),
            "centroids": _serialize_centroids(np.asarray(step["new_centroids"])),
            "cluster_sizes": _to_serializable_array(step.get("cluster_sizes")),
        }
    }

    movement = step.get("movement")
    if movement is not None and np.isfinite(movement):
        serialized["payload"]["movement"] = float(movement)
    else:
        serialized["payload"]["movement"] = None

    if step.get("old_centroids") is not None:
        serialized["payload"]["old_centroids"] = _serialize_centroids(np.asarray(step["old_centroids"]))

    if include_labels and step.get("labels") is not None:
        serialized["payload"]["labels"] = _to_serializable_array(step["labels"])
    
    if store_distances and step.get("distances") is not None:
        serialized["payload"]["distances"] = _to_serializable_array(step["distances"])
    
    return serialized


def run_kmeans_trace(dataset_params: dict, algo_params: dict, initial_centroids=None) -> dict:
    """
    Run K-Means algorithm and return step-by-step trace.
    
    Parameters:
    -----------
    dataset_params : dict
        Parameters for data generation:
        - data_type: str ('blobs', 'moons', 'circles', 'random')
        - n_samples: int
        - n_centers: int (for blobs)
        - random_state: int
        - n_features: int (2 or 3)
        - noise: float (for moons/circles)
        - separation: float (for blobs)
        - bounds: tuple (for random)
        - factor: float (for circles)
    
    algo_params : dict
        Algorithm parameters:
        - n_clusters: int
        - max_iters: int
        - tolerance: float
        - random_state: int (optional, overrides dataset random_state for algorithm)
        - init_method: str (optional, 'kmeans++' or 'random', default='kmeans++')
    
    Returns:
    --------
    dict: JSON-serializable trace with schema similar to EM
    """
    # Generate data
    X, y = generate_data(**dataset_params)
    
    # Extract algorithm parameters
    n_clusters = algo_params.get("n_clusters", 3)
    max_iters = algo_params.get("max_iters", 100)
    tolerance = algo_params.get("tolerance", 1e-4)
    algo_random_state = algo_params.get("random_state", dataset_params.get("random_state"))
    init_method = algo_params.get("init_method", "kmeans++")
    
    # Get number of features for tolerance adjustment
    n_features = dataset_params.get("n_features", 2)
    
    # Create and fit K-Means
    kmeans = KMeans(
        n_clusters=n_clusters,
        max_iters=max_iters,
        random_state=algo_random_state,
        tolerance=tolerance,
        n_features=n_features
    )
    
    start_time = time.perf_counter()
    if initial_centroids:
        # Convert to numpy array
        import numpy as np
        initial_centroids = np.array(initial_centroids)
        kmeans.fit(X, initial_centroids=initial_centroids, init_method='kmeans++')
    else:
        kmeans.fit(X, init_method=init_method)
    runtime_ms = (time.perf_counter() - start_time) * 1000.0
    
    # Serialize steps
    steps = [
        _serialize_step(step, include_labels=True, store_distances=False)
        for step in kmeans.history
    ]
    
    # Build trace response
    trace = {
        "schema_version": 1,
        "algo": "kmeans",
        "meta": {
            "n": int(X.shape[0]),
            "d": int(X.shape[1]),
            "data_type": dataset_params.get("data_type", "blobs"),
            "data_points": _to_serializable_array(X),  # Include actual data points for visualization
        },
        "params": {
            "n_clusters": n_clusters,
            "max_iters": max_iters,
            "tolerance": tolerance,
            "random_state": algo_random_state,
        },
        "params_full": {
            "dataset": dataset_params,
            "algo": algo_params,
        },
        "steps": steps,
        "inertia_history": [float(x) for x in kmeans.inertia_history_],
        "summary": {
            "iterations": len(kmeans.history) - 1,
            "converged": bool(kmeans.history[-1]["converged"]),
            "final_inertia": float(kmeans.inertia_),
            "runtime_ms": runtime_ms
        }
    }
    
    return trace
