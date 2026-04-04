# Workspace

## Overview

pnpm workspace monorepo using TypeScript. PaintPro is a multi-tenant SaaS mobile app for painting business field & project management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) + Expo Router

## Artifacts

### API Server
- **Directory**: `artifacts/api-server/`
- **Port**: 8080
- **Auth**: bcryptjs (rounds=12) + jsonwebtoken (30d expiry, `SESSION_SECRET`)
- **Multi-tenant**: All queries scoped to `companyId` for isolation
- **Routes**: `auth`, `users`, `projects`, `timesheets`, `expenses`, `notes`, `company`

### PaintPro Manager (mobile)
- **Directory**: `artifacts/mobile/`
- **Type**: Expo mobile app
- **Purpose**: Painting/construction business management SaaS

#### Features
- **Authentication**: JWT-based with role RBAC (Admin / Employee)
- **Multi-tenant**: Each company is isolated; company branding (colors, logo) applied across app
- **Admin role**: Dashboard, projects (with financials), employees, timesheets, reports, company settings
- **Employee role**: Home (assigned jobs), projects, clock-in/out worklog, notes, profile
- **Role guards**: All 5 admin tab screens redirect employees to emp-home
- **Avatar upload**: Profile settings with expo-image-picker (stored as base64 dataURL)
- **Logo upload**: Company settings with expo-image-picker
- **Auth screens**: Premium dark-gradient login & register with animated entrance, icon-prefixed inputs, trust badges, demo account quick-fill
- **Billing screen**: Plans & Billing UI (Free/Pro/Business) with usage stats; upgrade buttons show "Coming soon" modal. `STRIPE_ENABLED=false` flag in `billing.tsx` — flip to activate.
- **Color presets**: 12 named color themes in company settings with live preview

#### Design System
- **Auth screens**: `LinearGradient` dark navy background, white floating card with 24px radius + shadow
- **Profile / Settings screens**: `LinearGradient` hero header with avatar/logo + white card body
- **InputField**: Focus-aware border (primary color when focused, label also changes color)
- **PrimaryButton**: `LinearGradient` fill with shadow (elevation 4)
- **Color palette**: `constants/colors.ts` — navy (`#0f172a`) + orange (`#f97316`) default, dynamic per company
- **Image picker**: `expo-image-picker` (already installed) used in profile-settings and company-settings

#### Demo Accounts
- Admin: `admin@paintpro.com` / `admin123`
- Employee: `carlos@paintpro.com` / `employee123`
- Employee: `james@paintpro.com` / `employee123`
- Employee: `sofia@paintpro.com` / `employee123`

#### Key Files
- `context/AuthContext.tsx` — AuthUser type (includes avatarUrl, logoUrl, primaryColor, secondaryColor)
- `context/DataContext.tsx` — all app data via API calls
- `context/ThemeContext.tsx` — company primaryColor/secondaryColor from auth user
- `hooks/useColors.ts` — dynamic palette override from company branding
- `app/(tabs)/` — all tab screens
- `app/login.tsx`, `app/register.tsx`, `app/forgot-password.tsx` — auth screens
- `app/profile-settings.tsx` — avatar upload, profile edit, password change
- `app/(tabs)/company-settings.tsx` — logo upload, color preset picker, company name
- `components/InputField.tsx` — focus-state aware input
- `components/PrimaryButton.tsx` — gradient button with shadow

#### Security
- JWT auth on all API routes (401 if missing/invalid)
- Employee RBAC (403 on admin-only endpoints)
- Cross-company isolation verified via companyId scoping on all DB reads/writes
- Financial fields (totalValue, clientName, laborCost) stripped from employee API responses
- 5 admin frontend screens have role guards (redirect employees to emp-home)

## Stripe Billing (T001–T007)

**Status**: Pending credentials — Replit Stripe connector was dismissed. Billing will be wired via direct API keys stored as secrets.

**Required secrets** (not yet set):
- `STRIPE_SECRET_KEY` — from Stripe dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard → Webhooks (after creating endpoint)

**Plans**: Free ($0) · Pro ($29/mo) · Business ($79/mo)

**Mobile stub**: `artifacts/mobile/app/(tabs)/billing.tsx` has `STRIPE_ENABLED = false` — flip to `true` once wired.

**Do NOT use `proposeIntegration` for Stripe** — user dismissed the OAuth flow. Use `STRIPE_SECRET_KEY` secret directly in `artifacts/api-server/`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run Expo dev server
