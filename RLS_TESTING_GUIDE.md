# RLS Testing Guide (Option A)

Now that basic RLS policies are applied, perform a quick test round with the empty database.

## 1. Seed Minimal Test Data (Recommended)

Run the existing seed script for realistic data:

```bash
node seed-test-data.js
```

This will insert 10 participants + some check-ins and game data.

**Alternative (minimal):** Use the 4 test users from previous SQL if you want to keep it very small.

## 2. Test Participant Flows (via the app on Vercel)

Test these as a normal user (using seeded accounts or by registering new ones):

- [ ] **Registration**
  - Register a brand new user from the app.
  - Verify the new row appears in `participants` table (via Supabase Table Editor).
  - Password should be hashed.

- [ ] **Login**
  - Log in with a seeded user or the newly registered user.
  - Should reach the dashboard without issues.

- [ ] **Check-in**
  - Perform check-ins at various CPs (e.g., START, CP2, FINISH).
  - Verify rows appear in `checkins` table.
  - Test that you cannot check in twice at the same CP (app logic + DB).

- [ ] **Eye for Detail (CP2)**
  - Submit answers for the game.
  - Verify row appears in `game_answers` with correct score.

- [ ] **Finish Questionnaire**
  - Submit the finish questionnaire.
  - Verify row in `game_answers`.
  - Confirm it is marked as final (no re-submit).

## 3. Test Admin Flows

Log in as Admin (use your current PIN):

- [ ] View participants, checkins, game answers in the various tabs.
- [ ] Update **Manual Scores** for a team.
  - Verify update in `manual_scores` table.
- [ ] Update **Jerrican** status for a team (start, penalties, finish).
  - Verify in `jerrican_carry` table.
- [ ] Check Leaderboard updates based on new data.

## 4. Negative Tests (Verify RLS is working)

These confirm that the anon role cannot do what it shouldn't:

- Try to insert directly into `manual_scores` or `jerrican_carry` using the anon key (you can test this via Supabase SQL Editor by setting role to anon, or just confirm via the app that admin features require the PIN and go through server routes).

- Attempt to register or submit data while simulating anon-only access (the app should still work because it goes through server routes).

## 5. Cleanup After Testing

Once testing is complete:

```bash
node cleanup-database.js
```

Then run the RLS policy recreation SQL (the scripts we built earlier) to re-apply the light RLS policies.

## Notes

- Since the database was empty, any errors during testing are likely due to RLS policy restrictions or missing server-side route updates.
- If a flow that should work (e.g., registration) fails, note the exact error.
- Admin actions should continue to work because they use the service_role key via the API routes.

Report back with:
- Which flows worked.
- Any errors encountered.
- Screenshots or exact error messages if possible.

Then we will move to Option B (tightening policies) and C.
