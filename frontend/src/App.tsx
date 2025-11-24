import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import UFCPlot from "./UFCPlot";
import DisplayPCA from "./PCAConfigurator";
import PCASliderInteractive from "./PCASliderInteractive";
import ImageContainer from "./ImageContainer";
import DataFrameTable from "./DataFrameTable";

function App() {
  const Eq = ({ children }: { children: React.ReactNode }) => (
  <BlockMath>{children}</BlockMath>
  );
  return (
    <div>
      <h1> How PCA Works </h1>

      <h2 className="section-title">PCA: Why Do We Need It?</h2>

      <div className="main-text">

        <p>
          Let's say you're interested in Mixed Martial Arts (MMA) fighters, just like me! 
          There's one particular Ultimate Fighting Championship (UFC) fighter that I love:
        </p>
      </div>

      <div className="main-text">
        <blockquote>
          <b>Zabit Magomedsharipov!</b>
        </blockquote>
      </div>
      
      <ImageContainer>
        
        <div className="image-row">

          <figure className="image-item">
            <img src="/images/zabitProfile.png" alt="Zabit Profile" />
            <figcaption>Zabit Magomedsharipov.</figcaption>
          </figure>

          <figure className="image-item">
            <img src="/images/zabitSaenchaiKick.png" alt="Zabit Saenchai Kick" />
            <figcaption>Zabit's carthweel kick (Cepedea, 2019).</figcaption>
          </figure>

          <figure className="image-item">
            <img src="/images/zabitShowtimeKick.png" alt="Zabit Showtime Kick" />
            <figcaption>Zabit's off-the-wall kick (Gerbasi , 2021).</figcaption>
          </figure>

        </div>
      </ImageContainer>

      <div className="main-text">
        <p>
          A defining fact about Zabit, aside from his creative striking and grappling, is that he's considered <b> one of the biggest "what-ifs"</b> in the UFC. 
        </p>
        <p>
          That is, he retired to early for anyone to see his true potential. <b> But just how good was he? </b>
        </p>
        <p>
          An obvious first step would be compare his stats with other UFC fighters. Let's take a look at a snippet of a dataset from 
          <a href="https://www.kaggle.com/datasets/maksbasher/ufc-complete-dataset-all-events-1996-2024/data"> Kaggle</a>.
        </p>

        <ImageContainer>

        <h2 className="figure-title">DataFrame Snippet </h2>

        <DataFrameTable />

        </ImageContainer>

        <p>
          You'll run into problems real quick... <b> How do you rank fighters based on their stats? How do you weigh each stat?</b>
        </p>
        <p>
          In 3D, even if you couldn't answer those questions, you can just plot the data and get a sense of where each fighter is. 
          But this dataframe has 9 columns (we're indexing by name), so <b>it's 9-dimensional!</b> 
        </p>
        <p>
          Unfortunately, humans can't see 9 dimensions. <b>If only there is a way to plot this data in a lower dimension...</b>
        </p>
      </div>

      <div className="main-text">
        <blockquote>
          <b>Enter Principal Component Analysis (PCA!)</b>
        </blockquote>
      </div>

      <div className="main-text">
        <p>
          PCA is a <b>machine learning algorithm</b> that seeks to <b>find a set of axes</b> that <b>best describe the data.</b>
        </p>
        <p>
          PCA can be used for <b>Dimensionality Reduction</b>. For example, you can <b>find just 2 or 3 axes</b> for a <b>9-dimensional data. </b>
          By <b>projecting the 9-D data onto our two axes </b>, we're <b>left with 2-D data</b>, meaning we can <b>easily visualize it.</b>
        </p>
        <p>
          I'll explain how PCA works later, but let's just see it in action (you can hover over points)!
        </p>
      </div>

      <UFCPlot />

      <div className="main-text">
        <p>
          Cool, right? But how does this help us?
        </p>
        <p>
          In the below figure, I've labeled some of the greatest UFC fighters of all time; 
          <b> compare that to where Zabit is!</b>
        </p>
      </div>

      <UFCPlot showSelectedLabels={true} />

      <div className="main-text">
        <p>
          Now, we can say with some degree of evidence that <b> Zabit was elite!</b> 
        </p>
        <p>
          But how does this magical algorithm work? That's what you'll learn in the next section.
        </p>
      </div>

      <h2 className="section-title">Diving Deeper Into PCA</h2>

      <div className="main-text">
        <p>
          Just like the previous example, PCA is all about <b>finding the "right" axis</b>. 
          Let's see how this plays out in a simpler example.
        </p>
        <p>
          Suppose we want to create a single number line (an axis) to capture the relationships between these 2D points. 
          After all, it's easier to look at just a number line than 2D data.
        </p>
      </div>
      <ImageContainer>

      <img src="/images/tenRandomPoints.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          We can try just projecting them onto the X (or Y) axis, which will give us a number line.
        </p>
        <p>
          Mathematically, this just means setting only the x-value of the points to 0 to plot on the y-axis, and setting only the y-value of the poitns to 0 to plot on the x-axis.
        </p>
      </div>

      <ImageContainer>

      <img src="/images/tenRandomPointsNumberLine.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          The red axis <b>captures how close the points are horizontally</b>, and we get a pretty good sense of where the x-mean is.
        </p>
        <p>
          However, it <b>doesn't capture how close the points are <em>vertically</em></b>. We can see this on the blue axis, which shows how spread apart these points are vertically! 
        </p>
        <p>
          Of course, we have the same problem with the blue axis, as it only captures information about <b>how close the points are vertically</b>.
        </p>
        <p>
          Our job is to figure out what the <b>best axis to plot this "number line" is</b> We'll call this axis the <b>"principal axis"</b>.
        </p>
        <p>
          Suppose we have the below data.
        </p>
      </div>

      <ImageContainer>

      <img src="/images/hundredRandomPoints.png" className="original-image" />
      
      </ImageContainer>
      

      <div className="main-text">
        <p>
          Our <b>first step</b> is to <b>standardize</b> the data.
        </p>
        <p>
          Often, the x and y values of data have different scales. If you took (x,y) = (height, weight), they wouldn't be distributed the same, would they? 
          Standardizing makes sure we don't have to deal with that problem.
        </p>
        <p>
          Let's standardize (subtract by mean and divide by standard deviation) this data to make our lives easier.
        </p>
      </div>

      <ImageContainer>

      <img src="/images/hundredPointsRandomVStd.png" className="original-image" />
      
      </ImageContainer>
      
      <div className="main-text">
        <p>
          ...and take a closer look at what we're dealing with.
        </p>
      </div>

      <ImageContainer>

      <img src="/images/hundredStdPoints.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          Recall that the question we want to answer is, what's a <b>good axis</b> that accurately captures the relationships between data points?
        </p>
        <p>
          In other words, we want something like this:
        </p>
      </div>

      <ImageContainer>

      <img src="/images/hundredStdPointsAxisExample.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          This is kind of the "best of both worlds"; it captures both <b>how close the points are horizontally <em>and</em> vertically</b>.
        </p>
        <p>
          We have to be careful though; if the points are spread out more <em>vertically</em> than <em>horizontally</em>, our <b>axis needs to be steeper to "capture the vertical spread"</b>.
        </p>
        <p>
          Similiarly, if the points are spread out more <em>horizontally</em> than <em>vertically</em>, our <b>axis needs to be shallower to "capture the horizontal spread"</b>.
        </p>
        <p>
          <b><em>We'll visualize this more; keep reading!</em></b>
        </p>
      </div>

      <div className="main-text">
        <p>
          So how do we do this?
        </p>
      </div>

      <div className="main-text">
        <blockquote>
          <p>
            <b>The Big Idea 1</b>
          </p>
          <p>
            <em>The best axis is the one that's closest to all the points</em>
          </p>
        </blockquote>
      </div>
      
      <div className="main-text">
        <p>
          Let me explain.
        </p>
        <p>
          We can measure how far the points are from the axis by <b>subtracting the projection vector from the data vector</b>.
        </p>
        <p>
          We do this by using the familiar projection formula from MATH 18 and 20C:
        </p>
      </div>

      <PCASliderInteractive />

      <h2 className="section-title">Understanding PCA Behavior</h2>

      <DisplayPCA />
    </div>
  );
}

export default App;