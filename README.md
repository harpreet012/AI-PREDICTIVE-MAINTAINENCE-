# AI-Powered Predictive Maintenance System

An industry-grade full-stack web application for real-time industrial equipment monitoring, anomaly detection, and predictive failure analysis using MERN stack.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Configure Environment
Edit `server/.env` with your MongoDB URI:
```
MONGODB_URI=mongodb://localhost:27017/predictive_maintenance
PORT=5000
```

### 2. Seed the Database
```bash
cd server
npm run seed
```

### 3. Start the Backend
```bash
cd server
npm run dev
```

### 4. Start the Frontend
```bash
cd client
npm run dev
```

### 5. Open in Browser
```
http://localhost:5173
```

---

## 🏗️ Architecture

```
client/          React + Vite frontend
  src/
    pages/       Dashboard, Equipment, Alerts, Analytics, Maintenance
    components/  Sidebar, TopBar, HealthGauge, SensorChart, EquipmentCard
    context/     WebSocket (Socket.io) real-time context
    services/    Axios API client

server/          Node.js + Express backend
  models/        Equipment, SensorReading, Alert, MaintenanceLog
  routes/        REST API endpoints
  services/
    mlEngine.js       Z-score anomaly detection + health scoring
    dataSimulator.js  Real-time IoT data simulation with fault injection
  config/
    db.js        MongoDB connection
    seed.js      Database seeder (10 machines, 7-day history)
```

## 🤖 ML Engine Features
- **Z-score Anomaly Detection** — Statistical deviation-based anomaly scoring
- **Weighted Health Scoring** — Multi-sensor health index (0-100)
- **Exponential Degradation Model** — Predicts hours to failure
- **Sigmoid Failure Probability** — Converts health score to failure %
- **Domain Rule Engine** — Equipment-type-specific thresholds

## 📡 Real-time Features
- WebSocket sensor updates every 3 seconds
- Live alert toast notifications
- Fault injection simulation (bearing wear, overheating, pressure leaks, etc.)
- Fleet summary broadcast
