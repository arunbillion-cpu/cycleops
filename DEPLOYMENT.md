# CycleOps — Vercel + Supabase Deployment Guide

**Current Status (May 2026):**  
The application has undergone major cleanup. 
- Access Code login has been removed.
- Authentication is now **Name + Team + Self-set Password**.
- The Finish Point Questionnaire is now built directly into the app (no separate Google Form needed).
- All database writes have been standardized to use snake_case payloads.

---

## 1. Pre-Vercel Checklist (Do This First)

Before connecting to Vercel, complete these steps:

- [ ] Finish local testing with realistic data (highly recommended)
- [ ] Change the Admin PIN in `src/app/page.jsx` (currently set to `"arun"`)
- [ ] Verify your Supabase project is the correct one (the fresh project you created)
- [ ] Confirm you only have the two required Supabase keys ready
- [ ] Push the latest code to GitHub

---

## 2. Environment Variables (Only These Two Are Needed)

You must set **only** these two variables in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

### Critical Warning – Environment Variables

**Only** set these two variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Never** use Vercel’s one-click “Connect to Supabase” integration. It will automatically inject 10+ Postgres-related variables (POSTGRES_URL, etc.). This has caused major problems in the past.

We only need the two `NEXT_PUBLIC_SUPABASE_*` variables because the app uses the official `@supabase/supabase-js` client on the client side.

---

## 3. Safe Deployment Workflow (Recommended)

Because the database connection has historically been the most fragile part of this project, follow this order:

1. Finish solid local testing first (with simulated users).
2. Push the latest code to GitHub.
3. Connect / redeploy on Vercel.
4. Add **only** the two Supabase variables above in Vercel (Production + Preview).
5. Deploy to a **Preview** environment first.
6. Test thoroughly on the Preview URL.
7. Only promote to Production once you are confident.

---

## 4. How to Add Environment Variables in Vercel (Critical Step)

**Only add these two variables.** Do not add anything else.

1. Go to your Vercel project dashboard.
2. Click **Settings** (top menu) → **Environment Variables**.
3. Click **Add New**.
4. Add the following **exactly**:

   | Name                              | Value                                      | Environments          |
   |-----------------------------------|--------------------------------------------|-----------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`        | Your Supabase Project URL                  | Production + Preview  |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Your Supabase anon / publishable key       | Production + Preview  |

5. **Important**: After adding the variables, go to the **Deployments** tab and click **Redeploy** on the latest deployment (do **not** just push code — you must trigger a new build so the env vars are picked up).

**Common Mistake to Avoid**: Do **not** use Vercel’s “Connect Supabase” integration. It will inject many unnecessary Postgres variables and has caused problems before. Only add the two variables listed above manually.

---

## 5. Supabase Settings for This Event

- Row Level Security (RLS) is currently disabled on all tables (acceptable for a single-day internal military event).
- All reads and writes use the anon key.
- After the event you can enable RLS + add policies if you wish to reuse the project.

---

## 6. Post-Deployment Testing Checklist

After going live on Vercel, verify these flows:

- [ ] Registration works (Name + Team + Password)
- [ ] Login works with Name + Password
- [ ] Check-ins at SP, CP1, CP2, CP3, Finish
- [ ] Eye for Detail submission (per person)
- [ ] Finish Questionnaire submission (per person)
- [ ] Admin can start Jerrican, add penalties, and mark teams as finished
- [ ] Admin can enter Rapid Fire and Finish Questionnaire marks
- [ ] Leaderboard shows correct scores and rankings

---

## 7. If Something Breaks

- Check the Vercel deployment logs
- Double-check that only the two Supabase keys are set (no extra Postgres vars)
- Use the **Refresh from DB** button in the Admin panel
- You can redeploy from Vercel in ~1-2 minutes

---

**Current Recommendation**

We are now ready for Vercel from a documentation and configuration standpoint.

Next steps I recommend:
1. (Optional but strongly advised) Run the local test simulation with 8–10 users first.
2. Push the latest code to GitHub.
3. Connect the repo to Vercel.
4. Add only the two Supabase environment variables (as described in section 4).
5. Deploy to Preview first and test thoroughly.

Ready when you are. Just say the word and I’ll walk you through the exact Vercel steps.