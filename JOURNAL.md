# JOURNAL.md — Decision Journal

## 1) Prioritization

- **Build order (what first, and why):**
  - Built P0 end-to-end first: submit form → DB save → dashboard list → approve/reject → public wall (this is the main test flow).
  - After P0 worked locally, added P1 widget (`/widget.js`) because it’s the next most “product” thing.
  - Then attempted P2 AI (Gemini summary + sentiment) because it’s optional but shows extra value.

- **What I skipped/cut (and why):**
  - P2 is not working properly due to gemini api issue.
  - Auth/login: brief says unprotected dashboard is fine.
  - Multi-business/team support: out of scope.
  - Payments/billing/email notifications: out of scope.
  - Proper image hosting (S3/Supabase Storage): stored uploads on backend disk for speed (good for local, fragile for deploy).
  - Fancy pagination/infinite scroll: only added limit/offset for widget.

## 2) Key decisions (3–6)

### Decision 1 — DB choice
- **Decision:** Use Supabase Postgres + `pg`.
- **Options:** SQLite (`better-sqlite3`), local Postgres, Supabase.
- **Why:** On Windows, `better-sqlite3` required build tools and failed. Supabase is hosted and “real DB” with minimal setup.

### Decision 2 — Moderation model
- **Decision:** Store `status` on each testimonial (`pending/approved/rejected`).
- **Options:** Separate tables, soft-delete, only store approved.
- **Why:** Simple moderation logic and easy queries. Rejected never appear on public endpoints.

### Decision 3 — Widget embed approach
- **Decision:** `<script>` tag widget served by backend at `/widget.js`.
- **Options:** iframe embed.
- **Why:** Script embed is flexible, easier to style/customize (accent/layout) and doesn’t require iframe sizing.

### Decision 4 — Validation
- **Decision:** Use Zod validation on the backend; require testimonial min length.
- **Options:** Frontend-only validation, looser backend rules.
- **Why:** Backend validation prevents junk/empty data. (Noted: it initially caused “Invalid input” confusion until I surfaced field errors.)

### Decision 5 — AI feature
- **Decision:** Add “Run AI” in dashboard to generate `ai_summary` and `ai_sentiment`.
- **Options:** Auto-run on submit, tagging, spam detection.
- **Why:** Keeps AI optional + visible in product. Doesn’t block normal flow.

## 3) Working with AI agents

- **Tools/models used (and for what):**
  - ChatGPT (web) for scaffolding routes/components, widget script, and debugging steps.

- **How I split the work (agent vs me):**
  - Agent: generated initial Express routes, React pages, widget code, and deployment checklist.
  - Me: wired file structure, ran commands, fixed environment/config issues, tested endpoints, handled deploy errors.

- **Agent setup files (if any):**
  - None (no Cursor/Cline rules files used).

- **My 3–5 most important prompts (paste + note):**
  1. “Go with `<script>` tag for widget.”
     - Worked: got a self-contained widget with customization.
  2. “Switch to Postgres / Supabase and give code.”
     - Worked: unblocked Windows native build issues.
  3. “Give code for AI feature on dashboard + backend route.”
     - Worked: gave a straightforward P2 implementation.

- **At least one time AI was wrong (what happened, what I changed):**
  - AI suggested using Gemini model `gemini-1.5-flash` and it returned 404 for my API key/version.
  - I fixed it by switching to `gemini-1.0-pro` and but still giving error

- **Something I rejected or rewrote heavily (and why):**
  - Initial SQLite approach: rejected due to `better-sqlite3` build/tooling friction on Windows.
  - Also tightened deployment plan: backend on Render + frontend on Vercel (instead of forcing Express onto Vercel serverless).

## 4) Verification

- **How I verified it works (specific clicks/tests):**
  - Local P0:
    - Submit testimonial on `/submit`
    - Confirm appears in `/dashboard` as pending
    - Approve and confirm it appears on `/wall`
    - Rejected ones never show on `/wall`
  - API checks:
    - `GET /health`
    - `GET /api/public/testimonials?limit=...`
  - Widget:
    - Confirm `GET /widget.js` returns JS (fixed missing file issue)
    - Served `demo/embed.html` and confirmed it renders approved testimonials
  - Deploy checks:
    - Confirm frontend calls backend URL (fixed “Unexpected token <” caused by wrong API base)

- **What’s still broken/fragile:**
  - P2 is not working properly due to gemini api issue.
  - CORS is wide open for simplicity.
  - Dashboard has no auth (intentional per brief).
  - Error handling could be more user-friendly (some endpoints initially returned generic errors).

## 5) If I had 5 more hours

1. Move photo uploads to Supabase Storage (or disable on deploy and document clearly).
2. Add “Load more” in widget using offset + basic pagination on wall page.
3. Add duplicate/junk detection (simple hash of email+testimonial, rate limit).
4. Complete the p2 without api issue from gemini.
5. Add better UI states + show backend validation field errors cleanly.