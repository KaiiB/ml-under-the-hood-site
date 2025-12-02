import { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import "../../styles/global.css";

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

  if (!data || !projected || !center || !eigvecs) {
    return <div>No PCA data available</div>;
  }

  const is3DOriginal = dim === 3;
  const is3D = is3DOriginal && !showProjected; // Projection always 2D/1D

  const source = showProjected ? projected : data;

  // 🏷 Axis labels for student understanding
  const label = (i: number) => {
    if (showProjected) return `PC${i + 1}`;

    // Original data axes
    if (dim === 3) return ["x", "y", "z"][i];
    if (dim === 2) return ["x", "y"][i];
    return "x"; // dim == 1 case
  };

  const traces = useMemo(() => {
    const colors = ["red", "blue", "green", "purple", "orange"];
    const ts: any[] = [];

    source.forEach((set, si) => {
      ts.push({
        x: set.map((p) => p[0]),
        y: set.map((p) => p[1] ?? 0),
        ...(is3D && { z: set.map((p) => p[2] ?? 0) }),
        type: is3D ? "scatter3d" : "scatter",
        mode: "markers",
        marker: {
          size: 6,
          color: colors[si % colors.length],
          opacity: 0.4,
        },
        name: `Set ${si + 1}`,
      });
    });

    if (!showProjected) {
      eigvals.forEach((val, i) => {
        const length = Math.sqrt(val) * 3;
        const vec = eigvecs.map((row) => row[i]);

        const pos = center.map((c, j) => c + vec[j] * length);
        const neg = center.map((c, j) => c - vec[j] * length);

        ts.push({
          x: [neg[0], pos[0]],
          y: [neg[1], pos[1]],
          ...(is3D && { z: [neg[2], pos[2]] }),
          type: is3D ? "scatter3d" : "scatter",
          mode: "lines",
          line: { width: 2, color: "black" },
          name: `PC ${i + 1}`,
        });
      });
    }

    return ts;
  }, [source, eigvecs, eigvals, center, showProjected, is3D]);

  const layout = useMemo(() => {
    const title = showProjected
      ? "PCA Projection"
      : "Original Data View";

    const commonLayout = {
      autosize: true,
      title: { text: title, font: { size: 22 } },
      margin: { l: 80, r: 20, b: 80, t: 80 },
      template: "plotly_white",
    };

    if (is3D) {
      return {
        ...commonLayout,
        scene: {
          xaxis: { title: { text: label(0), font: { size: 18 } } },
          yaxis: { title: { text: label(1), font: { size: 18 } } },
          zaxis: { title: { text: label(2), font: { size: 18 } } },
        },
      };
    }

    return {
      ...commonLayout,
      xaxis: { title: { text: label(0), font: { size: 18 } } },
      yaxis:
        (dim === 1 || showProjected && projected[0][0].length === 1)
          ? { visible: false }
          : { title: { text: label(1), font: { size: 18 } } },
    };
  }, [is3D, showProjected, dim, projected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <button
        className="btn btn-primary"
        onClick={() => setShowProjected((p) => !p)}
        style={{ marginBottom: "10px", width: "200px" }}
      >
        {showProjected ? "Show Original Data" : "Show PCA Projection"}
      </button>

      <div style={{ width: "100%", height: "600px" }}>
        <Plot
          data={traces}
          layout={layout}
          config={{ responsive: true }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
