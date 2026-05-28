# CYCLEOPS — AMENDED EVENT PLAN (30 May 2026)
**Tactical Endurance Cycling Event — Bathinda Military Station**

**Total Distance:** ~40 km  
**Date:** 30 May 2026  
**Format:** Team-based (4 teams: ALPHA, BRAVO, CHARLIE, DELTA)  
**Primary App Purpose:** Live participant tracking, check-ins, "Eye for Detail" observation game scoring, jerrican endurance timing/penalties, and admin manual score entry.  
**Goal:** Reliable live Supabase backend. No test mode. Production-ready for event day.

---

## 1. UPDATED ROUTE & DISTANCES

| Segment          | Distance | Notes |
|------------------|----------|-------|
| Start Point (SP) → CP1 | 16 km   | Refreshments + Hydration at CP1 |
| CP1 → CP2        | 6 km    | "Eye for Detail" game at CP2 (objects + landmarks) |
| CP2 → CP3        | 9 km    | Jerrican carry begins here |
| CP3 → Finish (FP)| 9 km    | Continue jerrican carry to FP |
| **Total**        | **40 km** | - |

**Checkpoints (updated labels & km markers):**
- SP (Start) — 0 km
- CP1 — 16 km (Hydration + Refreshments)
- CP2 — 22 km (Eye for Detail Observation Game)
- CP3 — 31 km (Jerrican progress / possible minor activity)
- FP (Finish) — 40 km (Finish Questionnaire + jerrican hand-in)

---

## 2. THE FOUR GAMES (Revised)

### Game A — Eye for Detail (Major Game at CP2) — 30 Marks
**Location:** CP2 (after 22 km)

**Components:**
- **5 Unique Military Objects** placed enroute (SP to CP2):
  1. Two OG-coloured jerricans (painted/marked **87** and **41**) near **Hanut Chowk**.
  2. A **Helmet** with number **41** written/painted on it, placed on a red bench at **Chetak Chowk**.
  3. **Jungle Shoes** hanging on a tree near a boarding that has a torn poster/blow-up of **OP SINDOOR**.
  4. A **Ground Sheet** near a nala junction just before **Kassiwala Gurudwara**, marked with four red cellotape counts.
  5. **White Tape Newar** shaped on a tree to display the number **41**, near an Axis Bank ATM.

- **10 Landmarks / Unique Locations** enroute (participants must observe and remember). Questions asked at CP2. One representative per team answers for the whole team.

**Question Bank (final - 15 questions × 2 marks = 30 marks total):**

**Objects (5 questions):**
- Detailed questions on the 5 objects listed above (jerricans 87/41, helmet 41, jungle shoes + OP SINDOOR poster, ground sheet with 4 red marks, white tape "41").

**Landmarks (10 questions - framed from your route reconnaissance):**
1. Prominent quote in front of a Headquarters building (4 options MCQ).  
   Correct: **"In war, resolution, in victory, magnanimity"**

2. The war memorial is being maintained by which unit?  
   **Fill-in-the-blank**. Correct: **14 GARH RIF**

3. Board on **Bahadur Bridge** showing distances (Patiala 147 km, Chandigarh 219 km). Question framed to test "An Eye for Detail".

4. First Bus Stop enroute from Start was ahead of which gate? (Three gates on route).  
   **Fill-in-the-blank**. Answer: **Somnath Sharma Gate**

5. Water theme park across national highway just ahead of **Umrao Gate**. Name?  
   **Chill-o-Thrill**

6. First fuel pump enroute is Hindustan Petroleum. There is also an Indian Oil pump. MCQ.

7. First prominent Gurudwara with green boards enroute in Bhucho Kalan? (Dera Baba Rumi Wala Gurudwara vs others).

8. **Dera Baba Dayanandji** is the only **Mandir** enroute (not a Gurudwara). Fill-in-the-blank.

9. Thermal plant with four big chimneys + two ash handling chimneys visible enroute. Name: **Guru Hargobind Sahib Thermal Plant**.

10. School of Eminence in Bhucho Kalan associated with which NCC unit? (**20 Punjab Bn NCC**).

**Scoring:** +2 marks per correct answer. One team member answers for the team. All answers stored in DB.

### Game B — Endurance & Fortitude (Jerrican Carry) — 40 Marks for Winner
**Location:** CP2 → CP3 → Finish (18 km carry)

- Each team carries **two 5 kg jerricans** from CP2 to Finish Point.
- **First team to arrive at Finish Point** with all team members + both jerricans intact, following all handling rules correctly → **40 marks**.
- Other teams awarded marks based on final standings (order of arrival).
- **Mandatory rule:** Hands must change every 2 km on the CP2→FP stretch.
- **Penalty:** Exactly **5 points** deducted for every instance where a hand-change is not undertaken.
- Additional penalties (5 pts each) for any other mistakes in handling.

### Game C — Finish Point Questionnaire — 5 Marks (Admin Manual)
**Location:** Finish Point

Three questions (exact as provided):
1. Which rider consistently dropped back during the canal leg?
2. Who gave wrong answers to eye for detail questionnaire at CP2?
3. Who do you suspect is a saboteur in your team?

Admin reviews answers and awards marks out of 5 manually per team (or per relevant participants) and enters the score in the app.

### Game D — Rapid Fire Questionnaire — 15 Marks (Manual Paper)
- Conducted on paper by organizers.
- After the event, Admin enters the four team scores (0–15) directly into the app/DB.

**CP1 and CP3:** Pure hydration and refreshments stops only. No games or scoring activities.

---

## 3. ARRIVAL TIMINGS / CHECK-IN SCORING
Retained for now (rank-based points at key points). Exact contribution to be finalised in overall scoring matrix if needed. CP1 and CP3 have no game scoring.

---

## 4. OVERALL SCORING (CONFIRMED)

- **Eye for Detail (CP2):** 30 marks (15 questions × 2 marks)
- **Jerrican Endurance & Fortitude:** 40 marks for the winning team (first to finish correctly). Other teams scored by arrival order + penalties (5 pts per hand-change violation or handling mistake).
- **Rapid Fire Questionnaire:** 15 marks (manual paper → Admin entry)
- **Finish Point Questionnaire:** 5 marks (Admin manual award based on the 3 specific questions)
- Arrival timing bonuses: To be layered on top if desired (lower priority)

**Winning condition example:** First team to complete the jerrican carry correctly at Finish gets the big 40-mark payout. Total event winner decided by cumulative score across all components + penalties.

---

## 5. PARTICIPANT REGISTRATION & AUTHENTICATION (CONFIRMED)

**New Method:**
- During registration, the cyclist sets their **own password** (any value they choose).
- The app generates and displays a short unique **Access Code** (e.g. CYC-7K9P). This is shown once and they must note it down / photograph it.
- To login later (on any phone): they enter their **Access Code + Password**.
- Phone number is still collected strictly for emergency contact list (visible only to Admin). It is **not** used for self-service login or lookup.
- This prevents other participants from accessing accounts even if they know someone's phone number.

**Implementation Notes:**
- Registration form gets a "Password" field (required).
- On successful registration: show the generated Access Code clearly + "Save this code and your password".
- Login screen changed to: Access Code + Password.
- Phone remains in DB for Admin emergency export only.

---

## 6. DATABASE REQUIREMENTS — RELIABLE LIVE CONNECTION

**Non-negotiable:**
- Remove **all** Test Mode / local-only logic.
- The app must write reliably to Supabase in production.
- Hardcoded credentials **must be removed** from source. Only use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables.
- Use the official `@supabase/supabase-js` client properly (not raw fetch in most places).
- Proper error handling, loading states, and resilience for event-day conditions (intermittent connectivity).
- Before event: organizers manually clean the database (delete all rows in participants, checkins, game_answers, etc.). No reliance on in-app "reset all" for final cleanup.

**New / Changed Tables (proposed):**
- `participants` (add `access_code`, password hash or plain for event simplicity, keep phone for emergency only)
- `checkins`
- `observation_answers` (new — for the 15 Eye for Detail questions at CP2)
- `jerrican_carry` (new — timing + penalty tracking)
- `manual_scores` (new — for Rapid Fire 15 + Finish Questionnaire 5)

---

## 7. ADMIN IMPROVEMENTS
- Add proper **Logout** button when in Admin view.
- Protected sections for manual score entry (Rapid Fire + Finish Questionnaire with the 3 specific questions).
- Easy view/export of participants with phones + access codes.
- Connection status and basic DB health.

---

## 8. UI / HOME PAGE / ROUTE DISPLAY CHANGES
- Update route visualization to reflect new distances and game names.
- Remove all Test Mode references.
- New flows for Eye for Detail (15 questions), Jerrican carry logging, and manual score entry.

---

**Plan is locked.** Implementation is now happening directly in this folder (`C:\Users\K Arun Bhaskar\Downloads\CycleOps`).

Next steps will be executed here.