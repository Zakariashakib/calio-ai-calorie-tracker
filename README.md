# 🥗 CalSnap — AI-Powered Nutrition Coach & Camera-First Meal Tracker

> **Point your camera at any meal and get instant nutritional breakdowns, macro analysis, and custom AI coaching in under 2 seconds.**

---

## 📖 Complete Project Documentation

For a comprehensive technical overview, architecture diagrams, all 19 API endpoints, and a breakdown of every feature and file in this codebase, please read:

👉 **[CALSNAP_PROJECT_OVERVIEW.md](file:///Users/zakariashakib/Zakaria%20Dev/CalSnapapp/CALSNAP_PROJECT_OVERVIEW.md)**

---

## 🚀 Quick Start (Running Locally)

### 1. Start Backend API (FastAPI — Port 8001)
```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --port 8001
```
*Note: Includes automatic fallback to `mongomock-motor` if local MongoDB is not installed.*

### 2. Start Frontend App (Expo Web / Mobile — Port 8081)
```bash
cd frontend
npx expo start --web --port 8081
```
- Web App: Open **http://localhost:8081**
- iOS Simulator: Press `i` in terminal
- Mobile Device: Scan QR code with Expo Go app
