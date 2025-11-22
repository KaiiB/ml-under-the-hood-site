# K-Means Visualization - React Frontend

A React-based interactive visualization for K-Means clustering algorithm, migrated from vanilla HTML/JavaScript.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ with FastAPI backend running on port 8000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default port).

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
frontend/src/
├── components/
│   └── KMeansVisualization/    # K-Means specific components
│       ├── ControlPanel.tsx     # Sidebar controls
│       ├── D3Plot2D.tsx        # 2D D3.js visualization
│       ├── Plot3D.tsx          # 3D Plotly visualization
│       ├── IterationControls.tsx
│       └── MetricCards.tsx
├── hooks/
│   └── useD3.ts                # Custom D3 hook (optional)
├── services/
│   └── api.ts                  # API service layer
├── styles/
│   ├── globals.css             # Global CSS variables
│   └── components.css          # Shared component styles
├── types/
│   └── kmeans.ts               # TypeScript definitions
└── scripts/
    └── KMeans.tsx              # Main component
```

## 🎯 Features

### ✅ Implemented

- **2D Visualization** - D3.js interactive charts
- **3D Visualization** - Plotly.js 3D scatter plots
- **Step-by-Step Navigation** - Iterate through K-Means steps
- **Manual Centroid Placement** - Drag & drop (2D) or coordinate input (3D)
- **Visualization Options** - Voronoi regions, trajectories, distance lines
- **Real-time Metrics** - WCSS, cluster sizes, iteration info
- **Responsive Design** - Works on different screen sizes

### 🎨 UI Features

- Professional color scheme and typography
- Smooth animations and transitions
- Keyboard shortcuts (arrow keys for navigation)
- Tooltips on hover
- Accessible focus states

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If not set, the app will auto-detect the API URL based on the environment.

### API Integration

The app connects to a FastAPI backend at:
- Development: `http://localhost:8000`
- Production: Set via `VITE_API_BASE_URL` environment variable

API endpoint: `POST /api/trace/kmeans`

## 📦 Dependencies

### Core
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `typescript` ~5.9.3

### Visualization
- `d3` ^7.9.0 - 2D visualizations
- `plotly.js-dist-min` ^3.3.0 - 3D visualizations
- `react-plotly.js` ^2.6.0 - React wrapper for Plotly

### Development
- `vite` ^7.2.2 - Build tool
- `@vitejs/plugin-react` ^5.1.0
- `eslint` ^9.39.1
- TypeScript type definitions

## 🎓 Usage Guide

### Basic Usage

1. Configure dataset parameters (type, samples, clusters, dimensions)
2. Configure algorithm parameters (init method, max iterations, tolerance)
3. Toggle visualization options (Voronoi, trajectories, distances)
4. Click "Initialize K-Means" to run the algorithm
5. Use iteration controls to navigate through steps
6. View metrics and observe convergence

### Manual Centroid Placement

1. Check "Manual Centroid Placement" checkbox
2. For 2D:
   - Click on the plot to place centroids
   - Drag to move centroids
   - Double-click to remove centroids
3. For 3D:
   - Click anywhere in the 3D space
   - Or use the coordinate input panel
   - Hover to see coordinates
4. Click "Initialize K-Means" to run with your centroids

### Keyboard Shortcuts

- `←` Arrow Left: Previous iteration
- `→` Arrow Right: Next iteration

## 🔍 Component Architecture

### State Management

All state is managed using React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`):

- `KMeans.tsx` - Main state container
- Child components receive props and callbacks
- No external state management library needed

### D3.js Integration

D3.js is integrated using:
- `useRef` for DOM element references
- `useEffect` for rendering lifecycle
- Proper cleanup on unmount
- D3's enter/update/exit pattern

### Plotly.js Integration

Plotly.js is integrated via `react-plotly.js`:
- React component wrapper
- Automatic lifecycle management
- React event handlers

## 🐛 Troubleshooting

### API Connection Issues

**Problem:** "Failed to initialize K-Means: HTTP error!"

**Solution:**
1. Ensure FastAPI backend is running on port 8000
2. Check CORS settings in backend
3. Verify `VITE_API_BASE_URL` environment variable

### D3 Visualization Not Rendering

**Problem:** Chart is blank or not updating

**Solution:**
1. Check browser console for errors
2. Verify `traceData` is not null
3. Ensure container ref is properly set
4. Check that D3 dependencies are correct in `useEffect`

### Plotly 3D Not Displaying

**Problem:** 3D plot doesn't show or crashes

**Solution:**
1. Verify `plotly.js-dist-min` is installed
2. Check that `react-plotly.js` is properly imported
3. Ensure data points have 3 dimensions
4. Check browser console for errors

### Build Errors

**Problem:** TypeScript or build errors

**Solution:**
1. Run `npm install` to ensure all dependencies are installed
2. Check TypeScript version compatibility
3. Verify all type imports are correct
4. Run `npm run build` to see detailed error messages

## 📚 Additional Resources

- [Migration Guide](./MIGRATION_GUIDE.md) - Detailed migration from HTML/JS
- [React Documentation](https://react.dev)
- [D3.js Documentation](https://d3js.org)
- [Plotly.js Documentation](https://plotly.com/javascript)

## 🤝 Contributing

1. Follow the existing component structure
2. Use TypeScript for all new files
3. Follow the CSS variable naming convention
4. Test in both 2D and 3D modes
5. Ensure responsive design works

## 📝 License

Same as the parent project.
