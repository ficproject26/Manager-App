# Changelog

All notable changes to the FIC Manager Application repository will be documented in this file.

---

## [1.2.0] - Shared Backend Integration & Synchronization

### Added
- Authoritative backend integration pointing to shared Manager Website backend at `http://3.110.88.42:8005/api`.
- Native React Native WebSocket client on `ws://3.110.88.42:8005/ws` with polling fallback to `/api/realtime/events`.
- Real phone OTP generation and verification through `POST /api/auth/send-otp` and `POST /api/auth/verify-otp`.
- Real authenticated session resolution through `GET /api/auth/me`.

### Changed
- Re-routed all repository HTTP client calls to match live backend endpoints:
  - Tasks: `/api/qc-tasks/tasks` (list, detail, create, status, suspend)
  - Issues: `/api/issues` and `/api/issues/:id/status`
  - Agents: `/api/operations/agents` and `/api/operations/agents/hierarchy`
  - Managers: `/api/managers` and `/api/managers/:id`
  - Reports & Dashboard: `/api/reports/dashboard`, `/api/reports/leaderboard`, `/api/reports/submit`, `/api/reports/submitted`
  - Notifications: `/api/notifications/mark-all-read` (POST)
  - Shop Visits: `/api/shop-visits` (POST/GET)
  - Audits: `/api/audit-logs`
  - Media Uploads: `/api/uploads/photo`
- Removed all inline mock data fallbacks, fake manager generation, and silent mock repository delegates across all feature paths.
- Updated `ENV.apiBaseUrl` in `src/constants/env.ts` and `.env` to `http://3.110.88.42:8005/api`.

### Preserved
- **Protected Website**: `D:\Connect App Project\Website\Manager` remains 100% untouched.
- **Backend Integrity**: Shared server code, database configuration, and schemas untouched.
- **Root RN Structure**: Kept root-level React Native CLI structure.

---

## [1.1.0] - Standard Root Structure Migration

### Added
- Standard React Native CLI root-level directory layout:
  - `android/` and `ios/` native project roots.
  - `src/` modular source hierarchy containing `assets/` (`fonts/`, `icons/`, `images/`, `logo/`, `vendors/`), `components/` (`buttons/`, `cards/`, `common/`, `inputs/`, `feedback/`, `otp/`, `ui/`), `screens/` (`auth/`, `home/`, `profile/`, `settings/`), `navigation/`, `services/`, `hooks/`, `context/`, `store/`, `utils/`, `constants/`, `config/`, `theme/`, `types/`, and `validators/`.
  - `__tests__/` unit and integration test suites.
  - Root entry points: `App.tsx` and `index.js`.
  - Root tooling configurations: `tsconfig.json`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `react-native.config.js`, `app.json`.
- Root master `package.json` with direct React Native execution scripts (`npm start`, `npm run android`, `npm run typecheck`, `npm test`) and backend delegation scripts (`npm run backend:start`, `npm run backend:dev`, `npm run backend:test`).
- Permanent engineering guidelines in `AGENT.md`.

### Changed
- Dissolved the `frontend/` subdirectory wrapper. The React Native mobile application now lives directly at the root.
- Consolidated mobile and root `.gitignore` rules with iOS build paths.

### Preserved
- **Backend Isolation**: `backend/` remains completely separate with its own server, tests, and configuration.
- **Workflow Protection**: 100% preservation of existing business workflows, feature modules, authentication guards, and API integrations.
- **Zero Mock Data**: Strict enforcement of real backend data usage; no dummy records or fallback mock datasets.
