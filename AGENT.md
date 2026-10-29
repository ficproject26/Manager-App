# AGENT.md — Engineering & Operational Guidelines

> **CRITICAL MANDATE**: Any AI agent or developer MUST read this file in full before starting any new coding task, refactoring, bug fix, or feature implementation.

---

## 1. Permanent Workflow Protection Rules

1. **Zero Destructive Changes**:
   - **Never** change any existing application workflow, business logic, UI behavior, navigation, authentication, or API functionality without explicit user instruction.
   - **Never** delete, rename, move, or overwrite existing files without explicit user approval.
   - Always inspect the existing project structure first. Create only genuinely missing folders or files.
   - Do not perform unrelated refactoring, code formatting sweeps, or gratuitous architectural redesigns.

2. **Root Application & Backend Boundary Protection**:
   - The React Native mobile application lives directly at the root of `Manager App/`.
   - **Do not create a `frontend/` folder.**
   - The backend service lives in its own dedicated, separate root folder: `backend/`.
   - **Never** move backend code into `src/` or the root mobile application.
   - **Never** modify backend server scripts, database configuration, database schemas, or existing database records unless explicitly instructed as a backend-focused task.
   - All network and API communications must strictly live within the mobile app's `src/services/` layer.

3. **Native Configuration Preservation**:
   - Preserve existing Android native configuration in `android/` and iOS configuration in `ios/`.
   - Do not alter Gradle files, Android manifests, or native build scripts unless specifically required for native library linking.

4. **Dependency Hygiene**:
   - Do not install unnecessary packages. Always verify if an existing dependency (e.g., `react-native-vector-icons`, `react-native-reanimated`) fulfills the requirement.

---

## 2. Mandatory Data Rules

> **STRICT RULE: NO HARDCODING — NO MOCK DATA — NO DUMP DATA — REAL BACKEND DATA ONLY.**

- **No Dummy Records**: Never introduce dummy vendors, products, customers, orders, tasks, issues, categories, or metrics in components or state.
- **No Mock Responses**: Do not stub API calls with hardcoded dummy arrays or fake objects in production code paths.
- **Dynamic Data Integrity**: All dynamic data presented to the user must originate from real backend API endpoints or repositories.
- **Graceful States**: If backend data is unavailable, loading, or an error occurs:
  - Render designated loading indicators (`FICLoadingState`).
  - Render empty state components (`FICEmptyState`) when lists are empty.
  - Render error components (`FICErrorState`) when requests fail.
- Never invent placeholder configurations or dummy business logic merely to fill folder structures or interfaces.

---

## 3. Environment & Configuration Rules

- Environment variables must be read via `src/config/` and `src/constants/env.ts` referencing `.env`.
- Never hardcode IP addresses, port numbers, URLs, credentials, tokens, or secrets anywhere in source code.

---

## 4. Standard Mobile Application Directory Structure

The project strictly follows the root-level React Native CLI structure with an isolated `backend/`:

```text
Manager App/
├── android/                   # Native Android Gradle configuration
├── ios/                       # Native iOS project directory
├── backend/                   # Independent Backend Notification & Scoping Server
├── src/
│   ├── assets/                # Static assets
│   │   ├── fonts/             # Custom typography and font assets
│   │   ├── icons/             # Custom icon assets
│   │   ├── images/            # Static image assets
│   │   ├── logo/              # Brand and application logos
│   │   └── vendors/           # Vendor image assets
│   ├── components/            # Reusable UI components
│   │   ├── buttons/           # Button components (FICButton, FICIconButton, etc.)
│   │   ├── cards/             # Card components (FICCard, etc.)
│   │   ├── common/            # Headers, badges, dividers, avatars, modals
│   │   ├── feedback/          # Empty, error, and loading state indicators
│   │   ├── inputs/            # Text inputs, dropdowns, upload modals
│   │   ├── otp/               # OTP verification components
│   │   └── ui/                # Base UI components
│   ├── screens/               # Screen routing and exports
│   │   ├── auth/              # Authentication screens (Login, Register, Forgot Password)
│   │   ├── home/              # Home / Dashboard screens
│   │   ├── profile/           # Manager profile screens
│   │   └── settings/          # Application settings screens
│   ├── navigation/            # Navigation stacks, drawer navigators, and guards
│   ├── services/              # API clients, repositories, audio, camera, push services
│   ├── hooks/                 # Reusable custom React hooks
│   ├── context/               # Global React contexts (AlertContext, etc.)
│   ├── store/                 # State management / AuthContext
│   ├── utils/                 # Utility helpers (masking, formatting, etc.)
│   ├── constants/             # Application constants and configuration values
│   ├── config/                # Centralized environment and runtime configurations
│   ├── theme/                 # Design tokens (colors, typography, spacing, elevation)
│   ├── types/                 # TypeScript interfaces and type definitions
│   └── validators/            # Input validation and business validation rules
├── __tests__/                 # Automated Jest test suites
├── App.tsx                    # Mobile root component
├── index.js                   # React Native entry point
├── app.json                   # Application metadata
├── package.json               # Mobile dependencies & scripts
├── package-lock.json          # Locked dependency tree
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
├── metro.config.js            # Metro bundler configuration
├── jest.config.js             # Jest test configuration
├── .env                       # Local environment variables
├── .env.example               # Environment variables template
├── .gitignore                 # Root git ignore rules
├── AGENT.md                   # Engineering guidelines (Must read before any task)
├── CHANGELOG.md               # Repository changelog
└── README.md                  # Project documentation
```

---

## 5. Mandatory Regression Testing

Before concluding any task:
1. **TypeScript Typecheck**:
   ```bash
   npm run typecheck
   ```
   Must pass with zero type errors (`tsc --noEmit` exit code 0).
2. **Build Integrity**:
   Verify that Metro bundler resolves all paths properly and no missing import breaks execution.

---

## 6. Shared Backend Integration & Synchronization Specifications

### 6.1 Authoritative Backend Environment
- **Authoritative Shared Backend Base URL**: `http://3.110.88.42:8005/api`
- **Realtime WebSocket Bus**: `ws://3.110.88.42:8005/ws?token=<JWT>`
- **Realtime Event Polling Fallback**: `http://3.110.88.42:8005/api/realtime/events?since=<timestamp>&token=<JWT>`
- **Manager Website Location (Read-Only Reference)**: `D:\Connect App Project\Website\Manager`

### 6.2 Verified Route Map
| Module | Backend Endpoint | HTTP Method |
| :--- | :--- | :--- |
| Auth Login | `/api/auth/login` | POST (`{ identifier, password }`) |
| Auth Send OTP | `/api/auth/send-otp` | POST (`{ mobile }`) |
| Auth Verify OTP | `/api/auth/verify-otp` | POST (`{ mobile, otp }`) |
| Auth Current Session | `/api/auth/me` | GET (Bearer Token) |
| Tasks List | `/api/qc-tasks/tasks` | GET (Scoped by territory/manager) |
| Task Status Update | `/api/qc-tasks/tasks/:id/status` | PATCH (`{ status, notes }`) |
| Issues List | `/api/issues` | GET (Scoped by territory) |
| Issue Status Update | `/api/issues/:id/status` | PATCH (`{ status, resolutionText }`) |
| Agent Operations | `/api/operations/agents` | GET |
| Manager Directory | `/api/managers` | GET (Subordinate hierarchy) |
| Dashboard Metrics | `/api/reports/dashboard` | GET |
| Leaderboard | `/api/reports/leaderboard` | GET (`?period=day|week|month`) |
| Report Submit | `/api/reports/submit` | POST |
| Report History | `/api/reports/submitted` | GET |
| Notifications List | `/api/notifications` | GET |
| Notifications Mark All | `/api/notifications/mark-all-read` | POST |
| Shop Visits | `/api/shop-visits` | POST / GET |

### 6.3 Exact Files Modified for Backend Integration
1. `src/constants/env.ts`: `apiBaseUrl` set to `http://3.110.88.42:8005/api`, `useMockData: false`.
2. `.env`: `API_BASE_URL=http://3.110.88.42:8005/api`, `SOCKET_URL=ws://3.110.88.42:8005/ws`.
3. `.env.example`: Aligned configuration template.
4. `src/services/api/ApiClient.ts`: Cleaned fallback URLs, supported backend data envelope unpacking (`tasks`, `vendors`, `user`, `stats`).
5. `src/services/auth/HttpAuthService.ts`: Real login with `{ identifier, password }`, profile fetch from `/auth/me`, OTP login support, zero mock fallback.
6. `src/services/auth/AuthService.ts`: Added optional `sendOtp` and `verifyOtp` signatures to `IAuthService`.
7. `src/store/AuthContext.tsx`: Wired real `sendOtp` and `verifyOtp` to application authentication context.
8. `src/features/auth/LoginScreen.tsx`: Replaced dummy OTP generation with real backend `sendOtp` and `verifyOtp`.
9. `src/services/repositories/http/HttpTaskRepository.ts`: Routed calls to `/qc-tasks/tasks`.
10. `src/services/repositories/http/HttpIssueRepository.ts`: Routed updates to `/issues/:id/status`.
11. `src/services/repositories/http/HttpAgentRepository.ts`: Routed queries to `/operations/agents`.
12. `src/services/repositories/http/HttpManagerRepository.ts`: Routed queries to `/managers`.
13. `src/services/repositories/http/HttpDashboardRepository.ts`: Routed queries to `/reports/dashboard`, removed `MockDashboardRepository` fallback.
14. `src/services/repositories/http/HttpLeaderboardRepository.ts`: Routed queries to `/reports/leaderboard`.
15. `src/services/repositories/http/HttpDailyReportRepository.ts`: Routed submissions and history to `/reports/submit` and `/reports/submitted`.
16. `src/services/repositories/http/HttpNotificationRepository.ts`: Routed mark-all-read to `/notifications/mark-all-read`.
17. `src/services/repositories/http/HttpVendorRepository.ts`: Routed shop visits to `/shop-visits`.
18. `src/services/repositories/http/HttpActivityRepository.ts`: Routed activity feeds to `/audit-logs` and `/reports/submitted`.
19. `src/services/uploads/HttpMediaUploadService.ts`: Routed storefront photo uploads to `/uploads/photo`.
20. `src/services/realtime/SocketService.ts`: Native WebSocket client connected to `ws://3.110.88.42:8005/ws` with polling fallback to `/api/realtime/events`.

### 6.4 Regression Test Results
- `npm run typecheck`: **PASSED** (0 errors, exit code 0).
- Backend Endpoint Connectivity: **CONFIRMED** (`http://3.110.88.42:8005/api` active and responsive).
- Website & Backend Code Integrity: **100% UNTOUCHED** (0 files modified in `Website/Manager`).
