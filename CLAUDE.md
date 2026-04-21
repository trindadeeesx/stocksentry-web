# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

StockSentry frontend — real-time stock monitoring dashboard for Meiliy Cosméticos. Single admin user (store owner). Backend is a running Spring Boot API at `http://localhost:8080`. Goal: demo with live alerts and real product data.

## Commands

```bash
# Scaffold (first time only — project not yet created)
ng new stocksentry-web --routing --style=scss --standalone

# Dev server
ng serve                  # http://localhost:4200

# Build
ng build                  # dev
ng build --configuration production

# Tests
ng test                   # watch mode
ng test --watch=false --browsers=ChromeHeadless   # single run

# Lint
ng lint

# Generate
ng generate component features/dashboard/dashboard --standalone
ng generate service core/services/auth
ng generate guard core/guards/auth --functional
ng generate pipe shared/pipes/br-date --standalone
```

## Architecture

Angular standalone components (no NgModules). State via **Angular Signals** — use `signal()` / `computed()` / `effect()` over `BehaviorSubject`. RxJS only where HttpClient observables require it (use `toSignal()` to bridge).

```
src/app/
  core/
    guards/         authGuard (CanActivateFn) — checks localStorage token
    interceptors/   authInterceptor (adds Bearer header), errorInterceptor (401 → /login)
    models/         TypeScript interfaces only — no classes
    services/       one service per domain: auth, product, alert, sync, push
  features/         lazy-loaded standalone components (loadComponent in routes)
    login/
    dashboard/
    products/       includes product-min-stock-dialog/
    alerts/
    settings/
  shared/
    components/     status-badge, alert-card, product-table, confirm-dialog
    pipes/          brDate (ISO → pt-BR), stockStatus
src/styles/
  _variables.scss   CSS custom properties (see below)
  _reset.scss
  _typography.scss
  styles.scss       global imports
public/sw.js        Web Push service worker (must be at root)
```

Data flow: services call HttpClient → return `Observable<T>` → components convert with `toSignal()` → template reads signals directly.

## Backend API

**Base URL:** `http://localhost:8080` — set in `environment.ts` as `apiUrl`.

**Auth:** JWT Bearer token stored at `localStorage.getItem('stocksentry_token')`. All endpoints require it except `GET /api/v1/push/vapid-key`.

```
POST /api/v1/auth/login              → { token, email, role }
GET  /api/v1/auth/me                 → { id, name, email, role }

GET  /api/v1/products?page=0&size=20&sort=name,asc  → Page<ProductResponse>
GET  /api/v1/products/critical       → ProductResponse[]
GET  /api/v1/products/out-of-stock   → ProductResponse[]
PATCH /api/v1/products/{id}/min-stock  Body: { minStock: number }

GET  /api/v1/alerts/config           → AlertConfigResponse[]
POST /api/v1/alerts/config           Body: { type: 'EMAIL'|'PUSH', destination }
DELETE /api/v1/alerts/config/{id}
GET  /api/v1/alerts/history?page=0&size=20  → Page<AlertResponse>
POST /api/v1/alerts/report?days=7

POST /api/v1/sync/now
GET  /api/v1/sync/status             → { lastSyncAt, lastCreated, lastUpdated, lastCritical, lastRecovered }

GET  /api/v1/push/vapid-key          → { publicKey }   (no auth)
POST /api/v1/push/subscribe          Body: { endpoint, p256dh, auth, deviceName }
DELETE /api/v1/push/subscribe?endpoint=...
```

Spring pagination response shape: `{ content: T[], totalElements, totalPages, number, size }`.

## Key constraints

- **No Tailwind, no Bootstrap** — plain SCSS with CSS custom properties
- **No Axios** — Angular HttpClient only
- Prefer `signal()` over `BehaviorSubject`
- All components are standalone
- Routes use `loadComponent` (lazy loading) — see routes pattern in spec

## Stock status logic

- `currentStock === 0` → `🚫 Zerado` (dark red badge)
- `currentStock < minStock` → `⚠️ Crítico` (red badge)
- otherwise → `✅ Normal` (green badge)

The `critical` boolean from the API mirrors `currentStock < minStock`.

## Dashboard polling

Refresh dashboard data every 5 minutes:
```typescript
interval(300_000).pipe(startWith(0), switchMap(() => this.syncService.getStatus()))
```

## Push notifications

`public/sw.js` must be served from root. Push only works on HTTPS in production (localhost exempt). The service worker handles `push` and `notificationclick` events. `push.service.ts` fetches the VAPID public key (unauthenticated), registers the SW, subscribes via `pushManager.subscribe`, then POSTs subscription details to the backend.

## SCSS variables

Defined as CSS custom properties in `src/styles/_variables.scss` under `:root`. Key colors: `--color-primary: #2d3748`, `--color-danger: #e53e3e`, `--color-warning: #dd6b20`, `--color-success: #38a169`, `--color-bg: #f7fafc`, `--color-surface: #ffffff`. Spacing scale: `--spacing-xs` (4px) through `--spacing-xl` (32px). Border radii: `--radius-sm/md/lg`.

## Date formatting

Backend returns ISO 8601. Use `BrDatePipe` (`brDate` pipe, standalone) to format as `dd/MM/yyyy HH:mm` using `toLocaleString('pt-BR')`.
