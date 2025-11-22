import { useState } from "react";
import PCAPlot from "./PCAPlot";

export default function MoreTestAPIForPCA() {
  const [numSets, setNumSets] = useState(1);
  const [numPoints, setNumPoints] = useState(100);
  const [dim, setDim] = useState(2);
  const [seed, setSeed] = useState(42);

  const [means, setMeans] = useState<number[][]>([[0, 0]]);
  const [covs, setCovs] = useState<number[][][]>(
    [[[1, 0], [0, 1]]]
  );

  const numComponents = dim - 1;

  // Shape correction when dim or numSets changes
  const updateShapes = (newNumSets: number, newDim: number) => {
    const updatedMeans = Array.from({ length: newNumSets }, (_, si) =>
      Array.from({ length: newDim }, (_, di) =>
        means[si]?.[di] ?? 0
      )
    );
    setMeans(updatedMeans);

    const updatedCovs = Array.from({ length: newNumSets }, (_, si) =>
      Array.from({ length: newDim }, (_, r) =>
        Array.from({ length: newDim }, (_, c) =>
          covs[si]?.[r]?.[c] ?? (r === c ? 1 : 0)
        )
      )
    );
    setCovs(updatedCovs);
  };

  // Covariance generation helper (symmetric + PSD)
  function randomCovariance(dim: number): number[][] {
    const A = Array.from({ length: dim }, () =>
      Array.from({ length: dim }, () => Math.random() * 2 - 1)
    );
    const Sigma = Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) =>
        A[i].reduce((sum, _, k) => sum + A[i][k] * A[j][k], 0)
      )
    );
    return Sigma;
  }

  // Randomize button
  function randomizeAll() {
    const newDim = Math.random() < 0.5 ? 2 : 3;
    const newNumSets = Math.floor(Math.random() * 5) + 1;
    const newNumPoints = Math.floor(Math.random() * 46) * 10 + 50;
    const newSeed = Math.floor(Math.random() * 100000);

    setDim(newDim);
    setNumSets(newNumSets);
    setNumPoints(newNumPoints);
    setSeed(newSeed);

    const newMeans = Array.from({ length: newNumSets }, () =>
      Array.from({ length: newDim }, () => Math.random() * 10 - 5)
    );
    setMeans(newMeans);

    const newCovs = Array.from({ length: newNumSets }, () =>
      randomCovariance(newDim)
    );
    setCovs(newCovs);
  }

  const [response, setResponse] = useState<any>(null);

  async function runPCA() {
    const dataset = {
      num_sets: numSets,
      num_points: numPoints,
      dim: dim,
      seed: seed,
      means: means,
      covs: covs,
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/trace/pca`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset }),
        }
      );

      const data = await res.json();
      setResponse(data);
      console.log("📌 Full trace response:", data);
    } catch (err: any) {
      setResponse({ error: err.message });
    }
  }

  return (
    <div>
      <h2>PCA Configurator</h2>

      {/* NUM SETS */}
      <label>Num Sets: {numSets}</label>
      <input
        type="range"
        min={1}
        max={5}
        value={numSets}
        onChange={(e) => {
          const val = Number(e.target.value);
          setNumSets(val);
          updateShapes(val, dim);
        }}
      />
      <br />

      {/* NUM POINTS */}
      <label>Num Points per Set: {numPoints}</label>
      <input
        type="range"
        min={50}
        max={500}
        step={10}
        value={numPoints}
        onChange={(e) => setNumPoints(Number(e.target.value))}
      />
      <br />

      {/* DIM */}
      <label>Dimension:</label>
      <div>
        <label>
          <input
            type="radio"
            checked={dim === 2}
            onChange={() => {
              setDim(2);
              updateShapes(numSets, 2);
            }}
          />
          2D
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="radio"
            checked={dim === 3}
            onChange={() => {
              setDim(3);
              updateShapes(numSets, 3);
            }}
          />
          3D
        </label>
      </div>
      <br />

      {/* SEED */}
      <label>Seed:</label>
      <input
        type="number"
        value={seed}
        onChange={(e) => setSeed(Number(e.target.value))}
      />
      <br />

      {/* NUM COMPONENTS INFO */}
      <label>Num Components: {numComponents}</label>

      <hr />

      {/* MEAN + COV UI */}
      {Array.from({ length: numSets }).map((_, si) => (
        <div key={si} style={{ marginBottom: "20px" }}>
          <h4>Set {si + 1}</h4>

          <label>Mean:</label>
          <div>
            {means[si].map((val, di) => (
              <input
                key={di}
                type="number"
                value={val}
                style={{ width: "60px", margin: "2px" }}
                onChange={(e) => {
                  const updated = [...means];
                  updated[si][di] = Number(e.target.value);
                  setMeans(updated);
                }}
              />
            ))}
          </div>

          <label>Covariance:</label>
          <div>
            {covs[si].map((row, r) => (
              <div key={r}>
                {row.map((val, c) => (
                  <input
                    key={c}
                    type="number"
                    value={val}
                    style={{ width: "60px", margin: "2px" }}
                    onChange={(e) => {
                      const updated = [...covs];
                      updated[si][r][c] = Number(e.target.value);
                      setCovs(updated);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ACTION BUTTONS */}
      <button onClick={runPCA}>Run PCA</button>
      <button
        style={{ marginLeft: "10px" }}
        onClick={randomizeAll}
      >
        🎲 Randomize All
      </button>
{/*
      {#/* TRACE DISPLAY *#/}
      <pre
        style={{
          textAlign: "left",
          maxHeight: "400px",
          overflow: "auto",
          whiteSpace: "pre",
          width: "90%",
          border: "1px solid #ccc",
          padding: "10px",
          marginTop: "20px",
        }}
      >
        {response ? JSON.stringify(response, null, 2) : "No response yet"}
      </pre>
*/}
      {/* PLOT VISUALIZATION */}
      {response && response.data && response.projected && (
        <div style={{ marginTop: "20px" }}>
          <PCAPlot
            data={response.data}
            projected={response.projected}
            dim={response.meta.dim}
            eigvals={response.meta.eigens.eigvals}
            eigvecs={response.meta.eigens.eigvecs}
            center={response.meta.ellipse.ellipse_center}
          />
        </div>
      )}


    </div>
  );
}
