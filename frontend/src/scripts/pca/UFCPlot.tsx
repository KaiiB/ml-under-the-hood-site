import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "../../styles/global.css";

interface UFCTrace {
  name: string[];
  wins: number[];
  projected: number[][];
}

// Controls whether selected fighters always show labels
interface UFCPlotProps {
  showSelectedLabels?: boolean; 
}

const UFCPlot: React.FC<UFCPlotProps> = ({ showSelectedLabels = false }) => {
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

  // Fighters whose names you always want to display
  const labelSet = new Set([
    "Jon Jones",
    "Demeterious Johnson",
    "Georges St-Pierre",
    "Anderson Silva",
    "Khabib Nurmagomedov",
    "Islam Makhachev",
    "Valentina Shevchenko",
    "Amanda Nunes",
    "Kamaru Usman",
    "Alexander Volkanovski"
  ]);

  // One fighter to highlight heavily
  const highlight = "Zabit Magomedsharipov";

  // Determine each label based on mode
  const text = showSelectedLabels
    ? traceData.name.map((fighter) =>
        labelSet.has(fighter) ? fighter : ""
      )
    : traceData.name.map(
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

              // Switch between hover-only or always-show labels
              mode: showSelectedLabels ? "markers+text" : "markers",
              type: "scatter",

              // Offset Zabit’s label
              textposition: traceData.name.map((fighter) =>
                fighter === highlight ? "top left" : "top center"
              ),

              // Make Zabit’s label bold, red, and larger
              textfont: traceData.name.map((fighter) =>
                fighter === highlight
                  ? { color: "red", size: 16, family: "Arial Black" }
                  : { color: "black", size: 12 }
              ),

              // Make Zabit’s marker bigger with a red outline
              marker: {
                size: traceData.name.map((fighter) =>
                  fighter === highlight ? 18 : 10
                ),
                line: {
                  width: traceData.name.map((fighter) =>
                    fighter === highlight ? 3 : 0
                  ),
                  color: "red",
                },

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
                  tickfont: { size: 12 },
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

            // Arrow annotation pointing to Zabit
            annotations: traceData.name
              .map((fighter, i) =>
                fighter === highlight
                  ? {
                      x: x[i],
                      y: y[i],
                      xanchor: "left",
                      yanchor: "bottom",
                      text: fighter,
                      showarrow: true,
                      arrowhead: 2,
                      ax: 40,   // horizontal offset
                      ay: -40,  // vertical offset
                      font: {
                        color: "red",
                        size: 16,
                        family: "Arial Black",
                      },
                    }
                  : null
              )
              .filter(Boolean),
          }}

          style={{ width: "100%", height: "100%" }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
};

export default UFCPlot;