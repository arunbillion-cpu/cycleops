'use client'
// ╔══════════════════════════════════════════════════════════════╗
// ║  CYCLEOPS — TACTICAL ENDURANCE EVENT (30 May 2026)          ║
// ║  40 km | 4 Teams | 4 Games | LIVE Supabase only             ║
// ╚══════════════════════════════════════════════════════════════╝
//
// AMENDED SCORING (CONFIRMED):
// ────────────────────────────────────────────────────────────────
// Game A — Eye for Detail (at CP2): 30 marks
//   15 questions (5 objects + 10 landmarks) × 2 marks each
//   One team member answers for the team.
//
// Game B — Endurance & Fortitude (Jerrican Carry CP2→FP):
//   40 marks to the first team that finishes correctly with both
//   5kg jerricans + all members, following hand-change rules.
//   5 points penalty per violation (hand change every 2 km etc.).
//
// Game C — Finish Questionnaire (at FP): 5 marks (Admin manual)
//   1. Which rider consistently dropped back during the canal leg?
//   2. Who gave wrong answers to eye for detail questionnaire at CP2?
//   3. Who do you suspect is a saboteur in your team?

const FINISH_QUESTIONNAIRE_QUESTIONS = [
  "Which rider consistently dropped back during the canal leg?",
  "Who gave wrong answers to eye for detail questionnaire at CP2?",
  "Who do you suspect is a saboteur in your team?"
];
//
// Game D — Rapid Fire Questionnaire: 15 marks (manual paper)
//   Admin enters team scores after the event.
//
// CP1 and CP3 = Pure hydration & refreshments only (no scoring).
//
// Note: Finish Questionnaire (5 marks) is now collected directly in the app at the Finish Point.
//
// DATABASE: Supabase — LIVE WRITES ONLY
// ────────────────────────────────────────────────────────────────
// All writes go directly to Supabase. No test mode.
// See AMENDED_EVENT_PLAN.md for full details.
//
// CONFIG (see .env.local.example)
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, safeInsert, safeUpsert } from "../../lib/supabase/client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const ADMIN_PIN    = "arunbhaskar6014"; // CHANGE THIS before the event
const EVENT_DATE   = "13 Jun 2026";

// ══════════════════════════════════════
// TEAMS
// ══════════════════════════════════════
const TEAMS = [
  { id:"alpha",   name:"ALPHA",   color:"#00ff88", emoji:"⚡", tagline:"Swift & Relentless" },
  { id:"bravo",   name:"BRAVO",   color:"#ff5555", emoji:"🔥", tagline:"Bold & Fearless"   },
  { id:"charlie", name:"CHARLIE", color:"#4af0ff", emoji:"💎", tagline:"Precise & Tactical" },
  { id:"delta",   name:"DELTA",   color:"#ffbb00", emoji:"🌪️", tagline:"Fast & Unstoppable" },
];

// ══════════════════════════════════════
// CHECKPOINTS
// ══════════════════════════════════════
const CHECKPOINTS = [
  { id:"start", name:"START (SP)", label:"Start Point",                    km:0,  icon:"🏁", qrKey:"start" },
  { id:"cp1",   name:"CP 1",       label:"Hydration & Refreshments",       km:16, icon:"💧", qrKey:"cp1"   },
  { id:"cp2",   name:"CP 2",       label:"Eye for Detail (30 marks)",      km:22, icon:"👁️", qrKey:"cp2"   },
  { id:"cp3",   name:"CP 3",       label:"Hydration & Refreshments",       km:31, icon:"💧", qrKey:"cp3"   },
  { id:"finish",name:"FINISH (FP)",label:"Finish + Jerrican + Questionnaire", km:40, icon:"🏆", qrKey:"finish" },
];

// ══════════════════════════════════════
// URL-BASED QR CODES (unified for native camera + in-app scanner)
// Scanning any of these with phone camera or in-app scanner works uniformly.
// Production domain is used for printed signs; current origin is used inside the app (for local/Vercel preview testing).
// ══════════════════════════════════════
const APP_BASE_URL = "https://cycleops.vercel.app";

function buildQRUrl(key) {
  const base = (typeof window !== "undefined" && window.location.origin)
    ? window.location.origin
    : APP_BASE_URL;
  const params = new URLSearchParams();
  if (key === "register") {
    params.set("action", "register");
  } else {
    params.set("action", "checkin");
    params.set("cp", key);
  }
  return `${base}/?${params.toString()}`;
}

// Map for easy lookup when decoding URLs
const QR_KEY_BY_CP_ID = {
  start: "start",
  cp1: "cp1",
  cp2: "cp2",
  cp3: "cp3",
  finish: "finish",
};

// ══════════════════════════════════════
// EYE FOR DETAIL — 15 Questions (CP2) — 30 marks total (2 per correct)
// One team member answers for the whole team
// ══════════════════════════════════════
const EYE_FOR_DETAIL_QUESTIONS = [
  // === 5 OBJECTS ===
  {
    id: 1,
    type: "mcq",
    question: "Near Hanut Chowk, two OG-coloured jerricans were placed. What numbers were painted on them?",
    options: ["87 and 41", "41 and 23", "87 and 55", "41 and 19"],
    correct: "87 and 41",
  },
  {
    id: 2,
    type: "mcq",
    question: "At Chetak Chowk, a helmet with a number painted on it was placed on a red bench. What was the number?",
    options: ["41", "87", "23", "55"],
    correct: "41",
  },
  {
    id: 3,
    type: "mcq",
    question: "What item was hanging on a tree near the torn poster/blow-up that said 'OP SINDOOR'?",
    options: ["Jungle Shoes", "OG Jerrican", "Combat Helmet", "Ground Sheet"],
    correct: "Jungle Shoes",
  },
  {
    id: 4,
    type: "mcq",
    question: "A ground sheet was placed near a nala junction just before Kassiwala Gurudwara. How many red cellotape marks were shown on it for counting?",
    options: ["Three", "Four", "Five", "Six"],
    correct: "Four",
  },
  {
    id: 5,
    type: "mcq",
    question: "Near an Axis Bank ATM, white tape (Newar) was shaped on a tree to display which number?",
    options: ["41", "87", "23", "100"],
    correct: "41",
  },

  // === 10 LANDMARKS ===
  {
    id: 6,
    type: "mcq",
    question: "There was a prominent quote in front of a Headquarters building you crossed. What did it say?",
    options: [
      "In war, resolution, in victory, magnanimity",
      "The secret of getting ahead is getting started",
      "Champions keep playing until they get it right",
      "Fortune favours the brave"
    ],
    correct: "In war, resolution, in victory, magnanimity",
  },
  {
    id: 7,
    type: "text",
    question: "The War Memorial you saw is being maintained by which unit?",
    correct: "14 GARH RIF",
  },
  {
    id: 8,
    type: "mcq",
    question: "On Bahadur Bridge, a signboard showed distances to three places. According to that board, how far is Patiala from that location?",
    options: ["147 km", "219 km", "96 km", "172 km"],
    correct: "147 km",
  },
  {
    id: 9,
    type: "text",
    question: "The first bus stop you crossed after starting was located just ahead of which gate?",
    correct: "Somnath Sharma Gate",
  },
  {
    id: 10,
    type: "text",
    question: "Just ahead of Umrao Gate, across a national highway, there was a water theme park. What is its name?",
    correct: "Chill-o-Thrill",
  },
  {
    id: 11,
    type: "mcq",
    question: "What was the first fuel pump (petrol pump) you came across on the route?",
    options: ["Hindustan Petroleum", "Indian Oil", "Bharat Petroleum", "Reliance"],
    correct: "Hindustan Petroleum",
  },
  {
    id: 12,
    type: "mcq",
    question: "Which was the FIRST prominent Gurudwara you crossed in Bhucho Kalan with green boards?",
    options: [
      "Dera Baba Rumi Wala Gurudwara",
      "Dera Baba Dal Jiwan Singhji Gurudwara",
      "Dera Baba Dayanandji Gurudwara",
      "Gurdwara Shri Guru Gobind Singh Ji"
    ],
    correct: "Dera Baba Rumi Wala Gurudwara",
  },
  {
    id: 13,
    type: "text",
    question: "Dera Baba Dayanandji (near the route) is actually what? (It is the only one of its kind on the route)",
    correct: "Mandir",
  },
  {
    id: 14,
    type: "mcq",
    question: "You saw prominent chimneys of a thermal plant. How many big thermal chimneys (main ones) did it have?",
    options: ["Two", "Three", "Four", "Six"],
    correct: "Four",
  },
  {
    id: 15,
    type: "text",
    question: "In Bhucho Kalan, there is a School of Eminence associated with which NCC unit?",
    correct: "20 Punjab Bn NCC",
  },
];

// ══════════════════════════════════════
// SCORING CONFIG (editable by admin)
// ══════════════════════════════════════
const DEFAULT_SCORING = {
  arrival: {
    label: "Arrival Timings (Legacy Bonus)",
    total: 15,
    perCP: { first:5, second:4, third:3, fourth:2 },
    finish: { first:8, second:6, third:4, fourth:2 },
    note: "Optional bonus points based on check-in order (not core to new plan)"
  }
  // Legacy game data removed during cleanup.
  // Current core scoring: Eye for Detail 30 + Jerrican 40 (first correct) + Rapid Fire 15 + Finish Q 5
};

// Game constants for Eye for Detail and Finish Questionnaire only.

// All database operations now use the modern Supabase client.
// All DB operations now use the official Supabase client + safeInsert/safeUpsert.

// Test connection + basic write permission (production-grade version)
async function testSupabaseConnection() {
  try {
    // Connection test helper (no debug markers in production)

    // 1. Read test using official client
    const { error: readError } = await supabase
      .from("participants")
      .select("id")
      .limit(1);

    if (readError) {
      return { ok: false, step: "read", error: readError.message };
    }

    // 2. Lightweight write test using safe helper (we clean it up)
    const testId = "conn_test_" + Date.now();
    const writePayload = {
      id: testId,
      name: "CONNECTION_TEST",
      age: 99,
      phone: "0000000000",
      emergency: "test",
      team_id: "alpha",
      password: "test",
      registered_at: new Date().toISOString(),
    };

    const { error: writeError } = await safeInsert("participants", writePayload);
    if (writeError) {
      return { ok: false, step: "write", error: writeError.message || writeError };
    }

    // 3. Cleanup
    await supabase.from("participants").delete().eq("id", testId);

    return { ok: true, step: "ok" };
  } catch (e) {
    return { ok: false, step: "exception", error: e?.message || "Unknown error" };
  }
}

// Full reset disabled for safety (as requested).
// Use Supabase Dashboard → Table Editor to clear tables manually when needed.
async function resetAllSupabaseData(showToast) {
  if (showToast) {
    showToast("Full data reset is disabled in the app for safety. Please clear tables directly from the Supabase dashboard.", "warning");
  }
  return false;
}

// ══════════════════════════════════════
// GPS HELPER — REMOVED
// ══════════════════════════════════════
// Per confirmed security requirements (military tactical event):
// No device location / GPS is ever requested or stored.
// Check-ins rely solely on physical presence at the QR code location.
// The QR codes are only shown to the full team at the actual CP.
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════
// QR CODE COMPONENT
// ══════════════════════════════════════
// Note: Real QR codes are now used in the Admin QRCodesView (loaded via CDN).

// ══════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════
export default function CycleOps() {
  // ── App state ──
  const [view, setView] = useState("home");
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState(null); // null | "testing" | {ok:true} | {ok:false, error, step}

  // ── Auth ──
  const [cyclist, setCyclist] = useState(null);      // logged-in cyclist
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPin, setAdminPin] = useState("");

  // ── Data ──
  const [participants, setParticipants] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [gameAnswers, setGameAnswers] = useState([]); // all individual answers
  const [game2Status, setGame2Status] = useState(   // per-team jerrican status (repurposed for new 40-mark game)
    TEAMS.reduce((a,t)=>({...a,[t.id]:{
      started: false,
      startTime: null,
      finished: false,
      finishTime: null,
      penaltyCount: 0,
      completed: false,
      rank: null
    }}),{})
  );
  const [jerricanFinishOrder, setJerricanFinishOrder] = useState([]);  // order in which teams finish jerrican carry (for ranking)


  // Proper separate manual scores
  const [manualScores, setManualScores] = useState(
    TEAMS.reduce((a, t) => ({ ...a, [t.id]: { rapidFire: 0, finishQ: 0 } }), {})
  );
  const [scoring, setScoring] = useState(DEFAULT_SCORING);

  // DB sync status for Admin visibility
  const [lastDbSync, setLastDbSync] = useState(null);

  // Debounce ref for manual score saves
  const manualSaveTimeoutRef = useRef(null);

  // UI status for manual scores saving
  const [manualScoresSaving, setManualScoresSaving] = useState(false);

  // Per-team last saved time for manual scores (for granular display)
  const [manualScoresLastSaved, setManualScoresLastSaved] = useState({});

  // Registration success data (replaces fragile window.__justRegistered)
  const [justRegistered, setJustRegistered] = useState(null);

  // Pending action from URL QR scan (register or checkin at specific CP)
  // This enables native camera scans + in-app URL scans to work after login
  const [pendingAction, setPendingAction] = useState(null);

  // ── UI state ──
  const [activeCP, setActiveCP] = useState(null);
  const [regForm, setRegForm] = useState({name:"",age:"",phone:"",emergency:"",medical:false, password:""});
  const [isLoadingData, setIsLoadingData] = useState(true);



  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  }, []);

  // Consistent DB error messaging for event day (user-friendly)
  const showDBError = useCallback((operation, error) => {
    showToast(`DB error during ${operation}. Your changes are saved locally.`, "error");
    console.error(`DB ${operation} failed:`, error);
  }, [showToast]);

  // Expose load function for Admin refresh button (already used)

  // ============================================
  // MANUAL SCORES PERSISTENCE
  // ============================================
  const saveManualScoresToDB = async (teamId, scores, showToastFn = null) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    const payload = {
      id: `manual_${teamId}`,
      team_id: teamId,
      rapid_fire: scores.rapidFire ?? 0,
      finish_questionnaire: scores.finishQ ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await safeUpsert("manual_scores", payload);
    if (error) {
      console.error("Manual scores DB save failed:", error);
      if (showToastFn) {
        showToastFn("Failed to save manual scores. Changes kept locally.", "error");
      }
    } else {
      setLastDbSync(new Date());
      if (showToastFn) showToastFn("Manual scores saved to database", "success");
    }
  };

  // Save jerrican status to Supabase jerrican_carry table (official client preferred)
  const saveJerricanToDB = async (teamId, status, showToastFn = null) => {
    const payload = {
      id: `jerrican_${teamId}`,
      team_id: teamId,
      start_time: status.startTime,
      finish_time: status.finishTime,
      penalty_count: status.penaltyCount || 0,
      completed: !!status.completed,
      updated_at: new Date().toISOString()
    };

    const { error } = await safeUpsert("jerrican_carry", payload);
    if (error) {
      console.error("Jerrican DB save failed:", error);
      if (showToastFn) showToastFn("Failed to save Jerrican status. Changes kept locally.", "error");
    } else {
      setLastDbSync(new Date());
      if (showToastFn) showToastFn("Jerrican status saved to database", "success");
    }
  };

  // ============================================
  // DATA NORMALIZATION HELPERS (snake_case → camelCase)
  // ============================================
  function normalizeParticipant(row) {
    if (!row) return row;
    return {
      ...row,
      teamId: row.team_id ?? row.teamId,
      registeredAt: row.registered_at ?? row.registeredAt,
    };
  }

  function normalizeCheckin(row) {
    if (!row) return row;
    return {
      ...row,
      cyclistId: row.cyclist_id ?? row.cyclistId,
      cyclistName: row.cyclist_name ?? row.cyclistName,
      teamId: row.team_id ?? row.teamId,
      cpId: row.cp_id ?? row.cpId,
    };
  }

  function normalizeGameAnswer(row) {
    if (!row) return row;
    return {
      ...row,
      cyclistId: row.cyclist_id ?? row.cyclistId,
      cyclistName: row.cyclist_name ?? row.cyclistName,
      teamId: row.team_id ?? row.teamId,
      submittedAt: row.submitted_at ?? row.submittedAt,
    };
  }

  // ============================================
  // DB WRITE PAYLOAD HELPERS (camelCase → snake_case)
  // ============================================
  function toCheckinPayload(c) {
    return {
      id: c.id,
      cyclist_id: c.cyclistId,
      cyclist_name: c.cyclistName,
      team_id: c.teamId,
      cp_id: c.cpId,
      timestamp: c.timestamp,
      // gps intentionally omitted (security policy: no location data collected)
    };
  }

  function toGameAnswerPayload(e) {
    return {
      id: e.id,
      cyclist_id: e.cyclistId,
      cyclist_name: e.cyclistName,
      team_id: e.teamId,
      game: e.game,
      answers: e.answers,
      score: e.score,
      correct: e.correct ?? e.correctCount,
      total: e.total ?? e.totalQuestions,
      submitted_at: e.submittedAt,
    };
  }

  // ============================================
  // DATA LOADING FROM SUPABASE (Official Client)
  // ============================================
  const loadEventDataFromDB = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    try {
      // 1. Load participants
      const { data: participantsData, error: pErr } = await supabase
        .from("participants")
        .select("*")
        .order("registered_at", { ascending: true });

      if (!pErr && participantsData) {
        setParticipants(participantsData.map(normalizeParticipant));
      }

      // 2. Load checkins
      const { data: checkinsData, error: cErr } = await supabase
        .from("checkins")
        .select("*");

      if (!cErr && checkinsData) {
        setCheckins(checkinsData.map(normalizeCheckin));
      }

      // 3. Load game answers (including Eye for Detail)
      const { data: answersData, error: aErr } = await supabase
        .from("game_answers")
        .select("*");

      if (!aErr && answersData) {
        setGameAnswers(answersData.map(normalizeGameAnswer));
      }

      // 4. Load Jerrican carry data
      const { data: jerricanData, error: jErr } = await supabase
        .from("jerrican_carry")
        .select("*");

      if (!jErr && jerricanData) {
        const newJerricanStatus = { ...game2Status };
        jerricanData.forEach(row => {
          const teamId = row.team_id || row.teamId;
          if (teamId) {
            newJerricanStatus[teamId] = {
              ...newJerricanStatus[teamId],
              started: !!row.start_time,
              startTime: row.start_time,
              finished: !!row.completed,
              finishTime: row.finish_time,
              penaltyCount: row.penalty_count || 0,
              completed: !!row.completed,
            };
          }
        });
        setGame2Status(newJerricanStatus);
      }

      // 5. Load Manual Scores
      const { data: manualData, error: mErr } = await supabase
        .from("manual_scores")
        .select("*");

      if (!mErr && manualData) {
        const newManual = { ...manualScores };
        manualData.forEach(row => {
          if (row.team_id) {
            newManual[row.team_id] = {
              rapidFire: row.rapid_fire ?? 0,
              finishQ: row.finish_questionnaire ?? 0,
            };
          }
        });
        setManualScores(newManual);
      }

    } catch (e) {
      console.warn("Failed to load some event data from Supabase", e);
    }
  };

  // ── Leaderboard calculation ──
  const leaderboard = useCallback(() => {
    return TEAMS.map(team => {
      const members = participants.filter(p=>p.teamId===team.id);
      const teamCheckins = checkins.filter(c=>c.teamId===team.id);
      const teamAnswers = gameAnswers.filter(a=>a.teamId===team.id);

      // Arrival scores
      let arrivalScore = 0;
      CHECKPOINTS.slice(1).forEach(cp => {
        const cpCheckins = checkins.filter(c=>c.cpId===cp.id);
        const sorted = [...cpCheckins].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
        const rank = sorted.findIndex(c=>c.teamId===team.id);
        if (rank>=0) {
          if (cp.id==="finish") {
            arrivalScore += [scoring.arrival.finish.first,scoring.arrival.finish.second,scoring.arrival.finish.third,scoring.arrival.finish.fourth][rank]||0;
          } else {
            arrivalScore += [scoring.arrival.perCP.first,scoring.arrival.perCP.second,scoring.arrival.perCP.third,scoring.arrival.perCP.fourth][rank]||0;
          }
        }
      });

      // Eye for Detail (30 marks max)
      const eyeAnswers = teamAnswers.filter(a => a.game === "eye_for_detail");
      const eyeForDetailScore = eyeAnswers.length > 0 
        ? Math.max(...eyeAnswers.map(a => a.score || 0)) 
        : 0;

      // JERRICAN 40-MARK "FIRST TO FINISH" LOGIC
      const j = game2Status[team.id] || {};
      let jerricanScore = 0;

      if (j.finished && j.completed) {
        // Base points for finishing
        const base = 25;
        jerricanScore = base;

        // Bonus for being first (40 total for the winner)
        if (j.rank === 1) {
          jerricanScore = 40;
        } else if (j.rank === 2) {
          jerricanScore = 28;
        } else if (j.rank === 3) {
          jerricanScore = 18;
        } else {
          jerricanScore = 10;
        }

        // Apply penalties (5 pts each)
        jerricanScore = Math.max(0, jerricanScore - (j.penaltyCount || 0) * 5);
      }

      // Manual scores (Rapid Fire + Finish Q)
      const m = manualScores[team.id] || { rapidFire: 0, finishQ: 0 };
      const manualScore = (m.rapidFire || 0) + (m.finishQ || 0);

      const total = arrivalScore + eyeForDetailScore + jerricanScore + manualScore;

      return {
        ...team, members, checkins:teamCheckins,
        scores:{ 
          arrival: arrivalScore, 
          eyeForDetail: eyeForDetailScore,
          jerrican: jerricanScore,
          manual: manualScore,
          total 
        },
      };
    }).sort((a,b)=>b.scores.total-a.scores.total).map((t,i)=>({...t,rank:i+1}));
  }, [participants, checkins, gameAnswers, game2Status, manualScores, scoring]);

  const lb = leaderboard();

  // Load all event data from Supabase on startup (using official client)
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoadingData(true);
      try {
        await loadEventDataFromDB();
      } catch (e) {
        console.warn("Initial data load had issues", e);
        showToast("Could not load latest data from DB. Using local data.", "warning");
      }
      setIsLoadingData(false);
    };
    loadInitial();
  }, []);  // Run once on mount

  // Parse URL parameters from QR codes (native camera or in-app scanner)
  // Supports the new unified URL scheme: ?action=register or ?action=checkin&cp=cp2
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;

    let parsed = null;

    if (action === "register") {
      parsed = { type: "register" };
    } else if (action === "checkin") {
      const cpParam = params.get("cp");
      if (cpParam && QR_KEY_BY_CP_ID[cpParam]) {
        parsed = { type: "checkin", cpId: QR_KEY_BY_CP_ID[cpParam] };
      }
    }

    if (parsed) {
      setPendingAction(parsed);
      // Clean the URL so it doesn't stay in the address bar / get bookmarked strangely
      try {
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {}
    }
  }, []);  // Run once on mount

  // Persist manual scores to DB (debounced to avoid spamming the database)
  useEffect(() => {
    // Only save if we have real data
    const hasData = Object.values(manualScores).some(
      (m) => (m?.rapidFire ?? 0) > 0 || (m?.finishQ ?? 0) > 0
    );
    if (!hasData) return;

    // Clear previous timeout
    if (manualSaveTimeoutRef.current) {
      clearTimeout(manualSaveTimeoutRef.current);
    }

    setManualScoresSaving(true);

    // Debounce the save by 800ms
    manualSaveTimeoutRef.current = setTimeout(() => {
      const now = new Date();
      const updatedLastSaved = {};

      Object.entries(manualScores).forEach(([teamId, scores]) => {
        saveManualScoresToDB(teamId, scores);
        updatedLastSaved[teamId] = now;
      });

      setManualScoresLastSaved(prev => ({ ...prev, ...updatedLastSaved }));
      setManualScoresSaving(false);
    }, 800);

    // Cleanup on unmount or next change
    return () => {
      if (manualSaveTimeoutRef.current) {
        clearTimeout(manualSaveTimeoutRef.current);
      }
    };
  }, [manualScores]);

  // ── QR scan handler (supports both legacy CYCLEOPS- codes and new unified URL scheme) ──
  const handleQRScan = (code) => {
    setShowScanner(false);
    const raw = (code || "").trim();

    // Try to parse as URL first (new unified scheme)
    try {
      const url = new URL(raw);
      const params = url.searchParams;
      const action = params.get("action");

      if (action === "register") {
        showToast("Registration QR detected!");
        setView("register");
        return;
      }
      if (action === "checkin") {
        const cpParam = params.get("cp");
        const cp = CHECKPOINTS.find(c => c.qrKey === cpParam || c.id === cpParam);
        if (cp) {
          if (!cyclist) { showToast("Check-in QR detected! Please log in first.", "error"); setView("login"); return; }
          showToast(`Check-in QR detected for ${cp.name}`);
          setActiveCP(cp.id);
          setView("cpCheckin");
          return;
        }
      }
    } catch {
      // Not a valid URL — fall through to legacy handling
    }

    // Legacy opaque codes (for transition / old printed signs)
    const u = raw.toUpperCase().trim();
    if (u === "CYCLEOPS-REGISTER") { setView("register"); return; }

    // Support old "CYCLEOPS-CP3" format + new qrKey format during transition
    const legacyCp = CHECKPOINTS.find(c => {
      const oldFormat = `CYCLEOPS-${c.qrKey.toUpperCase()}`;
      return oldFormat === u || c.qrKey.toUpperCase() === u || c.id.toUpperCase() === u;
    });

    if (legacyCp) {
      if (!cyclist) { showToast("Please log in first","error"); setView("login"); return; }
      setActiveCP(legacyCp.id);
      setView("cpCheckin");
      return;
    }

    if (u === "CYCLEOPS-ADMIN") { setView("adminAuth"); return; }

    showToast("Unknown QR code. Make sure you're scanning a valid CycleOps checkpoint code.", "error");
  };

  // ── CP Checkin ──
  const handleCPCheckin = async () => {
    if (!cyclist || !activeCP) return;
    const existing = checkins.find(c=>c.cyclistId===cyclist.id&&c.cpId===activeCP);
    if (existing) { showToast("Already checked in here!","warning"); return; }

    // No GPS is captured (per security requirements — only physical presence at CP QR is recorded)
    const checkin = {
      id: genId(),
      cyclistId: cyclist.id,
      cyclistName: cyclist.name,
      teamId: cyclist.teamId,
      cpId: activeCP,
      timestamp: new Date().toISOString(),
    };
    setCheckins(prev=>[...prev,checkin]);

    let dbSuccess = true;

    // Live write to Supabase using official client (with retry)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbPayload = toCheckinPayload(checkin);
      const { error } = await safeInsert("checkins", dbPayload);
      if (error) {
        showDBError("check-in", error);
        dbSuccess = false;
      }
    }

    const cp = CHECKPOINTS.find(c=>c.id===activeCP);

    if (dbSuccess) {
      showToast(`✅ Checked in at ${cp?.name}! Time recorded.`);
    } else {
      showToast(`Checked in locally at ${cp?.name}. Database save failed — will sync later.`, "warning");
    }

    // Route to game if applicable
    if (activeCP==="cp2") { setView("eyeForDetail"); return; } // Eye for Detail (30 marks)
    // CP1 and CP3 are pure hydration stops - no games
    if (activeCP==="cp1" || activeCP==="cp3") { 
      setView("hydrationStop"); 
      return; 
    }
    if (activeCP==="finish") { 
      setView("finishQuestionnaire"); 
      return; 
    }
    setView("home");
  };

  // ── Register (Name + Team + Password only) ──
  const handleRegister = async () => {
    if (!regForm.name || !regForm.age || !regForm.phone || !regForm.emergency || !regForm.password) {
      showToast("Please fill all fields including password", "error");
      return;
    }
    if (!regForm.medical) {
      showToast("Medical declaration required", "error");
      return;
    }

    const id = genId();

    // Balanced team assignment
    const teamIds = ["alpha", "bravo", "charlie", "delta"];
    const sorted = [...participants, { age: parseInt(regForm.age) }].sort((a, b) => a.age - b.age);
    const tempIdx = sorted.findIndex((p, i) => i === sorted.length - 1);
    const assignedTeam = teamIds[tempIdx % 4];

    const newP = {
      id,
      ...regForm,
      age: parseInt(regForm.age),
      teamId: assignedTeam,
      registeredAt: new Date().toISOString(),
    };

    // Re-assign teams for balance
    const allP = [...participants, newP]
      .sort((a, b) => a.age - b.age)
      .map((p, i) => ({ ...p, teamId: teamIds[i % 4] }));

    setParticipants(allP);
    const me = allP.find(p => p.id === id);
    setCyclist(me);

    // Clear form immediately after setting cyclist (Bug 2 fix)
    setRegForm({ name: "", age: "", phone: "", emergency: "", medical: false, password: "" });

    // Live write to Supabase (send correct snake_case columns)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbPayload = {
        id: me.id,
        name: me.name,
        age: me.age,
        phone: me.phone,
        emergency: me.emergency,
        medical: me.medical,
        team_id: me.teamId,
        password: me.password,
        registered_at: me.registeredAt || new Date().toISOString(),
      };

      const { error } = await safeInsert("participants", dbPayload);
      if (error) {
        showDBError("registration", error);
      }
    }

    // Show success screen (no access code anymore)
    setView("regSuccess");
    setJustRegistered({ name: me.name, team: TEAMS.find(t => t.id === me.teamId)?.name });

    // If they scanned a check-in QR before registering, remember it so we can auto-open after they tap "Continue to Dashboard"
    // (handled in RegSuccessView onClick)
  };

  // ── Login (Name + Password) — Access Code removed ──
  const handleLogin = (name, password) => {
    const fullName = (name || "").trim().toLowerCase();
    const pass = (password || "").trim();

    const found = participants.find(
      p => (p.name || "").toLowerCase() === fullName && p.password === pass
    );

    if (!found) {
      showToast("Invalid Name or Password. Please check your details.", "error");
      return;
    }

    setCyclist(found);

    // Consume pending QR action (from native camera or in-app URL scan)
    if (pendingAction?.type === "checkin" && pendingAction.cpId) {
      const cp = CHECKPOINTS.find(c => c.id === pendingAction.cpId);
      if (cp) {
        setActiveCP(cp.id);
        setView("cpCheckin");
        showToast(`Welcome back, ${found.name}! Opening ${cp.name} check-in...`);
      } else {
        setView("dashboard");
        showToast(`Welcome back, ${found.name}!`);
      }
    } else {
      setView("dashboard");
      showToast(`Welcome back, ${found.name}!`);
    }

    setPendingAction(null);
  };

  // ── Game answer submission ──
  const submitGameAnswers = async (game, answers, questions, pointsEach) => {
    if (!cyclist) return 0;
    let correct = 0;
    questions.forEach((q,i)=>{ if(answers[i]===q.a) correct++; });
    const score = correct*pointsEach;
    const entry = { id:genId(), cyclistId:cyclist.id, cyclistName:cyclist.name, teamId:cyclist.teamId, game, answers, score, correct, total:questions.length, submittedAt:new Date().toISOString() };
    setGameAnswers(prev=>[...prev.filter(a=>!(a.cyclistId===cyclist.id&&a.game===game)),entry]);
    // Live write to Supabase using official client (with retry)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbPayload = toGameAnswerPayload(entry);
      const { error } = await safeInsert("game_answers", dbPayload);
      if (error) {
        showDBError("game answer submission", error);
      }
    }
    return { score, correct };
  };

  // Simple loading screen on initial data fetch
  if (isLoadingData) {
    return (
      <div style={{ minHeight:"100vh",background:"#060606",color:"#fff",maxWidth:480,margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ height: 64, width: "auto", marginBottom: 16, objectFit: "contain", display: 'none' }}
          onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{fontFamily:"monospace", fontSize:24, marginBottom:12}}>CYCLEOPS</div>
        <div style={{color:"#00ff88"}}>Loading event data...</div>
        <div style={{fontSize:12, color:"#555", marginTop:8}}>Connecting to database</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:"#060606",color:"#fff",maxWidth:480,margin:"0 auto" }}>
      <style>{CSS}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showScanner && <QRScanner onScan={handleQRScan} onClose={()=>setShowScanner(false)} />}

      {/* NAV */}
      <nav style={NAV}>
        <button onClick={()=>setView(cyclist?"dashboard":"home")} style={NAV_BRAND}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: 26, width: "auto", marginRight: 8, objectFit: "contain", display: 'none' }}
            onLoad={(e) => { e.currentTarget.style.display = 'inline'; }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span style={{color:"#fff",fontFamily:"monospace",fontSize:17,fontWeight:"bold",letterSpacing:3}}>CYCLEOPS</span>
        </button>
        <div style={{display:"flex",gap:6}}>
          {cyclist && <div style={{background:"#111",border:"1px solid #222",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#00ff88",fontFamily:"monospace",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cyclist.name.split(" ")[0]}</div>}
          <NBtn onClick={()=>setShowScanner(true)} icon="📷" />
          <NBtn onClick={()=>setView("leaderboard")} icon="🏆" />
          <NBtn onClick={()=>setView(adminAuth?"admin":"adminAuth")} icon="⚙️" />
        </div>
      </nav>



      <div style={{paddingBottom:50}}>
        {view==="home"       && <HomeView setView={setView} lb={lb} cyclist={cyclist} setShowScanner={setShowScanner} />}
        {view==="register"   && <RegisterView regForm={regForm} setRegForm={setRegForm} onSubmit={handleRegister} setView={setView} />}
        {view==="login"      && <LoginView onLogin={handleLogin} setView={setView} />}
        {view==="regSuccess" && <RegSuccessView 
          setView={setView} 
          justRegistered={justRegistered} 
          setJustRegistered={setJustRegistered} 
          pendingAction={pendingAction}
          setPendingAction={setPendingAction}
        />}
        {view==="dashboard"  && <DashboardView cyclist={cyclist} setCyclist={setCyclist} lb={lb} checkins={checkins} gameAnswers={gameAnswers} setView={setView} setShowScanner={setShowScanner} activeCP={activeCP} setActiveCP={setActiveCP} showToast={showToast} />}
        {view==="cpCheckin"  && <CPCheckinView activeCP={activeCP} cyclist={cyclist} checkins={checkins} onCheckin={handleCPCheckin} setView={setView} />}
        {view==="eyeForDetail" && <EyeForDetailView cyclist={cyclist} gameAnswers={gameAnswers} setGameAnswers={setGameAnswers} setView={setView} showToast={showToast} />}
        {view==="leaderboard"&& <LeaderboardView lb={lb} scoring={scoring} setView={setView} />}
        {view==="adminAuth"  && <AdminAuthView adminPin={adminPin} setAdminPin={setAdminPin} onAuth={()=>{if(adminPin===ADMIN_PIN){setAdminAuth(true);setView("admin");showToast("Admin access granted");}else showToast("Wrong PIN","error");}} setView={setView} />}
        {view==="admin"      && adminAuth && <AdminView 
          participants={participants} lb={lb} checkins={checkins} gameAnswers={gameAnswers} 
          game2Status={game2Status} setGame2Status={setGame2Status} 
          manualScores={manualScores} setManualScores={setManualScores}
          scoring={scoring} setScoring={setScoring} 
          setView={setView} showToast={showToast} 
          supabaseStatus={supabaseStatus} setSupabaseStatus={setSupabaseStatus}
          onRefreshData={loadEventDataFromDB}
          onAdminLogout={() => { setAdminAuth(false); setAdminPin(""); setView("home"); showToast("Logged out of Admin"); }}
          lastDbSync={lastDbSync}
          setLastDbSync={setLastDbSync}
          manualScoresSaving={manualScoresSaving}
          manualScoresLastSaved={manualScoresLastSaved}
          jerricanFinishOrder={jerricanFinishOrder}
          setJerricanFinishOrder={setJerricanFinishOrder}
          saveJerricanToDB={saveJerricanToDB}
        />}
        {view==="qrcodes"    && adminAuth && <QRCodesView setView={setView} />}
        {view==="scoringGuide" && <ScoringGuideView setView={setView} />}
        {view==="finishQuestionnaire" && cyclist && <FinishQuestionnaireView 
          cyclist={cyclist} 
          setView={setView} 
          showToast={showToast} 
          gameAnswers={gameAnswers}
          setGameAnswers={setGameAnswers}
        />}
        {view==="hydrationStop" && <HydrationStopView activeCP={activeCP} setView={setView} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// HOME VIEW
// ══════════════════════════════════════
function HomeView({ setView, lb, cyclist, setShowScanner }) {
  return (
    <div className="fadeUp">
      <div style={{position:"relative",padding:"36px 20px 28px",textAlign:"center",background:"linear-gradient(180deg,#0b0b0b,#060606)",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)",backgroundSize:"28px 28px"}} />
        <div style={{position:"relative"}}>
          <div style={BADGE}>TACTICAL ENDURANCE · {EVENT_DATE}</div>
          <div style={{fontFamily:"monospace",fontSize:62,fontWeight:"bold",lineHeight:0.9,letterSpacing:4,textShadow:"0 0 50px rgba(0,255,136,0.2)",marginBottom:16}}>
            CYCLE<br/><span style={{color:"#00ff88"}}>OPS</span>
          </div>
          <div style={{fontFamily:"monospace",fontSize:11,color:"#555",letterSpacing:3}}>40 KM · 4 TEAMS · 4 GAMES · LIVE</div>
          {lb.length>0&&lb[0].scores.total>0&&(
            <div style={{marginTop:18,display:"inline-flex",alignItems:"center",gap:12,background:"rgba(0,0,0,0.5)",border:"1px solid #1a1a1a",borderRadius:12,padding:"10px 20px"}}>
              <span style={{fontSize:24}}>{lb[0].emoji}</span>
              <span style={{fontFamily:"monospace",fontWeight:"bold",color:lb[0].color,fontSize:16}}>{lb[0].name}</span>
              <span style={{fontFamily:"monospace",fontWeight:"bold",color:"#00ff88",fontSize:18}}>{lb[0].scores.total}/100</span>
            </div>
          )}
        </div>
      </div>

      <div style={{padding:"0 16px"}}>
        {!cyclist ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16,marginBottom:16}}>
            <BigBtn icon="📝" label="REGISTER" sub="Join the event" onClick={()=>setView("register")} color="#00ff88" />
            <BigBtn icon="🔑" label="LOG IN" sub="Returning cyclist" onClick={()=>setView("login")} color="#4af0ff" />
          </div>
        ) : (
          <div style={{marginTop:16,marginBottom:16}}>
            <button onClick={()=>setView("dashboard")} style={{...BTN_PRIMARY,width:"100%",justifyContent:"center",gap:12}}>
              <span style={{fontSize:22}}>👤</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",letterSpacing:2}}>MY DASHBOARD</div>
                <div style={{fontSize:12,color:"#88ffcc",marginTop:2}}>{cyclist.name} · Team {TEAMS.find(t=>t.id===cyclist.teamId)?.name}</div>
              </div>
            </button>
          </div>
        )}

        <button onClick={()=>setShowScanner(true)} style={{...BTN_PRIMARY,width:"100%",marginBottom:10}}>
          <span style={{fontSize:26}}>📷</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",letterSpacing:2}}>SCAN QR CODE</div>
            <div style={{fontSize:12,color:"#88ffcc",marginTop:2}}>Check in · Play games</div>
          </div>
        </button>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <SmallBtn icon="🏆" label="LEADERBOARD" onClick={()=>setView("leaderboard")} />
          <SmallBtn icon="📋" label="SCORING GUIDE" onClick={()=>setView("scoringGuide")} />
        </div>

        {/* Route */}
        <div style={CARD}>
          <p style={SEC_LABEL}>EVENT ROUTE</p>
          <div style={{display:"flex",alignItems:"center",marginTop:8}}>
            {CHECKPOINTS.map((cp,i)=>(
              <div key={cp.id} style={{display:"flex",alignItems:"center",flex:i<CHECKPOINTS.length-1?1:"none"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{width:36,height:36,background:"#111",border:"1px solid #222",borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:12}}>{cp.icon}</span>
                  </div>
                  <div style={{fontSize:8,color:"#444",fontFamily:"monospace",marginTop:2}}>{cp.km}km</div>
                </div>
                {i<CHECKPOINTS.length-1&&<div style={{flex:1,height:2,background:"linear-gradient(90deg,#1a1a1a,#2a2a2a)"}} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// REGISTER VIEW
// ══════════════════════════════════════
function RegisterView({ regForm, setRegForm, onSubmit, setView }) {
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="📝" title="REGISTRATION" sub="Set a password for login" />
      <div style={CARD}>
        <Field label="FULL NAME *"><Input placeholder="Your full name" value={regForm.name} onChange={v=>setRegForm(p=>({...p,name:v}))} /></Field>
        <Field label="AGE *"><Input type="number" placeholder="Your age" value={regForm.age} onChange={v=>setRegForm(p=>({...p,age:v}))} /></Field>
        <Field label="PHONE NUMBER * (Emergency use only)"><Input type="tel" placeholder="+91 9999999999" value={regForm.phone} onChange={v=>setRegForm(p=>({...p,phone:v}))} /></Field>
        <Field label="EMERGENCY CONTACT *"><Input placeholder="Name & phone number" value={regForm.emergency} onChange={v=>setRegForm(p=>({...p,emergency:v}))} /></Field>
        
        <Field label="PASSWORD * (you will use this to log in later)">
          <Input 
            type="password" 
            placeholder="Create a password" 
            value={regForm.password} 
            onChange={v=>setRegForm(p=>({...p,password:v}))} 
          />
        </Field>

        <div onClick={()=>setRegForm(p=>({...p,medical:!p.medical}))}
          style={{display:"flex",alignItems:"flex-start",gap:12,marginTop:16,cursor:"pointer",padding:14,background:regForm.medical?"rgba(0,255,136,0.06)":"#0a0a0a",border:`1px solid ${regForm.medical?"#00ff88":"#1a1a1a"}`,borderRadius:10}}>
          <div style={{width:24,height:24,minWidth:24,border:`2px solid ${regForm.medical?"#00ff88":"#333"}`,borderRadius:6,background:regForm.medical?"#00ff88":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {regForm.medical&&<span style={{color:"#000",fontWeight:"bold"}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:"#aaa",lineHeight:1.6}}>I declare I am medically fit to participate and have no conditions preventing cycling 40km.</span>
        </div>

        <PBtn onClick={onSubmit} icon="⚡" label="REGISTER NOW" sub="Use your Name + Password to log in later" style={{marginTop:16}} />
        <BkBtn onClick={()=>setView("home")} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// LOGIN VIEW (Name + Password — Access Code removed)
// ══════════════════════════════════════
function LoginView({ onLogin, setView }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    onLogin(name, password);
  };

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🔑" title="CYCLIST LOGIN" sub="Enter your Name + Password" />
      <div style={CARD}>
        <Field label="YOUR FULL NAME">
          <Input 
            placeholder="Your full name as registered" 
            value={name} 
            onChange={setName}
            onEnter={handleSubmit}
          />
        </Field>
        <Field label="PASSWORD (you set during registration)">
          <Input 
            type="password" 
            placeholder="Your password" 
            value={password} 
            onChange={setPassword}
            onEnter={handleSubmit}
          />
        </Field>
        <PBtn onClick={handleSubmit} icon="→" label="LOG IN" style={{marginTop:16}} />
        <div style={{textAlign:"center",margin:"12px 0",color:"#444",fontFamily:"monospace",fontSize:12}}>— OR —</div>
        <button onClick={()=>setView("register")} style={{...BTN_SEC,width:"100%"}}>REGISTER FIRST</button>
        <BkBtn onClick={()=>setView("home")} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// REGISTRATION SUCCESS (No Access Code anymore)
// ══════════════════════════════════════
function RegSuccessView({ setView, justRegistered, setJustRegistered, pendingAction, setPendingAction }) {
  const data = justRegistered || { name: "Cyclist", team: "TEAM" };

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader 
        icon="✅" 
        title="REGISTRATION COMPLETE" 
        sub="You are ready for the event" 
      />
      
      <div style={{...CARD, background:"#0a1f0a", border:"2px solid #00ff88", textAlign:"center"}}>
        <div style={{fontSize:14, color:"#00ff88", marginBottom:8}}>WELCOME, {data.name.toUpperCase()}</div>
        <div style={{fontSize:13, color:"#aaa", marginBottom:16}}>You have been assigned to</div>
        <div style={{fontSize:28, fontWeight:"bold", color:"#00ff88", marginBottom:20}}>{data.team}</div>

        <div style={{margin:"20px 0", padding:"16px", background:"#111", borderRadius:12}}>
          <div style={{fontSize:13, color:"#aaa", marginBottom:8}}>
            Your password is the one you created during registration.
          </div>
          <div style={{fontSize:15, color:"#fff", lineHeight:1.4}}>
            To log in later, use your <strong>Full Name</strong> + the <strong>Password</strong> you set.
          </div>
        </div>

        <div style={{fontSize:13, color:"#ffaa00", lineHeight:1.5, marginBottom:16}}>
          Please remember your password. You will need your Name + Password to log in on any device.
        </div>

        <button 
          onClick={() => { 
            if (setJustRegistered) setJustRegistered(null);

            // Consume pending check-in action (from QR scanned before registration)
            if (pendingAction?.type === "checkin" && pendingAction.cpId) {
              const cp = CHECKPOINTS.find(c => c.id === pendingAction.cpId);
              if (cp) {
                setActiveCP(cp.id);
                setView("cpCheckin");
              } else {
                setView("dashboard");
              }
              if (setPendingAction) setPendingAction(null);
            } else {
              setView("dashboard");
            }
          }} 
          style={{...BTN_PRIMARY, width:"100%", justifyContent:"center", marginTop:8}}
        >
          CONTINUE TO DASHBOARD →
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// EYE FOR DETAIL VIEW (CP2) — 15 Questions, 30 marks
// ══════════════════════════════════════
function EyeForDetailView({ cyclist, gameAnswers, setGameAnswers, setView, showToast }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  const teamAnswers = gameAnswers.find(a => a.teamId === cyclist?.teamId && a.game === "eye_for_detail");

  const handleAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    EYE_FOR_DETAIL_QUESTIONS.forEach(q => {
      const userAns = (answers[q.id] || "").toString().trim().toLowerCase();
      const correctAns = q.correct.toString().trim().toLowerCase();
      if (userAns === correctAns) correctCount++;
    });
    return correctCount * 2;
  };

  const handleSubmit = async () => {
    if (!cyclist) return;

    setSubmitting(true);

    const finalScore = calculateScore();
    const entry = {
      id: genId(),
      cyclistId: cyclist.id,
      cyclistName: cyclist.name,
      teamId: cyclist.teamId,
      game: "eye_for_detail",
      answers,
      score: finalScore,
      totalQuestions: EYE_FOR_DETAIL_QUESTIONS.length,
      submittedAt: new Date().toISOString(),
    };

    setGameAnswers(prev => [...prev.filter(a => !(a.teamId === cyclist.teamId && a.game === "eye_for_detail")), entry]);
    setScore(finalScore);
    setSubmitted(true);

    // Live write to Supabase using official client (with retry)
    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbPayload = toGameAnswerPayload(entry);
      const { error } = await safeInsert("game_answers", dbPayload);
      if (error) {
        showDBError("Eye for Detail submission", error);
      } else {
        showToast(`Submitted! Your team scored ${finalScore} / 30 marks`);
      }
    } else {
      showToast(`Submitted locally! Team scored ${finalScore} / 30 marks`);
    }

    setSubmitting(false);
  };

  if (teamAnswers || submitted) {
    const displayScore = submitted ? score : teamAnswers?.score || 0;
    return (
      <div className="fadeUp" style={{padding:"0 16px"}}>
        <PageHeader icon="👁️" title="EYE FOR DETAIL" sub="CP2 • 30 marks" />
        <div style={{...CARD, textAlign:"center", background:"#0a1f0a", borderColor:"#00ff88"}}>
          <div style={{fontSize:48, fontWeight:"bold", color:"#00ff88"}}>{displayScore}</div>
          <div style={{fontSize:18, color:"#fff"}}>out of 30 marks</div>
          <div style={{marginTop:16, fontSize:13, color:"#aaa"}}>
            Answers recorded for your team.<br />Thank you for your observation skills!
          </div>
        </div>

        <PBtn 
          onClick={() => {
            // Quick way for team to mark they are ready for jerrican (admin still controls actual timing)
            setView("dashboard");
            showToast("Jerrican carry can now be started by organizers at CP2");
          }} 
          icon="⛽" 
          label="READY FOR JERRICAN CARRY" 
          sub="Inform organizers you are ready to start the 40-mark leg"
          style={{marginTop:8}}
        />

        <BkBtn onClick={() => setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="👁️" title="EYE FOR DETAIL" sub="CP2 • 15 Questions • 2 marks each = 30 marks" />
      
      <div style={{fontSize:12, color:"#ffaa00", background:"rgba(255,170,0,0.1)", padding:"8px 12px", borderRadius:8, marginBottom:16}}>
        One team member should answer on behalf of the whole team. Be honest — this tests real observation.
      </div>

      {EYE_FOR_DETAIL_QUESTIONS.map((q, index) => (
        <div key={q.id} style={{...CARD, marginBottom:12}}>
          <div style={{fontSize:11, color:"#888", marginBottom:6}}>
            Q{index + 1} of 15 • {q.type === "mcq" ? "Multiple Choice" : "Fill in the blank"}
          </div>
          <div style={{fontSize:14, marginBottom:10, lineHeight:1.4}}>{q.question}</div>

          {q.type === "mcq" ? (
            <select
              value={answers[q.id] || ""}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              style={{width:"100%", background:"#111", border:"1px solid #333", color:"#fff", padding:"10px", borderRadius:8, fontSize:14}}
            >
              <option value="">-- Select an answer --</option>
              {q.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="Type your answer here"
              value={answers[q.id] || ""}
              onChange={(v) => handleAnswer(q.id, v)}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < 10 || submitting}
        style={{
          ...BTN_PRIMARY,
          width:"100%",
          justifyContent:"center",
          marginTop:8,
          opacity: (Object.keys(answers).length < 10 || submitting) ? 0.5 : 1
        }}
      >
        {submitting ? "SUBMITTING ANSWERS..." : "SUBMIT TEAM ANSWERS (+2 per correct)"}
      </button>

      {submitting && (
        <div style={{textAlign:"center", fontSize:11, color:"#ffaa00", marginTop:8}}>
          Saving your team's answers to the database...
        </div>
      )}

      <div style={{fontSize:11, color:"#555", textAlign:"center", marginTop:8}}>
        You can submit even if some questions are left blank.
      </div>

      <BkBtn onClick={() => setView("dashboard")} />
    </div>
  );
}

// ══════════════════════════════════════
// FINISH POINT QUESTIONNAIRE (3 questions - Admin manually marks 0-5)
// ══════════════════════════════════════
function FinishQuestionnaireView({ cyclist, setView, showToast, gameAnswers, setGameAnswers }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Check if this cyclist already submitted (answers are FINAL)
  const existingResponse = gameAnswers?.find(
    a => a.cyclistId === cyclist?.id && a.game === "finish_questionnaire"
  );

  const hasSubmitted = !!existingResponse;

  const handleSubmit = async () => {
    if (!cyclist || hasSubmitted) return; // Block re-submission

    setSubmitting(true);

    const entry = {
      id: genId(),
      cyclistId: cyclist.id,
      cyclistName: cyclist.name,
      teamId: cyclist.teamId,
      game: "finish_questionnaire",
      answers,
      score: 0,
      total: 3,
      submittedAt: new Date().toISOString(),
    };

    // Always update local state immediately for instant UI feedback
    if (setGameAnswers) {
      setGameAnswers(prev => [...prev, entry]);
    }

    if (SUPABASE_URL && SUPABASE_KEY) {
      const dbPayload = toGameAnswerPayload(entry);
      const { error } = await safeInsert("game_answers", dbPayload);
      if (error) {
        showDBError("finish questionnaire submission", error);
      } else {
        showToast("Answers submitted successfully. This submission is final.");
      }
    } else {
      showToast("Answers saved locally (no DB connection). Admin can still review.", "warning");
    }

    setSubmitting(false);
  };

  // If already submitted → show final confirmation (no editing allowed)
  if (hasSubmitted) {
    return (
      <div className="fadeUp" style={{padding:"0 16px"}}>
        <PageHeader icon="🏆" title="FINISH QUESTIONNAIRE" sub="Submission Complete & Final" />
        
        <div style={{...CARD, textAlign:"center", background:"#0a1f0a", borderColor:"#00ff88"}}>
          <div style={{fontSize:18, color:"#00ff88", marginBottom:12}}>✓ Answers Submitted (Final)</div>
          <p style={{color:"#ccc", lineHeight:1.5, marginBottom:16}}>
            Your answers have been recorded and are now <strong>final</strong>.<br />
            No changes or re-submissions are allowed.
          </p>
          <p style={{fontSize:12, color:"#888"}}>
            The admin will review all individual answers from your team and award marks (0-5).
          </p>
        </div>

        <button 
          onClick={() => setView("dashboard")} 
          style={{...BTN_PRIMARY, width:"100%", marginTop:16}}
        >
          BACK TO DASHBOARD
        </button>
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🏆" title="FINISH QUESTIONNAIRE" sub="3 Questions • Admin will award 0-5 marks for the team" />
      
      <div style={{fontSize:12, color:"#ffaa00", background:"rgba(255,170,0,0.1)", padding:"8px 12px", borderRadius:8, marginBottom:16}}>
        <strong>Each team member must submit their own answers separately.</strong><br />
        <span style={{color:"#ff6666"}}>Important: Once submitted, these answers are final and cannot be changed or re-submitted.</span>
      </div>

      {FINISH_QUESTIONNAIRE_QUESTIONS.map((question, index) => (
        <div key={index} style={{...CARD, marginBottom:14}}>
          <div style={{fontSize:13, color:"#ffaa00", marginBottom:8, fontWeight:500}}>
            Q{index + 1}. {question}
          </div>
          <textarea
            placeholder="Your personal answer..."
            value={answers[index] || ""}
            onChange={(e) => setAnswers(prev => ({ ...prev, [index]: e.target.value }))}
            style={{ 
              width: "100%", 
              minHeight: "70px", 
              background: "#111", 
              border: "1px solid #333", 
              color: "#fff", 
              padding: "10px", 
              borderRadius: "8px",
              fontSize: "14px",
              resize: "vertical"
            }}
          />
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length === 0 || submitting}
        style={{
          ...BTN_PRIMARY,
          width: "100%",
          justifyContent: "center",
          marginTop: 8,
          opacity: (Object.keys(answers).length === 0 || submitting) ? 0.5 : 1
        }}
      >
        {submitting ? "SUBMITTING..." : "SUBMIT MY ANSWERS (FINAL)"}
      </button>

      {submitting && (
        <div style={{textAlign:"center", fontSize:11, color:"#ffaa00", marginTop:8}}>
          Saving your answers to the database. This may take a moment.
        </div>
      )}

      <div style={{fontSize: 11, color: "#ff6666", textAlign: "center", marginTop: 8, fontWeight:500}}>
        Once submitted, these answers are final and cannot be edited.
      </div>

      <BkBtn onClick={() => setView("dashboard")} />
    </div>
  );
}

// ══════════════════════════════════════
// HYDRATION STOP VIEW (for CP1 and CP3 - no game activity)
// ══════════════════════════════════════
function HydrationStopView({ activeCP, setView }) {
  const cp = CHECKPOINTS.find(c => c.id === activeCP);
  return (
    <div className="fadeUp" style={{padding:"0 16px", textAlign:"center"}}>
      <PageHeader icon="" title={cp?.name || "CHECKPOINT"} sub="Hydration & Refreshments Stop" />
      <div style={{...CARD, padding:28, textAlign:"center"}}>
        <div style={{fontSize:56, marginBottom:16}}>✅</div>
        <div style={{fontFamily:"monospace", fontSize:18, color:"#00ff88", fontWeight:"bold", marginBottom:12}}>CHECK-IN RECORDED</div>
        <div style={{fontSize:14, color:"#aaa", lineHeight:1.7}}>
          This is a hydration and refreshments stop.<br/>
          <strong style={{color:"#fff"}}>No game activity here.</strong><br/>
          Rest, hydrate, and continue the route.
        </div>
      </div>
      <button onClick={() => setView("dashboard")} 
        style={{...BTN_PRIMARY, width:"100%", marginTop:16, justifyContent:"center"}}>
        BACK TO MY DASHBOARD
      </button>
    </div>
  );
}

// ══════════════════════════════════════
// CYCLIST DASHBOARD
// ══════════════════════════════════════
function DashboardView({ cyclist, setCyclist, lb, checkins, gameAnswers, setView, setShowScanner, activeCP, setActiveCP, showToast }) {
  if (!cyclist) { setView("home"); return null; }
  const team = TEAMS.find(t=>t.id===cyclist.teamId);
  const myCPs = checkins.filter(c=>c.cyclistId===cyclist.id);
  const myAnswers = gameAnswers.filter(a=>a.cyclistId===cyclist.id);
  const teamData = lb.find(t=>t.id===cyclist.teamId);

  const quickCPs = CHECKPOINTS.slice(1); // exclude START from manual list

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      {/* Profile banner */}
      <div style={{background:`${team.color}10`,border:`2px solid ${team.color}33`,borderRadius:14,padding:"20px 16px",marginTop:16,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:44}}>{team.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"monospace",fontSize:18,fontWeight:"bold",color:"#fff",letterSpacing:1}}>{cyclist.name}</div>
            <div style={{fontFamily:"monospace",fontSize:13,color:team.color,letterSpacing:2,marginTop:2}}>TEAM {team.name}</div>
            <div style={{fontSize:11,color:"#555",marginTop:2}}>ID: {cyclist.id}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"monospace",fontSize:28,fontWeight:"bold",color:team.color}}>{teamData?.scores.total||0}</div>
            <div style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>/ 100 PTS</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>RANK #{teamData?.rank||"—"}</div>
          </div>
        </div>
      </div>

      {/* Scan button */}
      <button onClick={()=>setShowScanner(true)} style={{...BTN_PRIMARY,width:"100%",marginBottom:12}}>
        <span style={{fontSize:26}}>📷</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",letterSpacing:2}}>SCAN CHECKPOINT QR</div>
          <div style={{fontSize:12,color:"#88ffcc",marginTop:2}}>Record arrival · Start game</div>
        </div>
      </button>

      {/* Finish Questionnaire status for people who reached Finish */}
      {myCPs.some(c => c.cpId === "finish") && (
        <div style={{...CARD, background:"#1a1408", borderColor:"#ffbb00", marginBottom:12}}>
          <div style={{fontSize:13, color:"#ffbb00", marginBottom:6}}>🏁 FINISH POINT QUESTIONNAIRE</div>
          
          {myAnswers.some(a => a.game === "finish_questionnaire") ? (
            <div style={{background:"#0a2a0a", border:"1px solid #00ff88", borderRadius:8, padding:"10px 12px", marginTop:4}}>
              <div style={{fontSize:13, color:"#00ff88", fontWeight:600}}>✓ Finish Questionnaire Completed (Final)</div>
              <div style={{fontSize:11, color:"#888", marginTop:2}}>Your answers are locked. Admin will review them.</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:12, color:"#ccc", marginBottom:10}}>
                Each team member must submit their own answers to the 3 questions.
              </div>
              <button 
                onClick={() => setView("finishQuestionnaire")}
                style={{...BTN_PRIMARY, width:"100%", background:"#ffbb00", color:"#000"}}
              >
                SUBMIT MY FINISH QUESTIONNAIRE (FINAL)
              </button>
            </div>
          )}
        </div>
      )}

      {/* CP Progress */}
      <div style={CARD}>
        <p style={SEC_LABEL}>MY CHECKPOINT PROGRESS</p>
        {CHECKPOINTS.slice(1).map(cp=>{
          const done = myCPs.find(c=>c.cpId===cp.id);
          return (
            <div key={cp.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #0d0d0d"}}>
              <div style={{width:36,height:36,background:done?"rgba(0,255,136,0.12)":"#0a0a0a",border:`1px solid ${done?"#00ff88":"#1a1a1a"}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                {done?"✅":cp.icon}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:"bold",color:done?"#00ff88":"#aaa"}}>{cp.name}</div>
                <div style={{fontSize:11,color:"#555"}}>{cp.label}</div>
              </div>
              <div style={{fontFamily:"monospace",fontSize:11,color:"#555"}}>
                {done?formatTime(done.timestamp):"—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Game scores */}
      <div style={CARD}>
        <p style={SEC_LABEL}>MY GAME SUBMISSIONS</p>
        {[
          {id:"eyeForDetail", label:"Eye for Detail (CP2)"},
          {id:"finish_questionnaire", label:"Finish Questionnaire"}
        ].map(g=>{
          const ans = myAnswers.find(a=>a.game===g.id);
          return (
            <div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #0d0d0d"}}>
              <div style={{fontSize:12,color:"#aaa"}}>{g.label}</div>
              <div style={{fontFamily:"monospace",fontSize:13,color:ans?"#00ff88":"#444"}}>
                {ans ? "Submitted ✓" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={()=>{setCyclist(null);setView("home");}} style={{...BTN_SEC,width:"100%",marginTop:4}}>LOG OUT</button>
      <BkBtn onClick={()=>setView("home")} />
    </div>
  );
}

// ══════════════════════════════════════
// CP CHECK-IN VIEW
// ══════════════════════════════════════
function CPCheckinView({ activeCP, cyclist, checkins, onCheckin, setView }) {
  const cp = CHECKPOINTS.find(c=>c.id===activeCP);
  const already = checkins.find(c=>c.cyclistId===cyclist?.id&&c.cpId===activeCP);
  const [checking, setChecking] = useState(false);
  const [time] = useState(new Date().toLocaleTimeString());

  const go = async () => { 
    setChecking(true); 
    await onCheckin(); 
    // Note: onCheckin will usually change the view, so this may not be visible long
  };

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon={cp?.icon||"📍"} title={cp?.name||"CHECKPOINT"} sub={cp?.label} />
      {already ? (
        <div style={{...CARD,textAlign:"center",padding:28}}>
          <div style={{fontSize:48,marginBottom:10}}>✅</div>
          <div style={{fontFamily:"monospace",fontSize:16,color:"#00ff88",fontWeight:"bold"}}>ALREADY CHECKED IN</div>
          <div style={{fontSize:12,color:"#555",marginTop:6}}>at {formatTime(already.timestamp)}</div>
          {(activeCP==="cp2")&&<PBtn onClick={()=>setView("eyeForDetail")} icon="▶" label="START EYE FOR DETAIL (30 marks)" style={{marginTop:16}} />}
          {(activeCP==="finish")&&<PBtn onClick={()=>setView("dashboard")} icon="▶" label="BACK TO DASHBOARD" style={{marginTop:16}} />}
        </div>
      ) : (
        <div style={CARD}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontSize:11,color:"#555",fontFamily:"monospace"}}>CYCLIST</div>
              <div style={{fontFamily:"monospace",fontSize:15,fontWeight:"bold",color:"#fff",marginTop:2}}>{cyclist?.name}</div>
              <div style={{fontSize:12,color:TEAMS.find(t=>t.id===cyclist?.teamId)?.color,marginTop:1}}>Team {TEAMS.find(t=>t.id===cyclist?.teamId)?.name}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#555",fontFamily:"monospace"}}>TIME</div>
              <div style={{fontFamily:"monospace",fontSize:18,fontWeight:"bold",color:"#00ff88",marginTop:2}}>{time}</div>
              <div style={{fontSize:10,color:"#444",marginTop:1}}>Timestamp only</div>
            </div>
          </div>

          {checking ? (
            <div style={{textAlign:"center", padding: "20px 0"}}>
              <div style={{fontSize:18, color:"#00ff88", marginBottom:8}}>⏳ Recording your check-in...</div>
              <div style={{fontSize:12, color:"#888"}}>Saving arrival timestamp to the database. Please wait.</div>
            </div>
          ) : (
            <PBtn onClick={go} icon="📍" label="CONFIRM ARRIVAL" sub="Timestamp will be saved to database" />
          )}
        </div>
      )}
      <BkBtn onClick={()=>setView("dashboard")} disabled={checking} />
    </div>
  );
}

// ══════════════════════════════════════
// GAME 1 — Counter Intel Tracking Op
// ══════════════════════════════════════
function Game1View({ cyclist, gameAnswers, onSubmit, setView, showToast }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const already = gameAnswers.find(a=>a.cyclistId===cyclist?.id&&a.game==="game1");

  const submit = () => {
    if (Object.keys(answers).length<GAME1_QUESTIONS.length) { showToast("Answer all questions","error"); return; }
    const res = onSubmit(answers);
    setResult(res);
  };

  if (already||result) {
    const r = already||result;
    return (
      <div className="fadeUp" style={{padding:"0 16px"}}>
        <PageHeader icon="👁️" title="COUNTER INTEL" sub="Game 1 — Your result" />
        <div style={{...CARD,textAlign:"center",padding:28}}>
          <div style={{fontSize:48,marginBottom:12}}>🎯</div>
          <div style={{fontFamily:"monospace",fontSize:44,fontWeight:"bold",color:"#00ff88"}}>{r.correct||already?.correct}/{GAME1_QUESTIONS.length}</div>
          <div style={{fontSize:13,color:"#666",fontFamily:"monospace",marginTop:6}}>+{r.score||already?.score} POINTS</div>
        </div>
        <BkBtn onClick={()=>setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="👁️" title="COUNTER INTEL TRACKING OP" sub="Game 1 at CP1 · 20 marks · 4 pts each" />
      <div style={{...CARD,marginBottom:16,background:"rgba(0,255,136,0.04)",borderColor:"rgba(0,255,136,0.15)"}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:"#00ff88",marginBottom:6}}>⚠️ MISSION BRIEFING</div>
        <div style={{fontSize:13,color:"#aaa",lineHeight:1.7}}>Enemy agents have deployed intelligence items along the route. You have been tracking them. Identify the correct items from your observation. Choose carefully — your team's score depends on you.</div>
      </div>
      {GAME1_QUESTIONS.map((q,i)=>(
        <div key={i} style={{...CARD,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={QBADGE}>Q{i+1}</div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#555"}}>4 MARKS</div>
          </div>
          <p style={{fontSize:14,color:"#ddd",lineHeight:1.65,marginBottom:14}}>{q.q}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {q.options.map(opt=>{
              const sel = answers[i]===opt;
              return (
                <button key={opt} onClick={()=>setAnswers(p=>({...p,[i]:opt}))}
                  style={{background:sel?"rgba(0,255,136,0.12)":"#0a0a0a",border:`2px solid ${sel?"#00ff88":"#1a1a1a"}`,borderRadius:10,padding:"13px 8px",cursor:"pointer",fontFamily:"monospace",fontSize:12,color:sel?"#00ff88":"#999",transition:"all 0.15s",textAlign:"center",lineHeight:1.4}}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <PBtn onClick={submit} icon="✅" label="SUBMIT ANSWERS" sub={`${Object.keys(answers).length}/${GAME1_QUESTIONS.length} answered`} disabled={Object.keys(answers).length<GAME1_QUESTIONS.length} />
      <BkBtn onClick={()=>setView("dashboard")} />
    </div>
  );
}

// ══════════════════════════════════════
// GAME 3 removed during cleanup (old blindfold game no longer used)

// ══════════════════════════════════════
// GAME 4 — Rapid Fire Quiz
// ══════════════════════════════════════
function Game4View({ cyclist, gameAnswers, onSubmit, setView, showToast }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const already = gameAnswers.find(a=>a.cyclistId===cyclist?.id&&a.game==="game4");

  const submit = () => {
    if (Object.keys(answers).length<GAME4_QUESTIONS.length) { showToast("Answer all questions","error"); return; }
    const res = onSubmit(answers);
    setResult(res);
  };

  if (already||result) {
    const r = already||result;
    return (
      <div className="fadeUp" style={{padding:"0 16px"}}>
        <PageHeader icon="🧩" title="RAPID FIRE QUIZ" sub="Game 4 — Your result" />
        <div style={{...CARD,textAlign:"center",padding:28}}>
          <div style={{fontSize:48,marginBottom:12}}>🎯</div>
          <div style={{fontFamily:"monospace",fontSize:44,fontWeight:"bold",color:"#00ff88"}}>{r.correct||already?.correct}/{GAME4_QUESTIONS.length}</div>
          <div style={{fontSize:13,color:"#666",fontFamily:"monospace",marginTop:6}}>+{r.score||already?.score} POINTS</div>
        </div>
        <BkBtn onClick={()=>setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🧩" title="RAPID FIRE QUIZ" sub="Game 4 at CP3 · 15 marks · 3 pts each" />
      <div style={{...CARD,marginBottom:16,background:"rgba(255,187,0,0.04)",borderColor:"rgba(255,187,0,0.15)"}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:"#ffbb00",marginBottom:6}}>⚡ COUNTER INTEL INTERROGATION</div>
        <div style={{fontSize:13,color:"#aaa",lineHeight:1.7}}>You have been captured by the enemy. Answer these 5 rapid-fire questions correctly. One option in each question is a deliberate trap. Stay sharp.</div>
      </div>
      {GAME4_QUESTIONS.map((q,i)=>(
        <div key={i} style={{...CARD,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{...QBADGE,background:"rgba(255,187,0,0.1)",borderColor:"rgba(255,187,0,0.2)",color:"#ffbb00"}}>Q{i+1}</div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#555"}}>3 MARKS</div>
          </div>
          <p style={{fontSize:14,color:"#ddd",lineHeight:1.65,marginBottom:14}}>{q.q}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {q.options.map(opt=>{
              const sel = answers[i]===opt;
              const isFunny = opt===q.funny;
              return (
                <button key={opt} onClick={()=>setAnswers(p=>({...p,[i]:opt}))}
                  style={{background:sel?(isFunny?"rgba(255,100,0,0.1)":"rgba(0,255,136,0.12)"):"#0a0a0a",
                    border:`2px solid ${sel?(isFunny?"#ff6400":"#00ff88"):"#1a1a1a"}`,
                    borderRadius:10,padding:"13px 8px",cursor:"pointer",fontFamily:"monospace",fontSize:12,
                    color:sel?(isFunny?"#ff6400":"#00ff88"):(isFunny?"#555":"#999"),
                    transition:"all 0.15s",textAlign:"center",lineHeight:1.4,
                    fontStyle:isFunny?"italic":"normal"}}>
                  {opt} {isFunny&&!sel?"😄":""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <PBtn onClick={submit} icon="✅" label="SUBMIT ANSWERS" sub={`${Object.keys(answers).length}/${GAME4_QUESTIONS.length} answered`} disabled={Object.keys(answers).length<GAME4_QUESTIONS.length} />
      <BkBtn onClick={()=>setView("dashboard")} />
    </div>
  );
}

// ══════════════════════════════════════
// Finish Questionnaire (now integrated directly in the app)
// ══════════════════════════════════════
function Game5View({ cyclist, gameAnswers, setGameAnswers, setView, showToast }) {
  const [answers, setAnswers] = useState(["","",""]);
  const already = gameAnswers.find(a=>a.cyclistId===cyclist?.id&&a.game==="game5");

  const submit = () => {
    if (answers.some(a=>!a.trim())) { showToast("Answer all questions","error"); return; }
    const entry = { id:genId(), cyclistId:cyclist.id, cyclistName:cyclist.name, teamId:cyclist.teamId, game:"game5", answers, score:0, submittedAt:new Date().toISOString() };
    setGameAnswers(prev=>[...prev,entry]);
    showToast("Answers submitted! Admin will score.");
    setView("dashboard");
  };

  if (already) {
    return (
      <div className="fadeUp" style={{padding:"0 16px"}}>
        <PageHeader icon="🏆" title="FINISH QUESTIONNAIRE" sub="Already submitted" />
        <div style={{...CARD,textAlign:"center",padding:28}}>
          <div style={{fontSize:48,marginBottom:10}}>✅</div>
          <div style={{fontFamily:"monospace",color:"#00ff88",fontSize:14}}>Submitted! Admin will award 0–10 marks.</div>
        </div>
        <BkBtn onClick={()=>setView("dashboard")} />
      </div>
    );
  }

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🏆" title="FINISH QUESTIONNAIRE" sub="Admin scored (0-5 per team)" />
      <div style={{...CARD,marginBottom:16,background:"rgba(74,240,255,0.04)",borderColor:"rgba(74,240,255,0.15)"}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:"#4af0ff",marginBottom:6}}>🏁 DEBRIEF QUESTIONNAIRE</div>
        <div style={{fontSize:13,color:"#aaa",lineHeight:1.7}}>You have completed the mission. Answer these debrief questions honestly. Your answers will be reviewed by the admin. Points 0–10 awarded for best answers.</div>
      </div>
      {GAME5_QUESTIONS.map((q,i)=>(
        <div key={i} style={{...CARD,marginBottom:12}}>
          <div style={{...QBADGE,marginBottom:10,display:"inline-flex",background:"rgba(74,240,255,0.08)",borderColor:"rgba(74,240,255,0.2)",color:"#4af0ff"}}>Q{i+1}</div>
          <p style={{fontSize:14,color:"#ddd",lineHeight:1.65,marginBottom:12}}>{q}</p>
          <textarea value={answers[i]} onChange={e=>{const a=[...answers];a[i]=e.target.value;setAnswers(a);}}
            placeholder="Your answer..." rows={2}
            style={{width:"100%",background:"#080808",border:"1px solid #1a1a1a",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,fontFamily:"inherit",resize:"none",outline:"none"}} />
        </div>
      ))}
      <PBtn onClick={submit} icon="🏁" label="SUBMIT DEBRIEF" sub="Final submission" />
      <BkBtn onClick={()=>setView("dashboard")} />
    </div>
  );
}

// ══════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════
function LeaderboardView({ lb, scoring, setView }) {
  const medals=["🥇","🥈","🥉","4️⃣"];
  const rc=["#ffd700","#c0c0c0","#cd7f32","#888"];
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🏆" title="LEADERBOARD" sub="Live rankings — 100 marks total" />
      {lb.every(t=>t.scores.total===0)&&<div style={{textAlign:"center",padding:40,color:"#444",fontFamily:"monospace",fontSize:13}}>Event not started yet</div>}
      {lb.map((team,i)=>(
        <div key={team.id} style={{background:i===0?`${team.color}10`:"#0d0d0d",border:`2px solid ${i===0?team.color:"#1a1a1a"}`,borderRadius:14,padding:16,marginBottom:12,transform:i===0?"scale(1.01)":"scale(1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontSize:28}}>{medals[i]}</span>
            <span style={{fontSize:34}}>{team.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"monospace",fontSize:20,fontWeight:"bold",color:team.color,letterSpacing:2}}>{team.name}</div>
              <div style={{fontSize:12,color:"#555",marginTop:2}}>{team.members?.length||0} riders</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"monospace",fontSize:30,fontWeight:"bold",color:rc[i]}}>{team.scores.total}</div>
              <div style={{fontSize:10,color:"#444",fontFamily:"monospace"}}>/ 100</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,borderTop:"1px solid #111",paddingTop:12}}>
            {[["ARRIVAL",team.scores.arrival],["EYE FOR DETAIL",team.scores.eyeForDetail || 0],["JERRICAN",team.scores.game2],["FINISH Q (manual)",team.scores.game5]].map(([label,val])=>(
              <div key={label} style={{textAlign:"center"}}>
                <div style={{fontFamily:"monospace",fontSize:14,fontWeight:"bold",color:"#aaa"}}>{val}</div>
                <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={()=>setView("scoringGuide")} style={{...BTN_SEC,width:"100%",marginBottom:8}}>📋 VIEW SCORING GUIDE</button>
      <BkBtn onClick={()=>setView("home")} />
    </div>
  );
}

// ══════════════════════════════════════
// SCORING GUIDE VIEW
// ══════════════════════════════════════
function ScoringGuideView({ setView }) {
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="📊" title="SCORING GUIDE" sub="How points are awarded" />

      <div style={{...CARD, marginBottom:12}}>
        <div style={{fontSize:13, color:"#888", marginBottom:12}}>Total possible: 90 points</div>

        <div style={{padding:"12px 0", borderBottom:"1px solid #222"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div><div style={{fontWeight:600}}>Game A — Eye for Detail (CP2)</div><div style={{fontSize:12, color:"#666"}}>15 questions × 2 marks each</div></div>
            <div style={{fontFamily:"monospace", fontWeight:"bold", color:"#00ff88"}}>30 pts</div>
          </div>
        </div>

        <div style={{padding:"12px 0", borderBottom:"1px solid #222"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div><div style={{fontWeight:600}}>Game B — Jerrican Carry</div><div style={{fontSize:12, color:"#666"}}>First = 40, 2nd=28, 3rd=18, 4th=10. -5 per violation.</div></div>
            <div style={{fontFamily:"monospace", fontWeight:"bold", color:"#00ff88"}}>40 pts max</div>
          </div>
        </div>

        <div style={{padding:"12px 0", borderBottom:"1px solid #222"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div><div style={{fontWeight:600}}>Game C — Finish Questionnaire</div><div style={{fontSize:12, color:"#666"}}>Admin manual (0-5)</div></div>
            <div style={{fontFamily:"monospace", fontWeight:"bold", color:"#00ff88"}}>5 pts</div>
          </div>
        </div>

        <div style={{padding:"12px 0"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <div><div style={{fontWeight:600}}>Game D — Rapid Fire</div><div style={{fontSize:12, color:"#666"}}>Admin manual (0-15)</div></div>
            <div style={{fontFamily:"monospace", fontWeight:"bold", color:"#00ff88"}}>15 pts</div>
          </div>
        </div>
      </div>

      <div style={{...CARD, background:"#111"}}>
        <div style={{fontSize:12, color:"#888"}}>Note: Arrival timing bonuses are legacy/optional.</div>
      </div>

      <BkBtn onClick={() => setView("home")} />
    </div>
  );
}

// ══════════════════════════════════════
// QR CODES VIEW (Admin only)
// ══════════════════════════════════════
function QRCodesView({ setView }) {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [expandedQR, setExpandedQR] = useState(null);
  const expandedQrRef = useRef(null);
  const smallQrRefs = useRef({});
  const [qrSize, setQrSize] = useState(280);

  const items = [
    {label:"REGISTRATION",value:buildQRUrl("register"),icon:"📝",desc:"Opens registration form",color:"#00ff88"},
    {label:"CP 1 — KM 16",value:buildQRUrl("cp1"),icon:"💧",desc:"Check-in + Hydration",color:"#4af0ff"},
    {label:"CP 2 — KM 22",value:buildQRUrl("cp2"),icon:"👁️",desc:"Check-in + Eye for Detail (30 marks)",color:"#ffbb00"},
    {label:"CP 3 — KM 31",value:buildQRUrl("cp3"),icon:"💧",desc:"Check-in + Hydration",color:"#4af0ff"},
    {label:"FINISH — KM 40",value:buildQRUrl("finish"),icon:"🏆",desc:"Check-in + Finish Questionnaire",color:"#00ff88"},
  ];

  // Load real QR code library on demand
  useEffect(() => {
    if (window.QRCode) {
      setQrLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => setQrLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Responsive QR size for true full-screen zoom on any phone (used in lightbox)
  useEffect(() => {
    const updateSize = () => {
      if (typeof window === "undefined") return;
      const available = Math.max(240, Math.min(420, window.innerWidth - 90));
      setQrSize(available);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, []);

  // Generate small preview QRs once when library ready (stable, no re-gen flicker when opening lightbox)
  useEffect(() => {
    if (!qrLoaded || !window.QRCode) return;
    items.forEach((item) => {
      const el = smallQrRefs.current[item.value];
      if (el) {
        el.innerHTML = "";
        try {
          new window.QRCode(el, {
            text: item.value,
            width: 130,
            height: 130,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.H
          });
        } catch (e) {}
      }
    });
  }, [qrLoaded]);

  // Generate large QR in lightbox (uses ref + responsive size for perfect fit + zoom)
  useEffect(() => {
    if (!expandedQR || !qrLoaded || !window.QRCode || !expandedQrRef.current) return;
    const container = expandedQrRef.current;
    container.innerHTML = "";
    try {
      new window.QRCode(container, {
        text: expandedQR.value,
        width: qrSize,
        height: qrSize,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });
    } catch (e) {}
  }, [expandedQR, qrLoaded, qrSize]);

  const openQR = (item) => {
    setExpandedQR(item);
  };

  const closeQR = () => {
    setExpandedQR(null);
  };

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="⬛" title="QR CODES" sub="Real scannable codes for mobile admin use" />
      <div style={{...CARD,marginBottom:16,background:"rgba(255,85,85,0.05)",borderColor:"rgba(255,85,85,0.2)"}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:"#ff5555",marginBottom:4}}>🔒 ADMIN ONLY</div>
        <div style={{fontSize:12,color:"#888"}}>Tap any code below for a large version. Participants can scan with their normal phone camera (opens the app) or use the in-app scanner.</div>
      </div>

      {!qrLoaded && (
        <div style={{textAlign:"center", padding:20, color:"#666"}}>Loading real QR code generator...</div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {items.map(item => (
          <div 
            key={item.value} 
            onClick={() => openQR(item)}
            style={{
              background:"#0a0a0a",
              border:`1px solid ${item.color}33`,
              borderRadius:12,
              padding:14,
              cursor: "pointer",
              transition: "transform 0.1s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <div style={{display:"flex",justifyContent:"center",marginBottom:10, minHeight:130}}>
              {qrLoaded && window.QRCode ? (
                <div ref={el => { if (el) smallQrRefs.current[item.value] = el; }} style={{width:130,height:130}} />
              ) : (
                <div style={{width:130,height:130,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontSize:12}}>
                  Loading...
                </div>
              )}
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:4}}>{item.icon}</div>
              <div style={{fontFamily:"monospace",fontSize:11,fontWeight:"bold",color:item.color,letterSpacing:1,marginBottom:2}}>{item.label}</div>
              <div style={{fontSize:11,color:"#444"}}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <BkBtn onClick={()=>setView("admin")} />

      {/* Full Screen QR Modal — tap-to-zoom lightbox for admin phone use at checkpoints */}
      {expandedQR && (
        <div 
          onClick={closeQR}
          onTouchEnd={closeQR}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            cursor: "pointer"
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            style={{
              background: "#0a0a0a",
              borderRadius: 14,
              padding: "12px 10px 14px",
              maxWidth: "98vw",
              width: "100%",
              textAlign: "center",
              border: `2px solid ${expandedQR.color}55`
            }}
          >
            {/* Very prominent instruction for the person being shown the QR */}
            <div style={{
              background: "rgba(0,255,136,0.08)",
              border: "1px solid #00ff88",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 8,
              fontSize: 12,
              lineHeight: 1.3
            }}>
              <div style={{color: "#00ff88", fontWeight: "bold", marginBottom: 2}}>PARTICIPANT INSTRUCTIONS</div>
              <div style={{color: "#ddd"}}>
                Point your phone camera at this screen (or open the app → SCAN QR)
              </div>
            </div>

            <div style={{marginBottom: 6}}>
              <div style={{fontSize: 14, fontWeight: "bold", color: expandedQR.color, marginBottom: 1, letterSpacing: 0.5}}>
                {expandedQR.label}
              </div>
              <div style={{fontSize: 10, color: "#666"}}>{expandedQR.desc}</div>
            </div>

            {/* Maximized QR for screen-to-camera scanning */}
            <div 
              ref={expandedQrRef}
              style={{ 
                display: "flex", 
                justifyContent: "center",
                background: "white",
                padding: 8,
                borderRadius: 8,
                marginBottom: 8,
                minHeight: Math.min(qrSize + 16, 420)
              }}
            />

            {/* Full URL (what the QR actually encodes) — shown for admin reference */}
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#222",
              background: "#f1f1f1",
              padding: "6px 8px",
              borderRadius: 6,
              marginBottom: 6,
              userSelect: "all",
              WebkitUserSelect: "all",
              wordBreak: "break-all",
              lineHeight: 1.25
            }}>
              {expandedQR.value}
            </div>

            <div style={{fontSize: 10, color: "#888", marginBottom: 8}}>
              Works best with the in-app scanner. Native camera may open the browser.
            </div>

            <button 
              onClick={closeQR}
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                padding: "10px 28px",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 13,
                cursor: "pointer",
                minWidth: 110
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// ADMIN AUTH
// ══════════════════════════════════════
function AdminAuthView({ adminPin, setAdminPin, onAuth, setView }) {
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="⚙️" title="ADMIN ACCESS" sub={`Organizer console · PIN required`} />
      <div style={CARD}>
        <Field label="ADMIN PIN"><Input type="password" placeholder="••••" value={adminPin} onChange={setAdminPin} onEnter={onAuth} /></Field>
        <div style={{fontSize:11,color:"#444",fontFamily:"monospace",textAlign:"center",marginTop:6}}>Default PIN: 1234</div>
        <PBtn onClick={onAuth} icon="🔓" label="AUTHENTICATE" style={{marginTop:16}} />
        <BkBtn onClick={()=>setView("home")} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════
function AdminView({ participants, lb, checkins, gameAnswers, game2Status, setGame2Status, manualScores, setManualScores, scoring, setScoring, setView, showToast, supabaseStatus, setSupabaseStatus, onRefreshData, onAdminLogout, lastDbSync, setLastDbSync, manualScoresSaving, manualScoresLastSaved, jerricanFinishOrder, setJerricanFinishOrder, saveJerricanToDB }) {
  const [tab, setTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh from DB every 10 seconds while Admin is open (near real-time without Realtime subscriptions)
  const isRefreshingRef = useRef(isRefreshing);
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    if (!onRefreshData) return;

    const interval = setInterval(async () => {
      if (isRefreshingRef.current) return; // Avoid overlapping refreshes

      try {
        await onRefreshData();
        setLastDbSync(new Date());
      } catch (e) {
        // Silent fail for background auto-refresh
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [onRefreshData, setLastDbSync]);

  // Export CSV
  const exportCSV = () => {
    const rows=[["Rank","Team","Total","Arrival","Game1","Game2","Game3","Game4","Game5","Members"],...lb.map(t=>[t.rank,t.name,t.scores.total,t.scores.arrival,t.scores.game1,t.scores.game2,t.scores.game3,t.scores.game4,t.scores.game5,t.members.length])];
    const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cycleops_results.csv";a.click();
    showToast("Exported!");
  };

  return (
    <div className="fadeUp">
      <div style={{padding:"20px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <h2 style={{fontFamily:"monospace",fontSize:22,fontWeight:"bold",letterSpacing:2}}>ADMIN CONSOLE</h2>
            <div style={{fontSize:11,color:"#555",marginTop:2, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
              Organizer control panel • LIVE
              <span style={{background:"#112211", color:"#66ff99", padding:"1px 6px", borderRadius:4, fontSize:10}}>
                Auto-refresh every 10s
              </span>
              {lastDbSync ? (
                <span style={{background:"#0a2a0a", color:"#00ff88", padding:"1px 6px", borderRadius:4, fontSize:10}}>
                  Last synced: {lastDbSync.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                </span>
              ) : (
                <span style={{background:"#2a1a0a", color:"#ffaa00", padding:"1px 6px", borderRadius:4, fontSize:10}}>
                  No recent DB writes
                </span>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button 
              onClick={async () => {
                if (onRefreshData) {
                  setIsRefreshing(true);
                  showToast("Refreshing data from Supabase...");
                  await onRefreshData();
                  setLastDbSync(new Date()); // Update last saved timestamp after refresh
                  showToast("Data refreshed from database");
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              style={{background:"#111",border:"1px solid #00ff88",color:"#00ff88",padding:"6px 12px",borderRadius:6,fontFamily:"monospace",fontSize:11,cursor:isRefreshing ? "not-allowed" : "pointer", opacity: isRefreshing ? 0.6 : 1}}
            >
              {isRefreshing ? "REFRESHING..." : "↻ REFRESH FROM DB"}
            </button>
            <button 
              onClick={() => {
                if (onAdminLogout) onAdminLogout();
              }}
              style={{background:"#3a0f0f",border:"1px solid #ff5555",color:"#ff8888",padding:"6px 12px",borderRadius:6,fontFamily:"monospace",fontSize:11,cursor:"pointer"}}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",borderBottom:"1px solid #111",background:"rgba(6,6,6,0.97)",position:"sticky",top:54,zIndex:50,backdropFilter:"blur(8px)"}}>
        {[["overview","📊","OVERVIEW"],["jerrican","⛽","JERRICAN"],["riders","👤","RIDERS"],["manual","✍️","MANUAL SCORES"],["settings","⚙️","SETTINGS"]].map(([id,icon,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:"10px 2px",background:"none",border:"none",borderBottom:`3px solid ${tab===id?"#00ff88":"transparent"}`,cursor:"pointer",color:tab===id?"#00ff88":"#555",transition:"all 0.2s"}}>
            <div style={{fontSize:16}}>{icon}</div>
            <div style={{fontFamily:"monospace",fontSize:8,marginTop:2}}>{label}</div>
          </button>
        ))}
      </div>

      <div style={{padding:"16px 16px 0"}}>

        {/* OVERVIEW */}
        {tab==="overview"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[["👤","RIDERS",participants.length],["📍","CHECK-INS",checkins.length],["🏆","TOP",lb[0]?.scores.total||0],["⚡","ACTIVE",lb.filter(t=>t.scores.total>0).length]].map(([icon,label,val])=>(
                <div key={label} style={{...CARD,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
                  <div style={{fontFamily:"monospace",fontSize:30,fontWeight:"bold",color:"#00ff88"}}>{val}</div>
                  <div style={{fontFamily:"monospace",fontSize:10,color:"#444",marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>
            <p style={SEC_LABEL}>LIVE RANKINGS</p>
            {lb.map((team,i)=>(
              <div key={team.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid #0d0d0d"}}>
                <span style={{fontFamily:"monospace",fontSize:12,color:"#555",width:22}}>#{i+1}</span>
                <span style={{fontSize:20}}>{team.emoji}</span>
                <span style={{fontFamily:"monospace",fontSize:15,fontWeight:"bold",color:team.color,flex:1,letterSpacing:2}}>{team.name}</span>
                <span style={{fontFamily:"monospace",fontSize:20,fontWeight:"bold",color:"#fff"}}>{team.scores.total}</span>
                <span style={{fontFamily:"monospace",fontSize:11,color:"#444"}}>/100</span>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={()=>setView("qrcodes")} style={{...BTN_PRIMARY,flex:1,justifyContent:"center"}}>⬛ QR CODES</button>
              <button onClick={exportCSV} style={{...BTN_SEC,flex:1}}>📥 EXPORT</button>
            </div>
          </div>
        )}

        {/* JERRICAN CARRY (40 marks for first correct team) */}
        {tab==="jerrican"&&(
          <div>
            <div style={{...CARD,marginBottom:16,background:"rgba(255,187,0,0.04)",borderColor:"rgba(255,187,0,0.15)"}}>
              <div style={{fontFamily:"monospace",fontSize:13,color:"#ffbb00",marginBottom:6}}>⛽ JERRICAN CARRY • CP2 → FINISH</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>
                First team to arrive at Finish with both 5kg jerricans + all members + no violations = <strong>40 marks</strong>.<br />
                5 points penalty per violation (hand change every 2 km etc.).
              </div>
            </div>

            {TEAMS.map(team => {
              const j = game2Status[team.id] || {};
              const elapsed = j.startTime && !j.finished ? Math.floor((Date.now() - new Date(j.startTime))/1000) : null;
              const isFirst = j.finished && j.completed && j.rank === 1;

              return (
                <div key={team.id} style={{...CARD, marginBottom:12, borderColor: `${team.color}33`}}>
                  <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
                    <span style={{fontSize:22}}>{team.emoji}</span>
                    <span style={{fontFamily:"monospace", fontSize:15, fontWeight:"bold", color:team.color, flex:1}}>{team.name}</span>
                    {j.finished && <span style={{fontFamily:"monospace", fontSize:12, color: isFirst ? "#ffd700" : "#00ff88"}}>{isFirst ? "🏆 40 PTS" : "FINISHED"}</span>}
                  </div>

                  <div style={{fontFamily:"monospace", fontSize:12, color:"#888", marginBottom:8}}>
                    {j.startTime ? `Started: ${new Date(j.startTime).toLocaleTimeString()}` : "Not started"}
                    {j.finished && j.finishTime ? ` → Finished: ${new Date(j.finishTime).toLocaleTimeString()}` : ""}
                    {j.penaltyCount > 0 && ` • Penalties: ${j.penaltyCount} (-${j.penaltyCount*5} pts)`}
                  </div>

                  <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                    {!j.startTime && (
                      <button onClick={() => {
                        const newStatus = {...(game2Status[team.id]||{}), started:true, startTime: new Date().toISOString() };
                        setGame2Status(p => ({...p, [team.id]: newStatus }));
                        saveJerricanToDB(team.id, newStatus, showToast);
                        showToast(`${team.name} jerrican carry started`);
                      }} style={{background:"#111", border:"1px solid #ffbb00", color:"#ffbb00", padding:"8px 14px", borderRadius:8, fontSize:12, cursor:"pointer"}}>
                        START CARRY
                      </button>
                    )}

                    {j.startTime && !j.finished && (
                      <button onClick={() => {
                        const newPenalty = (game2Status[team.id]?.penaltyCount || 0) + 1;
                        const newStatus = {...(game2Status[team.id]||{}), penaltyCount: newPenalty };
                        setGame2Status(p => ({...p, [team.id]: newStatus }));
                        saveJerricanToDB(team.id, newStatus, showToast);
                        showToast(`${team.name} +1 penalty (-5 pts)`);
                      }} style={{background:"#111", border:"1px solid #ff5555", color:"#ff8888", padding:"8px 14px", borderRadius:8, fontSize:12, cursor:"pointer"}}>
                        + PENALTY (5 pts)
                      </button>
                    )}

                    {j.startTime && !j.finished && (
                      <button onClick={() => {
                        const now = new Date().toISOString();
                        const newOrder = [...jerricanFinishOrder, team.id];
                        const rank = newOrder.length; // 1 = first, 2 = second, etc.
                        const newStatus = {...(game2Status[team.id]||{}), finished:true, finishTime: now, completed:true, rank };
                        setJerricanFinishOrder(newOrder);
                        setGame2Status(p => ({...p, [team.id]: newStatus }));
                        saveJerricanToDB(team.id, newStatus, showToast);
                        showToast(`${team.name} marked as finished with jerricans (Rank ${rank})`);
                      }} style={{background:"rgba(0,255,136,0.1)", border:"1px solid #00ff88", color:"#00ff88", padding:"8px 14px", borderRadius:8, fontSize:12, cursor:"pointer"}}>
                        MARK FINISHED (both jerricans)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MANUAL SCORES ENTRY - with the 3 Finish questions */}
        {tab==="manual"&&(
          <div>
            {/* Finish Questionnaire Responses - Admin Review (Individual Answers) */}
            <div style={{...CARD, marginBottom:16, background:"#111"}}>
              <div style={{fontFamily:"monospace", fontSize:13, color:"#ffaa00", marginBottom:8}}>
                FINISH QUESTIONNAIRE RESPONSES (Each member answers separately)
              </div>
              {TEAMS.map(team => {
                const responses = gameAnswers.filter(a => a.teamId === team.id && a.game === "finish_questionnaire");
                const currentMarks = manualScores[team.id]?.finishQ || 0;

                return (
                  <div key={team.id} style={{marginBottom:14, paddingBottom:10, borderBottom:"1px solid #222"}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
                      <span>{team.emoji}</span>
                      <strong style={{color: team.color}}>{team.name}</strong>
                      <span style={{fontSize:11, color:"#555"}}>({responses.length} answered)</span>
                    </div>

                    {responses.length > 0 ? (
                      responses.map((resp, idx) => (
                        <div key={idx} style={{marginBottom:8, paddingLeft:8, borderLeft:"2px solid #333"}}>
                          <div style={{fontSize:11, color:"#00ff88", marginBottom:2}}>
                            {resp.cyclistName || "Unknown member"}
                          </div>
                          <div style={{fontSize:11, color:"#ccc", lineHeight:1.3}}>
                            {FINISH_QUESTIONNAIRE_QUESTIONS.map((q, i) => (
                              <div key={i} style={{marginBottom:1}}>
                                <span style={{color:"#888"}}>Q{i+1}:</span> {resp.answers?.[i] || <em style={{color:"#555"}}>—</em>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{fontSize:11, color:"#666", fontStyle:"italic", marginBottom:4}}>No responses yet from this team</div>
                    )}

                    <div style={{display:"flex", alignItems:"center", gap:8, marginTop:4}}>
                      <span style={{fontSize:11, color:"#888"}}>Team Marks (0-5):</span>
                      <input 
                        type="number" min="0" max="5" value={currentMarks}
                        onChange={e => {
                          const val = Math.max(0, Math.min(5, parseInt(e.target.value) || 0));
                          setManualScores(p => ({...p, [team.id]: {...(p[team.id]||{}), finishQ: val }}));
                        }}
                        style={{width:55, background:"#111", border:"1px solid #333", color:"#fff", padding:"3px 6px", borderRadius:4, textAlign:"center", fontSize:12}}
                      />
                      <span style={{fontSize:11, color:"#00ff88"}}>{currentMarks}/5</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{...CARD,marginBottom:16}}>
              <div style={{fontFamily:"monospace",fontSize:14,color:"#4af0ff",marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span>✍️ MANUAL SCORE ENTRY</span>
                {manualScoresSaving ? (
                  <span style={{fontSize:10, color:"#ffbb00", fontWeight:600}}>Saving changes to database...</span>
                ) : lastDbSync && (
                  <span style={{fontSize:10, color:"#00ff88", background:"#0a2a0a", padding:"1px 5px", borderRadius:3}}>
                    Last saved: {lastDbSync.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                  </span>
                )}
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,color:"#ffaa00",marginBottom:6}}>FINISH QUESTIONNAIRE (0-5 total)</div>
                <div style={{fontSize:11,color:"#888",marginBottom:8, lineHeight:1.4}}>
                  1. Which rider consistently dropped back during the canal leg?<br />
                  2. Who gave wrong answers to eye for detail questionnaire at CP2?<br />
                  3. Who do you suspect is a saboteur in your team?
                </div>
              </div>

              {TEAMS.map(team => {
                const m = manualScores[team.id] || { rapidFire: 0, finishQ: 0 };
                return (
                  <div key={team.id} style={{...CARD, marginBottom:12, borderColor:`${team.color}33`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:18}}>{team.emoji}</span>
                      <span style={{fontFamily:"monospace",fontWeight:"bold",color:team.color,flex:1}}>{team.name}</span>
                    </div>

                    {/* Finish Questionnaire - shows the 3 questions */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:10,color:"#ffaa00",marginBottom:4}}>FINISH QUESTIONNAIRE (0-5)</div>
                      <div style={{fontSize:11,color:"#888",marginBottom:6, lineHeight:1.3}}>
                        1. Which rider consistently dropped back during the canal leg?<br />
                        2. Who gave wrong answers to eye for detail at CP2?<br />
                        3. Who do you suspect is a saboteur in your team?
                      </div>
                      <input 
                        type="range" min="0" max="5" step="1" value={m.finishQ}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setManualScores(p => ({...p, [team.id]: {...p[team.id], finishQ: val }}));
                        }}
                        style={{width:"100%"}}
                      />
                      <div style={{textAlign:"right", fontSize:12, color:"#00ff88"}}>{m.finishQ}/5</div>
                    </div>

                    {/* Rapid Fire */}
                    <div>
                      <div style={{fontSize:10,color:"#555",marginBottom:4}}>RAPID FIRE (0-15)</div>
                      <input 
                        type="number" min="0" max="15" value={m.rapidFire}
                        onChange={e => {
                          const val = Math.max(0, Math.min(15, parseInt(e.target.value)||0));
                          setManualScores(p => ({...p, [team.id]: {...p[team.id], rapidFire: val }}));
                        }}
                        style={{width:"100%",background:"#111",border:"1px solid #333",color:"#fff",padding:"6px",borderRadius:6,textAlign:"center"}} 
                      />
                    </div>

                    {manualScoresLastSaved[team.id] && (
                      <div style={{fontSize:9, color:"#00aa66", marginTop:4, textAlign:"right"}}>
                        Saved at {manualScoresLastSaved[team.id].toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RIDERS */}
        {tab==="riders"&&(
          <div>
            <div style={{fontFamily:"monospace",fontSize:11,color:"#555",marginBottom:12}}>{participants.length} PARTICIPANTS REGISTERED</div>
            {participants.length===0&&<div style={{textAlign:"center",padding:40,color:"#444",fontFamily:"monospace",fontSize:13}}>No participants yet</div>}
            {participants.map(p=>{
              const team=TEAMS.find(t=>t.id===p.teamId);
              const pCheckins=checkins.filter(c=>c.cyclistId===p.id);
              const hasFinishedQ = gameAnswers.some(a => a.cyclistId === p.id && a.game === "finish_questionnaire");
              
              return (
                <div key={p.id} style={{borderLeft:`3px solid ${team?.color||"#333"}`,background:"#0a0a0a",padding:"12px 14px",marginBottom:8,borderRadius:"0 10px 10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:"bold",color:"#ddd"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:3}}>Age {p.age} · {p.phone}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{pCheckins.length} check-ins</div>
                      {hasFinishedQ && (
                        <div style={{fontSize:10, color:"#00ff88", marginTop:3}}>
                          ✓ Finish Questionnaire submitted
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:"bold",color:team?.color}}>{team?.emoji} {team?.name}</div>
                      <div style={{fontSize:10,color:"#444",marginTop:2}}>{formatTime(p.registeredAt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SCORES */}
        {tab==="scores"&&(
          <div>
            <p style={{fontFamily:"monospace",fontSize:11,color:"#555",marginBottom:12}}>MANUAL SCORES (Rapid Fire + Finish Questionnaire)</p>
            {TEAMS.map(team=>(
              <div key={team.id} style={{...CARD,marginBottom:10,borderColor:`${team.color}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:22}}>{team.emoji}</span>
                  <span style={{fontFamily:"monospace",fontSize:15,fontWeight:"bold",color:team.color,flex:1}}>{team.name}</span>
                  <span style={{fontFamily:"monospace",fontSize:22,fontWeight:"bold",color:"#fff"}}>{(manualScores[team.id]?.rapidFire || 0) + (manualScores[team.id]?.finishQ || 0)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <input type="range" min="0" max="5" value={manualScores[team.id]?.finishQ || 0}
                    onChange={e => setManualScores(p => ({...p, [team.id]: {...(p[team.id]||{}), finishQ: parseInt(e.target.value) }}))}
                    style={{flex:1,accentColor:team.color,cursor:"pointer"}} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>0 — LOW</span>
                  <span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>5 — HIGH</span>
                </div>

                {manualScoresLastSaved[team.id] && (
                  <div style={{fontSize:9, color:"#00aa66", marginTop:6, textAlign:"right"}}>
                    Saved at {manualScoresLastSaved[team.id].toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings"&&(
          <div>
            <p style={SEC_LABEL}>EVENT MODE</p>
            <div style={{...CARD,marginBottom:16,borderColor:"#00ff8833"}}>
              <div style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:"#00ff88"}}>LIVE MODE</div>
              <div style={{fontSize:12,color:"#555",marginTop:4}}>
                All registrations, check-ins and answers write directly to Supabase.
              </div>
            </div>

            {/* SUPABASE CONNECTION TESTER */}
            <p style={SEC_LABEL}>SUPABASE CONNECTION (Official Client)</p>
            <div style={{...CARD,marginBottom:16}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <button
                  onClick={async () => {
                    setSupabaseStatus("testing");
                    const result = await testSupabaseConnection();
                    setSupabaseStatus(result);
                    if (result.ok) {
                      showToast("Supabase connection OK — read + write both work");
                    } else {
                      showToast("Supabase test failed at step: " + result.step + " — " + result.error, "error");
                    }
                  }}
                  disabled={supabaseStatus==="testing"}
                  style={{background:"#111",border:"1px solid #00ff88",color:"#00ff88",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontFamily:"monospace",fontSize:12}}>
                  {supabaseStatus==="testing" ? "TESTING..." : "TEST SUPABASE CONNECTION"}
                </button>

                {/* Dangerous Reset button removed for safety. 
                    Database wipes should only be done directly in Supabase dashboard. */}

              </div>

              {supabaseStatus && supabaseStatus !== "testing" && (
                <div style={{marginTop:12,fontSize:12,fontFamily:"monospace",color:supabaseStatus.ok?"#00ff88":"#ff6666"}}>
                  {supabaseStatus.ok
                    ? "✓ Connection successful — read + write + cleanup all worked"
                    : `✗ Failed at "${supabaseStatus.step}": ${supabaseStatus.error}`}
                </div>
              )}

              <div style={{marginTop:10,fontSize:11,color:"#666"}}>
                Current target: {SUPABASE_URL ? SUPABASE_URL.replace(/https?:\/\//,"").split(".")[0] + ".supabase.co" : "NOT CONFIGURED"}
              </div>
            </div>

            <p style={SEC_LABEL}>SCORING CONFIG (LIVE EDIT)</p>
            {Object.entries(scoring).map(([key,s])=>(
              <div key={key} style={{...CARD,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontFamily:"monospace",fontSize:12,color:"#aaa",flex:1}}>{s.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"monospace",fontSize:11,color:"#555"}}>MAX:</span>
                    <input type="number" value={s.total} onChange={e=>setScoring(p=>({...p,[key]:{...p[key],total:parseInt(e.target.value)||0}}))}
                      style={{width:60,background:"#080808",border:"1px solid #1a1a1a",borderRadius:6,padding:"6px 8px",color:"#00ff88",fontFamily:"monospace",fontSize:14,textAlign:"center",outline:"none"}} />
                  </div>
                </div>
                <div style={{fontSize:11,color:"#555",lineHeight:1.5}}>{s.note}</div>
              </div>
            ))}

            <p style={{fontFamily:"monospace",fontSize:10,color:"#444",marginTop:16,marginBottom:8}}>SUPABASE SQL SCHEMA (run this once if tables are missing)</p>
            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:8,padding:14,fontFamily:"monospace",fontSize:10,color:"#555",lineHeight:1.8,overflowX:"auto",whiteSpace:"pre"}}>
{`-- Run this in Supabase SQL Editor
create table participants (
  id text primary key,
  name text, age int, phone text,
  emergency text, team_id text,
  registered_at timestamptz
);

create table checkins (
  id text primary key,
  cyclist_id text, cyclist_name text,
  team_id text, cp_id text,
  timestamp timestamptz
  -- Note: No gps / location column (security policy)
);

create table game_answers (
  id text primary key,
  cyclist_id text, cyclist_name text,
  team_id text, game text,
  answers jsonb, score int,
  submitted_at timestamptz
);`}
            </div>

            <div style={{fontSize:10,color:"#555",marginTop:16}}>
              Tip: Since RLS is disabled on your project, the anon key can freely write. For production events you may want to re-enable RLS with stricter policies after the event.
            </div>
          </div>
        )}

        <BkBtn onClick={()=>setView("home")} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// SHARED SMALL COMPONENTS
// ══════════════════════════════════════
function NBtn({ onClick, icon }) {
  return <button onClick={onClick} style={{background:"#111",border:"1px solid #1a1a1a",color:"#fff",width:40,height:40,borderRadius:9,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</button>;
}
function BigBtn({ icon, label, sub, onClick, color }) {
  return (
    <button onClick={onClick} style={{background:`${color}08`,border:`2px solid ${color}44`,borderRadius:12,padding:"18px 10px",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
      <div style={{fontSize:30,marginBottom:8}}>{icon}</div>
      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:"bold",color,letterSpacing:1}}>{label}</div>
      <div style={{fontSize:11,color:"#555",marginTop:3}}>{sub}</div>
    </button>
  );
}
function SmallBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 10px",cursor:"pointer",textAlign:"center"}}>
      <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:"bold",color:"#aaa",letterSpacing:1}}>{label}</div>
    </button>
  );
}
function PageHeader({ icon, title, sub }) {
  return (
    <div style={{padding:"22px 0 18px",borderBottom:"1px solid #0d0d0d",marginBottom:18}}>
      <div style={{fontSize:32,marginBottom:8}}>{icon}</div>
      <h2 style={{fontFamily:"monospace",fontSize:24,fontWeight:"bold",color:"#fff",letterSpacing:2,lineHeight:1.2,marginBottom:5}}>{title}</h2>
      <p style={{fontSize:13,color:"#555"}}>{sub}</p>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontFamily:"monospace",fontSize:10,color:"#555",letterSpacing:2,marginBottom:7}}>{label}</label>
      {children}
    </div>
  );
}
function Input({ type="text", placeholder, value, onChange, maxLength, onEnter }) {
  return (
    <input type={type} placeholder={placeholder} value={value} maxLength={maxLength}
      onChange={e=>onChange(e.target.value)}
      onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}
      style={{width:"100%",background:"#080808",border:"1px solid #1a1a1a",borderRadius:10,padding:"14px 16px",color:"#fff",fontSize:15,fontFamily:"inherit",outline:"none",WebkitAppearance:"none"}} />
  );
}
function PBtn({ onClick, icon, label, sub, disabled, style={} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{width:"100%",background:disabled?"#0a0a0a":"rgba(0,255,136,0.08)",border:`2px solid ${disabled?"#1a1a1a":"#00ff88"}`,borderRadius:14,padding:"17px 20px",cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:14,opacity:disabled?0.4:1,transition:"all 0.15s",...style}}>
      <span style={{fontSize:24}}>{icon}</span>
      <div style={{textAlign:"left"}}>
        <div style={{fontFamily:"monospace",fontSize:15,fontWeight:"bold",color:"#fff",letterSpacing:2}}>{label}</div>
        {sub&&<div style={{fontSize:12,color:"#00ff88",marginTop:3}}>{sub}</div>}
      </div>
    </button>
  );
}
function BkBtn({ onClick }) {
  return <button onClick={onClick} style={{width:"100%",background:"transparent",border:"1px solid #111",color:"#444",borderRadius:10,padding:"13px",cursor:"pointer",marginTop:10,fontFamily:"monospace",fontSize:13,textAlign:"center"}}>← BACK</button>;
}
function Toast({ msg, type }) {
  const bg=type==="error"?"#ff5555":type==="warning"?"#ffbb00":"#00ff88";
  return <div style={{position:"fixed",top:62,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:bg,color:"#000",padding:"11px 22px",borderRadius:10,fontFamily:"monospace",fontSize:13,fontWeight:"bold",boxShadow:"0 4px 24px rgba(0,0,0,0.5)",maxWidth:"88vw",textAlign:"center",lineHeight:1.5,wordBreak:"break-word"}}>{msg}</div>;
}
function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [err, setErr] = useState(false);
  const [decoderReady, setDecoderReady] = useState(false);
  const [scanStatus, setScanStatus] = useState("Starting camera...");

  // Camera + decoder loading
  useEffect(() => {
    let stream = null;
    let cancelled = false;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => {
        if (cancelled) return;
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanStatus("Point camera at QR code");

        // Load jsQR decoder (same CDN pattern as QR generation)
        if (window.jsQR) {
          setDecoderReady(true);
        } else {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
          script.onload = () => setDecoderReady(true);
          document.body.appendChild(script);
        }
      })
      .catch(() => setErr(true));

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Real-time QR decoding loop (supports new URL scheme + legacy CYCLEOPS-* codes)
  useEffect(() => {
    if (!decoderReady || err || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let frame = null;

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw && vh) {
          canvas.width = vw;
          canvas.height = vh;
          ctx.drawImage(video, 0, 0, vw, vh);
          const imageData = ctx.getImageData(0, 0, vw, vh);
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth"
          });

          if (code && code.data) {
            const val = code.data.trim();
            const upperVal = val.toUpperCase();

            // === More reliable detection for both legacy and URL-based QRs ===
            const isLegacyCode = upperVal.startsWith("CYCLEOPS-");

            // Stronger URL detection for our app
            const looksLikeUrl = val.includes("://") || val.includes("cycleops");
            const hasOurAction = upperVal.includes("ACTION=REGISTER") || 
                                 upperVal.includes("ACTION=CHECKIN") ||
                                 upperVal.includes("?ACTION=");

            const isOurUrl = looksLikeUrl && hasOurAction;

            if (isLegacyCode || isOurUrl) {
              setScanStatus("Code detected!");
              onScan(val);
              return; // stop loop after successful scan
            }
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [decoderReady, err, onScan]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#0d0d0d",borderRadius:"16px 16px 0 0",width:"100%",overflow:"hidden",border:"1px solid #222"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #1a1a1a"}}>
          <span style={{color:"#00ff88",fontFamily:"monospace",fontSize:13,fontWeight:"bold"}}>◉ QR SCANNER</span>
          <button onClick={onClose} style={{background:"#1a1a1a",border:"1px solid #333",color:"#aaa",width:34,height:34,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
        </div>

        {!err && (
          <div style={{position:"relative",background:"#000",minHeight:180}}>
            <video ref={videoRef} style={{width:"100%",maxHeight:260,display:"block",objectFit:"cover"}} />
            <div style={{position:"absolute",inset:"12%",pointerEvents:"none"}}>
              <div style={{position:"absolute",top:0,left:0,width:22,height:22,borderTop:"3px solid #00ff88",borderLeft:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",top:0,right:0,width:22,height:22,borderTop:"3px solid #00ff88",borderRight:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",bottom:0,left:0,width:22,height:22,borderBottom:"3px solid #00ff88",borderLeft:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,borderBottom:"3px solid #00ff88",borderRight:"3px solid #00ff88"}}/>
            </div>
            <div style={{
              position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)",
              background:"rgba(0,0,0,0.7)", color:"#00ff88", fontSize:11, fontFamily:"monospace",
              padding:"2px 10px", borderRadius:4, whiteSpace:"nowrap"
            }}>
              {scanStatus}
            </div>
          </div>
        )}

        {err && (
          <div style={{padding:16, color:"#ff5555", fontSize:13}}>Camera access denied or unavailable. Use manual entry below.</div>
        )}

        <div style={{padding:16}}>
          <p style={{color:"#444",fontSize:11,fontFamily:"monospace",marginBottom:8}}>
            {decoderReady ? "Auto-scanning active • or enter manually" : "Loading decoder... • manual entry available"}
          </p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input id="mqr" placeholder="QR code value..." style={{flex:1,background:"#111",border:"1px solid #222",borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:14,fontFamily:"monospace",outline:"none"}} />
            <button onClick={()=>{const v=document.getElementById("mqr").value;if(v)onScan(v);}} style={{background:"#00ff88",border:"none",color:"#000",borderRadius:8,padding:"0 18px",fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"monospace"}}>GO</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {["register","cp1","cp2","cp3","finish"].map(key=>(
              <button key={key} onClick={()=>onScan(buildQRUrl(key))} style={{background:"#111",border:"1px solid #222",color:"#00ff88",padding:"9px 12px",borderRadius:7,cursor:"pointer",fontFamily:"monospace",fontSize:11,fontWeight:"bold"}}>
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// CONSTANTS & HELPERS
// ══════════════════════════════════════
const genId = () => Math.random().toString(36).substr(2,9).toUpperCase();
const formatTime = (iso) => iso?new Date(iso).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"—";

const NAV={position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(6,6,6,0.97)",borderBottom:"1px solid #111",backdropFilter:"blur(10px)"};
const NAV_BRAND={background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8};
const CARD={background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:12,padding:16,marginBottom:8};
const BTN_PRIMARY={display:"flex",alignItems:"center",gap:14,background:"rgba(0,255,136,0.08)",border:"2px solid #00ff88",borderRadius:14,padding:"17px 20px",cursor:"pointer",color:"#fff",transition:"all 0.15s"};
const BTN_SEC={background:"#0d0d0d",border:"1px solid #1a1a1a",color:"#888",borderRadius:10,padding:"12px",cursor:"pointer",fontFamily:"monospace",fontSize:13,textAlign:"center"};
const SEC_LABEL={fontFamily:"monospace",fontSize:10,color:"#444",letterSpacing:3,marginBottom:12,borderBottom:"1px solid #0d0d0d",paddingBottom:8};
const BADGE={display:"inline-block",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.2)",borderRadius:20,padding:"4px 14px",fontFamily:"monospace",fontSize:10,color:"#00ff88",letterSpacing:3,marginBottom:14};
const QBADGE={display:"inline-flex",alignItems:"center",justifyContent:"center",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.2)",borderRadius:20,padding:"2px 10px",fontFamily:"monospace",fontSize:10,color:"#00ff88"};

const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{background:#060606;overscroll-behavior:none;}
  input,button,textarea,select{font-family:inherit;}
  input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:#1a1a1a;outline:none;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;cursor:pointer;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:#1a1a1a;}
  .fadeUp{animation:fadeUp 0.3s ease;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  select option{background:#0d0d0d;color:#fff;}
  details>summary{list-style:none;}
  details>summary::-webkit-details-marker{display:none;}
`;
