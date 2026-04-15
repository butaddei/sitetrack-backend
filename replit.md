# Workspace

## Overview

pnpm workspace monorepo using TypeScript. SiteTrack is a multi-tenant SaaS mobile app for field service / painting business management.

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

### SiteTrack (mobile)
- **Directory**: `artifacts/mobile/`
- **Type**: Expo mobile app
- **Purpose**: Painting/construction business management SaaS

#### Features
- **Authentication**: JWT-based with role RBAC (Admin / Employee)
- **Multi-tenant**: Each company is isolated; company branding (colors, logo) applied across app
- **Admin role**: Dashboard, projects (with financials), employees, timesheets, reports, company settings
- **Employee (Subcontractor) role**: Home, My Jobs, Invoices, Notes, Profile
- **Role guards**: All admin tab screens redirect employees to emp-home
- **Avatar upload**: Profile settings with expo-image-picker (stored as base64 dataURL)
- **Logo upload**: Company settings with expo-image-picker
- **Auth screens**: Premium dark-gradient login & register with animated entrance, icon-prefixed inputs, trust badges
- **Billing screen**: Plans & Billing UI (Free/Pro/Business) with usage stats. `BILLING_ACTIVE=false` in stripeClient.ts — flip to activate.
- **Color presets**: 12 named color themes in company settings with live preview
- **Subcontractor invoicing**: Workers can fill in ABN, bank details, invoice prefix in Profile Settings. Invoices tab generates PDF invoices (expo-print + expo-sharing) for custom date periods. Full line item breakdown (date, project, hours, rate, subtotal) is persisted in DB (`lineItemsJson` column). Payment terms selector (On Receipt / Net 7 / Net 14 / Net 30) stored per invoice and shown on PDF.
- **Company invoice branding**: Admin can set company ABN, billing email, business address in Company Settings — appears on subcontractor invoices as "Bill To" section.
- **Worker home (emp-home)**: Premium card-based layout with dark gradient header (greeting + status), project card with location indicator, large timer card (gradient when working, pulse ring animation), stats row (hours today + rate), and quick-action cards (Photo / Note). All clock in/out logic preserved.

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

**Status**: Fully implemented — waiting on Stripe secrets to activate.

**Required secrets** (add in Replit Secrets panel):
- `STRIPE_SECRET_KEY` — from Stripe dashboard → Developers → API keys (use `sk_test_...` for testing)
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard → Webhooks (after creating endpoint pointing to `/api/stripe/webhook`)

**Required env vars** (add once products are created in Stripe dashboard):
- `STRIPE_PRO_PRICE_ID` — Price ID for Pro plan ($29/mo recurring)
- `STRIPE_BUSINESS_PRICE_ID` — Price ID for Business plan ($79/mo recurring)

**Plans**: Free ($0, 3 projects/3 employees) · Pro ($29/mo, 15/15) · Business ($79/mo, unlimited)

**Mobile**: `artifacts/mobile/app/billing.tsx` — full plans UI, usage stats, upgrade buttons, Stripe Checkout + portal

**API routes**:
- `GET /api/stripe/plan` — get current plan
- `POST /api/stripe/checkout` — create Stripe Checkout session
- `POST /api/stripe/portal` — open Stripe Billing Portal
- `POST /api/stripe/webhook` — Stripe webhook handler

**Plan limits enforced**: Free max 3 projects & 3 employees; Pro max 15; Business unlimited. Enforced via `checkPlanLimit()` middleware on POST /api/projects and POST /api/users.

**Webhook events handled**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**Do NOT use `proposeIntegration` for Stripe** — use `STRIPE_SECRET_KEY` secret directly in `artifacts/api-server/`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run Expo dev server
