# FIC Manager Application Repository

Enterprise repository containing the **FIC Manager React Native Mobile Application** directly at the project root and the **Real-Time Notification Server** separated in `backend/`.

---

## 📁 Repository Structure

```text
Manager App/
├── android/                   # Native Android Gradle Project & Manifests
├── ios/                       # Native iOS Project Directory (.gitkeep)
│
├── backend/                   # Real-Time Scoping & Notification API Server (Separate project)
│   ├── server.js              # Real-time Push Notification & Territory Scoping Server
│   ├── package.json           # Backend dependencies & test scripts
│   ├── test_*.js              # Automated backend test suites
│   ├── .env.example           # Environment variables template
│   └── README.md              # Backend documentation
│
├── src/                       # Complete React Native Application Source Code
│   ├── assets/                # Static assets (fonts, icons, images, logo, vendors)
│   ├── components/            # UI components (buttons, cards, inputs, common, feedback, otp, ui)
│   ├── screens/               # Screen routing & exports (auth, home, profile, settings)
│   ├── navigation/            # Navigation stacks, drawer navigators, and guards
│   ├── services/              # Real backend API services, storage, audio, maps, push
│   ├── hooks/                 # Custom reusable hooks (useAuth, useTheme)
│   ├── store/                 # State management & global auth context
│   ├── context/               # Application contexts (e.g., AlertContext)
│   ├── utils/                 # Data formatting, masking, and helpers
│   ├── constants/             # Global constants and runtime definitions
│   ├── config/                # Centralized environment configuration
│   ├── theme/                 # Theme tokens (colors, typography, spacing, elevation)
│   ├── types/                 # TypeScript type definitions and interfaces
│   └── validators/            # Input & form validation rules
│
├── __tests__/                 # Unit & Integration test suites
├── App.tsx                    # Root mobile application entry component
├── index.js                   # React Native CLI entry point
├── app.json                   # Application metadata
├── package.json               # Mobile dependencies & root scripts
├── package-lock.json          # Locked dependency tree
├── tsconfig.json              # TypeScript configuration
├── metro.config.js            # Metro bundler configuration
├── babel.config.js            # Babel configuration
├── jest.config.js             # Jest test configuration
├── react-native.config.js     # React Native CLI configuration
│
├── screenshots/               # Visual QA, flow captures & UI test dumps
├── docs/                      # Architectural specs, API contracts & workflows (26 guides)
├── .env                       # Local environment configuration
├── .env.example               # Environment configuration template
├── .gitignore                 # Production git ignore rules
├── AGENT.md                   # Permanent engineering guidelines (Mandatory reading)
├── CHANGELOG.md               # Repository history & changelog
└── README.md                  # Project documentation
```

---

## 🚀 Quick Start Guide

### 📱 React Native Mobile Application (Root)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the Metro Bundler**:
   ```bash
   npm start
   ```

3. **Launch on connected Android device / emulator**:
   ```bash
   npm run android
   ```

4. **Run TypeScript typecheck**:
   ```bash
   npm run typecheck
   ```

5. **Run Unit & Integration Tests**:
   ```bash
   npm test
   ```

6. **Assemble Debug APK**:
   ```bash
   npm run build:apk
   ```

---

### 🖥️ Backend Server (`backend/`)

1. **Run the Node.js FCM Push Notification Backend Server**:
   ```bash
   npm run backend:start
   ```
   *Or development mode:*
   ```bash
   npm run backend:dev
   ```

2. **Run backend test suite**:
   ```bash
   npm run backend:test
   ```

---

## 🔒 Engineering Guidelines & Mandatory Rules

See [`AGENT.md`](./AGENT.md) for mandatory rules:
1. **Root-Level React Native**: The mobile app resides directly at the root. No `frontend/` folder.
2. **Backend Separation**: The backend service remains an independent project in `backend/`.
3. **Real Backend Data Only**: **NO HARDCODING — NO MOCK DATA — NO DUMP DATA**.
4. **Permanent Workflow Protection**: Zero non-approved modifications to business workflows, screens, navigation, or database configurations.
