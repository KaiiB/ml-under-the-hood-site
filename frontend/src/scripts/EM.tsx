import * as d3 from "d3";
import { useEffect, useState, useRef, useMemo } from "react";
import Plot from "react-plotly.js";
import "../styles/global.css";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

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
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // subtle background panel
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "#f9fafb");

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
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

    // axes
    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(values.length - 1, 10)));

    const yAxis = g.append("g").call(d3.axisLeft(yScale).ticks(5));

    // axis labels
    g.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#4b5563")
      .style("font-size", 10)
      .text("Iteration");

    g.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#4b5563")
      .style("font-size", 10)
      .text("Log-likelihood");

    // slightly lighten axis lines/ticks
    xAxis.selectAll("path, line").attr("stroke", "#d1d5db");
    yAxis.selectAll("path, line").attr("stroke", "#d1d5db");

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

function renderEmPlot(trace: EMtrace_dict, iter: number, layout: any) {
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
    useResizeHandler={true}
  />
);
}

function renderRawPlot(trace: EMtrace_dict, layout: any) {
  // raw 3D data lives here
  const X: number[][] = trace.meta.raw_data || [];
  if (!X.length) return null;

  const xs = X.map((p) => p[0]);
  const ys = X.map((p) => p[1]);
  const zs = X.map((p) => p[2]);

  const data: any[] = [
    {
      x: xs,
      y: ys,
      z: zs,
      type: "scatter3d" as const,
      mode: "markers",
      name: "Raw data",
      marker: {
        size: 3,
        color: "#64748b", // neutral gray-blue
        opacity: 0.9,
      },
    },
  ];

  // reuse layout, but we can hide legend for raw view
  const rawLayout = {
    ...layout,
    showlegend: false,
  };

  return (
    <Plot
      data={data}
      layout={rawLayout}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler={true}
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

    const [activeTab, setActiveTab] = useState<"viz" | "explain">("viz");

    const [viewMode, setViewMode] = useState<"model" | "raw">("model");


    const layout = useMemo(
        () => ({
        autosize: true,
        height: 600,
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

            setViewMode("model");

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
  <section className="container em-page">
    {/* Big header like K-Means */}
    <header className="header em-header em-header-animated">
      <h1>EM for Gaussian Mixtures</h1>
      <p>Interactive step-by-step visualization of the EM algorithm.</p>
    </header>

    <div className="main-grid">
      {/* LEFT: sidebar controls */}
      <aside className="sidebar">
        {/* Dataset parameters */}
        <div className="control-section">
          <h3>Dataset parameters</h3>

          <div className="control-group">
            <label htmlFor="em-k">K (true Gaussians)</label>
            <div className="slider-container">
              <input
                id="em-k"
                type="range"
                min={1}
                max={8}
                value={K}
                onChange={(e) => setK(Number(e.target.value))}
              />
              <span className="slider-value">{K}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-seed">Seed</label>
            <input
              id="em-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label htmlFor="em-n">n (points)</label>
            <div className="slider-container">
              <input
                id="em-n"
                type="range"
                min={100}
                max={2000}
                step={100}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              />
              <span className="slider-value">{n}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-cov-min">cov_diag_min</label>
            <div className="slider-container">
              <input
                id="em-cov-min"
                type="range"
                min={0.1}
                max={2.0}
                step={0.1}
                value={covDiagMin}
                onChange={(e) => setCovDiagMin(Number(e.target.value))}
              />
              <span className="slider-value">{covDiagMin.toFixed(2)}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-cov-max">cov_diag_max</label>
            <div className="slider-container">
              <input
                id="em-cov-max"
                type="range"
                min={0.2}
                max={4.0}
                step={0.1}
                value={covDiagMax}
                onChange={(e) => setCovDiagMax(Number(e.target.value))}
              />
              <span className="slider-value">{covDiagMax.toFixed(2)}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-mean-min">mean_min</label>
            <div className="slider-container">
              <input
                id="em-mean-min"
                type="range"
                min={-10}
                max={0}
                step={0.5}
                value={meanMin}
                onChange={(e) => setMeanMin(Number(e.target.value))}
              />
              <span className="slider-value">{meanMin.toFixed(1)}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-mean-max">mean_max</label>
            <div className="slider-container">
              <input
                id="em-mean-max"
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={meanMax}
                onChange={(e) => setMeanMax(Number(e.target.value))}
              />
              <span className="slider-value">{meanMax.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Algorithm parameters */}
        <div className="control-section">
          <h3>Algorithm parameters</h3>

          <div className="control-group">
            <label htmlFor="em-C">C (components used by EM)</label>
            <div className="slider-container">
              <input
                id="em-C"
                type="range"
                min={1}
                max={8}
                value={C}
                onChange={(e) => setC(Number(e.target.value))}
              />
              <span className="slider-value">{C}</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="em-iters">num_iters</label>
            <div className="slider-container">
              <input
                id="em-iters"
                type="range"
                min={1}
                max={50}
                value={numIters}
                onChange={(e) => setNumIters(Number(e.target.value))}
              />
              <span className="slider-value">{numIters}</span>
            </div>
          </div>
        </div>

        {/* Run button + error */}
        <div className="control-section actions">
          {error && <div className="error">{error}</div>}
          <div className="button-group">
            <button
              onClick={runEm}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Running EM..." : "Run EM"}
            </button>

            <button
              type="button"
              className={`btn btn-secondary ${
                viewMode === "raw" ? "active" : ""
              }`}
              disabled={!trace || loading}
              onClick={() =>
                setViewMode((prev) => (prev === "model" ? "raw" : "model"))
              }
            >
              {viewMode === "model" ? "Show Raw Data" : "Show Model View"}
            </button>
            

          </div>
        </div>
      </aside>

      
        {/* RIGHT: main visualization area */}
<section className="visualization-area">
  <div className="tabs">
    <button
      className={`tab ${activeTab === "explain" ? "active" : ""}`}
      onClick={() => setActiveTab("explain")}
    >
      EM Explanation
    </button>

    <button
      className={`tab ${activeTab === "viz" ? "active" : ""}`}
      onClick={() => setActiveTab("viz")}
    >
      EM Visualization
    </button>

    
  </div>

  {/* ---- Visualization tab ---- */}
  {activeTab === "viz" && (
  <>
        {/* Iteration controls – you can hide this when !trace if you prefer */}
        <div className="iteration-controls">
          <div className="iteration-info">
            <div>
              <div className="plot-title">Iteration</div>
              <div>
                Step {iter} of {trace ? trace.steps.length - 2 : 0}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={trace ? trace.steps.length - 2 : 0}
              value={iter}
              onChange={(e) => setIter(Number(e.target.value))}
              className="iteration-slider"
              disabled={!trace || loading}
            />
          </div>
        </div>

        <div className="em-plot-row">
          {/* LEFT: main Plotly / EM plot */}
          <div className="plot-container em-plot-3d">
            <div className="plot-title">Cluster assignments &amp; Gaussians</div>

            {loading && (
              <div className="plot-placeholder">
                Running EM on the server…
              </div>
            )}

            {!loading && !trace && (
              <div className="plot-placeholder">
                No trace yet. Adjust parameters and click <strong>“Run EM”</strong>.
              </div>
            )}

            {!loading && trace && (
              viewMode === "raw"
                ? renderRawPlot(trace, layout)
                : renderEmPlot(trace, iter, layout)
            )}
          </div>

          {/* RIGHT: log-likelihood chart */}
          <div className="plot-container em-loglikelihood-chart">
            <div className="plot-title">Log-likelihood over iterations</div>

            {loading && (
              <div className="plot-placeholder">
                Log-likelihood will appear here once EM finishes.
              </div>
            )}

            {!loading && !trace && (
              <div className="plot-placeholder">
                Run EM to see how the log-likelihood improves over iterations.
              </div>
            )}

            {!loading && trace && (
              <LogLikelihoodChart
                values={trace.log_likelihoods}
                currentIter={iter}
              />
            )}
          </div>
        </div>
      </>
    )}

  {/* ---- Explanation tab ---- */}
  {activeTab === "explain" && (
    <div className="plot-container">
      <div className="plot-title">How the EM algorithm works</div>
        <div className="explanation-content">
          <p>
            Welcome to Expectation Maximization (EM) for Gaussian Mixture Models (GMMs)! This interactive demo walks you through the
            EM algorithm step-by-step as it fits a mixture of Gaussians to 3D data.
          </p>

          <p>
            First, we set up the data. In the DATASET PARAMETERS panel you choose the{" "}
            <em>true</em> number of Gaussian components we use to generate points, how
            many points we sample, and how spread out or tight each blob is. Each
            component is a Gaussian with its own mean and covariance. When you create these blobs,
            you're just basically picking centers and drawing data points around them in 3D space.
          </p>

          <p>
            Then, in the ALGORITHM PARAMETERS panel, you tell the algorithm how many components it should
            try to fit. This is the model&apos;s number of components, and it is a{" "}
            <strong>hyperparameter</strong>: in real data we do not know the true
            number of clusters, so we have to choose it and compare different values.
            In this demo, the “true” number (used for data generation) and the “model”
            number (used by EM) can match or be different on purpose. You also set how many iterations of EM to run,
            you usually want to run enough iterations for the parameters of the algorithm to converge, hence the log liklihood plot.
          </p>

          <p>
            Once all of the data parameters are set, click Run EM. This will generate a 3d plot of your synthesized 
            data, an iteration slider, and a logliklihood chart. Each iteration has two
            stages, and your <code>n_steps</code> / iteration slider lets you pause the
            loop and step through these updates slowly:
          </p>

          <ol>
            <li>
              <strong>Expectation step (E-step):</strong> Given the current guesses for
              the means, covariances, and mixture weights, EM goes through every point
              and computes the probability that it came from each component. These are
              the “soft labels” or responsibilities. Instead of saying “this point is
              cluster 1,” we say “this point is 70% cluster 1, 25% cluster 2, 5%
              cluster 3.” In the visualization, you can think of the colors as showing
              these soft assignments.
            </li>
            <li>
              <strong>Maximization step (M-step):</strong> Using those soft labels, EM
              updates the model. Each component gets a new mean (a weighted average of
              the points assigned to it), a new covariance (a weighted covariance of
              those points), and a new mixture weight (how much of the dataset that
              component explains). After this update, the ellipsoids in the plot move
              and reshape, and then we go back to the E-step with these new parameters.
            </li>
          </ol>

          <p>
            This back-and-forth between E and M is iterative: with each step, the soft
            labels and the parameters influence each other. As you drag the iteration
            slider, you are literally watching EM alternate between “given the model,
            what are the labels?” and “given the labels, what is the best model?”
          </p>

          <p>
            At every iteration we also compute the <strong>log-likelihood</strong>,
            which is the log of the probability that the current model would generate
            the entire dataset you see. EM is designed so that this log-likelihood does
            not go down from one iteration to the next, so the curve in the plot should
            climb and then flatten. When the curve has basically stopped increasing,
            the parameter updates have become tiny, and we say the algorithm has
            converged for this choice of hyperparameters.
          </p>

          <p>
            Here we show everything in 3D so you can see blobs and ellipsoids in space,
            but the exact same EM + GMM logic works for 2D data and for higher
            dimensions that we cannot easily draw. Only the picture changes; the
            underlying steps of generating data, choosing a model, taking E-steps and
            M-steps, and tracking log-likelihood are the same.
          </p>

          <section className="formula-section">
  <h3>Key EM formulas (Gaussian Mixture Model)</h3>

      <div className="formula-grid">
        {/* 1. Posterior / responsibilities (E-step) */}
        <div className="formula-card">
          <h4>Posterior / responsibilities (E-step)</h4>
          <p>
            For each data point <code>x<sub>j</sub></code> and component{" "}
            <code>C<sub>i</sub></code>, EM computes a “soft label” (responsibility)
            that tells us how much component <code>i</code> explains point{" "}
            <code>j</code>:
          </p>
          <div className="formula">
            <BlockMath
              math={String.raw`
                y_{ij} = P(C_i \mid x_j)
                = \frac{\mathcal{N}(x_j \mid \mu_i, \Sigma_i)\,\pi_i}
                      {\sum_{k=1}^{K} \mathcal{N}(x_j \mid \mu_k, \Sigma_k)\,\pi_k}
              `}
            />
          </div>
          <p className="formula-note">
            Here <InlineMath math={String.raw`\mathcal{N}(\cdot \mid \mu_i, \Sigma_i)`} /> is
            the Gaussian density for component <code>i</code>.
          </p>
        </div>

        {/* 2. Effective counts and mixture weights (M-step) */}
        <div className="formula-card">
          <h4>Effective counts &amp; mixture weights</h4>
          <p>
            The responsibility matrix y<sub>i,j</sub> tells us how many “effective”
            points each component sees, and we use that to update the mixture
            weights π<sub>i</sub>:
          </p>
          <div className="formula">
            <BlockMath
              math={String.raw`
                N_i = \sum_{j=1}^{N} y_{ij}
              `}
            />
          </div>
          <div className="formula">
            <BlockMath
              math={String.raw`
                \pi_i = \frac{N_i}{N}
              `}
            />
          </div>
          <p className="formula-note">
            <InlineMath math={String.raw`N`} /> is the total number of data points and{" "}
            <InlineMath math={String.raw`N_i`} /> is the effective count for component{" "}
            <code>i</code>.
          </p>
        </div>

        {/* 3. Mean update (M-step) */}
        <div className="formula-card">
          <h4>Mean update (M-step)</h4>
          <p>
            Each component mean is the responsibility-weighted average of the data
            points:
          </p>
          <div className="formula">
            <BlockMath
              math={String.raw`
                \mu_i = \frac{1}{N_i} \sum_{j=1}^{N} y_{ij}\,x_j
              `}
            />
          </div>
          <p className="formula-note">
            Points with higher responsibility{" "}
            <InlineMath math={String.raw`y_{ij}`} /> pull the mean{" "}
            <InlineMath math={String.raw`\mu_i`} /> more strongly in their direction.
          </p>
        </div>

        {/* 4. Covariance update (M-step) */}
        <div className="formula-card">
          <h4>Covariance update (M-step)</h4>
          <p>
            The covariance of each component is updated using the
            responsibility-weighted scatter of points around the new mean:
          </p>
          <div className="formula">
            <BlockMath
              math={String.raw`
                \Sigma_i
                = \frac{1}{N_i} \sum_{j=1}^{N}
                  y_{ij}\,\bigl(x_j - \mu_i\bigr)\bigl(x_j - \mu_i\bigr)^\top
              `}
            />
          </div>
          <p className="formula-note">
            In 1D this reduces to the weighted variance; in this demo it is a 3D
            covariance, but the same formula works in any dimension.
          </p>
        </div>
      </div>
    </section>
        </div>



            
      </div>
      )}
      

      </section>
    </div>
  </section>
);
    
        
}



