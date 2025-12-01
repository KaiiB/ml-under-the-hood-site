import EM from "./scripts/EM.tsx";
import { useState } from "react";

type Page = "em" | "home";

function App() {

  
  const [page, setPage] = useState<Page>("home");

  return (
    <>
      
      <nav>
        <button onClick={() => setPage("home")} style={{ marginRight: "0.5rem" }}>Home</button>
        <button onClick={() => setPage("em")}>EM</button>
      </nav>

      {page === "home" && (
        <div style={{ padding: "2rem" }}>
          <h1>API Test</h1>
        </div>
      )}

      {page === "em" && <EM />}
    </>
    
    

    
  );
}

export default App;
