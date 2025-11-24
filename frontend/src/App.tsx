import UFCPlot from "./UFCPlot";
import DisplayPCA from "./PCAConfigurator";
import PCASliderInteractive from "./PCASliderInteractive"

function App() {
  return (
    <div>
      <h1> How PCA Works </h1>
      <h2 className="section-title">PCA: Why Do We Need It?</h2>
      <UFCPlot />
      <h2 className="section-title">Diving Deeper Into PCA</h2>
      <PCASliderInteractive />
      <h2 className="section-title">Understanding PCA Behavior</h2>
      <DisplayPCA />
    </div>
  );
}

export default App;
