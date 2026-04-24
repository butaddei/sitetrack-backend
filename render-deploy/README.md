# SiteTrack API — Render Deploy Package

This is a self-contained deploy package for Render.com.
All dependencies are bundled — no `npm install` required for runtime.

## Render Web Service Settings

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm run start` |
| Node Version | 20+ |

## Environment Variables (set in Render Dashboard)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Render PostgreSQL External Database URL |
| `SESSION_SECRET` | Any long random string (JWT signing key) |
| `PORT` | Set automatically by Render |
| `NODE_ENV` | `production` |

## Database

The server automatically creates all tables on first startup.
No manual migration needed — just set `DATABASE_URL` and start.
