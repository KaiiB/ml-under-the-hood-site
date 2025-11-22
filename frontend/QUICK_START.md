# Quick Start Guide - React K-Means Visualization

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Backend API

```bash
# In a separate terminal
cd app
uvicorn app.server:app --reload --port 8000
```

### 3. Start React Dev Server

```bash
# In the frontend directory
npm run dev
```

Visit `http://localhost:5173` to see the app!

## 📋 What to Test

1. **Basic Visualization:**
   - Click "Initialize K-Means"
   - Use iteration controls to navigate steps
   - View metrics and watch convergence

2. **2D Mode:**
   - Set "Dimensions" to "2D"
   - Enable visualization options (Voronoi, trajectories)
   - Test manual centroid placement (click, drag, double-click)

3. **3D Mode:**
   - Set "Dimensions" to "3D"
   - Rotate, zoom, and pan the 3D plot
   - Test manual centroid placement (click anywhere in 3D space)

4. **Different Data Types:**
   - Try "Blobs", "Moons", "Circles", "Random"
   - Adjust parameters and observe results

## 🔧 Troubleshooting

### API Connection Error
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify `VITE_API_BASE_URL` in `.env.local`

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires 18+)
- Delete `node_modules` and `package-lock.json`, then reinstall

### Visualization Not Rendering
- Check browser console for errors
- Verify D3/Plotly are installed: `npm list d3 plotly.js-dist-min`
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## 📚 Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration details
- See [REACT_CONVERSION_SUMMARY.md](./REACT_CONVERSION_SUMMARY.md) for overview

