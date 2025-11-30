// Use this file to manually test your API endpoints during development.
import { useState } from "react";

export default function TestAPI() {
  const [response, setResponse] = useState<any>(null);

  async function callAPI() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/pca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: {
            num_sets: 1,
            num_points: 100,
            dim: 2,
            seed: 42,
            means: [
              [6, 10]
            ],
            covs: [
              [
                [5, 4],
                [4, 12]
              ]
            ]
          },
          algo: { num_components: 2 }
        })
      });

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      console.error("API error:", err);
      setResponse({ error: err.message });
    }
  }

  return (
    <div>
      <button onClick={callAPI}>Test PCA API</button>
      <pre style={{ textAlign: "left" }}>
        {response ? JSON.stringify(response, null, 2) : "No response yet"}
      </pre>
    </div>
  );
}
