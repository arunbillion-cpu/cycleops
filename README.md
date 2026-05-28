# CycleOps — Tactical Endurance Event Manager

**Event Date:** 30 May 2026

A specialized event management tool for a 40km tactical cycling endurance event with custom scoring, real-time tracking, and admin tools.

## Quick Start (Development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Go Live / Deployment

See the full deployment guide:

→ **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Vercel Deployment
1. Push code to GitHub
2. Import repo at [vercel.com](https://vercel.com)
3. Add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Important Before Event Day

- Change the Admin PIN in `src/app/page.jsx`
- Clean all test data from Supabase
- Test the complete flow with real participants
- Verify Access Code + Password login works

## Tech Stack

- Next.js 16 (App Router + Turbopack)
- Supabase (PostgreSQL + real-time)
- Custom participant auth (Access Code + Password)

## Documentation

- [AMENDED_EVENT_PLAN.md](./AMENDED_EVENT_PLAN.md) — Full event rules and scoring
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment guide
- [supabase_schema_updates.sql](./supabase_schema_updates.sql) — Database schema

---

**Status:** Ready for Production Deployment

Good luck with the event! 🏁