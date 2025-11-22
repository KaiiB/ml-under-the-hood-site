# K-Means Visualization - Quick Start Guide

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Step 1: Install Dependencies

```bash
cd ml-under-the-hood-site
pip install -r requirements.txt
```

This will install:
- FastAPI
- uvicorn
- numpy
- scikit-learn
- pydantic

## Step 2: Start the Backend Server

```bash
# From the ml-under-the-hood-site directory
uvicorn main:app --reload
```

The server will start at: **http://localhost:8000**

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Step 3: Open the Visualization

You have two options:

### Option A: Direct File Open (Simplest)
1. Navigate to the `ml-under-the-hood-site` folder
2. Double-click `kmeans_visualization.html`
3. It will open in your default browser

### Option B: Using a Local Server (Recommended)
```bash
# Python 3
cd ml-under-the-hood-site
python -m http.server 8080

# Or Python 2
python -m SimpleHTTPServer 8080
```

Then open: **http://localhost:8080/kmeans_visualization.html**

## Step 4: Use the Visualization

1. **Configure Parameters** (in the left sidebar):
   - Choose data type (Blobs, Moons, Circles, Random)
   - Set number of clusters (K)
   - Adjust sample size
   - Choose 2D or 3D

2. **Click "🚀 Initialize"** to:
   - Generate the dataset
   - Run K-Means algorithm
   - Load the visualization

3. **Navigate through iterations**:
   - Use "⏭️ Next Step" to go step-by-step
   - Use the slider to jump to any iteration
   - Click "▶️ Run to Convergence" to animate

4. **Explore different views**:
   - **Main Visualization**: See the clustering process
   - **WCSS Optimization**: View the objective function optimization
   - **Mathematical Details**: Learn the formulas and algorithm steps

## Troubleshooting

### Backend not starting?
- Make sure you're in the `ml-under-the-hood-site` directory
- Check if port 8000 is already in use
- Try: `uvicorn main:app --reload --port 8001` (then update API_BASE_URL in HTML)

### CORS Errors?
- The server is configured with CORS enabled for all origins
- If you see CORS errors, make sure the backend is running

### API Connection Failed?
- Verify the backend is running at http://localhost:8000
- Check the browser console (F12) for errors
- Test the API directly: http://localhost:8000/docs

### Visualization not loading?
- Make sure you're opening via a web server (not file://)
- Check browser console for JavaScript errors
- Ensure D3.js is loading (check Network tab)

## Testing the API

Visit http://localhost:8000/docs to see the interactive API documentation and test endpoints directly.

## Stopping the Server

Press `Ctrl+C` in the terminal where uvicorn is running.

