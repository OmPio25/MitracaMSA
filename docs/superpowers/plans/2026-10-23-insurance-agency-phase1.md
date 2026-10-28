# Insurance Agency Management - Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core database schema, authentication system, and a resilient Excel ingestion pipeline for Agent, Production, and Claim data.

**Architecture:** A Next.js App Router application using Drizzle ORM for PostgreSQL. The ingestion pipeline uses a server-side streaming parser with batch insertions and a "self-healing" logic for agent hierarchies and auto-provisioning of master data.

**Tech Stack:** Next.js 14+, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, Shadcn UI, exceljs, NextAuth.js.

**Spec:** Based on the user request and brainstorming alignment (October 23, 2026).

## Global Constraints
- Performance: Use Server Components and minimal bundle overhead.
- Data Integrity: Money values must be `DECIMAL(18, 2)`.
- Resilience: Process tens of thousands of rows without crashing (streaming/batching).
- Security: RBAC with 7 distinct roles; data filtering by `branch_id` and agent hierarchy.
- Flexibility: Excel column mapping must be based on header names, not indices.

## Review Focus
- **Hierarchy Loop:** What happens if Agent A is upline of B, and B is upline of A? (Expected: Detected as error or handled via hierarchy depth).
- **Missing Upline:** Ensure `PENDING_UPLINE` status is correctly assigned and automatically resolved upon upline upload.
- **Placeholder Agents:** Verify that `UNREGISTERED_IN_MASTER` agents are created when Production/Claim data arrives first.
- **Large File Performance:** Verify that 50k+ row files do not cause memory leaks or timeout (use streaming).
- **RBAC Leakage:** Ensure a `KACAB` cannot access data from another `branch_id`.

---

## File Structure
- `src/db/schema.ts`: All Drizzle table definitions.
- `src/db/index.ts`: DB connection and client.
- `src/lib/auth.ts`: NextAuth configuration and RBAC helpers.
- `src/lib/excel-parser.ts`: Core logic for flexible column mapping and streaming.
- `src/services/ingestion-service.ts`: Business logic for self-healing and auto-provisioning.
- `src/app/api/upload/[type]/route.ts`: API endpoints for the 3 upload types.
- `src/app/upload/page.tsx`: Main upload dashboard.
- `src/app/upload/history/page.tsx`: Batch monitoring and warning viewer.
- `src/components/upload-card.tsx`: Reusable upload component with progress tracking.

---

## Tasks

### Task 1: Database Schema & Migration
**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Test: `tests/db/schema.test.ts`

**Interfaces:**
- Produces: Database tables `users`, `branches`, `agents`, `productions`, `claims`, `upload_batches`, `upload_errors`.

- [ ] **Step 1: Define Drizzle schemas for all 7 tables** including `JSONB` for `object_details` and `DECIMAL` for money.
- [ ] **Step 2: Implement indices** on `agent_code`, `upline_agent_code`, `branch_id`, `policy_no`, `claim_no`.
- [ ] **Step 3: Run migrations** to apply schema to PostgreSQL.
- [ ] **Step 4: Verify schema** by inserting a test record into each table.
- [ ] **Step 5: Commit**

### Task 2: Authentication & RBAC Setup
**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/db/schema.ts` (Add role enum)
- Create: `src/db/seed.ts`

**Interfaces:**
- Consumes: `users` table from Task 1.
- Produces: `getSession()`, `getServerSession()`, `checkRole(role)` helpers.

- [ ] **Step 1: Setup NextAuth.js** with JWT strategy.
- [ ] **Step 2: Implement RBAC middleware** to protect routes based on the 7 roles.
- [ ] **Step 3: Create seed script** for Superadmin and a test Agent account.
- [ ] **Step 4: Run seed script** and verify login.
- [ ] **Step 5: Commit**

### Task 3: Flexible Excel Parser Engine
**Files:**
- Create: `src/lib/excel-parser.ts`
- Test: `tests/lib/excel-parser.test.ts`

**Interfaces:**
- Consumes: Excel file buffers.
- Produces: `parseExcel(file, mappingConfig) -> AsyncGenerator<RowData>`

- [ ] **Step 1: Implement header-based mapping logic** that identifies column indices by name.
- [ ] **Step 2: Integrate `exceljs` streaming reader** to handle large files without loading everything into RAM.
- [ ] **Step 3: Implement data sanitization** (dates, currency strings to numbers).
- [ ] **Step 4: Verify parser** with a sample file containing shuffled columns.
- [ ] **Step 5: Commit**

### Task 4: Ingestion Service (Business Logic)
**Files:**
- Create: `src/services/ingestion-service.ts`
- Test: `tests/services/ingestion.test.ts`

**Interfaces:**
- Consumes: `parseExcel` from Task 3.
- Produces: `processAgentUpload()`, `processProductionUpload()`, `processClaimUpload()`.

- [ ] **Step 1: Implement `processAgentUpload`** with `PENDING_UPLINE` logic and Upsert.
- [ ] **Step 2: Implement `processProductionUpload`** with auto-provisioning of agents (`UNREGISTERED_IN_MASTER`) and branches.
- [ ] **Step 3: Implement `processClaimUpload`** with similar auto-provisioning and Upsert on `Claim No`.
- [ ] **Step 4: Implement `upload_batches` and `upload_errors` logging** for every run.
- [ ] **Step 5: Implement the "Self-Healing" trigger** (function to resolve `PENDING_UPLINE` agents).
- [ ] **Step 6: Verify end-to-end flow** with files containing missing uplines and unknown agents.
- [ ] **Step 7: Commit**

### Task 5: Upload UI & Monitoring Dashboard
**Files:**
- Create: `src/app/upload/page.tsx`
- Create: `src/components/upload-card.tsx`
- Create: `src/app/api/upload/[type]/route.ts`
- Create: `src/app/upload/history/page.tsx`

**Interfaces:**
- Consumes: `ingestion-service.ts` via API.
- Produces: Web interface for uploading and monitoring.

- [ ] **Step 1: Build the Upload Dashboard** with 3 cards (Agent, Production, Claim) using Shadcn UI.
- [ ] **Step 2: Implement API routes** for file upload and integration with the service.
- [ ] **Step 3: Add progress bars and success/fail summaries** on the upload cards.
- [ ] **Step 4: Build the Upload History table** showing `upload_batches`.
- [ ] **Step 5: Implement the Warning Viewer** (Drawer/Modal) to show `upload_errors` for a selected batch.
- [ ] **Step 6: Verify full flow** from upload to viewing warnings in the UI.
- [ ] **Step 7: Commit**
