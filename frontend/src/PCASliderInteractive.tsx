// PCAVisualizer.tsx
import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import pcaData from "./PCASliderInteractive.json"; 

// Simple seeded RNG (mulberry32)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic selection of k indices from [0..n-1]
function seededSampleIndices(n: number, k: number, seed = 42) {
  const rng = mulberry32(seed);
  const arr = Array.from({ length: n }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

const PCAVisualizer: React.FC = () => {
  // Slider angle is absolute degrees (0..360)
  const [angleDeg, setAngleDeg] = useState<number>(0);

  // Load data from JSON
  const raw: number[][] = pcaData.data[0]; // (100,2)
  const projectedScalar: number[] = pcaData.projected[0].map((p: any) => p[0]);
  const [cx, cy] = pcaData.meta.ellipse.ellipse_center;
  const center: [number, number] = [cx, cy];
  const ellipse_width: number = pcaData.meta.ellipse.ellipse_width;
  const ellipse_height: number = pcaData.meta.ellipse.ellipse_height;
  const eigvecs = pcaData.meta.eigens.eigvecs; // [[vx], [vy]]
  // convert eigvecs to 2-vector
  const truePC: [number, number] = [eigvecs[0][0], eigvecs[1][0]];
  const eigval = pcaData.meta.eigens.eigvals?.[0] ?? 1;

  // Precompute the true PCA angle for reference arrow
  const truePCAAngle = Math.atan2(truePC[1], truePC[0]);

  // Guess axis unit vector from slider (absolute)
  const angleRad = (angleDeg * Math.PI) / 180;
  const guessVec: [number, number] = [Math.cos(angleRad), Math.sin(angleRad)];

  // Projections computed relative to mean/center (correct centering)
  const projections = useMemo(() => {
    return raw.map((pt) => {
      const dx = pt[0] - center[0];
      const dy = pt[1] - center[1];
      const scalar = dx * guessVec[0] + dy * guessVec[1];
      const projX = center[0] + scalar * guessVec[0];
      const projY = center[1] + scalar * guessVec[1];
      return { orig: pt, scalar, proj: [projX, projY] as [number, number] };
    });
  }, [raw, center, guessVec]);

  // A line along the axis showing the distribution of projected scalars:
  // sort by scalar and create a line (connected) along guessVec
  const projectionLine = useMemo(() => {
    const sorted = [...projections].sort((a, b) => a.scalar - b.scalar);
    const xs = sorted.map((s) => s.proj[0]);
    const ys = sorted.map((s) => s.proj[1]);
    return { xs, ys };
  }, [projections]);

  // Projected point arrays (for marker trace)
  const projXs = projections.map((p) => p.proj[0]);
  const projYs = projections.map((p) => p.proj[1]);

  // Original data arrays
  const dataXs = raw.map((r) => r[0]);
  const dataYs = raw.map((r) => r[1]);

  // Guess axis (long line across plot)
  const axisLen = Math.max(ellipse_width, ellipse_height) * 1.5; // length for visibility
  const guessAxisX = [
    center[0] - axisLen * guessVec[0],
    center[0] + axisLen * guessVec[0],
  ];
  const guessAxisY = [
    center[1] - axisLen * guessVec[1],
    center[1] + axisLen * guessVec[1],
  ];

  // True PCA short arrow (±arrowLen along truePC)
  const arrowLen = Math.max(ellipse_width, ellipse_height) * 0.6;
  const trueAxisX = [
    center[0] - arrowLen * truePC[0],
    center[0] + arrowLen * truePC[0],
  ];
  const trueAxisY = [
    center[1] - arrowLen * truePC[1],
    center[1] + arrowLen * truePC[1],
  ];

  // Ellipse points rotated by slider angle.
  // (As discussed: for B this is equivalent to rotating by slider angle
  // so students see the ellipse orientation they chose).
  const ellipsePoints = useMemo(() => {
    const steps = 300;
    const t = Array.from({ length: steps }, (_, i) => (2 * Math.PI * i) / steps);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const a = ellipse_width / 2;
    const b = ellipse_height / 2;

    const xs: number[] = [];
    const ys: number[] = [];

    for (let tt of t) {
      const x0 = a * Math.cos(tt);
      const y0 = b * Math.sin(tt);
      // rotate by angleRad (absolute)
      const xr = x0 * cosA - y0 * sinA;
      const yr = x0 * sinA + y0 * cosA;
      xs.push(center[0] + xr);
      ys.push(center[1] + yr);
    }
    return { xs, ys };
  }, [ellipse_width, ellipse_height, center, angleRad]);

  // Residual (distance-to-axis) subset indices deterministic by seed
  const residualIndices = useMemo(() => seededSampleIndices(raw.length, 20, 42), [raw.length]);

  // Residual line traces for the selected indices
  const residualLines = residualIndices.map((idx) => {
    const p = projections[idx];
    return {
      x: [p.orig[0], p.proj[0]],
      y: [p.orig[1], p.proj[1]],
      mode: "lines",
      type: "scatter",
      line: { width: 1.6, color: "crimson" },
      hoverinfo: "none",
      showlegend: false,
    };
  });

  // Small helper to add arrowheads via layout annotations
  const pcaArrowAnnotations = [
    {
      x: trueAxisX[1],
      y: trueAxisY[1],
      ax: center[0],
      ay: center[1],
      xref: "x",
      yref: "y",
      axref: "x",
      ayref: "y",
      text: "",
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 1,
      arrowcolor: "rgba(60,60,60,0.35)",
      standoff: 0,
    },
    {
      x: trueAxisX[0],
      y: trueAxisY[0],
      ax: center[0],
      ay: center[1],
      xref: "x",
      yref: "y",
      axref: "x",
      ayref: "y",
      text: "",
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 1,
      arrowcolor: "rgba(60,60,60,0.35)",
      standoff: 0,
    },
  ];

  // compute plot bounds automatically a bit padded
  const allXs = [...dataXs, ...projXs, ...ellipsePoints.xs, guessAxisX[0], guessAxisX[1]];
  const allYs = [...dataYs, ...projYs, ...ellipsePoints.ys, guessAxisY[0], guessAxisY[1]];
  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const pad = 0.6;
  const xrange: [number, number] = [minX - pad, maxX + pad];
  const yrange: [number, number] = [minY - pad, maxY + pad];

  return (
   <div className="visualizer-container">
    <div className="visualizer-card">

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h2 className="figure-title">PCA Interactive Explorer</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={angleDeg}
              onChange={(e) => setAngleDeg(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <div style={{ width: 90, textAlign: "right" }}>{angleDeg}°</div>
          </div>

      <Plot
        data={[
          // raw data points (semi-transparent because dense)
          {
            x: dataXs,
            y: dataYs,
            mode: "markers",
            type: "scatter",
            name: "Data (standardized)",
            marker: { size: 6, opacity: 0.35, color: "rgba(255,165,0,1)" },
            hoverinfo: "x+y",
          },

          // projection line along axis (connected) to show variance spread
          {
            x: projectionLine.xs,
            y: projectionLine.ys,
            mode: "lines",
            type: "scatter",
            name: "Projection (axis line)",
            line: { width: 2.5, color: "rgba(0,0,0,1)" },
          },

          // projected points (on axis) - semi-transparent but visible
          {
            x: projXs,
            y: projYs,
            mode: "markers",
            type: "scatter",
            name: "Projected points",
            marker: { size: 8, opacity: 0.55, color: "rgba(0,128,0,0.6)" },
            hoverinfo: "none",
          },

          // residual lines for selected subset (red)
          // will be expanded into multiple traces below (spread)
          // (Plotly accepts array of traces; concatenated)
          // guess axis (bold solid)
          {
            x: guessAxisX,
            y: guessAxisY,
            mode: "lines",
            type: "scatter",
            name: "Guess Axis",
            line: { width: 2.5, color: "rgba(0,0,0,0.5)" },
          },

          // ellipse (rotating)
          {
            x: ellipsePoints.xs,
            y: ellipsePoints.ys,
            mode: "lines",
            type: "scatter",
            name: "Ellipse (rotating)",
            line: { width: 2, color: "rgba(0,0,0,1)" },
          },

          // true PCA axis faint short line (for visual fallback, same color as annotations)
          {
            x: trueAxisX,
            y: trueAxisY,
            mode: "lines",
            type: "scatter",
            name: "True PCA axis",
            line: { width: 2, dash: "solid", color: "rgba(0,0,255,0.4)" },
          },
          // then spread residual lines
          ...residualLines,
        ]}
        layout={{
          autosize: true,
          width: 720,
          height: 720,
          title: "Rotate to Maximize Variance Explained",
          showlegend: true,
          xaxis: {
            range: [-4,4],
            zeroline: false,
            scaleanchor: "y",
            scaleratio: 1,
            title: "x",
          },
          yaxis: {
            range: [-4, 4],
            zeroline: false,
            title: "y",
          },
          margin: { l: 60, r: 20, t: 60, b: 60 },
          annotations: pcaArrowAnnotations,
        }}
        config={{ responsive: true }}
      />
      <div style={{ fontSize: 13, marginTop: 8 }}>
        <strong>Notes:</strong>{" "}
        <span style={{ opacity: 0.85 }}>
          Projections are computed as <code>(x - mean)·v</code> and placed back on the axis at{" "}
          <code>mean + scalar·v</code>. Residuals (red lines) are shown for 20 deterministic points
          (seed=42).
        </span>
      </div>

      </div>
    </div> 
  </div>
  );
};

export default PCAVisualizer;
