# CycleOps — Go Live Deployment Guide

**Event Date:** 30 May 2026  
**Status:** Ready for Production

---

## 1. Pre-Deployment Checklist

Before deploying, complete these steps:

- [ ] Change the Admin PIN in `src/app/page.jsx` (search for `ADMIN_PIN`)
- [ ] Clean the Supabase database (delete all test data)
- [ ] Test the full flow with real participant data in a staging environment
- [ ] Verify `.env.local` has correct production Supabase keys
- [ ] Decide on custom domain (optional but recommended)

---

## 2. Environment Variables

### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important:** These must be set in your hosting platform (Vercel, etc.).

### How to Get Them

1. Go to your Supabase project dashboard
2. Go to **Project Settings → API**
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Recommended Deployment (Vercel)

This is the fastest and most reliable way for Next.js.

### Steps:

1. **Push your code to GitHub** (if not already)
2. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Add New Project"**
4. Import your `CycleOps` repository
5. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Deploy**

After deployment:
- Vercel will give you a `*.vercel.app` URL
- You can add a custom domain in the project settings later

---

## 4. Supabase Production Notes

### For This Event (Recommended Settings)

Because this is a **one-day internal event**, the following setup is acceptable:

- Row Level Security (RLS) can remain **disabled** on the tables during the event.
- The anon key is used for all writes (this is by design for simplicity).

### After the Event (Security Hardening)

Once the event is over, you should:
1. Enable RLS on all tables
2. Create proper policies
3. Consider moving to Supabase Auth + service role key for admin actions

---

## 5. Post-Deployment Verification

After deploying, test these flows:

1. **Registration**
   - Create a new participant
   - Confirm they receive an Access Code
   - Confirm they can log in with Access Code + Password

2. **Eye for Detail (CP2)**
   - Complete the 15-question form
   - Verify score is saved (30 marks max)

3. **Jerrican Tracking (Admin)**
   - Start a carry for a team
   - Add penalties
   - Mark as finished
   - Verify it appears correctly in the leaderboard

4. **Manual Scoring (Admin)**
   - Enter Rapid Fire scores
   - Enter Finish Questionnaire scores (the 3 questions)
   - Verify totals update in the leaderboard

---

## 6. Important Reminders

- The **Admin PIN** is currently set to `"arun"`. Change this before the real event.
- All data is stored in Supabase. Make sure you have a backup/export plan after the event.
- The app is designed as a **single-day event tool**. It is not built for long-term multi-event use.

---

## 7. Support & Rollback

If something goes wrong on event day:

- You can quickly redeploy from Vercel dashboard (takes ~1-2 minutes)
- All data lives in Supabase — nothing is lost on redeploy
- The "Refresh from DB" button in Admin can help recover state

---

**You are ready to Go Live.**

When you're ready, push the latest code to GitHub and deploy to Vercel following the steps above. 

Good luck with the event on 30 May 2026! 🏁