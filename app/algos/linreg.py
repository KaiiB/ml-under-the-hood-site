import numpy as np
from typing import Optional

# Data generation (Linear Regression)

def generate_linear_data(
    n: int,
    seed: int,
    true_slope: float = 2.0,
    true_intercept: float = -1.0,
    noise_std: float = 0.5,
    x_min: float = -5.0,
    x_max: float = 5.0,
    num_features: int = 1,  # 1 for 2D plot, 2 for 3D plane
    true_weights: Optional[list] = None,  # For 2D features: [w1, w2] or [b, w1, w2]
):
    """
    Generate synthetic linear regression data.
    
    Args:
        num_features: 1 for simple linear regression (y = w*x + b), 2 for plane regression (y = w1*x1 + w2*x2 + b)
        true_weights: For 2D features, specify [w1, w2] or [b, w1, w2]. If None, uses true_slope/true_intercept.
    
    Returns:
      X: (n, num_features) input features
      y: (n,) target values
      meta: metadata for ground truth
    """
    np.random.seed(seed)
    
    if num_features == 1:
        # 1D feature: simple linear regression
        X = np.random.uniform(x_min, x_max, size=(n, 1))
        y = true_slope * X.flatten() + true_intercept + np.random.normal(0, noise_std, size=n)
        
        meta = {
            "true_slope": float(true_slope),
            "true_intercept": float(true_intercept),
            "noise_std": float(noise_std),
            "x_min": float(x_min),
            "x_max": float(x_max),
            "num_features": 1,
        }
    else:
        # 2D features: plane regression y = w1*x1 + w2*x2 + b
        X = np.random.uniform(x_min, x_max, size=(n, 2))
        
        if true_weights is None:
            # Default: use true_slope as w1, w2 = 1.0, true_intercept as b
            w1, w2 = true_slope, 1.0
            b = true_intercept
        elif len(true_weights) == 2:
            w1, w2 = true_weights[0], true_weights[1]
            b = true_intercept
        else:  # len == 3
            b, w1, w2 = true_weights[0], true_weights[1], true_weights[2]
        
        y = w1 * X[:, 0] + w2 * X[:, 1] + b + np.random.normal(0, noise_std, size=n)
        
        meta = {
            "true_weights": [float(b), float(w1), float(w2)],
            "true_intercept": float(b),
            "true_slope": None,  # Not applicable for 2D
            "noise_std": float(noise_std),
            "x_min": float(x_min),
            "x_max": float(x_max),
            "num_features": 2,
        }
    
    return X, y, meta


# Linear Regression with Gradient Descent

class LinearRegression:
    """
    Backend-friendly Linear Regression with gradient descent.
    """

    def __init__(self, X, y, learning_rate=0.01, fit_intercept=True):
        self.X = X
        self.y = y
        self.learning_rate = learning_rate
        self.fit_intercept = fit_intercept
        
        # Add bias term if intercept is needed
        if fit_intercept:
            self.X_with_bias = np.column_stack([np.ones(X.shape[0]), X])
        else:
            self.X_with_bias = X
        
        n_samples, n_features = self.X_with_bias.shape
        
        # Initialize weights (small random values)
        np.random.seed(42)
        self.weights = np.random.randn(n_features) * 0.1
        
        self.cost_history = []

    def _compute_cost(self):
        """Compute Mean Squared Error (MSE)."""
        predictions = self.X_with_bias @ self.weights
        mse = np.mean((predictions - self.y) ** 2)
        return mse

    def _compute_gradient(self):
        """Compute gradient of MSE."""
        n_samples = self.X_with_bias.shape[0]
        predictions = self.X_with_bias @ self.weights
        error = predictions - self.y
        gradient = (2 / n_samples) * self.X_with_bias.T @ error
        return gradient

    def fit_and_trace(self, num_iters: int):
        """
        Run gradient descent and collect a StepTrace-style list of steps.
        Each step: {t, type, payload}
        """
        steps = []

        # t = 0: init
        initial_cost = self._compute_cost()
        steps.append(
            {
                "t": 0,
                "type": "init",
                "payload": {
                    "weights": self.weights.tolist(),
                    "cost": float(initial_cost),
                },
            }
        )
        self.cost_history.append(initial_cost)

        for i in range(1, num_iters + 1):
            # Compute gradient
            gradient = self._compute_gradient()
            
            # Update weights
            self.weights -= self.learning_rate * gradient
            
            # Compute cost
            cost = self._compute_cost()
            self.cost_history.append(cost)
            
            steps.append(
                {
                    "t": i,
                    "type": "update",
                    "payload": {
                        "weights": self.weights.tolist(),
                        "gradient": gradient.tolist(),
                        "cost": float(cost),
                    },
                }
            )
            
            # Check convergence (early stopping)
            if len(self.cost_history) > 1:
                if abs(self.cost_history[-2] - self.cost_history[-1]) < 1e-8:
                    steps.append(
                        {
                            "t": i + 1,
                            "type": "converged",
                            "payload": {"cost": float(cost)},
                        }
                    )
                    break

        # Final step if not converged early
        if steps[-1]["type"] != "converged":
            steps.append(
                {
                    "t": num_iters + 1,
                    "type": "converged",
                    "payload": {"cost": float(self.cost_history[-1])},
                }
            )

        return steps, self.cost_history


def run_linreg_trace(dataset_params: dict, algo_params: dict) -> dict:
    """
    dataset_params: dict with keys matching generate_linear_data args
    algo_params: dict with at least {"learning_rate": float, "num_iters": int, "fit_intercept": bool}
    Returns: JSON-serializable StepTrace dict
    """
    X, y, data_meta = generate_linear_data(**dataset_params)
    
    linreg = LinearRegression(
        X,
        y,
        learning_rate=algo_params.get("learning_rate", 0.01),
        fit_intercept=algo_params.get("fit_intercept", True),
    )
    
    num_iters = algo_params.get("num_iters", 100)
    steps, costs = linreg.fit_and_trace(num_iters=num_iters)

    # Extract final weights
    final_weights = linreg.weights.tolist()
    num_features = X.shape[1]
    
    if num_features == 1:
        # 1D feature: simple linear regression
        if linreg.fit_intercept:
            final_intercept = final_weights[0]
            final_slope = final_weights[1] if len(final_weights) > 1 else 0.0
        else:
            final_intercept = 0.0
            final_slope = final_weights[0] if len(final_weights) > 0 else 0.0
        
        final_weights_dict = {
            "intercept": float(final_intercept),
            "slope": float(final_slope),
        }
    else:
        # 2D features: plane regression
        if linreg.fit_intercept:
            final_intercept = final_weights[0]
            final_w1 = final_weights[1] if len(final_weights) > 1 else 0.0
            final_w2 = final_weights[2] if len(final_weights) > 2 else 0.0
        else:
            final_intercept = 0.0
            final_w1 = final_weights[0] if len(final_weights) > 0 else 0.0
            final_w2 = final_weights[1] if len(final_weights) > 1 else 0.0
        
        final_weights_dict = {
            "intercept": float(final_intercept),
            "w1": float(final_w1),
            "w2": float(final_w2),
        }

    trace = {
        "schema_version": 1,
        "algo": "linear_regression",
        "meta": {
            "n": int(X.shape[0]),
            "d": int(X.shape[1]),
            "data": data_meta,
        },
        "params": {
            "learning_rate": algo_params.get("learning_rate", 0.01),
            "num_iters": num_iters,
            "fit_intercept": algo_params.get("fit_intercept", True),
            "seed": dataset_params.get("seed"),
        },
        "params_full": {
            "dataset": dataset_params,
            "algo": algo_params,
        },
        "steps": steps,
        "cost_history": costs,
        "final_weights": final_weights_dict,
        # Include X and y for 3D visualization
        "X": X.tolist() if num_features == 2 else None,
        "y": y.tolist() if num_features == 2 else None,
    }
    return trace
