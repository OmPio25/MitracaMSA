---
name: code-security-audit
description: >-
  Use this skill when the user asks to run a security audit, check for
  vulnerabilities, pentest the codebase, find security holes, audit API
  endpoints, check for authentication issues, review authorization logic,
  scan for secrets/credentials leaks, or any task related to code security
  review and hardening. This skill runs a full White-Box Security Audit
  pipeline using local open-source tools (semgrep, npm audit, gitleaks) and
  the agent's own AI analysis — no external API key required. It covers OWASP
  Top 10 for Next.js / TypeScript / Drizzle ORM / PostgreSQL stacks and
  produces a prioritized vulnerability report with auto-patch recommendations.
---

# Code Security Audit & Auto-Hardening Skill

This skill runs a **multi-layer security assessment** of the codebase using:
1. **Static Analysis (SAST)** via `semgrep` and `npm audit`
2. **Secret & Credential Leak Detection** via `gitleaks` or `trufflehog`
3. **AI-Powered White-Box Review** using the agent's own reasoning engine
4. **Auto-Patching** — the agent directly applies fixes to vulnerable files

No external API key or token is required. All tools run locally.

---

## Stack Context (MitracaMSA)

- **Framework:** Next.js 14 (App Router) + TypeScript
- **ORM:** Drizzle ORM → PostgreSQL
- **Auth:** `jose` (JWT) + `bcryptjs`
- **Validation:** `zod`
- **Key Attack Surfaces:** API Routes (`src/app/api/**`), Middleware (`src/middleware.ts`), DB Queries (Drizzle), File Uploads, Auth Flow

---

## Phase 1 — Environment Setup

Before running, verify required tools are available. Run the setup script:

```bash
bash .agents/skills/code-security-audit/scripts/setup-tools.sh
```

This script will:
- Check if `semgrep`, `gitleaks`, and `npm` are installed
- Install any missing tools automatically (via `pip`, `brew`, or direct binary)
- Confirm the environment is ready

---

## Phase 2 — Automated Scanner Execution

Run all scanners in sequence using the main audit script:

```bash
bash .agents/skills/code-security-audit/scripts/run-audit.sh
```

This will generate result files in `.agents/skills/code-security-audit/results/`:
- `semgrep-report.json` — SAST findings
- `npm-audit.json` — dependency vulnerabilities
- `secrets-report.json` — leaked credentials/tokens in code or git history

---

## Phase 3 — AI White-Box Deep Review

After scanners complete, the agent performs manual code review focusing on the following **OWASP Top 10 categories** mapped to this stack:

### A01 — Broken Access Control
- [ ] Check every API route in `src/app/api/**/*.ts`: Does it validate the caller's role/ownership before returning data?
- [ ] Check `src/middleware.ts`: Are all protected routes actually covered? Any route bypass possible?
- [ ] Look for IDOR patterns: Does the API use user-supplied IDs without ownership verification?
- [ ] Check Drizzle queries: Are `.where()` clauses always filtering by authenticated user's context?

### A02 — Cryptographic Failures
- [ ] Verify passwords are hashed with `bcryptjs` (cost factor ≥ 10) — never stored in plaintext
- [ ] Check JWT (`jose`) signing: Is the algorithm explicitly set to `HS256`/`RS256`? Is the secret strong?
- [ ] Look for sensitive data (passwords, tokens, PII) in API responses that shouldn't be there
- [ ] Check if HTTPS is enforced (headers in `next.config.mjs`)

### A03 — Injection (SQL / NoSQL / Command)
- [ ] Scan all Drizzle ORM queries: Are raw SQL calls (`sql\`...\``) used? If so, are they parameterized?
- [ ] Check for any `eval()`, `Function()`, or `child_process.exec()` with user-controlled input
- [ ] Check `zod` schemas: Are all API route inputs validated before being passed to the DB?

### A04 — Insecure Design
- [ ] Check rate limiting: Are authentication endpoints (login, password reset) protected against brute force?
- [ ] Check file upload routes: Are MIME type, file size, and extension properly validated?
- [ ] Is there any mass assignment vulnerability (accepting too many fields from request body)?

### A05 — Security Misconfiguration
- [ ] Check `next.config.mjs`: Are security headers (CSP, X-Frame-Options, HSTS, etc.) configured?
- [ ] Verify `.env` files are in `.gitignore` and not committed to the repo
- [ ] Check CORS configuration: Are allowed origins restricted?
- [ ] Look for `console.log` statements that might expose stack traces or sensitive data to the client

### A06 — Vulnerable & Outdated Components
- [ ] Parse `npm-audit.json` for known CVEs in dependencies
- [ ] Flag any packages with high/critical severity and suggest safe upgrade paths

### A07 — Identification & Authentication Failures
- [ ] Check session token expiration: Are JWTs short-lived (≤ 1 hour for access tokens)?
- [ ] Is there a refresh token rotation strategy?
- [ ] Check login endpoint: Is there lockout or delay after N failed attempts?
- [ ] Are cookies set with `HttpOnly`, `Secure`, and `SameSite=Strict`?

### A08 — Software & Data Integrity Failures
- [ ] Check if `package-lock.json` is committed (ensures dependency integrity)
- [ ] Look for any dynamic `import()` or `require()` with user-controlled paths

### A09 — Security Logging & Monitoring Failures
- [ ] Check if authentication failures, access control violations, and admin actions are logged
- [ ] Ensure no sensitive data (passwords, tokens) is written to logs

### A10 — Server-Side Request Forgery (SSRF)
- [ ] Find any server-side `fetch()` / `axios` calls that use user-supplied URLs
- [ ] Check if those URLs are validated against an allowlist

---

## Phase 4 — Report Generation

After completing the AI review, produce a structured report using this format:

```
# Security Audit Report — [Project Name]
Date: [YYYY-MM-DD]
Stack: Next.js 14 / TypeScript / Drizzle ORM / PostgreSQL

## Executive Summary
[Brief overview of findings]

## Findings

### [CRITICAL/HIGH/MEDIUM/LOW] — [Vulnerability Title]
- **Category:** OWASP A0X — [Name]
- **File:** `src/path/to/file.ts` (Line XX-YY)
- **Description:** [What the vulnerability is]
- **Proof of Concept:** [Minimal code snippet showing the issue]
- **Impact:** [What an attacker could do]
- **Remediation:** [Exact fix to apply]

## Dependency Vulnerabilities
[Parsed from npm-audit.json]

## Secrets Found
[Parsed from gitleaks/trufflehog results]

## Passed Checks
[List of checks that found no issues]
```

Save the report to: `docs/security-audit-[YYYY-MM-DD].md`

---

## Phase 5 — Auto-Patching

For each confirmed vulnerability with a clear fix:

1. **State the patch:** Explain what will be changed and why
2. **Apply the fix:** Use `edit_file` to directly modify the vulnerable file
3. **Verify:** Re-read the patched section to confirm the fix is correct
4. **Document:** Add a comment `// SECURITY FIX: [brief description]` near the change

### Patch Priority Order:
1. 🔴 **Critical** — Apply immediately (exposed secrets, unauthenticated data access)
2. 🟠 **High** — Apply before next deployment (SQL injection, broken auth)
3. 🟡 **Medium** — Apply in current sprint (missing validation, weak crypto)
4. 🟢 **Low** — Document and schedule (missing headers, verbose errors)

> **Always ask the user for confirmation before patching High/Critical findings** that involve changing authentication logic, DB queries, or public API contracts.

---

## Phase 6 — Validation

After patching, run a quick validation:

```bash
# TypeScript compilation check (catches type errors introduced by patches)
npx tsc --noEmit

# Re-run semgrep on patched files to verify issues are resolved
semgrep --config=auto <patched-file-path>
```

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/sql)
- [Detailed Checklist](.agents/skills/code-security-audit/references/extended-checklist.md)
