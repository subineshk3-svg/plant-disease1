"""
AgriScan AI - Application Launcher
Runs the FastAPI application on http://127.0.0.1:8000
"""

import sys
import os
import uvicorn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("=" * 60)
    print(" AGRISCAN AI — ADVANCED PLANT & FRUIT DISEASE DETECTION PLATFORM")
    print(" Powered by PlantVillage Computer Vision & Gemini Vision")
    print("=" * 60)
    print(" Serving Web UI & API at: http://127.0.0.1:8000")
    print(" Press Ctrl+C to terminate.")
    print("=" * 60)
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False)
