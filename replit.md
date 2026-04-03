# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a mobile app for a painting/construction business.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (available but not used by mobile - uses AsyncStorage)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) + Expo Router

## Artifacts

### PaintPro Manager (mobile)
- **Directory**: `artifacts/mobile/`
- **Type**: Expo mobile app
- **Purpose**: Painting/construction business management app

#### Features
- **Authentication**: Role-based (Admin and Employee) using AsyncStorage
- **Admin role**: Full access to projects, employees, timesheets, expenses, reports, dashboard
- **Employee role**: View assigned projects, clock in/out, view work log
- **Projects**: Create, edit, delete projects; assign employees; track status
- **Employees**: Manage crew with hourly rates; track on-site status
- **Time Tracking**: Clock in/out per project; automatic time calculation; labor cost tracking
- **Finances**: Auto labor cost from time logs; manual expense entries; profit/margin reporting
- **Reports**: Per-project financial breakdown; per-employee hours and labor cost

#### Demo Accounts
- Admin: `admin@paintpro.com` / `admin123`
- Employee: `carlos@paintpro.com` / `carlos123`
- Employee: `james@paintpro.com` / `james123`
- Employee: `sofia@paintpro.com` / `sofia123`

#### Key Files
- `context/AuthContext.tsx` — login/logout/role management
- `context/DataContext.tsx` — all app data (projects, employees, time logs, expenses) + AsyncStorage
- `app/(tabs)/` — all tab screens (Dashboard, Projects, Employees, Timesheets, Reports, Work Log)
- `app/project/[id].tsx` — project detail screen with tabs
- `app/login.tsx` — login screen
- `constants/colors.ts` — design tokens (navy + orange theme)
- `components/` — reusable UI components

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
