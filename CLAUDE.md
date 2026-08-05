# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Genius Attestation** — a Next.js 15 TypeScript web application for document attestation workflow management. It is a multi-tenant SaaS-style CRM supporting role-based access, office-to-office document tracking, lead management, attendance, leave, and salary modules.

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: MySQL via Prisma ORM
- **Auth**: NextAuth.js v5 (Credentials + Google providers)
- **Styling**: Tailwind CSS v4
- **Storage**: Wasabi S3-compatible object storage (via AWS SDK v3)
- **Deployment**: Docker (multi-stage standalone) or Nixpacks (Railway/Render)

## Essential Commands

```bash
# Development
npm run dev                # Start Next.js dev server (localhost:3000)

# Build & Production
npm run build              # Prisma generate + Next.js production build
npm start                  # Start the production server
npm run lint               # Run ESLint (next lint)

# Prisma / Database
npx prisma studio          # Open Prisma Studio GUI (localhost:5555)
npx prisma generate        # Regenerate Prisma client
npx prisma migrate dev     # Run a new migration
npx prisma db push         # Push schema changes to DB (used in Docker entrypoint)

# Container
docker build -t genius-app . && docker run -p 3000:3000 genius-app
```

> **Note**: `npm run build` runs `prisma generate` then `next build`. The Docker/Nixpacks entrypoints also run `prisma db push` at container start to sync schema.

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Main Prisma schema (User, Lead, Registration, OfficeLocation, etc.)
│   ├── agency_models.prisma   # Separate schema for AssignedAgency models (not in schema.prisma)
│   └── migrations/
├── src/
│   ├── app/                    # Next.js App Router — API routes + pages
│   │   ├── api/<resource>/route.ts   # RESTful API handlers
│   │   ├── dashboard/...             # Dashboard page routes (all under /dashboard/)
│   │   ├── login/                    # Login page
│   │   ├── register/                 # Registration page
│   │   └── layout.tsx                # Root layout (SessionProvider + globals.css)
│   ├── auth.config.ts              # Auth middleware config (redirect rules, path protection)
│   ├── components/
│   │   ├── common/              # Reusable primitives (FileUpload, FilePreviewModal, etc.)
│   │   ├── shared/              # Shared layout components (Navbar, Sidebar, Guards)
│   │   └── ui/                  # UI components (Button, Input, DataTable, FormDrawer, etc.)
│   ├── config/                  # Application constants (env, process-types)
│   ├── features/                # Feature-based modules (see below)
│   │   └── <module>/{ components, server, types, validations, hooks, actions }
│   ├── lib/
│   │   ├── auth.ts              # NextAuth handlers, JWT/session callbacks, getCurrentUser
│   │   ├── prisma.ts            # PrismaClient singleton (global re-use in dev)
│   │   ├── data-scope.ts        # Row-level data scope filtering based on RBAC permissions
│   │   ├── office-location.ts   # Office location resolution helpers
│   │   ├── wasabi.ts            # S3 client config
│   │   └── logger.ts            # Structured error logging
│   ├── middleware/
│   │   └── auth.middleware.ts   # Server-side auth utilities (requireAuth, requirePermission, requireApiPermission)
│   ├── providers/               # React context providers
│   ├── services/storage/        # File storage (upload, delete, signed URLs, views)
│   ├── types/                   # Global type declarations (next-auth session extensions)
│   └── utils/                   # Utility functions (format, response, days-calculator)
├── .env.local                 # Local environment (database, auth, Wasabi keys)
├── .env.example               # Required environment variables
├── Dockerfile                 # Multi-stage production build
├── docker-entrypoint.sh       # Container entrypoint (prisma db push + start)
├── next.config.ts             # Next.js config (standalone output, image domains)
├── tsconfig.json              # TypeScript config (path alias @/* → ./src/*)
└── postcss.config.mjs         # PostCSS config (Tailwind CSS v4 with @tailwindcss/postcss)
```

### Feature Module Structure

Each feature under `src/features/<module>/` follows a consistent pattern:

```
features/<module>/
├── components/        # React components (pages use server components; forms are often client)
├── server/            # Server-side logic: <module>.service.ts with Prisma queries
├── types/             # TypeScript types for the feature
├── validations/       # Zod schemas for input validation
├── hooks/             # Client-side React hooks (optional)
├── actions/           # React Server Actions (optional)
├── data/              # Static data/config (permission catalog, role defaults, navigation)
└── validaions/        # Zod schemas
```

## Key Architecture

### Authentication & RBAC

- **Auth**: `src/lib/auth.ts` configures NextAuth with Credentials (email+password, bcrypt) and optionally Google (Super Admin only). The JWT callback enriches the session with RBAC data by calling `getSessionAccess()` which fetches role + permissions from the database.
- **Three user types**: Regular `User` (DB), `AssignedOffice` (credentials login, limited RBAC permissions), and `AssignedAgency`. The auth flow checks all three tables when resolving a credentials login.
- **Session data**: Extends `Session["user"]` with `role`, `roles`, `permissions`, `permissionScopes`, `isSuperAdmin`, `ownerAdminId`, `officeLocationId`, `isAssignedOffice`, `isLocked`, etc. (see `src/types/next-auth.d.ts`).

### Authorization Middleware

`src/middleware/auth.middleware.ts` provides server-side auth guards:

| Function | Purpose |
|---|---|
| `requireAuth(callbackUrl)` | Cached; redirects unauthenticated users to login. Also checks follow-up lock state. |
| `requirePermission(permission, callbackUrl)` | Cached; checks RBAC permission, redirects AssignedOffice users to their workspace. Returns `null` if denied. |
| `requireApiPermission(permission)` | For API routes; returns JSON error responses (401, 403, 423 locked) on failure. |
| `requireAnyApiPermission(permissions[])` | Same as above but accepts any of multiple permissions. |
| `requireApiAuth()` | Throws on missing auth (use in try/catch). |

### RBAC System

`src/features/admin/` implements a full RBAC system:

- **Permission catalog** (`rbac.data.ts`): Defines `permissionModules`, `sidebarNavigation`, `permissionActions`, and `defaultRoleDefinitions` (Super Admin, Admin, Manager, Staff, Sales, Operations).
- **Data scoping** (`src/lib/data-scope.ts`): `buildDataScopeFilter()` generates Prisma `where` clauses based on permission scope (`All`, `Own`, `Created`, `Assigned`, `Reporting Staff`, `Department`, `Office`, `Process Office`, `Team`).
- **Bootstrap** (`rbac.service.ts`): `ensureRbacBootstrap()` auto-creates permission rows from the catalog; `ensureAdminRoles()` creates default roles with permissions for a given `ownerAdminId`.
- **Session access** (`getSessionAccess()`): Fetches role + permissions for the current user, resolves `isSuperAdmin` (owner or role name "Super Admin").

### Data Ownership

Multi-tenancy is enforced via `ownerAdminId` on most tables. The owner admin is either an explicitly set `ownerAdminId` on the user record, or the user's own `id` (self-owned). All queries should filter by `ownerAdminId`. The `ownerAdminId` resolves to `session.user.ownerAdminId ?? session.user.id`.

### API Route Pattern

API routes follow a consistent pattern:

```typescript
// src/app/api/<resource>/route.ts
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    // Use requireApiPermission(permission) for protected routes
    // const authError = await requireApiPermission("<module.action>");
    // if (authError) return authError;

    // Business logic from feature service
    const data = await someFeatureService.someAction(ownerAdminId, params);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to ...", error);
    return jsonError("Unable to ...", 500);
  }
}
```

Use `jsonOk(data, status)` and `jsonError(message, status)` from `src/utils/response.ts` for consistent API responses.

### Document Bundle Workflow

Documents flow through a **bundle** system:

- Bundles group multiple documents; each has a tracking number and moves between offices.
- `DocumentMovement` tracks the current/to/from office with a status (`Received`, `Document In Hand`, `HOME`, `Completed`, `In Transfer`, etc.).
- Document retrieval and transfers are confirmed via dedicated API routes (e.g., `document-movement/retrieve`, `document-movement/send`).
- The home dashboard (`features/home/`) manages in-hand documents, bundles, and the confirmation UI for receiving/sending documents between offices.

### Frontend Patterns

- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin with `postcss.config.mjs`. Global CSS in `src/styles/globals.css` with CSS custom properties for theming (light/dark).
- **Client components**: Use `"use client"` directive. Most interactive forms and tables are client components.
- **Shared components**: `src/components/ui/` contains reusable UI primitives. `src/components/shared/` has layout components (`Navbar`, `Sidebar`, `AppSidebar`, `AttendanceGuard`, `FollowupReminderProvider`).
- **Feature components** live within each feature's `components/` directory.

## Environment Variables

```
DATABASE_URL             MySQL connection string
AUTH_SECRET / NEXTAUTH_SECRET  Random secret for session signing
AUTH_URL / NEXTAUTH_URL      Base URL (http://localhost:3000)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET  Google OAuth (optional, Super Admin only)
WASABI_REGION / WASABI_BUCKET / WASABI_ENDPOINT / WASABI_ACCESS_KEY / WASABI_SECRET_KEY  / WASABI_ROOT_PREFIX / WASABI_PUBLIC_URL  File storage
STORAGE_DRIVER               "wasabi"
```

See `.env.example` for a template.

## Prisma Schema

The main schema is in `prisma/schema.prisma`. There is an additional file `prisma/agency_models.prisma` with `AssignedAgency` and `AssignedAgencyPackage` models that uses `processTypeId` referencing `ProcessType`. Note that `agency_models.prisma` is **not** imported by `schema.prisma` — the auth code in `src/lib/auth.ts` references these models via `(prisma as any)` casts, so the Prisma client may need regeneration if these models are modified.
