import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import UFCPlot from "./pca/UFCPlot";
import DisplayPCA from "./pca/PCAConfigurator";
import PCASliderInteractive from "./pca/PCASliderInteractive";
import ImageContainer from "./pca/ImageContainer";
import DataFrameTable from "./pca/DataFrameTable";

function PCA() {
  return (
    <div className="container">
      <div className="header">
        <h1>Principal Component Analysis</h1>
        <p>PCA: Why Do We Need It?</p>
      </div>

      <div className="main-text">
        <p>
          Let's say you're interested in Mixed Martial Arts (MMA) fighters, just like me! 
          There's one particular Ultimate Fighting Championship (UFC) fighter that I love:
        </p>

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
          An obvious first step would be compare his stats with other UFC fighters. Let's take a look at a snippet of a
           dataset from <a href="https://www.kaggle.com/datasets/maksbasher/ufc-complete-dataset-all-events-1996-2024/data">Kaggle</a>.
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
          Enter<b> Principal Component Analysis (PCA)</b>!
        </blockquote>
      </div>

      <div className="main-text">
        <p>
          PCA is a <b>machine learning algorithm</b> that seeks to <b>find a set of axes</b> that <b>best describe the data.</b>
        </p>
        <p>
          PCA can be used for <b>Dimensionality Reduction</b>. For example, you can <b>find just 2 or 3 axes</b> for a <b>9-dimensional data. </b>
          By <b>projecting the 9D data onto our 2 axes </b>, we're <b>left with 2D data</b>, meaning we can <b>easily visualize it.</b>
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
          You can do this with virtually anything, whether you want to compare a baseketball player to all other players in the NBA,
          or if you want to compare something not sports related.
          <b> The possibilities are endless.</b>  
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
          Mathematically, this just means setting only the x-value of the points to 0 to plot on the y-axis, and setting only the y-value of the points to 0 to plot on the x-axis.
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
          Our job is to figure out what the <b>best axis to plot this "number line" is</b>. We'll call this axis the <b>"principal axis"</b>.
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
          Our <b>first step</b> is to <b>standardize</b> (subtract by mean and divide by standard deviation) the data.
        </p>
        <p>
          Often, the x and y values of data have different scales. If you took (x,y) = (height, weight), they wouldn't be distributed the same, would they? 
          Standardizing makes sure we don't have to deal with that problem.
        </p>
        <p>
          Let's standardize this data to make our lives easier.
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

        <BlockMath math={String.raw`\text{Proj}_{\mathbf{u}}\mathbf{v} = \frac{\mathbf{u} \cdot \mathbf{v}}{\lVert \mathbf{u} \rVert^2} \mathbf{u}`} />
      </div>


      <ImageContainer>

      <img src="/images/distanceFromAxis.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          Let's examine several test cases:
        </p>
      </div>

      <ImageContainer>

      <img src="/images/badPrincipalComponent1.png" className="original-image" />
      
      </ImageContainer>

      <div className="main-text">
        <p>
          We can see that while the axis may capture the horizontal spread, 
          <b>it doesn't capture the vertical spread at all</b>. 
          We can see this because <b>vertical distance from the points to the axis is huge for most of our points.</b>
        </p>
      </div>

      <ImageContainer>

      <img src="/images/badPrincipalComponent2.png" className="original-image" />
      
      </ImageContainer>
  
      <div className="main-text">
        <p>
          Similiarly, we can see that while the axis may capture the vertical spread,
          <b>it doesn't capture the horiontal spread at all</b>. 
          We can see this because <b>horizontal distance from the points to the axis is huge for most of our points.</b>
        </p>
      </div>

      <ImageContainer>

      <img src="/images/goodPrincipalComponent.png" className="original-image" />
      
      </ImageContainer>

     <div className="main-text">
        <p>
          Meanwhile, we see that this axis captures 
          <b> both the horizontal and vertical spread pretty well</b>, as its  
          <b> distance from the points are reasonably smaller.</b>
        </p>
        <p>
          Notice how the spacing on the green projections changes with different principal axes. Note how 
          <b> bad principal axes can trick you into thinking two points are close when they're really not.</b>
        </p>
        <p>
          With the below interactive, do you think you can find the "best" axis? (Hint! Pay attention to "Total squared distance to guess axis"!)
        </p>
      </div>
      
      <PCASliderInteractive showEllipse={false} showEigenvector={false} />

      <div className="main-text">
        <p>
          Notice how the pink line becomes longer as you get closer to the "best" axis. 
        </p>
        <p>
          Intuitively, this means that <b>we're "explaining" more and more of our data</b>!
        </p>
      </div>

      <div className="main-text">
        <p>
          You might be thinking,
        </p>
        <blockquote>
          How do you nail it down to one axis?
        </blockquote>
        <p>
          We'll show you how to pinpoint one mathematically.
        </p>
        <p>
          The formula for distance to the principal component is: <InlineMath math={String.raw`\mathbf{d} = \tilde{\mathbf{x}} - \text{Proj}_{\mathbf{p}}\tilde{\mathbf{x}} = \tilde{\mathbf{x}} - \frac{\mathbf{p} \cdot \tilde{\mathbf{x}}}{\|\mathbf{p}\|^2}\mathbf{p}`} />
        </p>
        <p>Where:</p>
        <ul>
          <li><InlineMath math={String.raw`\mathbf{d}`} /> is the distance to the principal component</li>
          <li><InlineMath math={String.raw`\tilde{\mathbf{x}} = \mathbf{x} - \boldsymbol{\mu}`} /> is 
           the standardized data point <i>after</i> x has been divided by the standard deviation</li>
          <li><InlineMath math={String.raw`\mathbf{p}`} /> is the principal component vector</li>
        </ul>
        <p>
          We see that a "good" principal component should have the <b>least distance between the points and principal component</b>!
        </p>
        <p>
          What we need to do is to <b>find a vector</b> that <b>minimizes the total distance between the points and the lines</b>!
        </p>
      </div>

      <div className="main-text">
        <blockquote>
          <p>
            <b>The Big Idea 2</b>
          </p>
          <p>
            <em>We need to find a principal component that minimizes <code>sum</code></em>
          </p>
        </blockquote>
        <p>
          <code>sum = 0</code>
        </p>
        <p>
          <code>for data in data_points:</code>
        </p>
        <p style={{ paddingLeft: "1em" }}>
          <code>sum += distance(data, principal_component)</code>
        </p>
        <p>
          Because we just need to find a direction, we can put a constraint that <code>magnitude(principal_component) = 1</code>.
        </p>
        <p>
          This has no effect on the problem that we're solving, and makes our math easier!
        </p>
        <p>
          Written in big scary math, it looks like this:
        </p>

      <BlockMath math={String.raw`\begin{aligned}
      \displaystyle \min_{\mathbf{p}}\sum_{i}\|\mathbf{d}_i\| &= 
      \displaystyle \min_{\mathbf{p}}\sum_{i}\|\tilde{\mathbf{x}}_{i} - \text{Proj}_{\mathbf{p}}\tilde{\mathbf{x}}_{i}\| \\
      &= \displaystyle \min_{\mathbf{p}}\sum_{i}\|\tilde{\mathbf{x}}_{i} - \frac{\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}}{\|\mathbf{p}\|^2}\mathbf{p}\|
      \end{aligned}`} />
      </div>

      <div className="main-text">
        <p>
          You might be thinking,
        </p>

        <blockquote>
          <p>
            <em>But aren't there infinitely many principal components we need to check? I mean, even our slider had 360 angles to choose for how our principal component looked like!</em>
          </p>
        </blockquote>

        <p>
          This is where we have to do some math; <b>don't worry, it's just algebra.</b>
        </p>
      </div>

      <details className="indented-details">
        <summary
          style={{
            fontSize: "1.3em",
            fontWeight: "bold",
            padding: "8px",
            cursor: "pointer"
          }}
        >
          "Find principal component <InlineMath math={String.raw`\mathbf{p}`} /> that minimizes the distance between points <InlineMath math={String.raw`\tilde{\mathbf{x}}`} /> and principal component <InlineMath math={String.raw`\mathbf{p}`} />"
        </summary>

        <div className="main-text">
          <BlockMath math={String.raw`\begin{aligned}
            \min_{\mathbf{p}} \sum_{i} \lVert \mathbf{d} \rVert^2 
            &= \min_{\mathbf{p}} \sum_{i} \lVert \tilde{\mathbf{x}}_{i} - \mathrm{Proj}_{\mathbf{p}} \tilde{\mathbf{x}}_{i} \rVert^2 \\
            &= \min_{\mathbf{p}} \sum_{i} \left\lVert \tilde{\mathbf{x}}_{i} - 
            \frac{\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}}{\lVert \mathbf{p} \rVert^2} \mathbf{p} \right\rVert^2 \\ 
            &= \min_{\mathbf{p}} \sum_{i} \left\lVert \tilde{\mathbf{x}}_{i} - 
            (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}) \mathbf{p} \right\rVert^2 
            \quad \text{Remember that we defined } \lVert \mathbf{p} \rVert^2 = 1
          \end{aligned}`} />

          <p><em>Note 1.</em> We use norm squared (“un-root it”) because:</p>
          <ul>
            <li>It makes our math easier</li>
            <li>It's easier to compute</li>
            <li>It has no effect on the final solution</li>
          </ul>

          <p><em>Note 2.</em> On line 4, we used the fact that the principal component <strong>p</strong> is a unit vector.</p>
        </div>
      </details>

      <details className="indented-details">
        <summary
          style={{
            fontSize: "1.3em",
            fontWeight: "bold",
            padding: "8px",
            cursor: "pointer"
          }}
        >
          Some algebra...
        </summary>

        <div className="main-text">
          <BlockMath math={String.raw`\begin{aligned}
            \min_{\mathbf{p}} \sum_{i} \left\lVert \tilde{\mathbf{x}}_{i} - 
            (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}) \mathbf{p} \right\rVert^2 
            &= \min_{\mathbf{p}} \sum_{i} (\tilde{\mathbf{x}}_{i}^2 - 2( (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}) \mathbf{p})\tilde{\mathbf{x}}_{i} + ((\mathbf{p} \cdot \tilde{\mathbf{x}}_{i}) \mathbf{p})^2) \\
            &= \min_{\mathbf{p}} \sum_{i} (\tilde{\mathbf{x}}_{i}^2 - 2(\mathbf{p} \cdot \tilde{\mathbf{x}}_{i})^2 + (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i})^2) \\
            &= \min_{\mathbf{p}} \sum_{i} (\tilde{\mathbf{x}}_{i}^2 - (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i})^2)
          \end{aligned}`} />
        </div>
      </details>

      <details className="indented-details">
        <summary
          style={{
            fontSize: "1.3em",
            fontWeight: "bold",
            padding: "8px",
            cursor: "pointer"
          }}
        >
          Some more algebra...
        </summary>

        <div className="main-text">
          <BlockMath math={String.raw`\begin{aligned}
            \min_{\mathbf{p}} \sum_{i} (\tilde{\mathbf{x}}_{i}^2 - (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i})^2)
            &= \max_{\mathbf{p}} \sum_{i} (\mathbf{p} \cdot \tilde{\mathbf{x}}_{i})^2
            \quad \text{because the first term is constant} \\
            &= \max_{\mathbf{p}} \sum_{i} (\mathbf{p}^\text{T} \tilde{\mathbf{x}}_{i})^\text{T} (\mathbf{p}^\text{T} \tilde{\mathbf{x}}_{i})
          \end{aligned}`} />

          <p><em>Note 1.</em> If line 1 seems confusing, think of minimizing <InlineMath math={String.raw`1 - t`} />.</p>
          <ul>
            <li>As <InlineMath math={String.raw`t`} /> increases, <InlineMath math={String.raw`1 - t`} /> decreases</li>
            <li>So maximizing <InlineMath math={String.raw`t`} /> is the same problem</li>
          </ul>
        </div>
      </details>

      <details className="indented-details">
        <summary
          style={{
            fontSize: "1.3em",
            fontWeight: "bold",
            padding: "8px",
            cursor: "pointer"
          }}
        >
          Even more algebra...
        </summary>

        <div className="main-text">
          <BlockMath math={String.raw`\begin{aligned}
            \max_{\mathbf{p}} \sum_{i} (\mathbf{p}^\text{T} \tilde{\mathbf{x}}_{i}\tilde{\mathbf{x}}_{i}^\text{T} \mathbf{p})
            &= \max_{\mathbf{p}} \mathbf{p}^\text{T} \sum_{i}(\tilde{\mathbf{x}}_{i}\tilde{\mathbf{x}}_{i}^\text{T}) \mathbf{p} \\
            &= \max_{\mathbf{p}} \mathbf{p}^\text{T} N\mathbf{S} \mathbf{p} \\
            &= \max_{\mathbf{p}} \mathbf{p}^\text{T} \mathbf{S} \mathbf{p}
          \end{aligned}`} />
        </div>
      </details>


      <div className="main-text">
        <p>We (finally) end here:</p>

        <BlockMath math={String.raw`\begin{aligned}
      \min_{\mathbf{p}} \sum_{i} \lVert \mathbf{d} \rVert^2 
      = \max_{\mathbf{p}} \mathbf{p}^\text{T} \mathbf{S} \mathbf{p}
      \end{aligned}`} />
      </div>

      <div className ="main-text">
        The right-hand equation is actually very well known; it&apos;s related to a
        special case of the <a href="https://ecroot.math.gatech.edu/notes_linear.pdf">Rayleigh Quotient</a>., and it&apos;s known that the{" "}
        <strong>eigenvectors with the largest eigenvalues of </strong>
        <InlineMath math={String.raw`\mathbf{S}`} /> maximize this value (i.e., the
        “biggest” eigenvectors).
      </div>

      <div className="main-text">
        <blockquote>
          <p style={{ fontSize: "1.6em", fontWeight: "bold" }}>
            The Big Idea 3
          </p>

          <p style={{ fontSize: "1.1em" }}>
            <em>
              If we want the “best” principal component, we're looking for the{" "}
              <strong>“biggest” eigenvectors of </strong>
              <InlineMath math={String.raw`\mathbf{S}`} />
            </em>
          </p>
        </blockquote>
      </div>

      <div className="main-text">
        Let's see what happens when we use the "biggest" eigenvectors of <InlineMath math={String.raw`\mathbf{S}`} /> as our principal axes.
      </div>

      <PCASliderInteractive showEllipse={false} showEigenvector={true} />

      <div className="main-text">
        <p>But what does this all mean? This makes a lot of sense geometrically! Mathematically, the relationship</p>

        <BlockMath math={String.raw`\mathbf{p}^\text{T} \mathbf{S} \mathbf{p}=c`} />

        <p>
          actually <strong>expands into the equation of an ellipse </strong>  
           (try plugging <InlineMath math={String.raw`\langle x, y \rangle`} /> into{" "}
          <InlineMath math={String.raw`\mathbf{p}`} />,  invent any 2×2 symmetric
          matrix for <InlineMath math={String.raw`\mathbf{S}`} />, and expand <InlineMath math={String.raw`\mathbf{p}^\text{T} \mathbf{S} \mathbf{p}`}/>), 
          where c is a constant. c is determined by the fact that <InlineMath math={String.raw`\mathbf{p} `}/> is 
          a unit vector, which is what we defined. The eigenvectors
          of <InlineMath math={String.raw`\mathbf{S}`} /> become the major and minor
          axes of that ellipse.
        </p>
        <p>
          So, <b><InlineMath math={String.raw`\mathbf{p}`} /> (the covariance matrix's eigenvectors) plot the axes of the ellipse that represents the covariance of the data.</b>
        </p>
        <p>
          Moreover, <strong>
            <InlineMath math={String.raw`\mathbf{p}`} />
          </strong>{" "}
          <b>gives us the directions of our principal components!</b>
        </p>

        <p>
          And because covariance measures how variables vary together,{" "}
          <strong>
            the ellipse and its axes visually capture the “spread” of our dataset!
          </strong>
        </p>
      </div>

      <PCASliderInteractive showEllipse={true} showEigenvector={true} />

      <div className = "main-text">
        <p>
          Notice how when our principal component is the "biggest" eigenvector, the <b>the ellipse drawn encapsulates the data</b>!
        </p>
        <blockquote>
          That's how PCA works.
        </blockquote>
      </div>

      <h2 className="section-title">Understanding PCA Behavior</h2>

      <div className = "main-text">
        <p>
          Now that you've (hopefully) understood how PCA mathematically works, we've 
          provided a cool interactive where you can <b>generate your own data</b>, and 
          understand how <b>PCA works under different data</b>!
        </p>
        <p>
          Hit <em>Run PCA</em> to begin!
        </p>
      </div>

      <DisplayPCA />

      <h2 className="section-title">Bibliography</h2>
      <div className = "main-text">
        <ul>
          <li>“Flashy Style a Product of Practice for Must-See Magomedsharipov.” UFC, October 3, 2018.  <a href="https://www.ufc.com.br/news/flashy-style-product-practice-must-see-magomedsharipov">https://www.ufc.com.br/news/flashy-style-product-practice-must-see-magomedsharipov</a>. </li>
          <li>MaksBasher. “UFC Complete Dataset (All Events 1996-2024).” Kaggle, March 28, 2024. <a href="https://www.kaggle.com/datasets/maksbasher/ufc-complete-dataset-all-events-1996-2024/data">https://www.kaggle.com/datasets/maksbasher/ufc-complete-dataset-all-events-1996-2024/data</a>. </li>
          <li>The rayleigh principle for finding eigenvalues April 19, 2005 1 introduction. Accessed December 1, 2025.<a href="https://ecroot.math.gatech.edu/notes_linear.pdf">https://ecroot.math.gatech.edu/notes_linear.pdf</a>.</li>
          <li>“UFC Moscow: Zabit Magomedsharipov Fades in Third, but Hangs on to Win Decision over Calvin Kattar.” Yahoo! Sports. Accessed November 30, 2025. <a href="https://sports.yahoo.com/zabit-magomedsharipov-fades-in-third-but-hangs-on-to-win-decision-over-calvin-kattar-in-moscow-224742903">https://sports.yahoo.com/zabit-magomedsharipov-fades-in-third-but-hangs-on-to-win-decision-over-calvin-kattar-in-moscow-224742903</a>. </li>
        </ul>
      </div>
      
    </div>
  );
}

export default PCA;