import TestAPI from "../TestAPI";
import * as d3 from "d3";
import { useEffect, useState, useRef, useMemo } from "react";
import Plot from "react-plotly.js";
import "./EM.css";

// Types fo EM elliposoid step payload
type EMStepPayload = {
  mu: number[][];      // [C][3] component means
  pi: number[];        // [C] mixture weights
  sigma: number[][][];   // [C][3] diagonal variances
};

type EMTraceStep = {
  payload: EMStepPayload;
  t: number;
  type: string;
};

// general trace structure
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
  steps: EMTraceStep[];            
  log_likelihoods: number[];
};

// Props for LogLikelihoodChart component
type LogLikelihoodChartProps = {
  values: number[];
  currentIter: number;
};

type Scales = {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
};

// LogLikelihoodChart component to display log-likelihood over iterations
function LogLikelihoodChart({ values, currentIter }: LogLikelihoodChartProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const markerRef = useRef<SVGCircleElement | null>(null);
    const vlineRef = useRef<SVGLineElement | null>(null);
    const [scales, setScales] = useState<Scales | null>(null);

    // 1) Build axes + full line once when values change
    useEffect(() => {
        if (!svgRef.current || values.length === 0) return;

        const svg = d3.select(svgRef.current);

        const width = 400;
        const height = 220;
        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        svg.selectAll("*").remove();

        const g = svg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3
        .scaleLinear()
        .domain([0, values.length - 1])
        .range([0, innerWidth]);

        const [yMin, yMax] = d3.extent(values) as [number, number];
        const yScale = d3
        .scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([innerHeight, 0]);

        setScales({ xScale, yScale });

        const line = d3
        .line<number>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(d));

        // main blue log-likelihood curve
        g.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", "#38bdf8")
        .attr("stroke-width", 2)
        .attr("d", line);

        // axes
        g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(Math.min(values.length - 1, 10)));

        g.append("g").call(d3.axisLeft(yScale).ticks(5));

        // red marker
        const marker = g
        .append("circle")
        .attr("r", 4)
        .attr("fill", "red");

        markerRef.current = marker.node() as SVGCircleElement;

        // red vertical line
        const vline = g
        .append("line")
        .attr("stroke", "red")
        .attr("stroke-dasharray", "4,2")
        .attr("stroke-width", 1);

        vlineRef.current = vline.node() as SVGLineElement;
    }, [values]);

    // 2) Move the red marker + line when currentIter changes
    useEffect(() => {
        if (!scales || values.length === 0) return;

        const { xScale, yScale } = scales;
        const idx = Math.max(0, Math.min(currentIter, values.length - 1));
        const x = xScale(idx);
        const y = yScale(values[idx]);

        if (markerRef.current) {
        d3.select(markerRef.current).attr("cx", x).attr("cy", y);
        }

        if (vlineRef.current) {
        d3.select(vlineRef.current)
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", yScale.range()[1]) // top
            .attr("y2", yScale.range()[0]); // bottom
        }
    }, [currentIter, values, scales]);

    return (
        <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        />
    );
    }


// helper function to find nearest mean index for a point
function nearestMeanIndex(point: number[], means: number[][]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let k = 0; k < means.length; k++) {
    const m = means[k];
    const dx = point[0] - m[0];
    const dy = point[1] - m[1];
    const dz = point[2] - m[2];
    const dist = dx * dx + dy * dy + dz * dz; // squared distance
    if (dist < bestDist) {
      bestDist = dist;
      best = k;
    }
  }
  return best;
}

// Build an ellipsoid surface for a diagonal covariance
function makeEllipsoidSurface(
  mean: number[],
  variances: number[],
  scale = 2,
  steps = 15
) {
  const [mx, my, mz] = mean;
  const [vx, vy, vz] = variances;

  const a = scale * Math.sqrt(vx);
  const b = scale * Math.sqrt(vy);
  const c = scale * Math.sqrt(vz);

  const x: number[][] = [];
  const y: number[][] = [];
  const z: number[][] = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI; // 0..π
    x[i] = [];
    y[i] = [];
    z[i] = [];
    for (let j = 0; j <= steps; j++) {
      const phi = (j / steps) * 2 * Math.PI; // 0..2π
      x[i][j] = mx + a * Math.sin(theta) * Math.cos(phi);
      y[i][j] = my + b * Math.sin(theta) * Math.sin(phi);
      z[i][j] = mz + c * Math.cos(theta);
    }
  }

  return { x, y, z };
}

function renderEmPlot(trace: EMtrace_dict, iter: number, layout) {
  const step = trace.steps[iter];
  const means = step.payload.mu;      // [C][3]
  const covs = step.payload.sigma;  // [C][3][3]
  const C = means.length;

  // where your raw data lives
  const X: number[][] = trace.meta.raw_data || [];
  const n = X.length;

  // 1) hard-assign points to nearest mean
  const clusterXs: number[][] = Array.from({ length: C }, () => []);
  const clusterYs: number[][] = Array.from({ length: C }, () => []);
  const clusterZs: number[][] = Array.from({ length: C }, () => []);

  for (let i = 0; i < n; i++) {
    const p = X[i];
    const k = nearestMeanIndex(p, means);
    clusterXs[k].push(p[0]);
    clusterYs[k].push(p[1]);
    clusterZs[k].push(p[2]);
  }

  const colors = ["#3b82f6", "#22c55e", "#f97316", "#e11d48", "#a855f7", "#14b8a6"];

  const data: any[] = [];

  // 2) scatter for each cluster
  for (let k = 0; k < C; k++) {
    data.push({
      x: clusterXs[k],
      y: clusterYs[k],
      z: clusterZs[k],
      type: "scatter3d" as const,
      mode: "markers",
      name: `Cluster ${k}`,
      marker: {
        size: 3,
        color: colors[k % colors.length],
      },
    });
  }

  // 3) mean markers
  for (let k = 0; k < C; k++) {
    const m = means[k];
    data.push({
      x: [m[0]],
      y: [m[1]],
      z: [m[2]],
      type: "scatter3d" as const,
      mode: "markers",
      name: `Mean ${k}`,
      marker: {
        size: 8,
        symbol: "diamond" as const,
        color: colors[k % colors.length],
      },
      showlegend: false,
    });
  }

  // 4) ellipsoid surfaces using diagonal sigma
    for (let k = 0; k < C; k++) {
    const m = means[k];
    const cov = covs[k]; // 3x3 matrix: number[][]
    const variances = [cov[0][0], cov[1][1], cov[2][2]]; // diag entries

    const ell = makeEllipsoidSurface(m, variances, 2.0, 15);

    data.push({
      type: "surface",
      x: ell.x,
      y: ell.y,
      z: ell.z,
      name: `Component ${k} ellipsoid`,
      showscale: false,
      opacity: 0.25, // maybe drop this back down so you see points through it
      colorscale: [
        [0, colors[k % colors.length]],
        [1, colors[k % colors.length]],
      ],
      hoverinfo: "skip",
    });
  }

  return (
    <Plot
      data={data}
      layout={layout}
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
    const [iter, setIter] = useState(0);

    const layout = useMemo(
        () => ({
        autosize: true,
        height: 600,
        width: 800,
        scene: {
            xaxis: { title: "x" },
            yaxis: { title: "y" },
            zaxis: { title: "z" },
            aspectmode: "data",
        },
        margin: { l: 0, r: 0, t: 30, b: 0 },
        // keep title static so layout identity doesn't change
        title: "EM 3D view",
        }),
        []
    );


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
        setIter(0);
    }
    // whenever slider effect changes
    

    return (
        <section className="em-page">
            {/* big header like K-Means */}
            <div className="em-header">
            <h1>EM for Gaussian Mixtures</h1>
            <p>Interactive step-by-step visualization of the EM algorithm.</p>
            </div>

            <div className="em-layout">
            {/* LEFT: sidebar controls */}
            <aside className="em-controls">
                <h3>Dataset parameters</h3>
                <div className="em-control-section">
                <div className="em-control-group">
                    <label>K (true Gaussians): {K}</label>
                    <input
                    type="range"
                    min={1}
                    max={8}
                    value={K}
                    onChange={(e) => setK(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>Seed:</label>
                    <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    style={{ width: "5rem" }}
                    />
                </div>

                <div className="em-control-group">
                    <label>n (points): {n}</label>
                    <input
                    type="range"
                    min={100}
                    max={2000}
                    step={100}
                    value={n}
                    onChange={(e) => setN(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>cov_diag_min: {covDiagMin.toFixed(2)}</label>
                    <input
                    type="range"
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    value={covDiagMin}
                    onChange={(e) => setCovDiagMin(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>cov_diag_max: {covDiagMax.toFixed(2)}</label>
                    <input
                    type="range"
                    min={0.2}
                    max={4.0}
                    step={0.1}
                    value={covDiagMax}
                    onChange={(e) => setCovDiagMax(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>mean_min: {meanMin.toFixed(1)}</label>
                    <input
                    type="range"
                    min={-10}
                    max={0}
                    step={0.5}
                    value={meanMin}
                    onChange={(e) => setMeanMin(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>mean_max: {meanMax.toFixed(1)}</label>
                    <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={meanMax}
                    onChange={(e) => setMeanMax(Number(e.target.value))}
                    />
                </div>
                </div>

                <h3>Algorithm parameters</h3>
                <div className="em-control-section">
                <div className="em-control-group">
                    <label>C (components used by EM): {C}</label>
                    <input
                    type="range"
                    min={1}
                    max={8}
                    value={C}
                    onChange={(e) => setC(Number(e.target.value))}
                    />
                </div>

                <div className="em-control-group">
                    <label>num_iters: {numIters}</label>
                    <input
                    type="range"
                    min={1}
                    max={50}
                    value={numIters}
                    onChange={(e) => setNumIters(Number(e.target.value))}
                    />
                </div>
                </div>

                <div className="em-actions">
                <button
                    
                    onClick={runEm}
                    disabled={loading}
                    className="em-run-btn"
                >
                    {loading ? "Running EM..." : "Run EM"}
                </button>
                </div>
            </aside>

            {/* RIGHT: main visualization card */}
            <main className="em-plot">
                {trace ? (
                <>
                    {/* iteration slider */}
                    <div className="em-iter-control">
                    <label>Iteration: {iter} / {trace.steps.length - 2}</label>
                    <input
                        type="range"
                        min={0}
                        max={trace.steps.length - 2}
                        value={iter}
                        onChange={(e) => setIter(Number(e.target.value))}
                        className="em-iter-slider"
                    />
                    </div>

                    <div className="em-plot-row">
                    <div className="em-plot-3d">
                        {renderEmPlot(trace, iter, layout)}
                    </div>

                    <div className="em-loglikelihood-chart">
                        <LogLikelihoodChart
                        values={trace.log_likelihoods}
                        currentIter={iter}
                        />
                    </div>
                    </div>
                </>
                ) : (
                !loading && <p>No trace yet. Adjust parameters and click Run EM.</p>
                )}
            </main>
            </div>
        </section>
        );
    
        
}



