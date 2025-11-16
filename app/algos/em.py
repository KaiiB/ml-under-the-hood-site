import numpy as np
# Data generation (GMM in 3D)

def GMM3d(
    K: int,
    seed: int,
    n: int,
    cov_diag_min: float,
    cov_diag_max: float,
    mean_min: float,
    mean_max: float,
):
    """
    Returns:
      X: (n, 3) samples
      meta: {mus: [...], covs: [...]} for potential visualization/ground truth
    """
    np.random.seed(seed)
    d = 3  # 3D
    mus = []
    covs = []
    x_clusters = []
    n_cluster_size = n // K

    for i in range(K):
        mu_i = np.random.uniform(mean_min, mean_max, size=d)
        cov_i = np.diag(np.random.uniform(cov_diag_min, cov_diag_max, size=d))
        mus.append(mu_i)
        covs.append(cov_i)
        x_clusters.append(
            np.random.multivariate_normal(
                mu_i, cov_i, size=n_cluster_size, check_valid="raise"
            )
        )

    X = np.vstack(x_clusters)
    meta = {
        "mus": [m.tolist() for m in mus],
        "covs": [c.tolist() for c in covs],
        "K": int(K),
    }
    return X, meta

# EM 

def initialized_params(X: np.array, C: int):
    n_datapoints, n_features = X.shape
    pi = np.ones(C) / C  # uniform prior
    mu = X[np.random.choice(n_datapoints, C, False)]  # random means
    sigma = [np.diag(X.var(axis=0)).copy() for _ in range(C)]
    return pi, mu, sigma


def multivariate_norm_pdf(X: np.array, mu: np.array, sigma: np.array):
    _, n_features = X.shape
    det = np.linalg.det(sigma)
    coeff = 1 / np.sqrt((2 * np.pi) ** n_features * det)
    diff = X - mu
    inv_sigma = np.linalg.inv(sigma)
    exponent = -0.5 * np.sum(diff @ inv_sigma * diff, axis=1)
    return coeff * np.exp(exponent)


class EM:
    """
    Backend-friendly EM
    """

    def __init__(self, X, C):
        self.X = X
        self.C = C
        self.N = X.shape[0]
        self.pi, self.mu, self.sigma = initialized_params(X, C)
        self.gamma = np.zeros((self.N, self.C))
        self.log_likelihood_history = []

    def expectation(self):
        for c in range(self.C):
            self.gamma[:, c] = self.pi[c] * multivariate_norm_pdf(
                self.X, self.mu[c], self.sigma[c]
            )
        denominator = np.sum(self.gamma, axis=1, keepdims=True)
        denominator = np.clip(denominator, 1e-12, None)
        self.gamma /= denominator
        self.log_likelihood_history.append(float(np.sum(np.log(denominator))))

    def maximization(self):
        sum_prob = np.sum(self.gamma, axis=0)  # (C,)
        sum_prob = np.clip(sum_prob, 1e-12, None)
        self.pi = sum_prob / self.N

        for c in range(self.C):
            weights = self.gamma[:, c:c+1]  # (N,1)
            self.mu[c] = (self.X * weights).sum(axis=0) / sum_prob[c]
            diff = self.X - self.mu[c]
            self.sigma[c] = (diff.T @ (weights * diff)) / sum_prob[c]
            # small reg for numerical stability
            self.sigma[c] += 1e-6 * np.eye(self.X.shape[1])

    def fit_and_trace(self, num_iters: int):
        """
        Run EM and collect a StepTrace-style list of steps.
        Each step: {t, type, payload}
        """
        steps = []

        # t = 0: init
        steps.append(
            {
                "t": 0,
                "type": "init",
                "payload": {
                    "pi": self.pi.tolist(),
                    "mu": self.mu.tolist(),
                    "sigma": [s.tolist() for s in self.sigma],
                },
            }
        )

        for i in range(1, num_iters + 1):
            self.expectation()
            self.maximization()
            steps.append(
                {
                    "t": i,
                    "type": "update",
                    "payload": {
                        "pi": self.pi.tolist(),
                        "mu": self.mu.tolist(),
                        "sigma": [s.tolist() for s in self.sigma],
                        "loglike": self.log_likelihood_history[-1],
                    },
                }
            )

        steps.append(
            {
                "t": num_iters + 1,
                "type": "converged",
                "payload": {"loglike": self.log_likelihood_history[-1]},
            }
        )
        return steps, self.log_likelihood_history


def run_em_trace(dataset_params: dict, algo_params: dict) -> dict:
    """
    dataset_params: dict with keys matching GMM3d args
    algo_params: dict with at least {"C": int, "num_iters": int}
    Returns: JSON-serializable StepTrace dict
    """
    X, data_meta = GMM3d(**dataset_params)
    em = EM(X, C=algo_params["C"])
    steps, loglikes = em.fit_and_trace(num_iters=algo_params["num_iters"])

    trace = {
        "schema_version": 1,
        "algo": "em_gmm_3d",
        "meta": {
            "n": int(X.shape[0]),
            "d": int(X.shape[1]),
            "data": data_meta,
        },
        "params": {
            "C": algo_params["C"],
            "num_iters": algo_params["num_iters"],
            "seed": dataset_params["seed"],
        },
        "params_full": {
            "dataset": dataset_params,
            "algo": algo_params,
        },
        "steps": steps,
        "log_likelihoods": loglikes,
    }
    return trace
