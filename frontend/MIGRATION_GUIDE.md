# K-Means Visualization: HTML/JS to React Migration Guide

This guide explains how the K-Means visualization was migrated from a monolithic HTML/JavaScript file to a React-based component architecture.

## 📁 React Folder Structure

```
frontend/src/
├── components/
│   └── KMeansVisualization/
│       ├── ControlPanel.tsx          # Sidebar with all controls
│       ├── ControlPanel.css
│       ├── D3Plot2D.tsx              # 2D D3.js visualization
│       ├── D3Plot2D.css
│       ├── Plot3D.tsx                # 3D Plotly visualization
│       ├── IterationControls.tsx     # Step navigation controls
│       ├── IterationControls.css
│       ├── MetricCards.tsx           # Metrics display
│       └── MetricCards.css
├── hooks/
│   └── useD3.ts                      # Custom hook for D3 integration
├── services/
│   └── api.ts                        # API service for backend calls
├── styles/
│   ├── globals.css                   # Global CSS variables
│   └── components.css                # Shared component styles
├── types/
│   └── kmeans.ts                     # TypeScript type definitions
└── scripts/
    ├── KMeans.tsx                    # Main component
    └── KMeans.css
```

## 🔄 Key Migration Changes

### 1. **State Management**

**Before (Vanilla JS):**
```javascript
let traceData = null;
let currentIteration = 0;
let placementMode = false;
```

**After (React Hooks):**
```typescript
const [traceData, setTraceData] = useState<KMeansTrace | null>(null);
const [currentIteration, setCurrentIteration] = useState<number>(0);
const [placementMode, setPlacementMode] = useState<boolean>(false);
```

### 2. **API Calls**

**Before (Vanilla JS):**
```javascript
async function initializeKMeans() {
  const response = await fetch(`${API_BASE_URL}/api/trace/kmeans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data = await response.json();
  traceData = data;
}
```

**After (React with Service):**
```typescript
import { kmeansAPI } from '../services/api';

const handleInitialize = async () => {
  const trace = await kmeansAPI.runKMeansTrace(request);
  setTraceData(trace);
};
```

### 3. **D3.js Integration**

**Before (Vanilla JS):**
```javascript
function updateMainPlot(step) {
  const svg = d3.select('#mainPlot')
    .selectAll('*')
    .remove();
  // ... D3 code
}
```

**After (React with useEffect):**
```typescript
useEffect(() => {
  if (!traceData || !step || !containerRef.current) return;
  
  const container = d3.select(containerRef.current);
  const svg = container.select('svg').empty() 
    ? container.append('svg')
    : container.select('svg');
  // ... D3 code with React state
}, [traceData, step, currentIteration]);
```

### 4. **Plotly.js Integration**

**Before (Vanilla JS):**
```javascript
Plotly.newPlot(containerNode, traces, layout, config);
```

**After (React Component):**
```typescript
import Plot from 'react-plotly.js';

<Plot
  data={traces}
  layout={layout}
  config={config}
  onClick={handlePlotClick}
  onHover={handlePlotHover}
/>
```

### 5. **Component Composition**

**Before (Monolithic HTML):**
```html
<div class="container">
  <div class="sidebar">...</div>
  <div class="plot-container">
    <div id="mainPlot"></div>
  </div>
</div>
```

**After (React Components):**
```typescript
<div className="kmeans-container">
  <ControlPanel {...props} />
  <D3Plot2D {...props} />
  <IterationControls {...props} />
</div>
```

## 📦 Dependencies

The React implementation uses these key packages:

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "d3": "^7.9.0",
    "plotly.js-dist-min": "^3.3.0",
    "react-plotly.js": "^2.6.0",
    "@types/d3": "^7.4.3",
    "@types/plotly.js": "^3.0.8"
  }
}
```

## 🎯 Key Features Maintained

✅ **All Original Functionality:**
- 2D D3.js visualizations with smooth transitions
- 3D Plotly visualizations
- Manual centroid placement (2D drag & drop, 3D coordinate input)
- Step-by-step iteration navigation
- Voronoi regions, trajectories, distance lines
- Metric cards and real-time updates

✅ **Enhanced with React:**
- Type-safe TypeScript
- Reusable components
- Better state management
- Improved code organization
- Easier testing and maintenance

## 🔧 Setup Instructions

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set Environment Variables (optional):**
   ```bash
   # .env.local
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Start Backend API:**
   ```bash
   cd ../app
   uvicorn app.server:app --reload --port 8000
   ```

## 🎨 CSS Architecture

The CSS uses CSS Variables for theming:

```css
:root {
  --primary: #2563eb;
  --text-primary: #0f172a;
  --spacing-md: 1rem;
  /* ... more variables */
}
```

All components share these variables through:
- `globals.css` - Global CSS variables
- `components.css` - Shared component styles
- Component-specific CSS files for unique styles

## 📝 Component Responsibilities

### **KMeans.tsx** (Main Component)
- State management for all configuration
- API calls and data fetching
- Coordination between child components
- Keyboard shortcuts and event handling

### **ControlPanel.tsx**
- Dataset configuration (type, samples, clusters, dimensions)
- Algorithm configuration (init method, max iters, tolerance)
- Visualization options (Voronoi, trajectories, distances)
- Manual placement toggle and controls

### **D3Plot2D.tsx**
- 2D D3.js visualization rendering
- Data points and centroids with transitions
- Voronoi regions, trajectories, distance lines
- Manual centroid placement with drag & drop

### **Plot3D.tsx**
- 3D Plotly visualization rendering
- Interactive 3D scatter plots
- Manual centroid placement with coordinate input

### **IterationControls.tsx**
- Step navigation (prev, next, first, last)
- Slider for iteration selection
- Convergence indicator

### **MetricCards.tsx**
- Display iteration number
- Total inertia (WCSS)
- Average cluster size
- Cluster size range

## 🚀 Usage Example

```typescript
import KMeans from './scripts/KMeans';

function App() {
  return <KMeans />;
}
```

The component handles all initialization and state management internally.

## 🔍 Key Implementation Details

### **D3.js Lifecycle in React**

D3.js requires direct DOM manipulation, which React manages differently. The solution:

1. Use `useRef` for DOM elements
2. Use `useEffect` for D3 rendering
3. Clean up D3 selections on unmount
4. Use D3's enter/update/exit pattern with React keys

### **Plotly.js in React**

React-Plotly.js provides a React wrapper:
- Handles Plotly lifecycle automatically
- Provides React event handlers (`onClick`, `onHover`)
- Responsive resizing built-in

### **API Service Pattern**

Centralized API service:
- Single source of truth for API endpoints
- Type-safe request/response handling
- Error handling in one place
- Easy to mock for testing

## 🐛 Common Issues & Solutions

### **D3 Elements Not Rendering**
- Ensure `useEffect` dependencies include all used state
- Check that `containerRef.current` exists before D3 selection
- Verify SVG is properly appended to container

### **Plotly Not Updating**
- Use `useMemo` for traces/layout computation
- Ensure `data` prop changes trigger re-render
- Check `useResizeHandler` prop for responsiveness

### **State Not Updating**
- Use `useCallback` for event handlers
- Check `useEffect` dependency arrays
- Verify state setters are being called

## 📚 Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [D3.js Documentation](https://d3js.org/)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [React-Plotly.js](https://github.com/plotly/react-plotly.js)

