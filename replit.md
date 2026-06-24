# PayrollPro

A production-ready SaaS platform for employers to create payslips and invoices, generate PDFs, and verify documents via QR codes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/payroll-pro run dev` — run the frontend (port 25275, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Demo credentials

- Email: `admin@payrollpro.com`
- Password: `demo1234`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + TanStack Query + Wouter + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in localStorage as `payrollpro_token`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (users, companies, employees, payslips, invoices, audit-logs)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, companies, employees, payslips, invoices, verify, dashboard, audit-logs)
- `artifacts/payroll-pro/src/` — React frontend (pages, components, hooks)
- `lib/api-client-react/src/generated/` — generated React Query hooks (DO NOT edit manually)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation

## Architecture decisions

- JWT auth stored in localStorage; custom-fetch.ts auto-injects Bearer token for all API calls
- Verification tokens (UUIDs) are generated on payslip/invoice creation and embedded in a public `/verify/:token` route (no auth required)
- PDF generation is simulated — the "Generate PDF" action sets pdfUrl to `/api/{resource}/{id}/pdf` and marks status as "generated"
- Dashboard aggregates (summary, payroll trend, invoice trend) are computed in-memory from DB data — suitable for small datasets
- Numeric values stored as `numeric(12,2)` in Postgres, returned as JavaScript numbers after parseFloat

## Product

- Employer login/register
- Company management (logo, registration/tax details)
- Employee CRUD (departments, designation, salary, bank details)
- Payslip creation with automatic gross/net salary calculation (allowances + deductions)
- Invoice creation with dynamic line items (auto-calc subtotal, tax, total)
- PDF generation + email dispatch actions per payslip/invoice
- QR verification: public `/verify/:token` page shows document validity
- Dashboard with charts (monthly payroll trend, invoice trend), summary stats, recent activity
- Audit log tracking all create/update/delete/email actions

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always re-run `pnpm --filter @workspace/api-spec run codegen` before building
- Numeric DB columns (numeric type) come back as strings from Drizzle — always `parseFloat()` them before returning from routes
- The `requireAuth` middleware in `auth.ts` is imported by all protected routes; `/verify/:token` is intentionally public (no `requireAuth`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
