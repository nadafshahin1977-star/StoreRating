# StoreRate

StoreRate is a full-stack store rating platform with one sign-in experience and three role-based workspaces:

- **System Administrator** — monitors platform totals, manages users and stores, assigns store owners, and inspects user details.
- **Normal User** — creates an account, browses stores, and submits or updates one 1–5 star rating per store.
- **Store Owner** — views the store's live average rating, rating mix, and the users who rated the store.

## Project layout

This repository uses a pnpm monorepo layout:

- `artifacts/api-server` — Express REST API, auth middleware, role permissions, validation, and seed script.
- `artifacts/store-rate` — React + Vite web application with role-aware routing and responsive UI.
- `lib/db` — Drizzle ORM schema with embedded PostgreSQL (PGlite) & PostgreSQL client support.
- `lib/api-spec/openapi.yaml` — source-of-truth API contract.
- `lib/api-client-react` and `lib/api-zod` — generated typed client hooks and validation schemas.

## Quick Start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Seed demo data (creates admin, store owner, and member accounts):

   ```bash
   pnpm run seed
   ```

   The seed creates:

   | Role | Email | Password |
   | :--- | :--- | :--- |
   | **Admin** | `admin@storerate.local` | `StoreRate!26` |
   | **Store Owner** | `owner@storerate.local` | `StoreOwner!26` |
   | **Normal User** | `member@storerate.local` | `MemberUser!26` |

3. Start the application:

   - **Full-Stack Production App (Port 5000)**:
     ```bash
     pnpm run start
     ```
   - **Development Mode with Hot Reload (Port 3000)**:
     ```bash
     pnpm run dev
     ```

## Architecture

The API is contract-first. `lib/api-spec/openapi.yaml` defines request bodies, role-protected routes, pagination, sorting, and response models. Orval generates both the React Query hooks used by the frontend and the Zod schemas used by the API:

```bash
pnpm --filter @workspace/api-spec run codegen
```

The backend uses Express 5 and Drizzle ORM over PostgreSQL. Passwords are hashed with bcryptjs and sessions are signed JWTs. Every protected request verifies the token, loads the current user, and then applies role middleware. Responses use a consistent `{ success, data, message }` envelope; the shared fetch client unwraps successful `data` payloads for generated hooks.

The data model is normalized:

- `users` stores account details and role.
- `stores` stores directory information and an optional Store Owner foreign key.
- `ratings` stores one rating per user/store pair using a unique constraint. Store averages and counts are calculated with SQL aggregation rather than denormalized fields.

## API routes

### Authentication

- `POST /api/auth/signup` — create a Normal User account.
- `POST /api/auth/login` — sign in and receive a JWT.
- `GET /api/auth/me` — get the current user.
- `POST /api/auth/change-password` — change the current password.

### Administrator

- `GET /api/admin/summary`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/users/:id`
- `GET /api/admin/stores`
- `POST /api/admin/stores`

Admin listings support pagination, search, filters, and ascending/descending sorting.

### Store browsing and ratings

- `GET /api/stores` — Normal User store directory with community and personal ratings.
- `POST /api/ratings` — create or update a Normal User's rating for a store.

### Store Owner

- `GET /api/owner/dashboard` — store summary, live average, rating mix source data, and rater activity.

### Profile

- `GET /api/users/profile` — current profile for settings and account surfaces.

## Validation and security

- Names are 20–60 characters.
- Addresses are limited to 400 characters.
- Passwords are 8–16 characters and require an uppercase letter plus a special character.
- Email addresses are validated and normalized to lowercase.
- Request bodies and query parameters are validated with generated Zod schemas plus server-side password/email rules.
- Password hashes are never returned.
- Admin, Normal User, and Store Owner routes reject unauthorized roles with HTTP 403.
- CORS is enabled for local development and bearer tokens are only sent in the `Authorization` header.

## Checks

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/store-rate run build
```