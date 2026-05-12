# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


Project Context: Transportes GM ERP
1. Overview
A comprehensive Logistics Management System (ERP) for a transportation company in Mexico. The system features a public Landing Page and a secure, authenticated Control Panel for daily operations.

2. Tech Stack
Frontend: React with Vite.

Styling: Tailwind CSS, Shadcn UI, and Framer Motion for animations.

Backend/Database: Supabase (PostgreSQL, Auth, Edge Functions).

AI Auditor: Google Gemini 2.5 Flash integrated via Supabase Edge Functions.

Hosting: Vercel.

3. Implemented Modules
Control Panel: Real-time monitoring of key metrics like Cost per KM, Fuel Efficiency (km/L), total trips, and diesel consumption.

Loading Program: Weekly trip scheduling and management (Monday to Saturday).

Catalog Management: Centralized control for Clients, Drivers (including commission percentages), Trucks, and Trailers.

Trip Registry: Detailed tracking of routes (outbound, additional stops, return), mileage, diesel liters, and toll costs.

Logistics Expert (AI): An advanced chatbot that analyzes operational data to detect anomalies and generate comparative reports.

4. Current Business Rules
Data Archiving: To maintain high performance, the system only processes and displays active data registered after April 24, 2026.

Commission Logic:

FULL Trips: Fixed payment of 15% of the gross freight.

Single Trips: Payment based on the driver's specific porcentaje_base (standard is 16%).

Payroll Cycle (Payment Cut-off):

Payday: Every Saturday.

Settlement Range: Saturday of the previous week through Friday of the current week.

Delayed Payment: Trips scheduled on the actual payday (Saturday) are automatically moved to the following week's settlement.

5. Next Steps
Settlement Module: Finalize Liquidaciones.jsx to automate the calculation: (Commissions + Driver Expenses) - Weekly Advances.

PDF Generation: Automate professional settlement receipts based on the company's existing physical format.

Compliance Tracking: Implement expiration alerts for driver licenses and vehicle documentation.

6. Key Data Structures
Viaje: Real fuel consumption and toll data.

viajes_registrados: Trip planning linked to the Loading Program and Clients.

Conductor: Driver profiles including porcentaje_base for payroll calculations.

Liquidaciones: Historical record of completed settlements and payments.


## Commands

All commands run from the `transportes-gm/` directory.

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

Environment variables required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack**: React 18 + Vite, Tailwind CSS, shadcn/ui (Radix UI primitives), React Router DOM v7, Supabase (auth + database), TanStack Query v5, Recharts, date-fns, jsPDF, Lucide icons.

### Two-zone routing

The app has two distinct zones defined in [`src/pages/index.jsx`](src/pages/index.jsx):

- **Public zone** (`/`, `/home`, `/unidades`, `/login`): renders without the sidebar shell.
- **Protected zone** (everything else): wrapped in `<ProtectedRoute>`, which checks `supabase.auth.getSession()` and redirects to `/login` if unauthenticated.

[`src/pages/Layout.jsx`](src/pages/Layout.jsx) decides whether to render the sidebar by checking if `currentPageName` is in `systemPages`. Public routes pass `children` through directly with no shell.

### Data layer

All database access goes through the single Supabase client exported from [`src/supabaseClient.js`](src/supabaseClient.js). Data fetching in pages uses **TanStack Query** (`useQuery` / `useMutation`) directly against Supabase tables (`Viaje`, `Conductor`, `Camion`, `Remolque`, `Cliente`, etc.).

The files in `src/api/` (`base44Client.js`, `entities.js`, `integrations.js`) are **legacy stubs from the original base44 scaffold** and are no longer used — all logic is in Supabase.

### Path alias

`@/` maps to `src/` (configured in `jsconfig.json` and Vite). Use `@/` imports throughout.

### Page navigation

Use `createPageUrl(pageName)` from `@/utils` to generate route paths (lowercases the name). The router resolves the current page by matching the last URL segment case-insensitively against the `PAGES` map in `index.jsx`.

### Key domain constants

`FECHA_LIMITE_ARCHIVO = '2026-04-24'` — used in `ControlCombustible` and `ExpertoLogistica` to exclude archived trips from queries. Update this date when archiving old data.

### AI pages

`IAAuditorChat` and `ExpertoLogistica` are chat interfaces that query Supabase for context and call an LLM API. Both include an inline `MarkdownMessage` renderer for formatting model responses.

### PDF export

`Liquidaciones` uses `jsPDF` + `jspdf-autotable` for weekly driver settlement PDFs. The `Liquidaciones` page also uses `useMutation` to persist settlement records to Supabase.

### UI components

`src/components/ui/` contains shadcn/ui components — do not modify these manually; regenerate via the shadcn CLI if needed. Domain-specific components live in `src/components/fuel/`.
