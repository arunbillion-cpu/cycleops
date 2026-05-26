'use client'

// ╔═══════════════════════════════════════════════════════════════╗
// ║           CYCLEOPS — TACTICAL ENDURANCE EVENT MANAGER         ║
// ║  Full-stack PWA: Registration · Teams · Pit Stops · Scoring   ║
// ╚═══════════════════════════════════════════════════════════════╝
//
// DEPLOYMENT GUIDE (Free Tier):
// ─────────────────────────────
// 1. Firebase Setup:
//    - firebase.google.com → New Project
//    - Enable Firestore Database (production mode)
//    - Enable Authentication → Anonymous
//    - Add web app → copy firebaseConfig
//    - Replace FIREBASE_CONFIG below
//
// 2. Vercel Deployment:
//    - Create Next.js app: npx create-next-app@latest cycleops
//    - Copy this file to pages/index.jsx (or app/page.jsx)
//    - npm install firebase qrcode.react html5-qrcode xlsx jspdf
//    - vercel --prod
//
// DATABASE SCHEMA (Firestore Collections):
// ─────────────────────────────────────────
// participants/{id}: { name, age, phone, emergencyContact, medicalDeclared,
//                      teamId, registeredAt, startTime, gps }
// teams/{id}:        { name, color, emoji, members[], totalScore, rank }
// checkins/{id}:     { teamId, pitStop, timestamp, gps, activityScore }
// scores/{id}:       { teamId, pitStop, arrivalPoints, activityPoints,
//                      bonusPoints, penaltyPoints, total, updatedBy }
// questions/{id}:    { teamId, pitStop, questions[], answers[], autoScore }
// admins/{id}:       { email, role, createdAt }

import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════
// FIREBASE CONFIG — Replace with your credentials
// ══════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ══════════════════════════════════════════════
// TEAM DEFINITIONS
// ══════════════════════════════════════════════
const TEAMS = [
  { id: "alpha",   name: "ALPHA",   color: "#00ff88", hex: "00ff88", emoji: "⚡", tagline: "Swift & Relentless" },
  { id: "bravo",   name: "BRAVO",   color: "#ff4444", hex: "ff4444", emoji: "🔥", tagline: "Bold & Fearless" },
  { id: "charlie", name: "CHARLIE", color: "#4488ff", hex: "4488ff", emoji: "💎", tagline: "Precise & Tactical" },
  { id: "delta",   name: "DELTA",   color: "#ffaa00", hex: "ffaa00", emoji: "🌪️", tagline: "Fast & Unstoppable" },
];

const PIT_STOPS = [
  { id: "ps1", name: "PIT STOP 1", label: "Observation Challenge", km: 12, icon: "👁️" },
  { id: "ps2", name: "PIT STOP 2", label: "Team Coordination",     km: 24, icon: "🤝" },
  { id: "ps3", name: "PIT STOP 3", label: "Tactical Problem",      km: 36, icon: "🧩" },
];

// ══════════════════════════════════════════════
// AI-GENERATED OBSERVATION QUESTIONS PER TEAM
// ══════════════════════════════════════════════
const OBSERVATION_QUESTIONS = {
  alpha: [
    { q: "What color was the gate near the canal bridge at km 3?", a: "red", options: ["Red","Blue","Green","Yellow"] },
    { q: "How many speed breakers did you count before the first checkpoint?", a: "4", options: ["2","3","4","5"] },
    { q: "What animal statue was visible near the roadside temple?", a: "elephant", options: ["Lion","Elephant","Horse","Bull"] },
    { q: "Which direction did the wind flag point at the hilltop?", a: "north", options: ["North","South","East","West"] },
    { q: "What was the dominant color of the buildings in Village 1?", a: "white", options: ["White","Yellow","Blue","Pink"] },
  ],
  bravo: [
    { q: "What was written on the large sign near km 8?", a: "welcome", options: ["Welcome","Caution","Stop","Speed Limit"] },
    { q: "How many trees lined the canal path section?", a: "12", options: ["8","10","12","15"] },
    { q: "What type of vehicle was parked at the farm near km 10?", a: "tractor", options: ["Truck","Tractor","Car","Bicycle"] },
    { q: "What color were the bollards along the cycle track?", a: "orange", options: ["Red","Orange","Yellow","White"] },
    { q: "Which village name appeared on the first milestone?", a: "greenfield", options: ["Greenfield","Riverside","Hilltop","Valley"] },
  ],
  charlie: [
    { q: "What was the height marking on the bridge overhead sign?", a: "4.5m", options: ["3.5m","4m","4.5m","5m"] },
    { q: "What color flags were at the festival ground near km 6?", a: "yellow", options: ["Red","Blue","Yellow","Green"] },
    { q: "How many benches were at the rest area after the bridge?", a: "6", options: ["4","5","6","8"] },
    { q: "What was the name on the tea stall near checkpoint route?", a: "chai point", options: ["Chai Point","Tea House","Fresh Brew","Garden Cafe"] },
    { q: "What was the road surface type on the hill descent?", a: "cobblestone", options: ["Asphalt","Gravel","Cobblestone","Concrete"] },
  ],
  delta: [
    { q: "What color was the telephone booth near the market area?", a: "yellow", options: ["Red","Yellow","Green","Blue"] },
    { q: "How many street lights were on the canal bridge?", a: "8", options: ["6","7","8","10"] },
    { q: "What animal was grazing near the open field at km 14?", a: "cow", options: ["Horse","Goat","Cow","Sheep"] },
    { q: "What was the km marker number at the start of the forest path?", a: "11", options: ["9","10","11","12"] },
    { q: "What shape was the landmark monument at the village center?", a: "pyramid", options: ["Sphere","Pyramid","Cube","Cylinder"] },
  ],
};

// ══════════════════════════════════════════════
// LOCAL MOCK DATABASE (replaces Firebase in demo)
// ══════════════════════════════════════════════
const db = {
  participants: [],
  teams: TEAMS.map(t => ({ ...t, members: [], totalScore: 0, rank: 0 })),
  checkins: [],
  scores: TEAMS.reduce((acc, t) => {
    acc[t.id] = { arrivalPoints: 0, activityPoints: 0, bonusPoints: 0, penaltyPoints: 0, total: 0 };
    return acc;
  }, {}),
  activityAnswers: {},
};

// ══════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

const getTeamColor = (teamId) => TEAMS.find(t => t.id === teamId)?.color || "#ffffff";

const formatTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const assignTeamBalanced = (participants) => {
  const sorted = [...participants].sort((a, b) => a.age - b.age);
  const teamAssignments = { alpha: [], bravo: [], charlie: [], delta: [] };
  const teamIds = ["alpha", "bravo", "charlie", "delta"];
  sorted.forEach((p, i) => {
    teamAssignments[teamIds[i % 4]].push(p.id);
  });
  return teamAssignments;
};

const calcScore = (teamId) => {
  const s = db.scores[teamId];
  return s.arrivalPoints + s.activityPoints + s.bonusPoints - s.penaltyPoints;
};

const getLeaderboard = () => {
  return TEAMS.map(team => ({
    ...team,
    score: calcScore(team.id),
    members: db.participants.filter(p => p.teamId === team.id),
    checkins: db.checkins.filter(c => c.teamId === team.id),
  })).sort((a, b) => b.score - a.score).map((t, i) => ({ ...t, rank: i + 1 }));
};

// ══════════════════════════════════════════════
// QR CODE COMPONENT (Canvas-based, no library needed)
// ══════════════════════════════════════════════
function QRCode({ value, size = 200, color = "#00ff88", bg = "#0a0a0a" }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = size;
    canvas.height = size;
    
    // Draw background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    
    // Generate a simple visual QR placeholder with the encoded value hash
    const hash = value.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    const seed = Math.abs(hash);
    
    const modules = 25;
    const cellSize = Math.floor((size - 20) / modules);
    const offset = Math.floor((size - modules * cellSize) / 2);
    
    // Finder patterns
    const drawFinder = (x, y) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize + offset, y * cellSize + offset, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = bg;
      ctx.fillRect((x+1) * cellSize + offset, (y+1) * cellSize + offset, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = color;
      ctx.fillRect((x+2) * cellSize + offset, (y+2) * cellSize + offset, 3 * cellSize, 3 * cellSize);
    };
    
    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);
    
    // Data modules
    const lcg = (s) => { let v = s; return () => { v = (v * 1664525 + 1013904223) & 0xffffffff; return (v >>> 0) / 0xffffffff; }; };
    const rand = lcg(seed);
    
    ctx.fillStyle = color;
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        const inFinder = (row < 8 && col < 8) || (row < 8 && col >= modules - 8) || (row >= modules - 8 && col < 8);
        if (!inFinder && rand() > 0.5) {
          ctx.fillRect(col * cellSize + offset, row * cellSize + offset, cellSize - 1, cellSize - 1);
        }
      }
    }
    
    // Label below
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, size * 0.045)}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    const label = value.length > 20 ? value.substring(0, 20) + "…" : value;
    ctx.fillText(label, size / 2, size - 4);
    
  }, [value, size, color, bg]);
  
  return <canvas ref={canvasRef} style={{ borderRadius: 8, display: "block" }} />;
}

// ══════════════════════════════════════════════
// QR SCANNER COMPONENT (Camera-based)
// ══════════════════════════════════════════════
function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setScanning(true);
        }
      } catch (e) {
        setError("Camera access denied. Please allow camera permission.");
      }
    };
    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  // Simulate scan after 2s for demo purposes
  const handleManualScan = (val) => { onScan(val); };

  return (
    <div style={styles.scannerOverlay}>
      <div style={styles.scannerBox}>
        <div style={styles.scannerHeader}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 14 }}>◉ QR SCANNER ACTIVE</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        {error ? (
          <div style={{ padding: 20, color: "#ff4444", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {error}
            <br/><br/>
            <span style={{ color: "#888", fontSize: 11 }}>Use manual input below</span>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <video ref={videoRef} style={{ width: "100%", borderRadius: 4, display: "block", background: "#111" }} />
            {scanning && (
              <div style={styles.scannerReticle}>
                <div style={styles.scannerCornerTL} />
                <div style={styles.scannerCornerTR} />
                <div style={styles.scannerCornerBL} />
                <div style={styles.scannerCornerBR} />
                <div style={styles.scanLine} />
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a" }}>
          <p style={{ color: "#555", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 8 }}>MANUAL QR INPUT (DEMO)</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              style={styles.input} 
              placeholder="Paste QR code value..." 
              id="manualQR"
            />
            <button 
              style={{ ...styles.btnPrimary, padding: "8px 14px", fontSize: 12 }}
              onClick={() => {
                const val = document.getElementById("manualQR").value;
                if (val) handleManualScan(val);
              }}
            >SCAN</button>
          </div>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["REGISTER", "START", "PS1", "PS2", "PS3", "ADMIN"].map(code => (
              <button key={code} onClick={() => handleManualScan(code)}
                style={{ background: "#111", border: "1px solid #222", color: "#888", 
                         padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                         fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════
export default function CycleOps() {
  const [view, setView] = useState("home");
  const [showScanner, setShowScanner] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState(TEAMS.map(t => ({ ...t, members: [], totalScore: 0 })));
  const [checkins, setCheckins] = useState([]);
  const [scores, setScores] = useState(db.scores);
  const [leaderboard, setLeaderboard] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);
  const [activePitStop, setActivePitStop] = useState(null);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [ps2Scores, setPs2Scores] = useState({ coordination: 0, teamwork: 0, communication: 0, speed: 0 });
  const [ps3Timer, setPs3Timer] = useState(null);
  const [ps3Running, setPs3Running] = useState(false);
  const [ps3Elapsed, setPs3Elapsed] = useState(0);
  const [regForm, setRegForm] = useState({ name: "", age: "", phone: "", emergency: "", medical: false });
  const [darkMode] = useState(true);

  // Recalculate leaderboard whenever scores change
  useEffect(() => {
    const lb = TEAMS.map(team => {
      const s = scores[team.id] || {};
      const total = (s.arrivalPoints || 0) + (s.activityPoints || 0) + (s.bonusPoints || 0) - (s.penaltyPoints || 0);
      const members = participants.filter(p => p.teamId === team.id);
      const teamCheckins = checkins.filter(c => c.teamId === team.id);
      return { ...team, score: total, members, checkins: teamCheckins };
    }).sort((a, b) => b.score - a.score).map((t, i) => ({ ...t, rank: i + 1 }));
    setLeaderboard(lb);
  }, [scores, participants, checkins]);

  // PS3 timer
  useEffect(() => {
    if (ps3Running) {
      const interval = setInterval(() => setPs3Elapsed(e => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [ps3Running]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleQRScan = (code) => {
    setShowScanner(false);
    const upper = code.toUpperCase().trim();
    if (upper === "REGISTER") { setView("register"); return; }
    if (upper === "START") { setView("eventStart"); return; }
    if (upper === "PS1") { setActivePitStop("ps1"); setView("pitStop"); return; }
    if (upper === "PS2") { setActivePitStop("ps2"); setView("pitStop"); return; }
    if (upper === "PS3") { setActivePitStop("ps3"); setView("pitStop"); return; }
    if (upper === "ADMIN") { setView("adminAuth"); return; }
    // Check team QR
    const teamMatch = TEAMS.find(t => upper === `TEAM-${t.name}`);
    if (teamMatch) { setActiveTeam(teamMatch.id); showToast(`Team ${teamMatch.name} identified!`); return; }
    showToast("Unknown QR code: " + code, "error");
  };

  const handleRegister = () => {
    if (!regForm.name || !regForm.age || !regForm.phone || !regForm.emergency) {
      showToast("Please fill all required fields", "error"); return;
    }
    if (!regForm.medical) {
      showToast("Medical declaration required", "error"); return;
    }
    const id = generateId();
    const newP = { id, ...regForm, age: parseInt(regForm.age), registeredAt: new Date().toISOString(), teamId: null };
    const updated = [...participants, newP];
    
    // Auto-assign teams
    const sortedByAge = [...updated].sort((a, b) => a.age - b.age);
    const teamIds = ["alpha", "bravo", "charlie", "delta"];
    sortedByAge.forEach((p, i) => { p.teamId = teamIds[i % 4]; });
    
    setParticipants(updated.map(p => sortedByAge.find(s => s.id === p.id) || p));
    setCurrentParticipant(newP);
    
    // Update arrival points for assigned team
    const assignedTeam = sortedByAge.find(p => p.id === id)?.teamId || teamIds[updated.length % 4];
    const bonus = updated.length <= 4 ? 10 : 5; // early bird bonus
    setScores(prev => ({
      ...prev,
      [assignedTeam]: { ...prev[assignedTeam], bonusPoints: (prev[assignedTeam].bonusPoints || 0) + bonus }
    }));
    
    setRegForm({ name: "", age: "", phone: "", emergency: "", medical: false });
    setView("registered");
    showToast(`Welcome, ${newP.name}! You've been assigned a team.`);
  };

  const handleStartEvent = () => {
    if (!activeTeam) { showToast("Select your team first", "error"); return; }
    const gps = { lat: 13.0827 + Math.random() * 0.01, lng: 80.2707 + Math.random() * 0.01 };
    const checkin = { id: generateId(), teamId: activeTeam, type: "start", timestamp: new Date().toISOString(), gps };
    setCheckins(prev => [...prev, checkin]);
    setScores(prev => ({
      ...prev,
      [activeTeam]: { ...prev[activeTeam], arrivalPoints: (prev[activeTeam].arrivalPoints || 0) + 50 }
    }));
    showToast(`Team ${TEAMS.find(t => t.id === activeTeam)?.name} — EVENT STARTED! 🚀`);
    setView("home");
  };

  const handlePitStopArrival = () => {
    if (!activeTeam || !activePitStop) { showToast("Select team first", "error"); return; }
    const psPoints = { ps1: 30, ps2: 30, ps3: 30 };
    const gps = { lat: 13.0827 + Math.random() * 0.05, lng: 80.2707 + Math.random() * 0.05 };
    const existing = checkins.find(c => c.teamId === activeTeam && c.type === activePitStop);
    if (existing) { showToast("Already checked in at this pit stop!", "warning"); return; }
    const checkin = { id: generateId(), teamId: activeTeam, type: activePitStop, timestamp: new Date().toISOString(), gps };
    setCheckins(prev => [...prev, checkin]);
    setScores(prev => ({
      ...prev,
      [activeTeam]: { ...prev[activeTeam], arrivalPoints: (prev[activeTeam].arrivalPoints || 0) + psPoints[activePitStop] }
    }));
    showToast(`✅ Pit Stop arrival recorded! +${psPoints[activePitStop]} points`);
  };

  const handleQuizSubmit = () => {
    if (!activeTeam) return;
    const questions = OBSERVATION_QUESTIONS[activeTeam];
    let correct = 0;
    questions.forEach((q, i) => { if (quizAnswers[i] === q.a) correct++; });
    const points = correct * 20;
    setScores(prev => ({
      ...prev,
      [activeTeam]: { ...prev[activeTeam], activityPoints: (prev[activeTeam].activityPoints || 0) + points }
    }));
    setQuizSubmitted(true);
    showToast(`Quiz complete! ${correct}/${questions.length} correct — +${points} pts`);
  };

  const handlePS2Submit = () => {
    if (!activeTeam) return;
    const total = Object.values(ps2Scores).reduce((a, b) => a + Number(b), 0);
    const scaled = Math.round((total / (4 * 10)) * 100);
    setScores(prev => ({
      ...prev,
      [activeTeam]: { ...prev[activeTeam], activityPoints: (prev[activeTeam].activityPoints || 0) + scaled }
    }));
    showToast(`Coordination scores saved! +${scaled} points`);
    setView("home");
  };

  const handlePS3Submit = (pts) => {
    if (!activeTeam) return;
    const timeBonus = ps3Elapsed < 120 ? 30 : ps3Elapsed < 240 ? 20 : 10;
    const total = pts + timeBonus;
    setScores(prev => ({
      ...prev,
      [activeTeam]: { ...prev[activeTeam], activityPoints: (prev[activeTeam].activityPoints || 0) + total }
    }));
    showToast(`Tactical challenge done! +${total} points (incl. time bonus)`);
    setView("home");
  };

  const exportToCSV = () => {
    const rows = [["Rank","Team","Score","Members","Checkins"]];
    leaderboard.forEach(t => {
      rows.push([t.rank, t.name, t.score, t.members.map(m => m.name).join("; "), t.checkins.length]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "cycleops_results.csv"; a.click();
    showToast("Results exported!");
  };

  // ─── RENDER ────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{globalStyles}</style>
      
      {/* TOAST */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ff4444" : toast.type === "warning" ? "#ffaa00" : "#00ff88" }}>
          {toast.msg}
        </div>
      )}

      {/* QR SCANNER */}
      {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navBrand} onClick={() => setView("home")}>
          <span style={{ color: "var(--accent)", fontSize: 20 }}>◎</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 4, color: "#fff" }}>CYCLEOPS</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.navBtn} onClick={() => setView("leaderboard")}>🏆</button>
          <button style={styles.navBtn} onClick={() => setShowScanner(true)}>📷</button>
          <button style={styles.navBtn} onClick={() => setView(adminAuth ? "admin" : "adminAuth")}>⚙️</button>
        </div>
      </nav>

      {/* VIEWS */}
      <div style={styles.content}>
        {view === "home" && <HomeView setView={setView} setShowScanner={setShowScanner} leaderboard={leaderboard} activeTeam={activeTeam} setActiveTeam={setActiveTeam} />}
        {view === "register" && <RegisterView regForm={regForm} setRegForm={setRegForm} onSubmit={handleRegister} />}
        {view === "registered" && <RegisteredView participant={currentParticipant} participants={participants} setView={setView} />}
        {view === "eventStart" && <EventStartView activeTeam={activeTeam} setActiveTeam={setActiveTeam} onStart={handleStartEvent} setView={setView} />}
        {view === "pitStop" && <PitStopView activePitStop={activePitStop} activeTeam={activeTeam} setActiveTeam={setActiveTeam} onArrival={handlePitStopArrival} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} quizSubmitted={quizSubmitted} setQuizSubmitted={setQuizSubmitted} onQuizSubmit={handleQuizSubmit} ps2Scores={ps2Scores} setPs2Scores={setPs2Scores} onPS2Submit={handlePS2Submit} ps3Timer={ps3Timer} ps3Running={ps3Running} setPs3Running={setPs3Running} ps3Elapsed={ps3Elapsed} setPs3Elapsed={setPs3Elapsed} onPS3Submit={handlePS3Submit} setView={setView} />}
        {view === "leaderboard" && <LeaderboardView leaderboard={leaderboard} setView={setView} />}
        {view === "adminAuth" && <AdminAuthView adminPin={adminPin} setAdminPin={setAdminPin} onAuth={() => { if (adminPin === "1234") { setAdminAuth(true); setView("admin"); showToast("Admin access granted"); } else showToast("Wrong PIN", "error"); }} setView={setView} />}
        {view === "admin" && adminAuth && <AdminView participants={participants} leaderboard={leaderboard} checkins={checkins} scores={scores} setScores={setScores} onExport={exportToCSV} setView={setView} showToast={showToast} />}
        {view === "qrcodes" && <QRCodesView setView={setView} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: HOME
// ══════════════════════════════════════════════
function HomeView({ setView, setShowScanner, leaderboard, activeTeam, setActiveTeam }) {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroGrid} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={styles.heroBadge}>TACTICAL ENDURANCE COMPETITION</div>
          <h1 style={styles.heroTitle}>CYCLE<br/><span style={{ color: "var(--accent)" }}>OPS</span></h1>
          <p style={styles.heroSub}>40 KM · 4 TEAMS · 3 PIT STOPS · REAL-TIME SCORING</p>
          
          {/* Live top team */}
          {leaderboard.length > 0 && leaderboard[0].score > 0 && (
            <div style={styles.liveLeader}>
              <span style={{ color: "#888", fontSize: 10, fontFamily: "var(--font-mono)" }}>LEADING</span>
              <br/>
              <span style={{ color: TEAMS.find(t => t.id === leaderboard[0].id)?.color, fontFamily: "var(--font-display)", fontSize: 22 }}>
                {leaderboard[0].emoji} {leaderboard[0].name}
              </span>
              <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 18, marginLeft: 12 }}>
                {leaderboard[0].score} PTS
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Team selector */}
      <div style={{ padding: "0 16px 16px" }}>
        <p style={styles.sectionLabel}>YOUR TEAM</p>
        <div style={styles.teamGrid}>
          {TEAMS.map(team => (
            <button key={team.id} onClick={() => setActiveTeam(team.id)}
              style={{ ...styles.teamCard, borderColor: activeTeam === team.id ? team.color : "#1a1a1a",
                       background: activeTeam === team.id ? `${team.color}15` : "#0d0d0d",
                       boxShadow: activeTeam === team.id ? `0 0 20px ${team.color}40` : "none" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{team.emoji}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: team.color, letterSpacing: 2 }}>{team.name}</div>
              <div style={{ fontSize: 9, color: "#555", fontFamily: "var(--font-mono)", marginTop: 2 }}>{team.tagline}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={styles.btnLarge} onClick={() => setShowScanner(true)}>
          <span style={{ fontSize: 24 }}>📷</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2 }}>SCAN QR CODE</div>
            <div style={{ fontSize: 10, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>Register · Start · Pit Stops</div>
          </div>
        </button>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button style={styles.btnSecondary} onClick={() => setView("register")}>
            <div style={{ fontSize: 20 }}>📝</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>REGISTER</div>
          </button>
          <button style={styles.btnSecondary} onClick={() => setView("leaderboard")}>
            <div style={{ fontSize: 20 }}>🏆</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>LEADERBOARD</div>
          </button>
          <button style={styles.btnSecondary} onClick={() => setView("eventStart")}>
            <div style={{ fontSize: 20 }}>🚀</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>START EVENT</div>
          </button>
          <button style={styles.btnSecondary} onClick={() => setView("qrcodes")}>
            <div style={{ fontSize: 20 }}>⬛</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>QR CODES</div>
          </button>
        </div>
      </div>

      {/* Route map */}
      <div style={{ padding: "20px 16px 0" }}>
        <p style={styles.sectionLabel}>ROUTE MAP</p>
        <div style={styles.routeBar}>
          <div style={styles.routeStart}>START</div>
          {PIT_STOPS.map((ps, i) => (
            <div key={ps.id} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={styles.routeLine} />
              <div style={styles.routeNode}>
                <div style={{ fontSize: 16 }}>{ps.icon}</div>
                <div style={{ fontSize: 8, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>KM {ps.km}</div>
              </div>
            </div>
          ))}
          <div style={styles.routeLine} />
          <div style={styles.routeFinish}>FINISH</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 4 }}>
          {PIT_STOPS.map(ps => (
            <div key={ps.id} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 8, color: "#555", fontFamily: "var(--font-mono)" }}>{ps.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: REGISTER
// ══════════════════════════════════════════════
function RegisterView({ regForm, setRegForm, onSubmit }) {
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>📝</div>
        <h2 style={styles.pageTitle}>PARTICIPANT<br/>REGISTRATION</h2>
        <p style={styles.pageSub}>Fill in your details to join the event</p>
      </div>
      
      <div style={{ padding: "0 16px" }}>
        <div style={styles.formCard}>
          <label style={styles.label}>FULL NAME *</label>
          <input style={styles.input} placeholder="Enter your full name" value={regForm.name}
            onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} />
          
          <label style={styles.label}>AGE *</label>
          <input style={styles.input} type="number" placeholder="Your age" value={regForm.age}
            onChange={e => setRegForm(p => ({ ...p, age: e.target.value }))} />
          
          <label style={styles.label}>PHONE NUMBER *</label>
          <input style={styles.input} type="tel" placeholder="+91 9999999999" value={regForm.phone}
            onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
          
          <label style={styles.label}>EMERGENCY CONTACT *</label>
          <input style={styles.input} placeholder="Name & phone" value={regForm.emergency}
            onChange={e => setRegForm(p => ({ ...p, emergency: e.target.value }))} />
          
          <div style={styles.checkRow} onClick={() => setRegForm(p => ({ ...p, medical: !p.medical }))}>
            <div style={{ ...styles.checkbox, borderColor: regForm.medical ? "var(--accent)" : "#333",
                          background: regForm.medical ? "var(--accent)" : "transparent" }}>
              {regForm.medical && <span style={{ color: "#000", fontSize: 12 }}>✓</span>}
            </div>
            <span style={{ fontSize: 12, color: "#888", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
              I declare I am medically fit to participate and have no conditions that would prevent cycling 40km.
            </span>
          </div>
          
          <button style={{ ...styles.btnLarge, marginTop: 16 }} onClick={onSubmit}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2 }}>REGISTER NOW</div>
              <div style={{ fontSize: 10, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>Auto team assignment</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: REGISTERED CONFIRMATION
// ══════════════════════════════════════════════
function RegisteredView({ participant, participants, setView }) {
  if (!participant) { setView("home"); return null; }
  const p = participants.find(x => x.id === participant.id) || participant;
  const team = TEAMS.find(t => t.id === p.teamId);
  
  return (
    <div style={styles.page}>
      <div style={{ textAlign: "center", padding: "40px 24px 24px" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
        <h2 style={{ ...styles.pageTitle, color: "var(--accent)" }}>REGISTERED!</h2>
        <p style={{ color: "#888", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 24 }}>
          Welcome to CycleOps, {p.name}
        </p>
        
        {team && (
          <div style={{ ...styles.teamBanner, borderColor: team.color, background: `${team.color}10`,
                        boxShadow: `0 0 40px ${team.color}30` }}>
            <div style={{ fontSize: 50, marginBottom: 8 }}>{team.emoji}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "#888", letterSpacing: 3, marginBottom: 4 }}>YOU ARE IN</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: team.color, letterSpacing: 6 }}>TEAM {team.name}</div>
            <div style={{ fontSize: 11, color: "#666", fontFamily: "var(--font-mono)", marginTop: 6 }}>{team.tagline}</div>
          </div>
        )}
        
        <div style={styles.idCard}>
          <div style={styles.idRow}><span style={styles.idLabel}>ID</span><span style={styles.idVal}>{p.id}</span></div>
          <div style={styles.idRow}><span style={styles.idLabel}>NAME</span><span style={styles.idVal}>{p.name}</span></div>
          <div style={styles.idRow}><span style={styles.idLabel}>AGE</span><span style={styles.idVal}>{p.age}</span></div>
          <div style={styles.idRow}><span style={styles.idLabel}>TEAM</span><span style={{ ...styles.idVal, color: team?.color }}>{team?.name}</span></div>
          <div style={styles.idRow}><span style={styles.idLabel}>REGISTERED</span><span style={styles.idVal}>{formatTime(p.registeredAt)}</span></div>
        </div>
        
        <button style={{ ...styles.btnLarge, marginTop: 16 }} onClick={() => setView("home")}>
          ← BACK TO HOME
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: EVENT START
// ══════════════════════════════════════════════
function EventStartView({ activeTeam, setActiveTeam, onStart, setView }) {
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>🚀</div>
        <h2 style={styles.pageTitle}>EVENT START<br/>CHECKPOINT</h2>
        <p style={styles.pageSub}>Record your team's departure time</p>
      </div>
      
      <div style={{ padding: "0 16px" }}>
        <p style={styles.sectionLabel}>SELECT YOUR TEAM</p>
        <div style={styles.teamGrid}>
          {TEAMS.map(team => (
            <button key={team.id} onClick={() => setActiveTeam(team.id)}
              style={{ ...styles.teamCard, borderColor: activeTeam === team.id ? team.color : "#1a1a1a",
                       background: activeTeam === team.id ? `${team.color}15` : "#0d0d0d" }}>
              <div style={{ fontSize: 28 }}>{team.emoji}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: team.color, letterSpacing: 2 }}>{team.name}</div>
            </button>
          ))}
        </div>
        
        <div style={styles.infoBox}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#888" }}>CURRENT TIME</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--accent)", letterSpacing: 2 }}>
            {new Date().toLocaleTimeString()}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", marginTop: 4 }}>
            GPS will be recorded automatically
          </div>
        </div>
        
        <button style={{ ...styles.btnLarge, marginTop: 16, opacity: activeTeam ? 1 : 0.4 }} onClick={onStart} disabled={!activeTeam}>
          <span style={{ fontSize: 24 }}>🏁</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2 }}>CONFIRM START</div>
            <div style={{ fontSize: 10, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>+50 arrival points</div>
          </div>
        </button>
        <button style={styles.btnBack} onClick={() => setView("home")}>← BACK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: PIT STOP (routes to sub-activities)
// ══════════════════════════════════════════════
function PitStopView(props) {
  const { activePitStop, activeTeam, setActiveTeam, onArrival, setView } = props;
  const [phase, setPhase] = useState("arrival"); // arrival → activity
  const ps = PIT_STOPS.find(p => p.id === activePitStop);

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>{ps?.icon}</div>
        <h2 style={styles.pageTitle}>{ps?.name}<br/><span style={{ color: "var(--accent)", fontSize: "0.7em" }}>{ps?.label.toUpperCase()}</span></h2>
        <p style={styles.pageSub}>KM {ps?.km} checkpoint</p>
      </div>
      
      <div style={{ padding: "0 16px" }}>
        {phase === "arrival" ? (
          <>
            <p style={styles.sectionLabel}>SELECT YOUR TEAM</p>
            <div style={styles.teamGrid}>
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => setActiveTeam(team.id)}
                  style={{ ...styles.teamCard, borderColor: activeTeam === team.id ? team.color : "#1a1a1a",
                           background: activeTeam === team.id ? `${team.color}15` : "#0d0d0d" }}>
                  <div style={{ fontSize: 24 }}>{team.emoji}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: team.color, letterSpacing: 2 }}>{team.name}</div>
                </button>
              ))}
            </div>
            <button style={{ ...styles.btnLarge, marginTop: 12, opacity: activeTeam ? 1 : 0.4 }}
              onClick={() => { onArrival(); setPhase("activity"); }} disabled={!activeTeam}>
              <span>📍</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2 }}>CONFIRM ARRIVAL</div>
                <div style={{ fontSize: 10, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>+30 pts · Unlock activity</div>
              </div>
            </button>
          </>
        ) : activePitStop === "ps1" ? (
          <PS1Activity {...props} />
        ) : activePitStop === "ps2" ? (
          <PS2Activity {...props} />
        ) : (
          <PS3Activity {...props} />
        )}
        
        <button style={styles.btnBack} onClick={() => setView("home")}>← BACK TO HOME</button>
      </div>
    </div>
  );
}

// ── PS1: Observation Quiz ───────────────────
function PS1Activity({ activeTeam, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted, onQuizSubmit }) {
  const questions = OBSERVATION_QUESTIONS[activeTeam] || OBSERVATION_QUESTIONS.alpha;
  
  if (quizSubmitted) {
    let correct = 0;
    questions.forEach((q, i) => { if (quizAnswers[i] === q.a) correct++; });
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 50 }}>🎯</div>
        <h3 style={{ fontFamily: "var(--font-display)", color: "var(--accent)", fontSize: 24, letterSpacing: 3, margin: "12px 0" }}>
          {correct}/{questions.length}
        </h3>
        <p style={{ color: "#888", fontFamily: "var(--font-mono)", fontSize: 12 }}>OBSERVATION SCORE: {correct * 20} PTS</p>
        <button style={{ ...styles.btnPrimary, marginTop: 16 }} onClick={() => setQuizSubmitted(false)}>REVIEW ANSWERS</button>
      </div>
    );
  }
  
  return (
    <div>
      <div style={{ ...styles.infoBox, marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>👁️ OBSERVATION CHALLENGE</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          Answer {questions.length} questions about what you saw on the route. +20 pts each.
        </div>
      </div>
      {questions.map((q, i) => (
        <div key={i} style={styles.quizCard}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginBottom: 6 }}>Q{i + 1}</div>
          <div style={{ fontSize: 13, color: "#ddd", marginBottom: 12, lineHeight: 1.5 }}>{q.q}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {q.options.map(opt => (
              <button key={opt} onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: opt.toLowerCase() }))}
                style={{ ...styles.optionBtn, 
                         borderColor: quizAnswers[i] === opt.toLowerCase() ? "var(--accent)" : "#222",
                         background: quizAnswers[i] === opt.toLowerCase() ? "rgba(0,255,136,0.1)" : "#0d0d0d",
                         color: quizAnswers[i] === opt.toLowerCase() ? "var(--accent)" : "#888" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button style={{ ...styles.btnLarge, marginTop: 8 }} onClick={onQuizSubmit}
        disabled={Object.keys(quizAnswers).length < questions.length}>
        <span>✅</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2 }}>SUBMIT ANSWERS</div>
          <div style={{ fontSize: 10, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>
            {Object.keys(quizAnswers).length}/{questions.length} answered
          </div>
        </div>
      </button>
    </div>
  );
}

// ── PS2: Team Coordination Scoring ──────────
function PS2Activity({ ps2Scores, setPs2Scores, onPS2Submit, activeTeam }) {
  const criteria = [
    { key: "coordination", label: "COORDINATION", icon: "🔗" },
    { key: "teamwork", label: "TEAMWORK", icon: "👥" },
    { key: "communication", label: "COMMUNICATION", icon: "📡" },
    { key: "speed", label: "COMPLETION SPEED", icon: "⚡" },
  ];
  const teamColor = TEAMS.find(t => t.id === activeTeam)?.color || "var(--accent)";
  
  return (
    <div>
      <div style={{ ...styles.infoBox, marginBottom: 16, borderColor: teamColor }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: teamColor }}>🤝 COORDINATION CHALLENGE</div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Organizer scores team performance. Max 10 per category.</div>
      </div>
      {criteria.map(({ key, label, icon }) => (
        <div key={key} style={styles.scoreRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span>{icon}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#aaa" }}>{label}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: 20, color: teamColor }}>
              {ps2Scores[key]}/10
            </span>
          </div>
          <input type="range" min="0" max="10" value={ps2Scores[key]}
            onChange={e => setPs2Scores(p => ({ ...p, [key]: parseInt(e.target.value) }))}
            style={{ width: "100%", accentColor: teamColor }} />
        </div>
      ))}
      <div style={{ ...styles.infoBox, margin: "12px 0", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#888" }}>TOTAL SCORE</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: teamColor }}>
          {Math.round((Object.values(ps2Scores).reduce((a, b) => a + Number(b), 0) / 40) * 100)} PTS
        </div>
      </div>
      <button style={{ ...styles.btnLarge, borderColor: teamColor }} onClick={onPS2Submit}>
        <span>💾</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2 }}>SAVE SCORES</div>
        </div>
      </button>
    </div>
  );
}

// ── PS3: Tactical Problem ────────────────────
function PS3Activity({ activeTeam, ps3Running, setPs3Running, ps3Elapsed, setPs3Elapsed, onPS3Submit }) {
  const [manualPts, setManualPts] = useState(50);
  const [puzzle, setPuzzle] = useState(0);
  const teamColor = TEAMS.find(t => t.id === activeTeam)?.color || "var(--accent)";
  
  const puzzles = [
    { title: "THE BRIDGE PUZZLE", desc: "Four cyclists need to cross a bridge at night. They have one torch. Max 2 at a time. Bridge takes 1, 2, 5, 10 min. What is the minimum time for all to cross?", hint: "Think: always send fastest back", answer: "17 minutes" },
    { title: "ROUTE OPTIMIZATION", desc: "Your team must visit 5 checkpoints. You know distances between each. Find the shortest route that visits all checkpoints and returns to start.", hint: "This is the Travelling Salesman — use nearest neighbor heuristic", answer: "Apply nearest neighbor" },
    { title: "WATER RATIONING", desc: "3 team members share 7L of water for 40km. Each km needs 0.15L. How do you distribute water to ensure no one runs out and all finish?", hint: "Calculate total need first", answer: "6L total — 2L each with 1L reserve" },
  ];
  const p = puzzles[puzzle % puzzles.length];
  const formatTimer = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  
  return (
    <div>
      <div style={{ ...styles.infoBox, borderColor: teamColor, marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: teamColor }}>🧩 TACTICAL PROBLEM SOLVING</div>
      </div>
      
      {/* Timer */}
      <div style={{ textAlign: "center", padding: "16px", background: "#0d0d0d", borderRadius: 8, border: "1px solid #1a1a1a", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 48, color: ps3Elapsed > 240 ? "#ff4444" : teamColor, letterSpacing: 4 }}>
          {formatTimer(ps3Elapsed)}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          <button style={{ ...styles.btnPrimary, padding: "8px 20px" }}
            onClick={() => setPs3Running(r => !r)}>
            {ps3Running ? "⏸ PAUSE" : "▶ START"}
          </button>
          <button style={{ ...styles.btnBack, margin: 0, padding: "8px 16px" }}
            onClick={() => { setPs3Running(false); setPs3Elapsed(0); }}>↺ RESET</button>
        </div>
      </div>
      
      {/* Puzzle */}
      <div style={styles.puzzleCard}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: teamColor, marginBottom: 8 }}>CHALLENGE {puzzle + 1}</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#fff", letterSpacing: 2, marginBottom: 12 }}>{p.title}</h3>
        <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, marginBottom: 12 }}>{p.desc}</p>
        <details style={{ cursor: "pointer" }}>
          <summary style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555" }}>HINT (reveals -10 pts)</summary>
          <p style={{ fontSize: 11, color: "#666", marginTop: 6 }}>💡 {p.hint}</p>
        </details>
      </div>
      
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={{ ...styles.btnBack, margin: 0, flex: 1 }} onClick={() => setPuzzle(p => p + 1)}>
          NEXT PUZZLE →
        </button>
      </div>
      
      {/* Manual score */}
      <div style={styles.scoreRow}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#aaa" }}>MANUAL SCORE</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: teamColor }}>{manualPts} PTS</span>
        </div>
        <input type="range" min="0" max="100" value={manualPts}
          onChange={e => setManualPts(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: teamColor }} />
        <div style={{ fontSize: 10, color: "#555", fontFamily: "var(--font-mono)", marginTop: 4 }}>
          Time bonus: {ps3Elapsed < 120 ? "+30" : ps3Elapsed < 240 ? "+20" : "+10"} pts
        </div>
      </div>
      
      <button style={{ ...styles.btnLarge, marginTop: 8, borderColor: teamColor }} onClick={() => onPS3Submit(manualPts)}>
        <span>✅</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2 }}>SUBMIT CHALLENGE</div>
        </div>
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: LEADERBOARD
// ══════════════════════════════════════════════
function LeaderboardView({ leaderboard, setView }) {
  const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32", "#888"];
  const medals = ["🥇", "🥈", "🥉", "4️⃣"];
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>🏆</div>
        <h2 style={styles.pageTitle}>LIVE<br/>LEADERBOARD</h2>
        <p style={styles.pageSub}>Real-time team rankings</p>
      </div>
      
      <div style={{ padding: "0 16px" }}>
        {leaderboard.map((team, i) => (
          <div key={team.id} style={{ ...styles.leaderCard, borderColor: team.color,
                                       background: i === 0 ? `${team.color}12` : "#0d0d0d",
                                       transform: i === 0 ? "scale(1.01)" : "scale(1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>{medals[i]}</div>
              <div style={{ fontSize: 32 }}>{team.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: team.color, letterSpacing: 3 }}>
                  {team.name}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", marginTop: 2 }}>
                  {team.members?.length || 0} riders · {team.checkins?.length || 0} check-ins
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: rankColors[i] }}>
                  {team.score}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#555" }}>POINTS</div>
              </div>
            </div>
            
            {/* Score breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginTop: 10, paddingTop: 10, borderTop: "1px solid #1a1a1a" }}>
              {[["ARRIVAL", "arrivalPoints"], ["ACTIVITY", "activityPoints"], ["BONUS", "bonusPoints"], ["PENALTY", "penaltyPoints"]].map(([label, key]) => (
                <div key={key} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: key === "penaltyPoints" ? "#ff4444" : "#888" }}>
                    {key === "penaltyPoints" ? "-" : "+"}{team[key] || 0}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#444" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {leaderboard.every(t => t.score === 0) && (
          <div style={{ textAlign: "center", padding: 40, color: "#444", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            No scores recorded yet.<br/>Start the event to see rankings.
          </div>
        )}
        
        <button style={styles.btnBack} onClick={() => setView("home")}>← BACK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: QR CODES
// ══════════════════════════════════════════════
function QRCodesView({ setView }) {
  const [selected, setSelected] = useState("all");
  
  const qrItems = [
    { label: "REGISTRATION", value: "REGISTER", icon: "📝", desc: "Participants scan to register" },
    { label: "EVENT START", value: "START", icon: "🚀", desc: "Scan at starting point" },
    { label: "PIT STOP 1", value: "PS1", icon: "👁️", desc: "Observation Challenge - KM 12" },
    { label: "PIT STOP 2", value: "PS2", icon: "🤝", desc: "Team Coordination - KM 24" },
    { label: "PIT STOP 3", value: "PS3", icon: "🧩", desc: "Tactical Problem - KM 36" },
    { label: "ADMIN ACCESS", value: "ADMIN", icon: "⚙️", desc: "Organizer dashboard" },
    ...TEAMS.map(t => ({ label: `TEAM ${t.name}`, value: `TEAM-${t.name}`, icon: t.emoji, desc: t.tagline, color: t.color }))
  ];
  
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>⬛</div>
        <h2 style={styles.pageTitle}>QR CODE<br/>GENERATOR</h2>
        <p style={styles.pageSub}>Print and place at event locations</p>
      </div>
      
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {["all", "event", "teams"].map(f => (
            <button key={f} onClick={() => setSelected(f)}
              style={{ ...styles.filterBtn, borderColor: selected === f ? "var(--accent)" : "#222",
                       color: selected === f ? "var(--accent)" : "#555" }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {qrItems
            .filter(item => selected === "all" || (selected === "teams" ? item.value.startsWith("TEAM") : !item.value.startsWith("TEAM")))
            .map(item => (
            <div key={item.value} style={{ ...styles.qrCard, borderColor: item.color || "#1a1a1a" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <QRCode value={item.value} size={130} color={item.color || "#00ff88"} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: item.color || "var(--accent)", letterSpacing: 2, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#555" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        
        <button style={styles.btnBack} onClick={() => setView("home")}>← BACK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: ADMIN AUTH
// ══════════════════════════════════════════════
function AdminAuthView({ adminPin, setAdminPin, onAuth, setView }) {
  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderIcon}>⚙️</div>
        <h2 style={styles.pageTitle}>ADMIN<br/>ACCESS</h2>
        <p style={styles.pageSub}>Enter organizer PIN (default: 1234)</p>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={styles.formCard}>
          <label style={styles.label}>ADMIN PIN</label>
          <input style={{ ...styles.input, textAlign: "center", fontSize: 24, letterSpacing: 12 }}
            type="password" maxLength={6} value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onAuth()} />
          <button style={{ ...styles.btnLarge, marginTop: 16 }} onClick={onAuth}>
            <span>🔓</span>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2 }}>AUTHENTICATE</div>
          </button>
          <button style={styles.btnBack} onClick={() => setView("home")}>← BACK</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// VIEW: ADMIN DASHBOARD
// ══════════════════════════════════════════════
function AdminView({ participants, leaderboard, checkins, scores, setScores, onExport, setView, showToast }) {
  const [tab, setTab] = useState("overview");
  const [editScore, setEditScore] = useState(null);
  const [editVal, setEditVal] = useState({});
  
  const tabs = [
    { id: "overview", label: "OVERVIEW", icon: "📊" },
    { id: "participants", label: "RIDERS", icon: "👤" },
    { id: "checkins", label: "CHECK-INS", icon: "📍" },
    { id: "scores", label: "SCORES", icon: "🎯" },
  ];

  return (
    <div style={styles.page}>
      <div style={{ ...styles.pageHeader, background: "linear-gradient(180deg, #0a0a00 0%, transparent 100%)" }}>
        <div style={styles.pageHeaderIcon}>⚙️</div>
        <h2 style={styles.pageTitle}>ORGANIZER<br/>DASHBOARD</h2>
      </div>
      
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...styles.tabBtn, borderBottomColor: tab === t.id ? "var(--accent)" : "transparent",
                     color: tab === t.id ? "var(--accent)" : "#555" }}>
            <span>{t.icon}</span>
            <span style={{ fontSize: 9, display: "block" }}>{t.label}</span>
          </button>
        ))}
      </div>
      
      <div style={{ padding: "0 16px" }}>
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "TOTAL RIDERS", value: participants.length, icon: "👤" },
                { label: "TEAMS ACTIVE", value: leaderboard.filter(t => t.score > 0).length, icon: "⚡" },
                { label: "CHECK-INS", value: checkins.length, icon: "📍" },
                { label: "TOP SCORE", value: Math.max(...leaderboard.map(t => t.score), 0), icon: "🏆" },
              ].map(stat => (
                <div key={stat.label} style={styles.statCard}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--accent)" }}>{stat.value}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#555" }}>{stat.label}</div>
                </div>
              ))}
            </div>
            
            {/* Mini leaderboard */}
            <p style={styles.sectionLabel}>CURRENT RANKINGS</p>
            {leaderboard.map((team, i) => (
              <div key={team.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #0d0d0d" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#555", width: 16 }}>#{i+1}</span>
                <span style={{ fontSize: 18 }}>{team.emoji}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: team.color, flex: 1, letterSpacing: 2 }}>{team.name}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#fff" }}>{team.score}</span>
              </div>
            ))}
            
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={{ ...styles.btnLarge }} onClick={onExport}>
                <span>📥</span>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2 }}>EXPORT CSV</div>
                  <div style={{ fontSize: 9, color: "#88ffcc", fontFamily: "var(--font-mono)" }}>Download results spreadsheet</div>
                </div>
              </button>
            </div>
          </div>
        )}
        
        {/* PARTICIPANTS */}
        {tab === "participants" && (
          <div>
            {participants.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#444", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                No participants registered yet
              </div>
            ) : (
              participants.map(p => {
                const team = TEAMS.find(t => t.id === p.teamId);
                return (
                  <div key={p.id} style={{ ...styles.listItem, borderLeftColor: team?.color || "#333" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "#ddd", letterSpacing: 1 }}>{p.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", marginTop: 2 }}>
                          AGE: {p.age} · {p.phone}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: team?.color }}>{team?.emoji} {team?.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#444" }}>{formatTime(p.registeredAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {/* CHECKINS */}
        {tab === "checkins" && (
          <div>
            {checkins.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#444", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                No check-ins yet
              </div>
            ) : (
              [...checkins].reverse().map(c => {
                const team = TEAMS.find(t => t.id === c.teamId);
                const ps = PIT_STOPS.find(p => p.id === c.type);
                return (
                  <div key={c.id} style={{ ...styles.listItem, borderLeftColor: team?.color || "#333" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "#ddd" }}>
                          {team?.emoji} {team?.name} — {c.type === "start" ? "EVENT START" : ps?.name || c.type.toUpperCase()}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", marginTop: 2 }}>
                          {c.gps ? `GPS: ${c.gps.lat.toFixed(4)}, ${c.gps.lng.toFixed(4)}` : "No GPS"}
                        </div>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#888" }}>
                        {formatTime(c.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {/* SCORES EDITOR */}
        {tab === "scores" && (
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", marginBottom: 12 }}>
              MANUAL SCORE CORRECTION — Edit any score component
            </p>
            {TEAMS.map(team => (
              <div key={team.id} style={{ ...styles.formCard, borderColor: team.color + "44", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{team.emoji}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: team.color, letterSpacing: 3 }}>{team.name}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: 20, color: "#fff" }}>
                    {(scores[team.id]?.arrivalPoints || 0) + (scores[team.id]?.activityPoints || 0) + (scores[team.id]?.bonusPoints || 0) - (scores[team.id]?.penaltyPoints || 0)}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["arrivalPoints", "Arrival"], ["activityPoints", "Activity"], ["bonusPoints", "Bonus"], ["penaltyPoints", "Penalty"]].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ ...styles.label, fontSize: 9 }}>{label.toUpperCase()}</label>
                      <input style={{ ...styles.input, padding: "6px 10px", fontSize: 14 }}
                        type="number" value={scores[team.id]?.[key] || 0}
                        onChange={e => setScores(prev => ({
                          ...prev,
                          [team.id]: { ...prev[team.id], [key]: parseInt(e.target.value) || 0 }
                        }))} />
                    </div>
                  ))}
                </div>
                <button style={{ ...styles.btnPrimary, marginTop: 8, width: "100%", padding: 10 }}
                  onClick={() => showToast(`${team.name} scores updated!`)}>
                  SAVE
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button style={styles.btnBack} onClick={() => setView("home")}>← BACK</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap');
  
  :root {
    --accent: #00ff88;
    --accent2: #00ccff;
    --bg: #060606;
    --surface: #0d0d0d;
    --border: #1a1a1a;
    --font-display: 'Rajdhani', 'Arial Black', sans-serif;
    --font-mono: 'Share Tech Mono', 'Courier New', monospace;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: #fff; font-family: var(--font-mono); overscroll-behavior: none; }
  
  input[type=range] { -webkit-appearance: none; height: 3px; border-radius: 2px; background: #1a1a1a; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; }
  
  details summary { cursor: pointer; list-style: none; }
  details summary::-webkit-details-marker { display: none; }
  
  @keyframes scanline {
    0% { top: 10%; }
    100% { top: 90%; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  
  @keyframes heroGlow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }
  
  ::-webkit-scrollbar { width: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a1a1a; }
`;

const styles = {
  root: { minHeight: "100vh", background: "var(--bg)", maxWidth: 480, margin: "0 auto", position: "relative" },
  nav: { position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center",
         padding: "10px 16px", background: "rgba(6,6,6,0.95)", backdropFilter: "blur(10px)",
         borderBottom: "1px solid #111" },
  navBrand: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  navBtn: { background: "transparent", border: "1px solid #1a1a1a", color: "#888", padding: "8px 10px",
            borderRadius: 6, cursor: "pointer", fontSize: 16 },
  content: { paddingBottom: 40 },
  page: { animation: "slideUp 0.3s ease" },
  
  hero: { position: "relative", padding: "40px 16px 30px", overflow: "hidden",
          background: "linear-gradient(180deg, #060606 0%, #080808 100%)", textAlign: "center" },
  heroGrid: { position: "absolute", inset: 0, backgroundImage: `
    linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)`,
    backgroundSize: "30px 30px" },
  heroBadge: { display: "inline-block", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent)",
               border: "1px solid rgba(0,255,136,0.3)", padding: "4px 12px", borderRadius: 2, letterSpacing: 3, marginBottom: 16 },
  heroTitle: { fontFamily: "var(--font-display)", fontSize: 72, fontWeight: 700, lineHeight: 0.9,
               letterSpacing: 6, textShadow: "0 0 60px rgba(0,255,136,0.3)" },
  heroSub: { fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", letterSpacing: 3, marginTop: 12 },
  liveLeader: { marginTop: 20, padding: "12px 20px", background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.15)", borderRadius: 8, display: "inline-block" },
  
  sectionLabel: { fontFamily: "var(--font-mono)", fontSize: 10, color: "#444", letterSpacing: 3,
                  marginBottom: 10, borderBottom: "1px solid #111", paddingBottom: 6 },
  
  teamGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 },
  teamCard: { background: "#0d0d0d", border: "1px solid", borderRadius: 8, padding: "16px 8px",
              cursor: "pointer", transition: "all 0.2s", textAlign: "center" },
  teamBanner: { border: "2px solid", borderRadius: 12, padding: "24px 16px", marginBottom: 20 },
  
  btnLarge: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(0,255,136,0.05)",
              border: "1px solid var(--accent)", borderRadius: 10, padding: "16px 20px", cursor: "pointer",
              color: "#fff", textAlign: "left", transition: "all 0.15s", marginBottom: 0 },
  btnPrimary: { background: "var(--accent)", border: "none", color: "#000", borderRadius: 6, padding: "10px 20px",
                cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, fontWeight: 700 },
  btnSecondary: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "#0d0d0d",
                  border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 8px", cursor: "pointer",
                  color: "#fff", transition: "all 0.15s" },
  btnBack: { display: "block", width: "100%", background: "transparent", border: "1px solid #1a1a1a",
             color: "#555", padding: "12px", borderRadius: 8, cursor: "pointer", marginTop: 12,
             fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center" },
  
  formCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: 16, marginBottom: 8 },
  label: { display: "block", fontFamily: "var(--font-mono)", fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: { width: "100%", background: "#060606", border: "1px solid #1a1a1a", borderRadius: 6, padding: "12px 14px",
           color: "#fff", fontFamily: "var(--font-mono)", fontSize: 14, outline: "none" },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 12, marginTop: 16, cursor: "pointer" },
  checkbox: { width: 20, height: 20, minWidth: 20, border: "2px solid", borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center" },
  
  infoBox: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: 14 },
  idCard: { background: "#080808", border: "1px solid #1a1a1a", borderRadius: 8, padding: 16, marginTop: 16 },
  idRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0d0d0d" },
  idLabel: { fontFamily: "var(--font-mono)", fontSize: 10, color: "#444" },
  idVal: { fontFamily: "var(--font-mono)", fontSize: 10, color: "#888" },
  
  quizCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: 14, marginBottom: 10 },
  optionBtn: { border: "1px solid", borderRadius: 6, padding: "8px 6px", cursor: "pointer",
               fontFamily: "var(--font-mono)", fontSize: 11, transition: "all 0.15s" },
  
  scoreRow: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: 14, marginBottom: 10 },
  
  puzzleCard: { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: 16, marginBottom: 12 },
  
  leaderCard: { border: "1px solid", borderRadius: 10, padding: "14px 16px", marginBottom: 10,
                transition: "all 0.2s" },
  
  qrCard: { background: "#0a0a0a", border: "1px solid", borderRadius: 10, padding: 14 },
  filterBtn: { border: "1px solid", borderRadius: 6, padding: "6px 14px", cursor: "pointer",
               background: "transparent", fontFamily: "var(--font-mono)", fontSize: 10 },
  
  tabBar: { display: "flex", borderBottom: "1px solid #111", marginBottom: 16, position: "sticky", top: 48, 
            background: "rgba(6,6,6,0.95)", backdropFilter: "blur(8px)", zIndex: 50 },
  tabBtn: { flex: 1, padding: "10px 4px", background: "transparent", border: "none", borderBottom: "2px solid",
            cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--font-mono)", fontSize: 11 },
  
  statCard: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 10px", textAlign: "center" },
  listItem: { borderLeft: "3px solid", background: "#0a0a0a", padding: "12px 14px", marginBottom: 6, borderRadius: "0 6px 6px 0" },
  
  routeBar: { display: "flex", alignItems: "center", padding: "12px 0" },
  routeStart: { fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent)", whiteSpace: "nowrap" },
  routeFinish: { fontFamily: "var(--font-mono)", fontSize: 9, color: "#ff4444", whiteSpace: "nowrap" },
  routeLine: { flex: 1, height: 2, background: "linear-gradient(90deg, #1a1a1a, #333)" },
  routeNode: { width: 36, height: 36, background: "#0d0d0d", border: "1px solid #333", borderRadius: "50%",
               display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
               flexShrink: 0, fontSize: 12 },
  
  toast: { position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
           padding: "10px 20px", borderRadius: 8, color: "#000", fontFamily: "var(--font-mono)", fontSize: 12,
           fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
           animation: "slideUp 0.2s ease" },
  
  pageHeader: { padding: "30px 24px 20px", borderBottom: "1px solid #0d0d0d" },
  pageHeaderIcon: { fontSize: 32, marginBottom: 8 },
  pageTitle: { fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, letterSpacing: 4, lineHeight: 1.1, marginBottom: 6 },
  pageSub: { fontFamily: "var(--font-mono)", fontSize: 11, color: "#555" },
  
  // Scanner
  scannerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200,
                    display: "flex", alignItems: "flex-end", justifyContent: "center" },
  scannerBox: { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "12px 12px 0 0",
                width: "100%", maxWidth: 480, overflow: "hidden" },
  scannerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center",
                   padding: "12px 16px", borderBottom: "1px solid #1a1a1a" },
  closeBtn: { background: "transparent", border: "1px solid #333", color: "#888", width: 32, height: 32,
              borderRadius: "50%", cursor: "pointer", fontSize: 14 },
  scannerReticle: { position: "absolute", inset: "10%", border: "none" },
  scannerCornerTL: { position: "absolute", top: 0, left: 0, width: 20, height: 20,
                     borderTop: "3px solid var(--accent)", borderLeft: "3px solid var(--accent)" },
  scannerCornerTR: { position: "absolute", top: 0, right: 0, width: 20, height: 20,
                     borderTop: "3px solid var(--accent)", borderRight: "3px solid var(--accent)" },
  scannerCornerBL: { position: "absolute", bottom: 0, left: 0, width: 20, height: 20,
                     borderBottom: "3px solid var(--accent)", borderLeft: "3px solid var(--accent)" },
  scannerCornerBR: { position: "absolute", bottom: 0, right: 0, width: 20, height: 20,
                     borderBottom: "3px solid var(--accent)", borderRight: "3px solid var(--accent)" },
  scanLine: { position: "absolute", left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              animation: "scanline 2s linear infinite" },
};
