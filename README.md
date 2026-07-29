# Testimonial Platform (React + Express + Supabase Postgres)

Small testimonial platform where customers submit testimonials, businesses moderate them, and approved testimonials appear on a public wall + an embeddable `<script>` widget.

## Features

### P0 (core flow)
- Public submission form: name, email, company, testimonial text, star rating, optional photo
- Express API + Supabase Postgres persistence
- Moderation dashboard (unprotected): list + approve/reject
- Public wall page: shows **approved only**

### P1
- Embeddable widget via `<script src=".../widget.js">` that renders approved testimonials on a third-party site
- Simple widget customization via `data-*` (accent, layout, limit, title)

### P2 (optional, if enabled)
- “Run AI” on a testimonial to generate `ai_summary` + `ai_sentiment` (Gemini)

---

## Tech Stack
- Frontend: React (Vite), React Router
- Backend: Node.js, Express
- DB: Supabase Postgres (via `pg`)
- Uploads: stored on backend filesystem (`/uploads`) for local dev

---

## Project Structure
- `client/` – React app
- `server/` – Express API + widget (`/widget.js`)
- `demo/` – plain HTML page for widget demo (`embed.html`)

---

## Local Setup

### 1) Supabase DB setup
Create table in Supabase SQL Editor:

```sql
create table if not exists public.testimonials (
  id bigserial primary key,
  name text not null,
  email text not null,
  company text not null,
  testimonial text not null,
  rating int not null check (rating between 1 and 5),
  photo_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_testimonials_status_created
on public.testimonials (status, created_at desc);