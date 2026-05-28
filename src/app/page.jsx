'use client'
// ╔══════════════════════════════════════════════════════════════╗
// ║  CYCLEOPS v3 — TACTICAL ENDURANCE EVENT MANAGER             ║
// ║  Event Date: 30 May 2026                                    ║
// ║  Scoring: 100 marks total across 5 games + timings          ║
// ╚══════════════════════════════════════════════════════════════╝
//
// SCORING BREAKDOWN (100 MARKS TOTAL):
// ─────────────────────────────────────
// Arrival timings (CP1+CP2+CP3+Finish): 15 marks
//   - 1st team at each CP: 5, 2nd: 4, 3rd: 3, 4th: 2
//   - Finish: 1st:8, 2nd:6, 3rd:4, 4th:2
//
// Game 1 — Counter Intel Tracking Op (CP1):   20 marks
//   - Each cyclist answers 5 MCQs (4 marks each)
//   - Team score = average of all members
//
// Game 2 — Endurance & Fortitude (CP1→CP2):  20 marks
//   - Completion: 15 marks (ranked by closing time)
//   - Rule compliance bonus: 5 marks (admin confirms)
//   - Penalty: -5 marks per violation
//
// Game 3 — Communication & Trust (CP2):       20 marks
//   - Ranked by completion time: 1st:20, 2nd:15, 3rd:10, 4th:5
//
// Game 4 — Rapid Fire Quiz (CP3):             15 marks
//   - 5 questions x 3 marks each
//   - Team score = average of all members
//
// Game 5 — Finish Questionnaire:              10 marks
//   - 3 fill-in-blank questions
//   - Admin awards 0-10 manually
//
// DATABASE: Supabase (free tier)
// ─────────────────────────────
// TEST MODE: uses local state only (no DB writes)
// LIVE MODE: writes to Supabase
// Toggle in Admin → Settings → Mode
//
// SUPABASE SETUP:
// 1. supabase.com → New project
// 2. SQL Editor → run schema from SCORING_GUIDE.md
// 3. Copy project URL + anon key into ENV below
// 4. Add to .env.local:
//    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════
// CONFIG
// ══════════════════════════════════════
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://swrtpnwkuqfhitzhgmwx.supabase.co";
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cnRwbndrdXFmaGl0emhnbXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDM0MTcsImV4cCI6MjA5NTQxOTQxN30.B7GXbyTFXKhQyP-WkybFxnwwuFL3wTzzIN5QrIPNXII";
const ADMIN_PIN     = "arun"; // Change before event
const EVENT_DATE    = "30 May 2026";

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
  { id:"start", name:"START",  label:"Event Start",            km:0,  icon:"🏁", qr:"CYCLEOPS-START" },
  { id:"cp1",   name:"CP 1",   label:"Counter Intel + Load",   km:12, icon:"👁️", qr:"CYCLEOPS-CP1"   },
  { id:"cp2",   name:"CP 2",   label:"Comms & Trust",          km:24, icon:"🤝", qr:"CYCLEOPS-CP2"   },
  { id:"cp3",   name:"CP 3",   label:"Rapid Fire Quiz",        km:36, icon:"🧩", qr:"CYCLEOPS-CP3"   },
  { id:"finish",name:"FINISH", label:"Finish Questionnaire",   km:40, icon:"🏆", qr:"CYCLEOPS-FINISH" },
];

// ══════════════════════════════════════
// SCORING CONFIG (editable by admin)
// ══════════════════════════════════════
const DEFAULT_SCORING = {
  arrival: {
    label: "Arrival Timings",
    total: 15,
    perCP: { first:5, second:4, third:3, fourth:2 },
    finish: { first:8, second:6, third:4, fourth:2 },
    note: "Points awarded per CP based on team closing time rank"
  },
  game1: {
    label: "Game 1 — Counter Intel Tracking Op",
    total: 20,
    perQuestion: 4,
    questions: 5,
    note: "Individual MCQ, team score = average of all members"
  },
  game2: {
    label: "Game 2 — Endurance & Fortitude (Jerrican)",
    total: 20,
    completion: { first:15, second:12, third:9, fourth:6 },
    complianceBonus: 5,
    penalty: -5,
    note: "Ranked by closing time. +5 if all rules followed. -5 per violation"
  },
  game3: {
    label: "Game 3 — Communication & Trust (Blindfold)",
    total: 20,
    byRank: { first:20, second:15, third:10, fourth:5 },
    note: "Ranked by task completion time"
  },
  game4: {
    label: "Game 4 — Rapid Fire Quiz",
    total: 15,
    perQuestion: 3,
    questions: 5,
    note: "Individual MCQ with humour option, team score = average"
  },
  game5: {
    label: "Game 5 — Finish Questionnaire",
    total: 10,
    note: "Admin manually awards 0-10 based on answers"
  }
};

// ══════════════════════════════════════
// GAME CONTENT
// ══════════════════════════════════════

// Game 1 — Counter Intel Tracking (same for all teams — items placed on route)
const GAME1_QUESTIONS = [
  {
    q: "Which of these items did you spot hanging/placed prominently along the route?",
    options: ["Lantern", "Bicycle pump", "Traffic cone", "Road sign"],
    a: "Lantern",
    funny: null
  },
  {
    q: "What type of cooking equipment was observed near the route as a planted intelligence item?",
    options: ["Pressure cooker", "Kettle for tea", "Gas stove", "Lunch box"],
    a: "Kettle for tea",
    funny: null
  },
  {
    q: "Which helmet type was spotted as a planted marker along the route?",
    options: ["Cycling helmet", "Construction helmet", "Ghost helmet", "Swimming cap"],
    a: "Ghost helmet",
    funny: null
  },
  {
    q: "What ground covering item was observed as a planted intelligence marker?",
    options: ["Carpet", "Ground sheet", "Tarpaulin", "Door mat"],
    a: "Ground sheet",
    funny: null
  },
  {
    q: "Which of these rope/tape configurations was spotted as a non-standard tactical marker?",
    options: ["Tape in standard knot", "Tape near a non-standard tactical knot", "Rope ladder", "Wire fence"],
    a: "Tape near a non-standard tactical knot",
    funny: null
  },
];

// Game 4 — Rapid Fire Quiz (army + route awareness, with humour option)
const GAME4_QUESTIONS = [
  {
    q: "What is the standard battle cry used by Indian Army infantry during a charge?",
    options: ["Jai Hind!", "Bharat Mata Ki Jai!", "Jai Mata Di!", "I want my lunch!"],
    a: "Jai Mata Di!",
    funny: "I want my lunch!"
  },
  {
    q: "What does the abbreviation 'CP' stand for in military field operations?",
    options: ["Check Post", "Command Post", "Control Point", "Chai Point"],
    a: "Check Post",
    funny: "Chai Point"
  },
  {
    q: "How many jerricans did your team carry during the Endurance Mission?",
    options: ["One", "Two", "Three", "Zero — we outsourced it"],
    a: "Two",
    funny: "Zero — we outsourced it"
  },
  {
    q: "What is the maximum weight one team member could carry during Game 2?",
    options: ["5 kg for 1 km", "10 kg for 2 km", "5 kg for 2 km each carry", "Whatever they felt like"],
    a: "5 kg for 2 km each carry",
    funny: "Whatever they felt like"
  },
  {
    q: "In the Blindfold Navigation game, what were the team members guiding their teammate towards?",
    options: ["Enemy flag", "Their team coloured flag", "The finish line", "The nearest chai stall"],
    a: "Their team coloured flag",
    funny: "The nearest chai stall"
  },
];

// Game 5 — Finish questionnaire (fill in the blank — same for all)
const GAME5_QUESTIONS = [
  "Which rider dropped back during the canal leg of the route?",
  "Who gave the wrong answer during the interrogation at CP3?",
  "Who do you suspect is the saboteur in your team? (Be honest!)"
];

// ══════════════════════════════════════
// SUPABASE DB HELPER (raw REST — works with anon key)
// ══════════════════════════════════════
async function supabaseQuery(table, method, data = null, filters = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { data: null, error: "Supabase not configured (missing URL or key)" };
  }
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filters) url += `?${filters}`;
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Prefer": method === "POST" ? "return=representation" : "",
  };
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: `HTTP ${res.status}: ${text}` };
    }
    const json = await res.json().catch(() => null);
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e.message || "Network error" };
  }
}

// Test connection + basic write permission
async function testSupabaseConnection() {
  const testId = "conn_test_" + Date.now();
  // Try a lightweight read first
  const read = await supabaseQuery("participants", "GET", null, "limit=1");
  if (read.error) return { ok: false, step: "read", error: read.error };

  // Try a write (we will immediately delete it)
  const write = await supabaseQuery("participants", "POST", {
    id: testId,
    name: "CONNECTION_TEST",
    age: 99,
    phone: "0000000000",
    emergency: "test",
    team_id: "alpha",
    registered_at: new Date().toISOString(),
  });
  if (write.error) return { ok: false, step: "write", error: write.error };

  // Clean up the test row
  await supabaseQuery("participants", "DELETE", null, `id=eq.${testId}`);
  return { ok: true, step: "ok" };
}

// Full reset for fresh event start
async function resetAllSupabaseData(showToast) {
  const tables = ["game_answers", "checkins", "participants"];
  for (const t of tables) {
    const res = await supabaseQuery(t, "DELETE", null, "id=neq.null"); // delete all
    if (res.error) {
      if (showToast) showToast(`Failed to clear ${t}: ${res.error}`, "error");
      return false;
    }
  }
  if (showToast) showToast("All Supabase data cleared — fresh start ready");
  return true;
}

// ══════════════════════════════════════
// GPS HELPER
// ══════════════════════════════════════
function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

// ══════════════════════════════════════
// QR CODE COMPONENT
// ══════════════════════════════════════
function QRCode({ value, size = 160, color = "#00ff88", bg = "#0a0a0a" }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = size; c.height = size;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    const hash = value.split("").reduce((a, ch) => ((a << 5) - a + ch.charCodeAt(0)) | 0, 0);
    const seed = Math.abs(hash);
    const m = 25, cs = Math.floor((size - 16) / m), off = Math.floor((size - m * cs) / 2);
    const finder = (x, y) => {
      ctx.fillStyle = color;
      ctx.fillRect(x*cs+off, y*cs+off, 7*cs, 7*cs);
      ctx.fillStyle = bg;
      ctx.fillRect((x+1)*cs+off,(y+1)*cs+off,5*cs,5*cs);
      ctx.fillStyle = color;
      ctx.fillRect((x+2)*cs+off,(y+2)*cs+off,3*cs,3*cs);
    };
    finder(0,0); finder(m-7,0); finder(0,m-7);
    let v = seed;
    const rand = () => { v=(v*1664525+1013904223)&0xffffffff; return (v>>>0)/0xffffffff; };
    ctx.fillStyle = color;
    for (let r=0;r<m;r++) for (let col=0;col<m;col++) {
      const f=(r<8&&col<8)||(r<8&&col>=m-8)||(r>=m-8&&col<8);
      if (!f && rand()>0.5) ctx.fillRect(col*cs+off,r*cs+off,cs-1,cs-1);
    }
    ctx.fillStyle = color; ctx.font = `bold 9px monospace`; ctx.textAlign = "center";
    ctx.fillText(value.length>20?value.slice(0,20)+"…":value, size/2, size-3);
  }, [value, size, color, bg]);
  return <canvas ref={ref} style={{ borderRadius:6,display:"block" }} />;
}

// ══════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════
export default function CycleOps() {
  // ── App state ──
  const [view, setView] = useState("home");
  const [testMode, setTestMode] = useState(true); // TEST = local only, LIVE = Supabase
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
  const [game2Status, setGame2Status] = useState(   // per-team jerrican status
    TEAMS.reduce((a,t)=>({...a,[t.id]:{completed:false,violation:false,penaltyCount:0,closingTime:null}}),{})
  );
  const [game3Timers, setGame3Timers] = useState(   // per-team blindfold timer
    TEAMS.reduce((a,t)=>({...a,[t.id]:{startTime:null,endTime:null,running:false,elapsed:0}}),{})
  );
  const [game5Marks, setGame5Marks] = useState(     // admin-awarded finish marks
    TEAMS.reduce((a,t)=>({...a,[t.id]:0}),{})
  );
  const [scoring, setScoring] = useState(DEFAULT_SCORING);

  // ── UI state ──
  const [activeCP, setActiveCP] = useState(null);
  const [regForm, setRegForm] = useState({name:"",age:"",phone:"",emergency:"",medical:false});

  // Game 3 timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setGame3Timers(prev => {
        const updated = {...prev};
        TEAMS.forEach(t => {
          if (updated[t.id].running && updated[t.id].startTime) {
            updated[t.id] = {...updated[t.id], elapsed: Math.floor((Date.now()-updated[t.id].startTime)/1000)};
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist testMode across refreshes (admin convenience)
  useEffect(() => {
    const saved = localStorage.getItem("cycleops_testMode");
    if (saved !== null) {
      setTestMode(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cycleops_testMode", String(testMode));
  }, [testMode]);

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3500);
  }, []);

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

      // Game 1 score
      const g1Answers = teamAnswers.filter(a=>a.game==="game1");
      const g1Score = g1Answers.length>0 ? Math.round(g1Answers.reduce((s,a)=>s+a.score,0)/g1Answers.length) : 0;

      // Game 2 score
      const g2 = game2Status[team.id];
      let g2Score = 0;
      if (g2.completed) {
        const g2Checkins = checkins.filter(c=>c.cpId==="cp2"&&c.teamId===team.id);
        const allCP2 = checkins.filter(c=>c.cpId==="cp2"&&g2.completed);
        // simplified rank by closing time
        const rank = g2.rank||3;
        g2Score += [scoring.game2.completion.first,scoring.game2.completion.second,scoring.game2.completion.third,scoring.game2.completion.fourth][rank-1]||0;
        if (!g2.violation) g2Score += scoring.game2.complianceBonus;
        g2Score += g2.penaltyCount * scoring.game2.penalty;
        g2Score = Math.max(0, g2Score);
      }

      // Game 3 score
      const g3 = game3Timers[team.id];
      let g3Score = 0;
      if (g3.endTime) {
        const allEnded = TEAMS.filter(t=>game3Timers[t.id].endTime).sort((a,b)=>game3Timers[a.id].elapsed-game3Timers[b.id].elapsed);
        const rank = allEnded.findIndex(t=>t.id===team.id);
        g3Score = [scoring.game3.byRank.first,scoring.game3.byRank.second,scoring.game3.byRank.third,scoring.game3.byRank.fourth][rank]||0;
      }

      // Game 4 score
      const g4Answers = teamAnswers.filter(a=>a.game==="game4");
      const g4Score = g4Answers.length>0 ? Math.round(g4Answers.reduce((s,a)=>s+a.score,0)/g4Answers.length) : 0;

      // Game 5 score
      const g5Score = game5Marks[team.id]||0;

      const total = arrivalScore+g1Score+g2Score+g3Score+g4Score+g5Score;

      return {
        ...team, members, checkins:teamCheckins,
        scores:{ arrival:arrivalScore, game1:g1Score, game2:g2Score, game3:g3Score, game4:g4Score, game5:g5Score, total },
      };
    }).sort((a,b)=>b.scores.total-a.scores.total).map((t,i)=>({...t,rank:i+1}));
  }, [participants, checkins, gameAnswers, game2Status, game3Timers, game5Marks, scoring]);

  const lb = leaderboard();

  // ── QR scan handler ──
  const handleQRScan = (code) => {
    setShowScanner(false);
    const u = code.toUpperCase().trim();

    if (u==="CYCLEOPS-REGISTER") { setView("register"); return; }

    // CP scans require cyclist to be logged in
    const cp = CHECKPOINTS.find(c=>c.qr===u);
    if (cp) {
      if (!cyclist) { showToast("Please log in first","error"); setView("login"); return; }
      setActiveCP(cp.id);
      setView("cpCheckin");
      return;
    }
    if (u==="CYCLEOPS-ADMIN") { setView("adminAuth"); return; }
    showToast("Unknown QR code","error");
  };

  // ── CP Checkin ──
  const handleCPCheckin = async () => {
    if (!cyclist || !activeCP) return;
    const existing = checkins.find(c=>c.cyclistId===cyclist.id&&c.cpId===activeCP);
    if (existing) { showToast("Already checked in here!","warning"); return; }
    const gps = await getGPS();
    const checkin = {
      id: genId(),
      cyclistId: cyclist.id,
      cyclistName: cyclist.name,
      teamId: cyclist.teamId,
      cpId: activeCP,
      timestamp: new Date().toISOString(),
      gps,
    };
    setCheckins(prev=>[...prev,checkin]);
    if (!testMode && SUPABASE_URL) {
      const res = await supabaseQuery("checkins","POST",checkin);
      if (res.error) showToast("Live write failed (checkin): " + res.error, "error");
    }
    const cp = CHECKPOINTS.find(c=>c.id===activeCP);
    showToast(`✅ Checked in at ${cp?.name}! Time recorded.`);

    // Route to game if applicable
    if (activeCP==="cp1") { setView("game1"); return; }
    if (activeCP==="cp2") { setView("game3"); return; }
    if (activeCP==="cp3") { setView("game4"); return; }
    if (activeCP==="finish") { setView("game5"); return; }
    setView("home");
  };

  // ── Register ──
  const handleRegister = async () => {
    if (!regForm.name||!regForm.age||!regForm.phone||!regForm.emergency) { showToast("Fill all fields","error"); return; }
    if (!regForm.medical) { showToast("Medical declaration required","error"); return; }
    const id = genId();
    // Balanced team assignment
    const existing = participants.length;
    const teamIds = ["alpha","bravo","charlie","delta"];
    const sorted = [...participants,{age:parseInt(regForm.age)}].sort((a,b)=>a.age-b.age);
    const tempIdx = sorted.findIndex((p,i)=>i===sorted.length-1);
    const assignedTeam = teamIds[tempIdx%4];
    const newP = { id, ...regForm, age:parseInt(regForm.age), teamId:assignedTeam, registeredAt:new Date().toISOString() };
    // Reassign all
    const allP = [...participants,newP].sort((a,b)=>a.age-b.age).map((p,i)=>({...p,teamId:teamIds[i%4]}));
    setParticipants(allP);
    const me = allP.find(p=>p.id===id);
    setCyclist(me);
    if (!testMode && SUPABASE_URL) {
      const res = await supabaseQuery("participants","POST",me);
      if (res.error) showToast("Live write failed (register): " + res.error, "error");
    }
    setRegForm({name:"",age:"",phone:"",emergency:"",medical:false});
    setView("dashboard");
    showToast(`Registered! Team ${TEAMS.find(t=>t.id===me.teamId)?.name} ✓`);
  };

  // ── Login (returning cyclist) ──
  const handleLogin = (phone) => {
    const found = participants.find(p=>p.phone===phone.trim());
    if (!found) { showToast("Phone not found — please register first","error"); return; }
    setCyclist(found);
    setView("dashboard");
    showToast(`Welcome back, ${found.name}!`);
  };

  // ── Game answer submission ──
  const submitGameAnswers = async (game, answers, questions, pointsEach) => {
    if (!cyclist) return 0;
    let correct = 0;
    questions.forEach((q,i)=>{ if(answers[i]===q.a) correct++; });
    const score = correct*pointsEach;
    const entry = { id:genId(), cyclistId:cyclist.id, cyclistName:cyclist.name, teamId:cyclist.teamId, game, answers, score, correct, total:questions.length, submittedAt:new Date().toISOString() };
    setGameAnswers(prev=>[...prev.filter(a=>!(a.cyclistId===cyclist.id&&a.game===game)),entry]);
    if (!testMode && SUPABASE_URL) {
      const res = await supabaseQuery("game_answers","POST",entry);
      if (res.error) showToast("Live write failed (game): " + res.error, "error");
    }
    return { score, correct };
  };

  return (
    <div style={{ minHeight:"100vh",background:"#060606",color:"#fff",maxWidth:480,margin:"0 auto" }}>
      <style>{CSS}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showScanner && <QRScanner onScan={handleQRScan} onClose={()=>setShowScanner(false)} />}

      {/* NAV */}
      <nav style={NAV}>
        <button onClick={()=>setView(cyclist?"dashboard":"home")} style={NAV_BRAND}>
          <span style={{color:"#00ff88",fontSize:20}}>◎</span>
          <span style={{color:"#fff",fontFamily:"monospace",fontSize:17,fontWeight:"bold",letterSpacing:3}}>CYCLEOPS</span>
          {testMode && <span style={{background:"#ff000022",border:"1px solid #ff0000",color:"#ff6666",borderRadius:4,padding:"1px 6px",fontSize:9,fontFamily:"monospace"}}>TEST</span>}
        </button>
        <div style={{display:"flex",gap:6}}>
          {cyclist && <div style={{background:"#111",border:"1px solid #222",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#00ff88",fontFamily:"monospace",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cyclist.name.split(" ")[0]}</div>}
          <NBtn onClick={()=>setShowScanner(true)} icon="📷" />
          <NBtn onClick={()=>setView("leaderboard")} icon="🏆" />
          <NBtn onClick={()=>setView(adminAuth?"admin":"adminAuth")} icon="⚙️" />
        </div>
      </nav>

      {/* Global Test Mode banner — very hard to miss */}
      {testMode && view !== "admin" && (
        <div style={{
          background:"linear-gradient(90deg,#3a0f0f,#2a0a0a)",
          borderBottom:"1px solid #ff555533",
          padding:"8px 16px",
          fontSize:12,
          fontFamily:"monospace",
          color:"#ff8888",
          display:"flex",
          alignItems:"center",
          gap:10
        }}>
          <span style={{background:"#ff000033",padding:"2px 6px",borderRadius:3}}>TEST MODE</span>
          <span>Data is local only. Go to Admin → Settings to switch to LIVE and write to Supabase.</span>
        </div>
      )}

      <div style={{paddingBottom:50}}>
        {view==="home"       && <HomeView setView={setView} lb={lb} cyclist={cyclist} setShowScanner={setShowScanner} />}
        {view==="register"   && <RegisterView regForm={regForm} setRegForm={setRegForm} onSubmit={handleRegister} setView={setView} />}
        {view==="login"      && <LoginView onLogin={handleLogin} setView={setView} />}
        {view==="dashboard"  && <DashboardView cyclist={cyclist} setCyclist={setCyclist} lb={lb} checkins={checkins} gameAnswers={gameAnswers} setView={setView} setShowScanner={setShowScanner} activeCP={activeCP} setActiveCP={setActiveCP} showToast={showToast} />}
        {view==="cpCheckin"  && <CPCheckinView activeCP={activeCP} cyclist={cyclist} checkins={checkins} onCheckin={handleCPCheckin} setView={setView} />}
        {view==="game1"      && <Game1View cyclist={cyclist} gameAnswers={gameAnswers} onSubmit={async (answers)=>await submitGameAnswers("game1",answers,GAME1_QUESTIONS,4)} setView={setView} showToast={showToast} />}
        {view==="game3"      && <Game3View cyclist={cyclist} setView={setView} showToast={showToast} />}
        {view==="game4"      && <Game4View cyclist={cyclist} gameAnswers={gameAnswers} onSubmit={async (answers)=>await submitGameAnswers("game4",answers,GAME4_QUESTIONS,3)} setView={setView} showToast={showToast} />}
        {view==="game5"      && <Game5View cyclist={cyclist} gameAnswers={gameAnswers} setGameAnswers={setGameAnswers} testMode={testMode} setView={setView} showToast={showToast} />}
        {view==="leaderboard"&& <LeaderboardView lb={lb} scoring={scoring} setView={setView} />}
        {view==="adminAuth"  && <AdminAuthView adminPin={adminPin} setAdminPin={setAdminPin} onAuth={()=>{if(adminPin===ADMIN_PIN){setAdminAuth(true);setView("admin");showToast("Admin access granted");}else showToast("Wrong PIN","error");}} setView={setView} />}
        {view==="admin"      && adminAuth && <AdminView participants={participants} lb={lb} checkins={checkins} gameAnswers={gameAnswers} game2Status={game2Status} setGame2Status={setGame2Status} game3Timers={game3Timers} setGame3Timers={setGame3Timers} game5Marks={game5Marks} setGame5Marks={setGame5Marks} scoring={scoring} setScoring={setScoring} testMode={testMode} setTestMode={setTestMode} setView={setView} showToast={showToast} supabaseStatus={supabaseStatus} setSupabaseStatus={setSupabaseStatus} />}
        {view==="qrcodes"    && adminAuth && <QRCodesView setView={setView} />}
        {view==="scoringGuide" && <ScoringGuideView scoring={scoring} setView={setView} />}
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
          <div style={{fontFamily:"monospace",fontSize:11,color:"#555",letterSpacing:3}}>40 KM · 4 TEAMS · 5 GAMES · 100 MARKS</div>
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
      <PageHeader icon="📝" title="REGISTRATION" sub="One-time setup · No password needed" />
      <div style={CARD}>
        <Field label="FULL NAME *"><Input placeholder="Your full name" value={regForm.name} onChange={v=>setRegForm(p=>({...p,name:v}))} /></Field>
        <Field label="AGE *"><Input type="number" placeholder="Your age" value={regForm.age} onChange={v=>setRegForm(p=>({...p,age:v}))} /></Field>
        <Field label="PHONE NUMBER * (used to log in)"><Input type="tel" placeholder="+91 9999999999" value={regForm.phone} onChange={v=>setRegForm(p=>({...p,phone:v}))} /></Field>
        <Field label="EMERGENCY CONTACT *"><Input placeholder="Name & phone number" value={regForm.emergency} onChange={v=>setRegForm(p=>({...p,emergency:v}))} /></Field>
        <div onClick={()=>setRegForm(p=>({...p,medical:!p.medical}))}
          style={{display:"flex",alignItems:"flex-start",gap:12,marginTop:16,cursor:"pointer",padding:14,background:regForm.medical?"rgba(0,255,136,0.06)":"#0a0a0a",border:`1px solid ${regForm.medical?"#00ff88":"#1a1a1a"}`,borderRadius:10}}>
          <div style={{width:24,height:24,minWidth:24,border:`2px solid ${regForm.medical?"#00ff88":"#333"}`,borderRadius:6,background:regForm.medical?"#00ff88":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {regForm.medical&&<span style={{color:"#000",fontWeight:"bold"}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:"#aaa",lineHeight:1.6}}>I declare I am medically fit to participate and have no conditions preventing cycling 40km.</span>
        </div>
        <PBtn onClick={onSubmit} icon="⚡" label="REGISTER NOW" sub="Auto team assignment by age balance" style={{marginTop:16}} />
        <BkBtn onClick={()=>setView("home")} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// LOGIN VIEW
// ══════════════════════════════════════
function LoginView({ onLogin, setView }) {
  const [phone, setPhone] = useState("");
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🔑" title="CYCLIST LOGIN" sub="Enter your registered phone number" />
      <div style={CARD}>
        <Field label="PHONE NUMBER"><Input type="tel" placeholder="+91 9999999999" value={phone} onChange={setPhone} /></Field>
        <PBtn onClick={()=>onLogin(phone)} icon="→" label="LOG IN" style={{marginTop:16}} />
        <div style={{textAlign:"center",margin:"12px 0",color:"#444",fontFamily:"monospace",fontSize:12}}>— OR —</div>
        <button onClick={()=>setView("register")} style={{...BTN_SEC,width:"100%"}}>REGISTER FIRST</button>
        <BkBtn onClick={()=>setView("home")} />
      </div>
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
        {[{id:"game1",label:"Counter Intel Tracking"},{id:"game4",label:"Rapid Fire Quiz"},{id:"game5",label:"Finish Questionnaire"}].map(g=>{
          const ans = myAnswers.find(a=>a.game===g.id);
          return (
            <div key={g.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #0d0d0d"}}>
              <div style={{fontSize:12,color:"#aaa"}}>{g.label}</div>
              <div style={{fontFamily:"monospace",fontSize:13,color:ans?"#00ff88":"#444"}}>{ans?`${ans.score} pts`:"Pending"}</div>
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

  const go = async () => { setChecking(true); await onCheckin(); setChecking(false); };

  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon={cp?.icon||"📍"} title={cp?.name||"CHECKPOINT"} sub={cp?.label} />
      {already ? (
        <div style={{...CARD,textAlign:"center",padding:28}}>
          <div style={{fontSize:48,marginBottom:10}}>✅</div>
          <div style={{fontFamily:"monospace",fontSize:16,color:"#00ff88",fontWeight:"bold"}}>ALREADY CHECKED IN</div>
          <div style={{fontSize:12,color:"#555",marginTop:6}}>at {formatTime(already.timestamp)}</div>
          {(activeCP==="cp1")&&<PBtn onClick={()=>setView("game1")} icon="▶" label="GO TO GAME 1" style={{marginTop:16}} />}
          {(activeCP==="cp2")&&<PBtn onClick={()=>setView("game3")} icon="▶" label="GO TO GAME 3" style={{marginTop:16}} />}
          {(activeCP==="cp3")&&<PBtn onClick={()=>setView("game4")} icon="▶" label="GO TO GAME 4" style={{marginTop:16}} />}
          {(activeCP==="finish")&&<PBtn onClick={()=>setView("game5")} icon="▶" label="GO TO FINISH QUIZ" style={{marginTop:16}} />}
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
              <div style={{fontSize:10,color:"#444",marginTop:1}}>GPS auto-capture</div>
            </div>
          </div>
          <PBtn onClick={go} icon={checking?"⏳":"📍"} label={checking?"RECORDING…":"CONFIRM ARRIVAL"} sub="Timestamp + GPS will be saved" disabled={checking} />
        </div>
      )}
      <BkBtn onClick={()=>setView("dashboard")} />
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
// GAME 3 — Communication & Trust (Cyclist view — info only, admin controls)
// ══════════════════════════════════════
function Game3View({ cyclist, setView, showToast }) {
  const team = TEAMS.find(t=>t.id===cyclist?.teamId);
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="🤝" title="COMMUNICATION & TRUST" sub="Game 3 at CP2 · 20 marks" />
      <div style={{...CARD,background:`${team?.color||"#00ff88"}08`,borderColor:`${team?.color||"#00ff88"}22`}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:team?.color||"#00ff88",marginBottom:10}}>📋 GAME BRIEFING — TEAM {team?.name}</div>
        <div style={{fontSize:14,color:"#ccc",lineHeight:1.8}}>
          <b style={{color:"#fff"}}>Task:</b> One team member is blindfolded and guided only by voice from teammates 25 metres away (on a phone call). The blindfolded member must reach and touch your team's coloured flag.
          <br/><br/>
          <b style={{color:"#fff"}}>Your flag:</b> <span style={{color:team?.color,fontWeight:"bold"}}>{team?.emoji} {team?.name} coloured flag</span>
          <br/><br/>
          <b style={{color:"#fff"}}>Penalty:</b> Touching another team's flag = penalty points deducted.
          <br/><br/>
          <b style={{color:"#fff"}}>Scoring:</b> 1st to finish: 20 pts · 2nd: 15 pts · 3rd: 10 pts · 4th: 5 pts
          <br/><br/>
          <b style={{color:"#fff"}}>Note:</b> Admin controls the start/stop timer. Report to the organizer to begin.
        </div>
      </div>
      <div style={{...CARD,textAlign:"center",marginTop:8}}>
        <div style={{fontSize:11,color:"#555",fontFamily:"monospace"}}>Admin will record your time when complete</div>
      </div>
      <BkBtn onClick={()=>setView("dashboard")} />
    </div>
  );
}

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
// GAME 5 — Finish Questionnaire
// ══════════════════════════════════════
function Game5View({ cyclist, gameAnswers, setGameAnswers, testMode, setView, showToast }) {
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
      <PageHeader icon="🏆" title="FINISH QUESTIONNAIRE" sub="Game 5 · 10 marks · Admin scored" />
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
            {[["ARRIVAL",team.scores.arrival],["GAME 1",team.scores.game1],["GAME 2",team.scores.game2],["GAME 3",team.scores.game3],["GAME 4",team.scores.game4],["GAME 5",team.scores.game5]].map(([label,val])=>(
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
function ScoringGuideView({ scoring, setView }) {
  const entries = Object.entries(scoring);
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="📋" title="SCORING GUIDE" sub="Full breakdown · Total 100 marks" />
      <div style={{...CARD,marginBottom:16,background:"rgba(0,255,136,0.04)",borderColor:"rgba(0,255,136,0.15)"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          {entries.map(([key,s])=>(
            <div key={key}>
              <div style={{fontFamily:"monospace",fontSize:20,fontWeight:"bold",color:"#00ff88"}}>{s.total}</div>
              <div style={{fontSize:9,color:"#555",fontFamily:"monospace",marginTop:2}}>{s.label.split("—")[0].trim()}</div>
            </div>
          ))}
        </div>
      </div>
      {entries.map(([key,s])=>(
        <div key={key} style={{...CARD,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:"bold",color:"#fff",flex:1,paddingRight:10}}>{s.label}</div>
            <div style={{background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.2)",borderRadius:8,padding:"4px 12px",fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:"#00ff88",whiteSpace:"nowrap"}}>{s.total} MARKS</div>
          </div>
          <div style={{fontSize:12,color:"#666",lineHeight:1.6,marginBottom:8}}>{s.note}</div>
          {key==="arrival"&&(
            <div style={{background:"#080808",borderRadius:8,padding:10}}>
              <div style={{fontFamily:"monospace",fontSize:10,color:"#555",marginBottom:6}}>PER CP (CP1/CP2/CP3)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                {["1st","2nd","3rd","4th"].map((rank,i)=>(
                  <div key={rank} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:16,color:["#ffd700","#c0c0c0","#cd7f32","#888"][i]}}>{[s.perCP.first,s.perCP.second,s.perCP.third,s.perCP.fourth][i]}</div>
                    <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{rank}</div>
                  </div>
                ))}
              </div>
              <div style={{fontFamily:"monospace",fontSize:10,color:"#555",marginTop:10,marginBottom:6}}>FINISH LINE</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                {["1st","2nd","3rd","4th"].map((rank,i)=>(
                  <div key={rank} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:16,color:["#ffd700","#c0c0c0","#cd7f32","#888"][i]}}>{[s.finish.first,s.finish.second,s.finish.third,s.finish.fourth][i]}</div>
                    <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{rank}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {key==="game2"&&(
            <div style={{background:"#080808",borderRadius:8,padding:10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginBottom:8}}>
                {["1st","2nd","3rd","4th"].map((rank,i)=>(
                  <div key={rank} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:16,color:["#ffd700","#c0c0c0","#cd7f32","#888"][i]}}>{[s.completion.first,s.completion.second,s.completion.third,s.completion.fourth][i]}</div>
                    <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{rank}</div>
                  </div>
                ))}
              </div>
              <div style={{fontFamily:"monospace",fontSize:11,color:"#00ff88"}}>+{s.complianceBonus} compliance bonus · {s.penalty} per violation</div>
            </div>
          )}
          {key==="game3"&&(
            <div style={{background:"#080808",borderRadius:8,padding:10}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                {["1st","2nd","3rd","4th"].map((rank,i)=>(
                  <div key={rank} style={{textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:16,color:["#ffd700","#c0c0c0","#cd7f32","#888"][i]}}>{[s.byRank.first,s.byRank.second,s.byRank.third,s.byRank.fourth][i]}</div>
                    <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{rank}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <BkBtn onClick={()=>setView("home")} />
    </div>
  );
}

// ══════════════════════════════════════
// QR CODES VIEW (Admin only)
// ══════════════════════════════════════
function QRCodesView({ setView }) {
  const items = [
    {label:"REGISTRATION",value:"CYCLEOPS-REGISTER",icon:"📝",desc:"All participants scan to register",color:"#00ff88"},
    {label:"CP 1 — KM 12",value:"CYCLEOPS-CP1",icon:"👁️",desc:"Counter Intel + Jerrican",color:"#4af0ff"},
    {label:"CP 2 — KM 24",value:"CYCLEOPS-CP2",icon:"🤝",desc:"Comms & Trust",color:"#ffbb00"},
    {label:"CP 3 — KM 36",value:"CYCLEOPS-CP3",icon:"🧩",desc:"Rapid Fire Quiz",color:"#ff5555"},
    {label:"FINISH — KM 40",value:"CYCLEOPS-FINISH",icon:"🏆",desc:"Finish questionnaire",color:"#00ff88"},
    ...TEAMS.map(t=>({label:`TEAM ${t.name}`,value:`TEAM-${t.name}`,icon:t.emoji,desc:t.tagline,color:t.color})),
  ];
  return (
    <div className="fadeUp" style={{padding:"0 16px"}}>
      <PageHeader icon="⬛" title="QR CODES" sub="Print and laminate for event day" />
      <div style={{...CARD,marginBottom:16,background:"rgba(255,85,85,0.05)",borderColor:"rgba(255,85,85,0.2)"}}>
        <div style={{fontFamily:"monospace",fontSize:11,color:"#ff5555",marginBottom:4}}>🔒 ADMIN ONLY</div>
        <div style={{fontSize:12,color:"#888"}}>Only share REGISTRATION QR with participants. Keep checkpoint QRs confidential — place physically at each checkpoint on event day.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {items.map(item=>(
          <div key={item.value} style={{background:"#0a0a0a",border:`1px solid ${item.color}33`,borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
              <QRCode value={item.value} size={130} color={item.color} />
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
        <Field label="ADMIN PIN"><Input type="password" maxLength={6} placeholder="••••" value={adminPin} onChange={setAdminPin} onEnter={onAuth} /></Field>
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
function AdminView({ participants, lb, checkins, gameAnswers, game2Status, setGame2Status, game3Timers, setGame3Timers, game5Marks, setGame5Marks, scoring, setScoring, testMode, setTestMode, setView, showToast, supabaseStatus, setSupabaseStatus }) {
  const [tab, setTab] = useState("overview");
  const fmt = (s) => s!=null?`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`:"—";

  // Game 3 timer controls
  const startG3 = (teamId) => setGame3Timers(p=>({...p,[teamId]:{...p[teamId],startTime:Date.now(),running:true,elapsed:0,endTime:null}}));
  const stopG3  = (teamId) => setGame3Timers(p=>({...p,[teamId]:{...p[teamId],running:false,endTime:Date.now()}}));

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
            <div style={{fontSize:11,color:"#555",marginTop:2}}>Organizer control panel</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontFamily:"monospace",fontSize:10,color:testMode?"#ff6666":"#00ff88"}}>{testMode?"TEST MODE":"LIVE MODE"}</div>
            <button onClick={()=>setTestMode(p=>!p)}
              style={{background:testMode?"rgba(255,0,0,0.1)":"rgba(0,255,136,0.1)",border:`1px solid ${testMode?"#ff000033":"#00ff8833"}`,color:testMode?"#ff6666":"#00ff88",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:"monospace",fontSize:11}}>
              {testMode?"→ GO LIVE":"→ TEST"}
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",borderBottom:"1px solid #111",background:"rgba(6,6,6,0.97)",position:"sticky",top:54,zIndex:50,backdropFilter:"blur(8px)"}}>
        {[["overview","📊","OVERVIEW"],["g2","⛽","GAME 2"],["g3","🎯","GAME 3"],["riders","👤","RIDERS"],["scores","🏆","SCORES"],["settings","⚙️","SETTINGS"]].map(([id,icon,label])=>(
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

        {/* GAME 2 — Jerrican */}
        {tab==="g2"&&(
          <div>
            <div style={{...CARD,marginBottom:16,background:"rgba(255,187,0,0.04)",borderColor:"rgba(255,187,0,0.15)"}}>
              <div style={{fontFamily:"monospace",fontSize:11,color:"#ffbb00",marginBottom:6}}>⛽ ENDURANCE & FORTITUDE — JERRICAN MISSION</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>Two jerricans (5kg each) carried from CP1→CP2 (12 km). Max 2km per person. Admin confirms completion and rule compliance. Penalty per violation: {scoring.game2.penalty} marks.</div>
            </div>
            {TEAMS.map(team=>{
              const g2 = game2Status[team.id];
              return (
                <div key={team.id} style={{...CARD,marginBottom:12,borderColor:`${team.color}33`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                    <span style={{fontSize:24}}>{team.emoji}</span>
                    <span style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:team.color,flex:1}}>{team.name}</span>
                    <span style={{fontFamily:"monospace",fontSize:18,color:"#fff"}}>{g2.completed?(scoring.game2.completion[["first","second","third","fourth"][g2.rank-1]||"fourth"]+(g2.violation?0:scoring.game2.complianceBonus)+g2.penaltyCount*scoring.game2.penalty)+" pts":"Pending"}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div style={{textAlign:"center",padding:12,background:"#080808",borderRadius:8,border:`1px solid ${g2.completed?"#00ff8833":"#1a1a1a"}`}}>
                      <div style={{fontSize:20,marginBottom:4}}>{g2.completed?"✅":"⏳"}</div>
                      <div style={{fontFamily:"monospace",fontSize:11,color:g2.completed?"#00ff88":"#555"}}>JERRICAN ARRIVED</div>
                    </div>
                    <div style={{textAlign:"center",padding:12,background:"#080808",borderRadius:8,border:`1px solid ${g2.violation?"#ff555533":"#1a1a1a"}`}}>
                      <div style={{fontSize:20,marginBottom:4}}>{g2.violation?"⚠️":"✅"}</div>
                      <div style={{fontFamily:"monospace",fontSize:11,color:g2.violation?"#ff5555":"#555"}}>RULE COMPLIANCE</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:10,color:"#555",marginBottom:6}}>FINISH RANK</div>
                      <select value={g2.rank||""} onChange={e=>setGame2Status(p=>({...p,[team.id]:{...p[team.id],rank:parseInt(e.target.value)||null}}))}
                        style={{width:"100%",background:"#080808",border:"1px solid #1a1a1a",borderRadius:8,padding:"10px 12px",color:"#fff",fontFamily:"monospace",fontSize:14,outline:"none"}}>
                        <option value="">Select rank</option>
                        <option value="1">1st Place</option>
                        <option value="2">2nd Place</option>
                        <option value="3">3rd Place</option>
                        <option value="4">4th Place</option>
                      </select>
                    </div>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:10,color:"#555",marginBottom:6}}>VIOLATIONS</div>
                      <input type="number" min="0" max="5" value={g2.penaltyCount}
                        onChange={e=>setGame2Status(p=>({...p,[team.id]:{...p[team.id],penaltyCount:parseInt(e.target.value)||0}}))}
                        style={{width:"100%",background:"#080808",border:"1px solid #1a1a1a",borderRadius:8,padding:"10px 12px",color:"#fff",fontFamily:"monospace",fontSize:14,outline:"none",textAlign:"center"}} />
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <button onClick={()=>setGame2Status(p=>({...p,[team.id]:{...p[team.id],completed:!p[team.id].completed}}))}
                      style={{background:g2.completed?"rgba(0,255,136,0.1)":"#080808",border:`1px solid ${g2.completed?"#00ff88":"#222"}`,color:g2.completed?"#00ff88":"#888",borderRadius:10,padding:"10px",fontFamily:"monospace",fontSize:12,cursor:"pointer"}}>
                      {g2.completed?"✅ COMPLETE":"MARK COMPLETE"}
                    </button>
                    <button onClick={()=>setGame2Status(p=>({...p,[team.id]:{...p[team.id],violation:!p[team.id].violation}}))}
                      style={{background:g2.violation?"rgba(255,85,85,0.1)":"#080808",border:`1px solid ${g2.violation?"#ff5555":"#222"}`,color:g2.violation?"#ff5555":"#888",borderRadius:10,padding:"10px",fontFamily:"monospace",fontSize:12,cursor:"pointer"}}>
                      {g2.violation?"⚠️ VIOLATION":"ADD VIOLATION"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* GAME 3 — Blindfold timers */}
        {tab==="g3"&&(
          <div>
            <div style={{...CARD,marginBottom:16,background:"rgba(74,240,255,0.04)",borderColor:"rgba(74,240,255,0.15)"}}>
              <div style={{fontFamily:"monospace",fontSize:11,color:"#4af0ff",marginBottom:6}}>🤝 COMMUNICATION & TRUST — ADMIN TIMER CONTROL</div>
              <div style={{fontSize:12,color:"#888",lineHeight:1.6}}>Start timer when blindfolded member begins. Stop when they touch their team's flag. Rankings auto-calculated by elapsed time.</div>
            </div>
            {TEAMS.map(team=>{
              const g3 = game3Timers[team.id];
              const allEnded = TEAMS.filter(t=>game3Timers[t.id].endTime).sort((a,b)=>game3Timers[a.id].elapsed-game3Timers[b.id].elapsed);
              const rank = allEnded.findIndex(t=>t.id===team.id);
              const pts = g3.endTime?[scoring.game3.byRank.first,scoring.game3.byRank.second,scoring.game3.byRank.third,scoring.game3.byRank.fourth][rank]||0:null;
              return (
                <div key={team.id} style={{...CARD,marginBottom:12,borderColor:`${team.color}33`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                    <span style={{fontSize:24}}>{team.emoji}</span>
                    <span style={{fontFamily:"monospace",fontSize:16,fontWeight:"bold",color:team.color,flex:1}}>{team.name}</span>
                    {pts!=null&&<span style={{fontFamily:"monospace",fontSize:18,color:"#00ff88"}}>{pts} pts · #{rank+1}</span>}
                  </div>
                  <div style={{textAlign:"center",marginBottom:14}}>
                    <div style={{fontFamily:"monospace",fontSize:44,fontWeight:"bold",letterSpacing:4,color:g3.running?"#ffbb00":g3.endTime?"#00ff88":"#333"}}>
                      {g3.endTime?`${String(Math.floor(g3.elapsed/60)).padStart(2,"0")}:${String(g3.elapsed%60).padStart(2,"0")}`:g3.running?`${String(Math.floor(g3.elapsed/60)).padStart(2,"0")}:${String(g3.elapsed%60).padStart(2,"0")}`:"00:00"}
                    </div>
                    {g3.endTime&&<div style={{fontSize:11,color:"#00ff88",fontFamily:"monospace",marginTop:4}}>COMPLETED</div>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <button onClick={()=>startG3(team.id)} disabled={g3.running||!!g3.endTime}
                      style={{background:g3.running||g3.endTime?"#080808":"rgba(0,255,136,0.08)",border:`1px solid ${g3.running||g3.endTime?"#1a1a1a":"#00ff88"}`,color:g3.running||g3.endTime?"#444":"#00ff88",borderRadius:10,padding:"12px",fontFamily:"monospace",fontSize:13,fontWeight:"bold",cursor:g3.running||g3.endTime?"not-allowed":"pointer"}}>
                      ▶ START
                    </button>
                    <button onClick={()=>stopG3(team.id)} disabled={!g3.running}
                      style={{background:g3.running?"rgba(255,85,85,0.08)":"#080808",border:`1px solid ${g3.running?"#ff5555":"#1a1a1a"}`,color:g3.running?"#ff5555":"#444",borderRadius:10,padding:"12px",fontFamily:"monospace",fontSize:13,fontWeight:"bold",cursor:g3.running?"pointer":"not-allowed"}}>
                      ⏹ STOP
                    </button>
                  </div>
                  {!g3.running&&!g3.endTime&&<button onClick={()=>startG3(team.id)} style={{width:"100%",marginTop:8,background:"#080808",border:"1px solid #1a1a1a",color:"#666",borderRadius:10,padding:"8px",fontFamily:"monospace",fontSize:11,cursor:"pointer"}}>↺ RESET</button>}
                </div>
              );
            })}
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
              return (
                <div key={p.id} style={{borderLeft:`3px solid ${team?.color||"#333"}`,background:"#0a0a0a",padding:"12px 14px",marginBottom:8,borderRadius:"0 10px 10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:"bold",color:"#ddd"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:3}}>Age {p.age} · {p.phone}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{pCheckins.length} check-ins</div>
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
            <p style={{fontFamily:"monospace",fontSize:11,color:"#555",marginBottom:12}}>GAME 5 FINISH MARKS (0–10, admin-awarded)</p>
            {TEAMS.map(team=>(
              <div key={team.id} style={{...CARD,marginBottom:10,borderColor:`${team.color}33`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <span style={{fontSize:22}}>{team.emoji}</span>
                  <span style={{fontFamily:"monospace",fontSize:15,fontWeight:"bold",color:team.color,flex:1}}>{team.name}</span>
                  <span style={{fontFamily:"monospace",fontSize:22,fontWeight:"bold",color:"#fff"}}>{game5Marks[team.id]||0}/10</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <input type="range" min="0" max="10" value={game5Marks[team.id]||0}
                    onChange={e=>setGame5Marks(p=>({...p,[team.id]:parseInt(e.target.value)}))}
                    style={{flex:1,accentColor:team.color,cursor:"pointer"}} />
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>0 — POOR</span>
                  <span style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>10 — EXCELLENT</span>
                </div>
                {/* Game 5 answers */}
                {gameAnswers.filter(a=>a.teamId===team.id&&a.game==="game5").map(a=>(
                  <div key={a.id} style={{background:"#080808",borderRadius:8,padding:10,marginTop:10}}>
                    <div style={{fontFamily:"monospace",fontSize:10,color:"#555",marginBottom:6}}>{a.cyclistName}</div>
                    {GAME5_QUESTIONS.map((q,i)=>(
                      <div key={i} style={{marginBottom:8}}>
                        <div style={{fontSize:10,color:"#666",marginBottom:2}}>{q}</div>
                        <div style={{fontSize:13,color:"#ddd",background:"#0d0d0d",padding:"6px 10px",borderRadius:6}}>{a.answers[i]||"—"}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings"&&(
          <div>
            {/* MODE TOGGLE — much clearer */}
            <p style={SEC_LABEL}>EVENT MODE</p>
            <div style={{...CARD,marginBottom:16,borderColor:testMode?"#ff555533":"#00ff8833"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontFamily:"monospace",fontSize:18,fontWeight:"bold",color:testMode?"#ff6666":"#00ff88"}}>
                    {testMode ? "TEST MODE" : "LIVE MODE"}
                  </div>
                  <div style={{fontSize:12,color:"#555",marginTop:4}}>
                    {testMode ? "All data is local only — nothing reaches Supabase" : "Writes are going to Supabase right now"}
                  </div>
                </div>
                <button onClick={()=>setTestMode(p=>!p)}
                  style={{background:testMode?"rgba(0,255,136,0.08)":"rgba(255,85,85,0.08)",border:`2px solid ${testMode?"#00ff88":"#ff5555"}`,color:testMode?"#00ff88":"#ff5555",borderRadius:10,padding:"12px 20px",cursor:"pointer",fontFamily:"monospace",fontSize:13,fontWeight:"bold"}}>
                  SWITCH TO {testMode?"LIVE":"TEST"}
                </button>
              </div>

              {!testMode && (
                <div style={{fontSize:11,color:"#ffaa00",background:"rgba(255,170,0,0.08)",padding:"8px 10px",borderRadius:6}}>
                  ⚠️ LIVE MODE ACTIVE — new registrations, check-ins and answers are being written to the internet database.
                </div>
              )}
            </div>

            {/* SUPABASE CONNECTION TESTER */}
            <p style={SEC_LABEL}>SUPABASE CONNECTION</p>
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

                <button
                  onClick={async () => {
                    if (!confirm("This will PERMANENTLY DELETE all participants, checkins and answers from Supabase. Continue?")) return;
                    await resetAllSupabaseData(showToast);
                    // Also clear local state so the UI is fresh
                    setParticipants([]); setCheckins([]); setGameAnswers([]);
                  }}
                  style={{background:"#3a0f0f",border:"1px solid #ff5555",color:"#ff8888",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontFamily:"monospace",fontSize:12}}>
                  RESET ALL DATA IN SUPABASE (fresh start)
                </button>
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
  timestamp timestamptz,
  gps jsonb
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
  const videoRef=useRef(null);
  const [err,setErr]=useState(false);
  useEffect(()=>{
    let s=null;
    navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment"}})
      .then(stream=>{s=stream;if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}})
      .catch(()=>setErr(true));
    return ()=>{if(s)s.getTracks().forEach(t=>t.stop());};
  },[]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#0d0d0d",borderRadius:"16px 16px 0 0",width:"100%",overflow:"hidden",border:"1px solid #222"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #1a1a1a"}}>
          <span style={{color:"#00ff88",fontFamily:"monospace",fontSize:13,fontWeight:"bold"}}>◉ QR SCANNER</span>
          <button onClick={onClose} style={{background:"#1a1a1a",border:"1px solid #333",color:"#aaa",width:34,height:34,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        {!err&&(
          <div style={{position:"relative",background:"#000",minHeight:180}}>
            <video ref={videoRef} style={{width:"100%",maxHeight:200,display:"block",objectFit:"cover"}} />
            <div style={{position:"absolute",inset:"12%",pointerEvents:"none"}}>
              <div style={{position:"absolute",top:0,left:0,width:22,height:22,borderTop:"3px solid #00ff88",borderLeft:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",top:0,right:0,width:22,height:22,borderTop:"3px solid #00ff88",borderRight:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",bottom:0,left:0,width:22,height:22,borderBottom:"3px solid #00ff88",borderLeft:"3px solid #00ff88"}}/>
              <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,borderBottom:"3px solid #00ff88",borderRight:"3px solid #00ff88"}}/>
            </div>
          </div>
        )}
        <div style={{padding:16}}>
          <p style={{color:"#444",fontSize:11,fontFamily:"monospace",marginBottom:8}}>MANUAL INPUT FOR TESTING</p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input id="mqr" placeholder="QR code value..." style={{flex:1,background:"#111",border:"1px solid #222",borderRadius:8,padding:"11px 13px",color:"#fff",fontSize:14,fontFamily:"monospace",outline:"none"}} />
            <button onClick={()=>{const v=document.getElementById("mqr").value;if(v)onScan(v);}} style={{background:"#00ff88",border:"none",color:"#000",borderRadius:8,padding:"0 18px",fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"monospace"}}>GO</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {["CYCLEOPS-REGISTER","CYCLEOPS-CP1","CYCLEOPS-CP2","CYCLEOPS-CP3","CYCLEOPS-FINISH","CYCLEOPS-ADMIN"].map(code=>(
              <button key={code} onClick={()=>onScan(code)} style={{background:"#111",border:"1px solid #222",color:"#00ff88",padding:"9px 12px",borderRadius:7,cursor:"pointer",fontFamily:"monospace",fontSize:11,fontWeight:"bold"}}>
                {code.replace("CYCLEOPS-","")}
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
