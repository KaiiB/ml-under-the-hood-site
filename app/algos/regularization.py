import numpy as np

# Data generation for Regularization (Polynomial features for overfitting demonstration)

def generate_polynomial_data(
    n: int,
    seed: int,
    true_coefficients: list,
    noise_std: float = 0.5,
    x_min: float = -3.0,
    x_max: float = 3.0,
    normalize_features: bool = True,
):
    """
    Generate synthetic polynomial regression data.
    
    Args:
        n: number of samples
        seed: random seed
        true_coefficients: list of coefficients [a0, a1, a2, ...] for polynomial
                          y = a0 + a1*x + a2*x^2 + ...
        noise_std: standard deviation of noise
        x_min, x_max: range for x values
        normalize_features: if True, normalize polynomial features (except bias column)
    
    Returns:
        X: (n, degree+1) polynomial features [1, x, x^2, ...] (normalized if normalize_features=True)
        y: (n,) target values
        meta: metadata for visualization
        feature_stats: dict with mean and std for denormalization (if normalize_features=True)
    """
    np.random.seed(seed)
    
    # Generate X values
    X = np.random.uniform(x_min, x_max, size=(n, 1))
    
    # Generate polynomial features
    degree = len(true_coefficients) - 1
    X_poly = np.ones((n, degree + 1))
    for d in range(1, degree + 1):
        X_poly[:, d] = X.flatten() ** d
    
    # Normalize features (except bias column) to stabilize gradient descent
    feature_stats = {}
    if normalize_features:
        # Store statistics for denormalization
        for d in range(1, degree + 1):
            mean_val = np.mean(X_poly[:, d])
            std_val = np.std(X_poly[:, d])
            if std_val > 1e-10:  # Avoid division by zero
                X_poly[:, d] = (X_poly[:, d] - mean_val) / std_val
            feature_stats[d] = {"mean": float(mean_val), "std": float(std_val)}
    
    # Generate y = sum(coef[i] * x^i) + noise
    # Note: We use original unscaled features for generating y to maintain true relationship
    X_poly_original = np.ones((n, degree + 1))
    for d in range(1, degree + 1):
        X_poly_original[:, d] = X.flatten() ** d
    y = X_poly_original @ np.array(true_coefficients) + np.random.normal(0, noise_std, size=n)
    
    meta = {
        "true_coefficients": [float(c) for c in true_coefficients],
        "degree": degree,
        "noise_std": float(noise_std),
        "x_min": float(x_min),
        "x_max": float(x_max),
        "n": n,
        "normalize_features": normalize_features,
    }
    return X_poly, y, meta, feature_stats


# Ridge Regression (L2 Regularization)

class RidgeRegression:
    """
    Ridge Regression with L2 regularization: J = MSE + λ * ||w||²
    """
    
    def __init__(self, X, y, learning_rate=0.001, lambda_reg=0.1, fit_intercept=True):
        self.X = X
        self.y = y
        # Use smaller learning rate for stability with normalized features
        self.learning_rate = learning_rate
        self.lambda_reg = lambda_reg
        self.fit_intercept = fit_intercept
        
        n_samples, n_features = X.shape
        if fit_intercept:
            # Add bias column
            self.X_with_bias = np.hstack([np.ones((n_samples, 1)), X])
            # Initialize weights with small random values for better convergence
            np.random.seed(42)
            self.weights = np.random.randn(n_features + 1) * 0.01
        else:
            self.X_with_bias = X
            np.random.seed(42)
            self.weights = np.random.randn(n_features) * 0.01
        
        self.cost_history = []
    
    def _compute_cost(self):
        """Compute cost: MSE + λ * ||w||²"""
        n_samples = self.X_with_bias.shape[0]
        predictions = self.X_with_bias @ self.weights
        mse = np.mean((predictions - self.y) ** 2)
        
        # L2 penalty: exclude bias term if fit_intercept
        if self.fit_intercept:
            weights_penalty = self.weights[1:]  # exclude bias
        else:
            weights_penalty = self.weights
        
        l2_penalty = self.lambda_reg * np.sum(weights_penalty ** 2)
        return mse + l2_penalty
    
    def _compute_gradient(self):
        """Compute gradient with L2 regularization"""
        n_samples = self.X_with_bias.shape[0]
        predictions = self.X_with_bias @ self.weights
        error = predictions - self.y
        
        # MSE gradient
        gradient = (2 / n_samples) * self.X_with_bias.T @ error
        
        # Add L2 regularization gradient: 2 * λ * w
        if self.fit_intercept:
            # Don't regularize bias term
            gradient[1:] += 2 * self.lambda_reg * self.weights[1:]
        else:
            gradient += 2 * self.lambda_reg * self.weights
        
        return gradient
    
    def fit_and_trace(self, num_iters: int):
        """
        Run gradient descent with Ridge regularization and collect steps.
        """
        steps = []
        
        # t = 0: init
        initial_cost = self._compute_cost()
        steps.append({
            "t": 0,
            "type": "init",
            "payload": {
                "weights": self.weights.tolist(),
                "cost": float(initial_cost),
                "mse": float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2)),
                "regularization": float(self.lambda_reg * np.sum(self.weights[1:] ** 2) if self.fit_intercept else self.lambda_reg * np.sum(self.weights ** 2)),
            },
        })
        self.cost_history.append(initial_cost)
        
        for i in range(1, num_iters + 1):
            gradient = self._compute_gradient()
            self.weights -= self.learning_rate * gradient
            
            cost = self._compute_cost()
            self.cost_history.append(cost)
            
            mse = float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2))
            reg_term = float(self.lambda_reg * np.sum(self.weights[1:] ** 2) if self.fit_intercept else self.lambda_reg * np.sum(self.weights ** 2))
            
            steps.append({
                "t": i,
                "type": "update",
                "payload": {
                    "weights": self.weights.tolist(),
                    "gradient": gradient.tolist(),
                    "cost": float(cost),
                    "mse": mse,
                    "regularization": reg_term,
                },
            })
            
            # Check convergence
            if len(self.cost_history) > 1:
                if abs(self.cost_history[-2] - self.cost_history[-1]) < 1e-8:
                    steps.append({
                        "t": i + 1,
                        "type": "converged",
                        "payload": {"cost": float(cost), "mse": mse, "regularization": reg_term},
                    })
                    break
        
        # Final step if not converged early
        if steps[-1]["type"] != "converged":
            cost = self._compute_cost()
            mse = float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2))
            reg_term = float(self.lambda_reg * np.sum(self.weights[1:] ** 2) if self.fit_intercept else self.lambda_reg * np.sum(self.weights ** 2))
            steps.append({
                "t": num_iters + 1,
                "type": "converged",
                "payload": {"cost": float(cost), "mse": mse, "regularization": reg_term},
            })
        
        return steps, self.cost_history


# Lasso Regression (L1 Regularization)

class LassoRegression:
    """
    Lasso Regression with L1 regularization: J = MSE + λ * ||w||₁
    Uses subgradient for L1 term.
    """
    
    def __init__(self, X, y, learning_rate=0.001, lambda_reg=0.1, fit_intercept=True):
        self.X = X
        self.y = y
        # Use smaller learning rate for stability with normalized features
        self.learning_rate = learning_rate
        self.lambda_reg = lambda_reg
        self.fit_intercept = fit_intercept
        
        n_samples, n_features = X.shape
        if fit_intercept:
            self.X_with_bias = np.hstack([np.ones((n_samples, 1)), X])
            # Initialize weights with small random values for better convergence
            np.random.seed(42)
            self.weights = np.random.randn(n_features + 1) * 0.01
        else:
            self.X_with_bias = X
            np.random.seed(42)
            self.weights = np.random.randn(n_features) * 0.01
        
        self.cost_history = []
    
    def _compute_cost(self):
        """Compute cost: MSE + λ * ||w||₁"""
        n_samples = self.X_with_bias.shape[0]
        predictions = self.X_with_bias @ self.weights
        mse = np.mean((predictions - self.y) ** 2)
        
        # L1 penalty: exclude bias term if fit_intercept
        if self.fit_intercept:
            weights_penalty = self.weights[1:]
        else:
            weights_penalty = self.weights
        
        l1_penalty = self.lambda_reg * np.sum(np.abs(weights_penalty))
        return mse + l1_penalty
    
    def _compute_gradient(self):
        """Compute gradient with L1 regularization (subgradient)"""
        n_samples = self.X_with_bias.shape[0]
        predictions = self.X_with_bias @ self.weights
        error = predictions - self.y
        
        # MSE gradient
        gradient = (2 / n_samples) * self.X_with_bias.T @ error
        
        # Add L1 regularization subgradient: λ * sign(w)
        if self.fit_intercept:
            # Don't regularize bias term
            gradient[1:] += self.lambda_reg * np.sign(self.weights[1:])
        else:
            gradient += self.lambda_reg * np.sign(self.weights)
        
        return gradient
    
    def fit_and_trace(self, num_iters: int):
        """
        Run gradient descent with Lasso regularization and collect steps.
        """
        steps = []
        
        # t = 0: init
        initial_cost = self._compute_cost()
        steps.append({
            "t": 0,
            "type": "init",
            "payload": {
                "weights": self.weights.tolist(),
                "cost": float(initial_cost),
                "mse": float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2)),
                "regularization": float(self.lambda_reg * np.sum(np.abs(self.weights[1:])) if self.fit_intercept else self.lambda_reg * np.sum(np.abs(self.weights))),
            },
        })
        self.cost_history.append(initial_cost)
        
        for i in range(1, num_iters + 1):
            gradient = self._compute_gradient()
            self.weights -= self.learning_rate * gradient
            
            cost = self._compute_cost()
            self.cost_history.append(cost)
            
            mse = float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2))
            reg_term = float(self.lambda_reg * np.sum(np.abs(self.weights[1:])) if self.fit_intercept else self.lambda_reg * np.sum(np.abs(self.weights)))
            
            steps.append({
                "t": i,
                "type": "update",
                "payload": {
                    "weights": self.weights.tolist(),
                    "gradient": gradient.tolist(),
                    "cost": float(cost),
                    "mse": mse,
                    "regularization": reg_term,
                },
            })
            
            # Check convergence
            if len(self.cost_history) > 1:
                if abs(self.cost_history[-2] - self.cost_history[-1]) < 1e-8:
                    steps.append({
                        "t": i + 1,
                        "type": "converged",
                        "payload": {"cost": float(cost), "mse": mse, "regularization": reg_term},
                    })
                    break
        
        # Final step if not converged early
        if steps[-1]["type"] != "converged":
            cost = self._compute_cost()
            mse = float(np.mean((self.X_with_bias @ self.weights - self.y) ** 2))
            reg_term = float(self.lambda_reg * np.sum(np.abs(self.weights[1:])) if self.fit_intercept else self.lambda_reg * np.sum(np.abs(self.weights)))
            steps.append({
                "t": num_iters + 1,
                "type": "converged",
                "payload": {"cost": float(cost), "mse": mse, "regularization": reg_term},
            })
        
        return steps, self.cost_history


def compute_coefficient_path(
    dataset_params: dict,
    algo_params: dict,
    lambda_min: float = 0.01,
    lambda_max: float = 10.0,
    num_lambdas: int = 50,
    n_folds: int = 6,
) -> dict:
    """
    Compute coefficient path (regularization path) for multiple lambda values with cross-validation.
    
    Args:
        dataset_params: polynomial data generation parameters
        algo_params: regularization algorithm parameters (type, learning_rate, etc.)
        lambda_min: minimum lambda value (log scale)
        lambda_max: maximum lambda value (log scale)
        num_lambdas: number of lambda values to test
        n_folds: number of cross-validation folds
    
    Returns:
        Dictionary with coefficient path data:
        - lambdas: list of lambda values (log scale)
        - weights_path: list of weight vectors for each lambda (from first fold)
        - losses: list of loss values for each lambda (mean across folds)
        - mse_values: list of MSE values for each lambda (mean across folds)
        - mse_path_folds: list of lists, each inner list is MSE values for one fold
        - reg_values: list of regularization penalty values for each lambda
    """
    regularization_type = algo_params.get("regularization_type", "ridge")
    learning_rate = algo_params.get("learning_rate", 0.001)
    num_iters = algo_params.get("num_iters", 100)
    fit_intercept = algo_params.get("fit_intercept", True)
    
    # Generate lambda values on log scale
    lambdas = np.logspace(np.log10(lambda_min), np.log10(lambda_max), num_lambdas)
    
    # Store results for each fold
    mse_path_folds = []  # List of lists: each inner list is MSE values for one fold
    weights_path = []
    losses = []
    mse_values = []
    reg_values = []
    
    # Compute coefficient path for each fold
    base_seed = dataset_params.get("seed", 42)
    for fold_idx in range(n_folds):
        # Generate data with different seed for each fold
        fold_dataset_params = dataset_params.copy()
        fold_dataset_params["seed"] = base_seed + fold_idx * 1000  # Different seed for each fold
        
        X, y, data_meta, feature_stats = generate_polynomial_data(
            normalize_features=True,
            **fold_dataset_params
        )
        
        fold_mse_values = []
        
        for lambda_reg in lambdas:
            # Create model with current lambda
            if regularization_type.lower() == "lasso":
                model = LassoRegression(
                    X, y,
                    learning_rate=learning_rate,
                    lambda_reg=float(lambda_reg),
                    fit_intercept=fit_intercept,
                )
            else:  # default to ridge
                model = RidgeRegression(
                    X, y,
                    learning_rate=learning_rate,
                    lambda_reg=float(lambda_reg),
                    fit_intercept=fit_intercept,
                )
            
            # Train model
            _, _ = model.fit_and_trace(num_iters=num_iters)
            
            # Compute MSE for this fold and lambda
            fold_mse = float(np.mean((model.X_with_bias @ model.weights - model.y) ** 2))
            fold_mse_values.append(fold_mse)
            
            # Store weights and metrics from first fold only (for consistency)
            if fold_idx == 0:
                final_weights = model.weights.tolist()
                weights_path.append(final_weights)
                
                # Compute final cost and regularization term
                final_cost = model._compute_cost()
                
                if regularization_type.lower() == "lasso":
                    if fit_intercept:
                        final_reg = float(lambda_reg * np.sum(np.abs(model.weights[1:])))
                    else:
                        final_reg = float(lambda_reg * np.sum(np.abs(model.weights)))
                else:  # ridge
                    if fit_intercept:
                        final_reg = float(lambda_reg * np.sum(model.weights[1:] ** 2))
                    else:
                        final_reg = float(lambda_reg * np.sum(model.weights ** 2))
                
                losses.append(float(final_cost))
                reg_values.append(final_reg)
        
        mse_path_folds.append(fold_mse_values)
    
    # Compute mean MSE across folds
    mse_path_folds_array = np.array(mse_path_folds)  # Shape: (n_folds, num_lambdas)
    mse_values = np.mean(mse_path_folds_array, axis=0).tolist()  # Mean across folds
    
    return {
        "lambdas": [float(l) for l in lambdas],
        "weights_path": weights_path,  # List of lists: each inner list is weights for one lambda
        "losses": losses,
        "mse_values": mse_values,  # Mean MSE across folds
        "mse_path_folds": mse_path_folds,  # List of lists: each inner list is MSE values for one fold
        "reg_values": reg_values,
        "regularization_type": regularization_type,
        "fit_intercept": fit_intercept,
        "num_features": int(X.shape[1]),
    }


def run_regularization_trace(dataset_params: dict, algo_params: dict) -> dict:
    """
    Run Ridge or Lasso regularization and return StepTrace.
    
    Args:
        dataset_params: polynomial data generation parameters
        algo_params: regularization algorithm parameters (type, lambda, etc.)
    
    Returns:
        StepTrace JSON-serializable dict
    """
    # Generate polynomial data with feature normalization for stability
    X, y, data_meta, feature_stats = generate_polynomial_data(
        normalize_features=True,  # Always normalize for stable gradient descent
        **dataset_params
    )
    
    regularization_type = algo_params.get("regularization_type", "ridge")
    # Use smaller default learning rate for normalized features
    learning_rate = algo_params.get("learning_rate", 0.001)
    lambda_reg = algo_params.get("lambda_reg", 0.1)
    num_iters = algo_params.get("num_iters", 100)
    fit_intercept = algo_params.get("fit_intercept", True)
    
    # Choose regularization type
    if regularization_type.lower() == "lasso":
        model = LassoRegression(
            X, y,
            learning_rate=learning_rate,
            lambda_reg=lambda_reg,
            fit_intercept=fit_intercept,
        )
    else:  # default to ridge
        model = RidgeRegression(
            X, y,
            learning_rate=learning_rate,
            lambda_reg=lambda_reg,
            fit_intercept=fit_intercept,
        )
    
    steps, costs = model.fit_and_trace(num_iters=num_iters)
    
    # Extract final weights
    final_weights = model.weights.tolist()
    
    # Calculate weight magnitude for visualization (excluding bias)
    if fit_intercept:
        weight_magnitude = float(np.sqrt(np.sum(np.array(final_weights[1:]) ** 2)))
    else:
        weight_magnitude = float(np.sqrt(np.sum(np.array(final_weights) ** 2)))
    
    trace = {
        "schema_version": 1,
        "algo": f"regularization_{regularization_type.lower()}",
        "meta": {
            "n": int(X.shape[0]),
            "d": int(X.shape[1]),
            "data": data_meta,
            "feature_stats": feature_stats,  # For potential denormalization in frontend
        },
        "params": {
            "regularization_type": regularization_type,
            "learning_rate": learning_rate,
            "lambda_reg": lambda_reg,
            "num_iters": num_iters,
            "fit_intercept": fit_intercept,
            "seed": dataset_params.get("seed"),
        },
        "params_full": {
            "dataset": dataset_params,
            "algo": algo_params,
        },
        "steps": steps,
        "cost_history": [float(c) for c in costs],
        "final_weights": final_weights,
        "weight_magnitude": weight_magnitude,  # L2 norm of weights (excluding bias)
    }
    return trace


def compute_loss_surface(
    noise_level: float = 1.0,
    alpha: float = 0.0,
    n_samples: int = 50,
    seed: int = 42,
    w0_range: tuple = (-2, 6),
    w1_range: tuple = (-1, 7),
    grid_size: int = 50,
) -> dict:
    """
    Compute 3D Loss Surface for Ridge Regression (simple linear regression: y = w0 + w1*x).
    
    This function implements the Loss Landscape Explorer from test2.py.
    
    Args:
        noise_level: Standard deviation of noise in data generation
        alpha: Regularization strength (lambda)
        n_samples: Number of data samples
        seed: Random seed
        w0_range: (min, max) range for intercept (w0) grid
        w1_range: (min, max) range for slope (w1) grid
        grid_size: Number of grid points in each dimension
    
    Returns:
        Dictionary with:
        - loss_surface: 3D grid of loss values (Z)
        - w0_grid: 2D grid of intercept values (X)
        - w1_grid: 2D grid of slope values (Y)
        - true_intercept: True intercept value (2.0)
        - true_coef: True slope value (3.0)
        - optimal_intercept: Ridge solution intercept
        - optimal_coef: Ridge solution slope
        - min_loss: Loss value at optimal solution
        - X: Generated X data
        - y: Generated y data
    """
    TRUE_INTERCEPT = 2.0
    TRUE_COEF = 3.0
    
    # Generate data: y = w0 + w1*x + noise
    np.random.seed(seed)
    X = np.linspace(-2, 2, n_samples).reshape(-1, 1)
    noise = np.random.normal(0, noise_level, n_samples)
    y = TRUE_INTERCEPT + TRUE_COEF * X.flatten() + noise
    
    # Solve Ridge mathematically: w = (X^T * X + alpha * I)^(-1) * X^T * y
    m = X.shape[0]
    X_design = np.c_[np.ones((m, 1)), X]  # Add bias column
    n_params = X_design.shape[1]
    I = np.eye(n_params)
    
    # Normal equation
    A = X_design.T.dot(X_design) + alpha * I
    b = X_design.T.dot(y)
    w_opt = np.linalg.solve(A, b)
    w0_opt, w1_opt = float(w_opt[0]), float(w_opt[1])
    
    # Compute Loss Surface
    w0_range_vals = np.linspace(w0_range[0], w0_range[1], grid_size)
    w1_range_vals = np.linspace(w1_range[0], w1_range[1], grid_size)
    W0, W1 = np.meshgrid(w0_range_vals, w1_range_vals)
    
    Z = np.zeros_like(W0)
    X_flat = X.flatten()
    
    # Compute loss for each grid point
    for i in range(W0.shape[0]):
        for j in range(W0.shape[1]):
            w0_val = W0[i, j]
            w1_val = W1[i, j]
            y_pred = w0_val + w1_val * X_flat
            mse = np.mean((y - y_pred) ** 2)
            penalty = alpha * (w0_val**2 + w1_val**2)
            Z[i, j] = mse + penalty
    
    # Compute loss at optimal solution
    y_pred_opt = w0_opt + w1_opt * X_flat
    min_loss = float(np.mean((y - y_pred_opt) ** 2) + alpha * (w0_opt**2 + w1_opt**2))
    
    return {
        "loss_surface": Z.tolist(),  # 2D array: loss values
        "w0_grid": W0.tolist(),  # 2D array: intercept values
        "w1_grid": W1.tolist(),  # 2D array: slope values
        "true_intercept": TRUE_INTERCEPT,
        "true_coef": TRUE_COEF,
        "optimal_intercept": w0_opt,
        "optimal_coef": w1_opt,
        "min_loss": min_loss,
        "X": X.flatten().tolist(),
        "y": y.tolist(),
        "noise_level": float(noise_level),
        "alpha": float(alpha),
    }

