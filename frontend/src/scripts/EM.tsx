import TestAPI from "../TestAPI";
import { useEffect, useState } from "react";
import Plot from "react-plotly.js";




type EMtrace_dict = { // Structure of EM trace data
    algo: string;
  meta: {
    n: number;
    d: number;
    data: any;
    raw_data: any[];
  };
  params: {
    C: number;
    num_iters: number;
    seed: number;
  };
  params_full: any;
  steps: any[];            
  log_likelihoods: number[];
};


function setLoading(arg0: boolean) {
    throw new Error("Function not implemented.");
}

// plotly renderer 3d function
function render3DScatter(trace: EMtrace_dict) {
    const X: number[][] =
    trace.meta.raw_data;

    const x = X.map((p) => p[0]);
    const y = X.map((p) => p[1]);
    const z = X.map((p) => p[2]);

    const data = [
    {
        x,
        y,
        z,
        type: "scatter3d" as const,
        mode: "markers",
        name: "Data",
        marker: { size: 3 },
    },
    ];

    return (
    <Plot
      data={data}
      layout={{
        autosize: true,
        height: 600,
        width: 800,
        scene: {
          xaxis: { title: "x" },
          yaxis: { title: "y" },
          zaxis: { title: "z" },
        },
        margin: { l: 0, r: 0, t: 30, b: 0 },
        title: "GMM3d Sample",
      }}
      style={{ width: "100%", height: "100%" }}
        />
    );

}

export default function EM() {
    const [error, setError] = useState<string | null>(null);
    const [trace, setTrace] = useState<EMtrace_dict | null>(null);
    const [loading, setLoading] = useState(false);

    // dataset param states with defaults components
    const [K, setK] = useState(4);
    const [seed, setSeed] = useState(7);
    const [n, setN] = useState(600);
    const [covDiagMin, setCovDiagMin] = useState(0.2);
    const [covDiagMax, setCovDiagMax] = useState(1.0);
    const [meanMin, setMeanMin] = useState(-4.0);
    const [meanMax, setMeanMax] = useState(4.0);

    // algorithm param states with defaults componenets
    const [C, setC] = useState(4); 
    const [numIters, setNumIters] = useState(20);




    // function to call backend API to run EM and get trace
    async function runEm() {
        setLoading(true);
        setError(null);

        try {
            const body = {
            dataset: {
                K,
                seed,
                n,
                cov_diag_min: covDiagMin,
                cov_diag_max: covDiagMax,
                mean_min: meanMin,
                mean_max: meanMax,
            },
            algo: {
                C,
                num_iters: numIters,
            },
            };

            const res = await fetch("http://localhost:8000/api/trace/em", { //change url when deploying server
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json: EMtrace_dict = await res.json();
            console.log("trace from backend:", json);
            setTrace(json);
        } catch (err: any) {
            console.error("error fetching EM trace:", err);
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }
    // whenever slider effect changes
    

    return (
        <section style={{ padding: "2rem", maxWidth: 900 }}>
            <h2>EM Demo</h2>

            {/* DATASET SLIDERS */}
            <h3>Dataset parameters</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
            <label>
                K (true Gaussians): {K}
                <input
                type="range"
                min={1}
                max={8}
                value={K}
                onChange={(e) => setK(Number(e.target.value))}
                />
            </label>

            <label>
                Seed:
                <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                style={{ marginLeft: "0.5rem", width: "5rem" }}
                />
            </label>

            <label>
                n (points): {n}
                <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                />
            </label>

            <label>
                cov_diag_min: {covDiagMin.toFixed(2)}
                <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.1}
                value={covDiagMin}
                onChange={(e) => setCovDiagMin(Number(e.target.value))}
                />
            </label>

            <label>
                cov_diag_max: {covDiagMax.toFixed(2)}
                <input
                type="range"
                min={0.2}
                max={4.0}
                step={0.1}
                value={covDiagMax}
                onChange={(e) => setCovDiagMax(Number(e.target.value))}
                />
            </label>

            <label>
                mean_min: {meanMin.toFixed(1)}
                <input
                type="range"
                min={-10}
                max={0}
                step={0.5}
                value={meanMin}
                onChange={(e) => setMeanMin(Number(e.target.value))}
                />
            </label>

            <label>
                mean_max: {meanMax.toFixed(1)}
                <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={meanMax}
                onChange={(e) => setMeanMax(Number(e.target.value))}
                />
            </label>
            </div>

            {/* ALGO SLIDERS */}
            <h3 style={{ marginTop: "1.5rem" }}>Algorithm parameters</h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
            <label>
                C (components used by EM): {C}
                <input
                type="range"
                min={1}
                max={8}
                value={C}
                onChange={(e) => setC(Number(e.target.value))}
                />
            </label>

            <label>
                num_iters: {numIters}
                <input
                type="range"
                min={1}
                max={50}
                value={numIters}
                onChange={(e) => setNumIters(Number(e.target.value))}
                />
            </label>
            </div>

            {/* BUTTON TO RUN EM WITH CURRENT PARAMS */}
            <div style={{ marginTop: "1.5rem" }}>
                <button onClick={runEm} disabled={loading}>
                    {"loading? Running EM... Run EM"}
                </button>
            </div>

             <div style={{ marginTop: "2rem", width: "100%", height: "600px" }}>
                {trace && render3DScatter(trace)}
            </div>


        </section>
    );
    
        
}



