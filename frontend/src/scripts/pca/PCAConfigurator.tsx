import { useReducer, useState } from "react";
import PCAPlot from "./PCAPlot";
import "../../globals.css";
import "../../styles/ryo_components.css";

/* --- Reducer for PCA state --- */
type State = {
  numSets: number;
  numPoints: number;
  dim: number;
  seed: number;
  means: number[][];
  covs: number[][][];
};

type Action =
  | { type: "SET_NUM_SETS"; payload: number }
  | { type: "SET_NUM_POINTS"; payload: number }
  | { type: "SET_DIM"; payload: number }
  | { type: "SET_SEED"; payload: number }
  | { type: "SET_MEAN"; payload: { set: number; dim: number; value: number } }
  | { type: "SET_COV"; payload: { set: number; row: number; col: number; value: number } }
  | { type: "RANDOMIZE"; payload: State };

const initialState: State = {
  numSets: 1,
  numPoints: 100,
  dim: 2,
  seed: 42,
  means: [[0, 0]],
  covs: [[[1, 0], [0, 1]]],
};

function pcaReducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_NUM_SETS": {
      const newNumSets = action.payload;
      const newMeans = Array.from({ length: newNumSets }, (_, si) =>
        Array.from({ length: state.dim }, (_, di) => state.means[si]?.[di] ?? 0)
      );
      const newCovs = Array.from({ length: newNumSets }, (_, si) =>
        Array.from({ length: state.dim }, (_, r) =>
          Array.from({ length: state.dim }, (_, c) =>
            state.covs[si]?.[r]?.[c] ?? (r === c ? 1 : 0)
          )
        )
      );
      return { ...state, numSets: newNumSets, means: newMeans, covs: newCovs };
    }
    case "SET_NUM_POINTS":
      return { ...state, numPoints: action.payload };
    case "SET_DIM": {
      const newDim = action.payload;
      const newMeans = state.means.map((m) =>
        Array.from({ length: newDim }, (_, i) => m[i] ?? 0)
      );
      const newCovs = state.covs.map((cov) =>
        Array.from({ length: newDim }, (_, r) =>
          Array.from({ length: newDim }, (_, c) => cov[r]?.[c] ?? (r === c ? 1 : 0))
        )
      );
      return { ...state, dim: newDim, means: newMeans, covs: newCovs };
    }
    case "SET_SEED":
      return { ...state, seed: action.payload };
    case "SET_MEAN": {
      const updated = state.means.map((m) => [...m]);
      updated[action.payload.set][action.payload.dim] = action.payload.value;
      return { ...state, means: updated };
    }
    case "SET_COV": {
      const updated = state.covs.map((c) => c.map((r) => [...r]));
      const { set, row, col, value } = action.payload;
      updated[set][row][col] = value;
      return { ...state, covs: updated };
    }
    case "RANDOMIZE":
      return action.payload;
    default:
      return state;
  }
}

/* --- Helper Functions --- */
function randomCovariance(dim: number): number[][] {
  const A = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => Math.random() * 2 - 1)
  );
  return Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) =>
      A[i].reduce((sum, _, k) => sum + A[i][k] * A[j][k], 0)
    )
  );
}

/* --- PCA Configurator Component --- */
export default function PCAConfigurator() {
  const [state, dispatch] = useReducer(pcaReducer, initialState);
  const [response, setResponse] = useState<any>(null);
  const numComponents = state.dim - 1;

  function randomizeAll() {
    const newDim = Math.random() < 0.5 ? 2 : 3;
    const newNumSets = Math.floor(Math.random() * 5) + 1;
    const newNumPoints = Math.floor(Math.random() * 46) * 10 + 50;
    const newSeed = Math.floor(Math.random() * 100000);

    const newMeans = Array.from({ length: newNumSets }, () =>
      Array.from({ length: newDim }, () => Math.random() * 10 - 5)
    );
    const newCovs = Array.from({ length: newNumSets }, () => randomCovariance(newDim));

    dispatch({
      type: "RANDOMIZE",
      payload: {
        numSets: newNumSets,
        numPoints: newNumPoints,
        dim: newDim,
        seed: newSeed,
        means: newMeans,
        covs: newCovs,
      },
    });
  }

  async function runPCA() {
    const dataset = {
      num_sets: state.numSets,
      num_points: state.numPoints,
      dim: state.dim,
      seed: state.seed,
      means: state.means,
      covs: state.covs,
    };
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trace/pca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset }),
      });
      const data = await res.json();
      setResponse(data);
      console.log("📌 Full trace response:", data);
    } catch (err: any) {
      setResponse({ error: err.message });
    }
  }

  return (
    <div className="pca-container">
      {/* Sidebar */}
      <div className="pca-sidebar">
        <h2 className="figure-title">Data Configurator</h2>

        <div className="control-group">
          <label>Num Sets: {state.numSets}</label>
          <input
            type="range"
            min={1}
            max={5}
            value={state.numSets}
            onChange={(e) =>
              dispatch({ type: "SET_NUM_SETS", payload: Number(e.target.value) })
            }
          />
        </div>

        <div className="control-group">
          <label>Num Points per Set: {state.numPoints}</label>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={state.numPoints}
            onChange={(e) =>
              dispatch({ type: "SET_NUM_POINTS", payload: Number(e.target.value) })
            }
          />
        </div>

        <div className="control-group">
          <label>Dimension:</label>
          <div className="dimension-selector">
            <label>
              <input
                type="radio"
                checked={state.dim === 2}
                onChange={() => dispatch({ type: "SET_DIM", payload: 2 })}
              />
              2D
            </label>
            <label>
              <input
                type="radio"
                checked={state.dim === 3}
                onChange={() => dispatch({ type: "SET_DIM", payload: 3 })}
              />
              3D
            </label>
          </div>
        </div>

        <div className="control-group">
          <label>Seed:</label>
          <input
            type="number"
            value={state.seed}
            onChange={(e) =>
              dispatch({ type: "SET_SEED", payload: Number(e.target.value) })
            }
          />
        </div>

        <label>Num Components: {numComponents}</label>
        <hr />

        {/* Means/Covariance editor */}
        {state.means.map((meanRow, si) => (
          <div key={si} className="pca-set-block">
            <h4>Set {si + 1}</h4>

            <label>Mean:</label>
            <div className="pca-input-row">
              {meanRow.map((val, di) => (
                <input
                  key={di}
                  type="number"
                  value={val}
                  className="pca-input"
                  onChange={(e) =>
                    dispatch({
                      type: "SET_MEAN",
                      payload: { set: si, dim: di, value: Number(e.target.value) },
                    })
                  }
                />
              ))}
            </div>

            <label>Covariance Matrix:</label>
            <div className="pca-cov-matrix">
              {state.covs[si].map((row, r) => (
                <div key={r} className="pca-input-row">
                  {row.map((val, c) => (
                    <input
                      key={c}
                      type="number"
                      value={val}
                      className="pca-input"
                      onChange={(e) =>
                        dispatch({
                          type: "SET_COV",
                          payload: { set: si, row: r, col: c, value: Number(e.target.value) },
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button className="btn btn-primary" onClick={runPCA}>
            Run PCA
          </button>
          <button className="btn btn-secondary" onClick={randomizeAll}>
            🎲 Randomize All
          </button>
        </div>
      </div>

      {/* Main Plot Area */}
      <div className="pca-main">
        {response?.data && response?.projected && (
          <PCAPlot
            data={response.data}
            projected={response.projected}
            dim={response.meta.dim}
            eigvals={response.meta.eigens.eigvals}
            eigvecs={response.meta.eigens.eigvecs}
            center={response.meta.ellipse.ellipse_center}
          />
        )}
      </div>
    </div>
  );
}