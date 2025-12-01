// Use this file to manually test your API endpoints during development.
import { useState } from "react";

export default function TestAPI() {
  const [response, setResponse] = useState<any>(null);

  async function callAPI() {
    // Test EM endpoint
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/trace/em`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset: {
          K: 4,
          seed: 7,
          n: 100,
          cov_diag_min: 0.2,
          cov_diag_max: 1.0,
          mean_min: -4,
          mean_max: 4
        },
        algo: {
          C: 4,
          num_iters: 10
        }
      })
    });

    const data = await res.json();
    setResponse(data);
  }

  return (
    <div>
      <button onClick={callAPI}>Test EM API</button>
      <pre>{response ? JSON.stringify(response, null, 2) : "No response yet"}</pre>
    </div>
  );
}
