# FIC Manager Application Repository

Restructured repository containing the **FIC Manager Mobile Application** (`frontend/`) and the **Real-Time Notification Server** (`backend/`).

---

## 📁 Repository Structure

```
FIC Manager App/
├── frontend/             # Complete React Native Mobile Application
│   ├── android/          # Native Android Gradle Project & Manifests
│   ├── src/              # Application features, components, services, and navigation
│   ├── __tests__/        # Unit & Integration test suites
│   ├── package.json      # Mobile dependencies & scripts
│   ├── tsconfig.json     # TypeScript configuration
│   ├── metro.config.js   # Metro bundler configuration
│   └── babel.config.js   # Babel configuration
│
├── backend/              # Real-Time Scoping & Notification API Server
│   ├── server.js         # Real-time Push Notification & Territory Scoping Server
│   ├── package.json      # Backend dependencies & test scripts
│   ├── test_*.js         # Automated backend test suites
│   ├── .env.example      # Environment variables template
│   └── README.md         # Backend documentation
│
├── screenshots/          # Visual QA, flow captures & UI test dumps
│   └── README.md
│
├── docs/                 # Architectural specs, API contracts & workflows (26 guides)
├── .env.example          # Root environment configuration template
├── .gitignore            # Production git ignore rules
├── package.json          # Root scripts delegating to frontend/backend
└── README.md
```

---

## 🚀 Quick Start Guide

### 📱 Frontend (React Native Mobile App)

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Metro Bundler:
   ```bash
   npm start
   ```
   *Or from the root directory:*
   ```bash
   npm run mobile:start
   ```

4. Launch on connected Android device / emulator:
   ```bash
   npm run android
   ```
   *Or from the root directory:*
   ```bash
   npm run mobile:android
   ```

5. Run TypeScript typecheck:
   ```bash
   npm run typecheck
   ```
   *Or from the root directory:*
   ```bash
   npm run mobile:typecheck
   ```

6. Run Unit & Integration Tests:
   ```bash
   npm test
   ```
   *Or from the root directory:*
   ```bash
   npm run mobile:test
   ```

---

### 🖥️ Backend (Notification Service)

1. Run the Node.js FCM Push Notification Backend Server:
   ```bash
   node backend/server.js
   ```
   *Or from the root directory:*
   ```bash
   npm run backend:start
   ```

---

## 🔒 Environment & Configuration Integrity
- All mobile app dependencies and React Native configurations are scoped entirely within `frontend/package.json`.
- Android native configuration files reside inside `frontend/android/`.
- Backend notification server scripts reside inside `backend/`.
