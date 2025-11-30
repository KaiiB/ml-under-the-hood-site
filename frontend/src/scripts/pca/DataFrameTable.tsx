import React, { useEffect, useState } from "react";

interface Row {
  [key: string]: any;
}

export default function DataFrameTable() {
  const [data, setData] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/snippet.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load snippet.json");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (data.length === 0) return <div>Loading DataFrame...</div>;

  const columns = Object.keys(data[0]);

  return (
    <div style={{ overflowX: "auto", marginTop: "20px" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={thStyle}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col} style={tdStyle}>
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  borderBottom: "2px solid #444",
  padding: "8px 12px",
  textAlign: "left",
  background: "#f0f0f0",
  fontWeight: "600",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  padding: "8px 12px",
};
