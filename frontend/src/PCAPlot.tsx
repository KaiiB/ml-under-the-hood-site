import React, { useState } from "react";
import Plot from "react-plotly.js";


type PCAPlotProps = {
  data: number[][][];
  projected: number[][][];
  dim: number;
  eigvecs: number[][];
  eigvals: number[];
  center: number[];
};

export default function PCAPlot({
  data,
  projected,
  dim,
  eigvecs,
  eigvals,
  center,
}: PCAPlotProps) {
  const [showProjected, setShowProjected] = useState(false);
  

  {/*
  console.log("eigvecs:", eigvecs);
  console.log("eigvals:", eigvals);
  console.log("center:", center);
  console.log("one point:", data[0][0]);
  */}

  // Safety guards before plotting
  if (!data || !projected) {
    return <div>No PCA data available</div>;
  }

  const source = showProjected ? projected : data;

  const numSets = source.length;
  const numDims = source[0]?.[0]?.length ?? 0;

  const traces: any[] = [];
  const colors = ["red", "blue", "green", "purple", "orange"];

  for (let si = 0; si < numSets; si++) {
    const xs = source[si].map((p) => p[0] ?? 0);
    const ys = source[si].map((p) => (numDims > 1 ? p[1] : 0));
    const zs = source[si].map((p) => (numDims > 2 ? p[2] : 0));

    const is3D =
      (!showProjected && dim === 3) ||
      (showProjected && numDims === 3);

    traces.push({
      x: xs,
      y: ys,
      z: is3D ? zs : undefined,
      type: is3D ? "scatter3d" : "scatter",
      mode: "markers",
      marker: {
        size: 6,
        color: colors[si % colors.length],
        opacity: 0.85,
      },
      name: `Set ${si + 1}`,
    });
  }

  // ----- Add PCA Vector Traces (ONLY on Original View + eigvecs valid) -----
  if (!showProjected && eigvecs && eigvals && center) {
    const scaleFactor = 2.0; // 2 std devs visual scaling

    for (let i = 0; i < eigvals.length; i++) {
      const length = scaleFactor * Math.sqrt(eigvals[i]);
      const vector = eigvecs.map((row) => row[i]);

      const start = center;
      const end = start.map((c, idx) => c + vector[idx] * length);
      const negative_end = start.map((c, idx) => c - vector[idx] * length);

      if (dim === 3) {
        traces.push({
          x: [negative_end[0], end[0]],
          y: [negative_end[1], end[1]],
          z: [negative_end[2], end[2]],
          type: "scatter3d",
          mode: "lines",
          line: {
            width: 6,
            color: "black"
          },
          name: `Principal Component ${i + 1}`,
        });
      } else {
        traces.push({
          x: [negative_end[0], end[0]],
          y: [negative_end[1], end[1]],
          type: "scatter",
          mode: "lines",
          line: {
            width: 4,
            color: "black"
          },
          name: `Principal Component ${i + 1}`,
        });
      }
    }
  }

  // ----- Labeling layout -----
  const layout: any = {
    autosize: true,
    margin: { t: 60 },
    showlegend: true,
    title: showProjected
      ? "PCA Projection (Dimensionality Reduced)"
      : "Original Data (Before PCA)",
  };

  delete layout.scene; // if 2D
  delete layout.xaxis; // if 3D
  delete layout.yaxis; // if 3D

  const is3D =
    (!showProjected && dim === 3) || (showProjected && numDims === 3);

  if (is3D) {
    layout.scene = {
      xaxis: { title: showProjected ? "PCA1" : "X" },
      yaxis: { title: showProjected ? "PCA2" : "Y" },
      zaxis: { title: showProjected ? "PCA3" : "Z" },
    };
  } else {
    layout.xaxis = { title: showProjected ? "PCA1" : "X" };
    layout.yaxis = {
      title:
        showProjected && numDims === 1
          ? "" // hide in 1D projection view
          : showProjected
          ? "PCA2"
          : "Y",
    };
  }

  // ============================== RENDER ==============================
  return (
    <div style={{ width: "100%", height: "550px" }}>
      <button
        onClick={() => setShowProjected((prev) => !prev)}
        style={{ marginBottom: "10px" }}
      >
        {showProjected ? "Show Original Data" : "Show PCA Projection"}
      </button>

      <Plot
        data={traces}
        layout={layout}
        style={{ width: "100%", height: "500px" }}
        config={{ responsive: true }}
      />
    </div>
  );

}
