# TaskForge

# TaskForge (Monorepo)

Production-quality Kanban app built to showcase full-stack engineering with a legacy frontend (AngularJS) + modern backend (Node/Express, Socket.IO), real-time collaboration, testing, and CI/CD.

## Structure

- `apps/client` — AngularJS 1.7+ SPA (component-based, UI-Router), built with Webpack (Milestone 5+)
- `apps/server` — Node/Express API + Socket.IO (Milestone 2+)

## Getting Started

1. Node 20 (see `.nvmrc`)
2. Install deps:
   - `npm install`
3. Lint and format check:
   - `npm run lint`
   - `npm run format:check`
4. Tests (placeholder for now):
   - `npm test`

Tooling:

- ESLint + Prettier
- Husky + lint-staged
- Conventional Commits (commitlint)
- GitHub Actions CI (lint + format check + tests)
