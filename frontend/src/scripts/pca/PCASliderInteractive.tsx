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
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

interface PCAVisualizerProps {
  showEllipse?: boolean;      // default true
  showEigenvector?: boolean;  // default true
}

const PCAVisualizer: React.FC<PCAVisualizerProps> = ({
  showEllipse = true,
  showEigenvector = true,
}) => {
  const [angleDeg, setAngleDeg] = useState<number>(0);

  const raw: number[][] = pcaData.data[0];
  const projectedScalar: number[] = pcaData.projected[0].map((p: any) => p[0]);
  const [cx, cy] = pcaData.meta.ellipse.ellipse_center;
  const center: [number, number] = [cx, cy];
  const ellipse_width: number = pcaData.meta.ellipse.ellipse_width;
  const ellipse_height: number = pcaData.meta.ellipse.ellipse_height;
  const eigvecs = pcaData.meta.eigens.eigvecs;
  const truePC: [number, number] = [eigvecs[0][0], eigvecs[1][0]];
  const eigval = pcaData.meta.eigens.eigvals?.[0] ?? 1;

  const angleRad = (angleDeg * Math.PI) / 180;
  const guessVec: [number, number] = [Math.cos(angleRad), Math.sin(angleRad)];

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

const totalSquaredDistance = useMemo(() => {
    return projections.reduce((sum, p) => {
      const dx = p.orig[0] - p.proj[0];
      const dy = p.orig[1] - p.proj[1];
      return sum + dx * dx + dy * dy;
    }, 0);
  }, [projections]);

  const projectionLine = useMemo(() => {
    const sorted = [...projections].sort((a, b) => a.scalar - b.scalar);
    const xs = sorted.map((s) => s.proj[0]);
    const ys = sorted.map((s) => s.proj[1]);
    return { xs, ys };
  }, [projections]);

  const projXs = projections.map((p) => p.proj[0]);
  const projYs = projections.map((p) => p.proj[1]);
  const dataXs = raw.map((r) => r[0]);
  const dataYs = raw.map((r) => r[1]);

  const axisLen = Math.max(ellipse_width, ellipse_height) * 1.5;
  const guessAxisX = [center[0] - axisLen * guessVec[0], center[0] + axisLen * guessVec[0]];
  const guessAxisY = [center[1] - axisLen * guessVec[1], center[1] + axisLen * guessVec[1]];

  const arrowLen = Math.max(ellipse_width, ellipse_height) * 0.6;
  const trueAxisX = [center[0] - arrowLen * truePC[0], center[0] + arrowLen * truePC[0]];
  const trueAxisY = [center[1] - arrowLen * truePC[1], center[1] + arrowLen * truePC[1]];

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
      const xr = x0 * cosA - y0 * sinA;
      const yr = x0 * sinA + y0 * cosA;
      xs.push(center[0] + xr);
      ys.push(center[1] + yr);
    }
    return { xs, ys };
  }, [ellipse_width, ellipse_height, center, angleRad]);

  const residualIndices = useMemo(() => seededSampleIndices(raw.length, 20, 42), [raw.length]);
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

  const pcaArrowAnnotations = showEigenvector
    ? [
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
      ]
    : [];

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

          {/* New label showing total squared distance */}
          <div style={{ marginBottom: 8, fontSize: 14 }}>
            <strong>Total squared distance to guess axis:</strong> {totalSquaredDistance.toFixed(3)}
          </div>

          <Plot
            data={[
              {
                x: dataXs,
                y: dataYs,
                mode: "markers",
                type: "scatter",
                name: "Data (standardized)",
                marker: { size: 6, opacity: 1, color: "rgba(255,165,0,1)" },
                hoverinfo: "x+y",
              },
              {
                x: guessAxisX,
                y: guessAxisY,
                mode: "lines",
                type: "scatter",
                name: "Guess Axis",
                line: { width: 2.5, color: "rgba(0,0,0,1)" },
              },
              {
                x: projectionLine.xs,
                y: projectionLine.ys,
                mode: "lines",
                type: "scatter",
                name: "Range of Projection",
                line: { width: 3, color: "rgba(238,130,238,1)" },
              },
              {
                x: projXs,
                y: projYs,
                mode: "markers",
                type: "scatter",
                name: "Projected points",
                marker: { size: 8, opacity: 0.3, color: "rgba(0,128,0,1)" },
                hoverinfo: "none",
              },
              ...(showEllipse
                ? [
                    {
                      x: ellipsePoints.xs,
                      y: ellipsePoints.ys,
                      mode: "lines",
                      type: "scatter",
                      name: "Ellipse",
                      line: { width: 2, color: "rgba(128,128,128,1)" },
                    },
                  ]
                : []),
              ...(showEigenvector
                ? [
                    {
                      x: trueAxisX,
                      y: trueAxisY,
                      mode: "lines",
                      type: "scatter",
                      name: "Eigenvector",
                      line: { width: 2, dash: "solid", color: "rgba(0,0,255,0.4)" },
                    },
                  ]
                : []),
              ...residualLines,
            ]}
            layout={{
              autosize: true,
              width: 720,
              height: 720,
              title: "Rotate to Maximize Variance Explained",
              showlegend: true,
              xaxis: {
                range: [-4, 4],
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
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default PCAVisualizer;
