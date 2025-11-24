import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "./Components.css";

interface UFCTrace {
  name: string[];
  wins: number[];
  projected: number[][];
}

const UFCPlot: React.FC = () => {
  const [traceData, setTraceData] = useState<UFCTrace | null>(null);

  useEffect(() => {
    fetch("/ufc.json")
      .then((res) => res.json())
      .then((data: UFCTrace) => setTraceData(data))
      .catch((err) => console.error("Failed to load UFC data:", err));
  }, []);

  if (!traceData) {
    return <div className="loading">Loading UFC PCA data...</div>;
  }

  const x = traceData.projected.map((p) => p[0]);
  const y = traceData.projected.map((p) => p[1]);
  const text = traceData.name.map(
    (n, i) => `${n} (Wins: ${traceData.wins[i]})`
  );

  return (
    <div className="visualizer-container">
      <div className="visualizer-card">
        <h2 className="figure-title">UFC Fighters PCA Projection</h2>
        <Plot
          data={[
            {
              x,
              y,
              text,
              mode: "markers",
              type: "scatter",
              marker: {
                size: 10,
                color: traceData.wins, 
                colorscale: "Viridis",
                showscale: true,
                colorbar: {
                  title: {
                    text: "Wins",
                    side: "Left",
                    font: {
                      size: 14,
                      color: "#000",
                      family: "Arial, sans-serif",
                    },
                  },
                  thickness: 20,
                  len: 0.6,
                  tickfont: { size: 12 }
                },
              },
              hoverinfo: "text",
            },
          ]}
          layout={{
            xaxis: {
              title: { text: "Principal Component 1", font: { size: 14 } },
            },
            yaxis: {
              title: { text: "Principal Component 2", font: { size: 14 } },
            },
            height: 600,
            width: 1100,
            margin: { t: 60, b: 60, l: 80, r: 40 },
          }}
          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
};

export default UFCPlot;
