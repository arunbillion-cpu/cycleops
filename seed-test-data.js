/**
 * Test Data Seeder for CycleOps
 * 
 * This script creates 10 test participants across 4 teams
 * and simulates a full event workflow with realistic (messy) data.
 * 
 * Run with: node seed-test-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEAMS = ['alpha', 'bravo', 'charlie', 'delta'];
const TEAM_NAMES = { alpha: 'ALPHA', bravo: 'BRAVO', charlie: 'CHARLIE', delta: 'DELTA' };

// 10 test users
const testUsers = [
  { name: "Rohan Sharma", team: "alpha", phone: "9876543210" },
  { name: "Priya Patel", team: "alpha", phone: "9876543211" },
  { name: "Amit Verma", team: "bravo", phone: "9876543212" },
  { name: "Sneha Gupta", team: "bravo", phone: "9876543213" },
  { name: "Vikram Singh", team: "charlie", phone: "9876543214" },
  { name: "Ananya Reddy", team: "charlie", phone: "9876543215" },
  { name: "Karan Malhotra", team: "delta", phone: "9876543216" },
  { name: "Ishita Kapoor", team: "delta", phone: "9876543217" },
  { name: "Arjun Nair", team: "alpha", phone: "9876543218" },
  { name: "Meera Iyer", team: "bravo", phone: "9876543219" },
];

async function seed() {
  console.log("🧹 Clearing old test data...");

  // Clear previous test data (optional - comment out if you want to keep old data)
  await supabase.from("participants").delete().like("name", "%Test%");
  await supabase.from("participants").delete().in("name", testUsers.map(u => u.name));

  console.log("👥 Creating 10 test participants...");

  const participants = testUsers.map((user, index) => ({
    id: `test-user-${index + 1}`,
    name: user.name,
    age: 22 + (index % 8),
    phone: user.phone,
    emergency: "987650000" + index,
    medical: true,
    team_id: user.team,
    password: "test123",
    registered_at: new Date(Date.now() - (10 - index) * 3600000).toISOString(),
  }));

  const { error: pError } = await supabase.from("participants").insert(participants);
  if (pError) console.error("Participant insert error:", pError);
  else console.log("✅ Participants inserted");

  // Simulate check-ins with varied timing
  console.log("📍 Creating check-in data...");

  const checkins = [];
  const baseTime = Date.now() - 3 * 3600000; // 3 hours ago

  participants.forEach((p, i) => {
    // Everyone has checked into CP1
    checkins.push({
      id: `checkin-${p.id}-cp1`,
      cyclist_id: p.id,
      cyclist_name: p.name,
      team_id: p.team_id,
      cp_id: "cp1",
      timestamp: new Date(baseTime + i * 180000).toISOString(), // staggered
    });

    // Most reached CP2
    if (i < 8) {
      checkins.push({
        id: `checkin-${p.id}-cp2`,
        cyclist_id: p.id,
        cyclist_name: p.name,
        team_id: p.team_id,
        cp_id: "cp2",
        timestamp: new Date(baseTime + 1800000 + i * 240000).toISOString(),
      });
    }

    // Some reached CP3
    if (i < 6) {
      checkins.push({
        id: `checkin-${p.id}-cp3`,
        cyclist_id: p.id,
        cyclist_name: p.name,
        team_id: p.team_id,
        cp_id: "cp3",
        timestamp: new Date(baseTime + 3600000 + i * 300000).toISOString(),
      });
    }

    // 5 people reached Finish (with different arrival times)
    if (i < 5) {
      checkins.push({
        id: `checkin-${p.id}-finish`,
        cyclist_id: p.id,
        cyclist_name: p.name,
        team_id: p.team_id,
        cp_id: "finish",
        timestamp: new Date(baseTime + 5400000 + i * 420000).toISOString(),
      });
    }
  });

  await supabase.from("checkins").insert(checkins);
  console.log(`✅ Inserted ${checkins.length} check-ins`);

  // Eye for Detail answers (varied quality)
  console.log("👁️ Inserting Eye for Detail answers...");
  const eyeAnswers = [];

  participants.forEach((p, i) => {
    const quality = i % 4; // 0 = excellent, 3 = poor
    const score = [28, 22, 14, 8][quality];

    eyeAnswers.push({
      id: `eye-${p.id}`,
      cyclist_id: p.id,
      cyclist_name: p.name,
      team_id: p.team_id,
      game: "eye_for_detail",
      answers: { q1: "Good", q2: quality < 2 ? "Correct" : "Wrong" },
      score,
      total: 30,
      submitted_at: new Date().toISOString(),
    });
  });

  await supabase.from("game_answers").insert(eyeAnswers);
  console.log("✅ Eye for Detail answers inserted");

  // Jerrican data (varied performance)
  console.log("🪣 Inserting Jerrican carry data...");
  const jerricanData = [];

  // Team alpha - did well
  jerricanData.push({
    id: "jerrican_alpha",
    team_id: "alpha",
    start_time: new Date(baseTime + 3600000).toISOString(),
    finish_time: new Date(baseTime + 7200000).toISOString(),
    penalty_count: 1,
    completed: true,
    updated_at: new Date().toISOString(),
  });

  // Team bravo - average
  jerricanData.push({
    id: "jerrican_bravo",
    team_id: "bravo",
    start_time: new Date(baseTime + 3900000).toISOString(),
    finish_time: new Date(baseTime + 8100000).toISOString(),
    penalty_count: 3,
    completed: true,
    updated_at: new Date().toISOString(),
  });

  // Team charlie - poor
  jerricanData.push({
    id: "jerrican_charlie",
    team_id: "charlie",
    start_time: new Date(baseTime + 4200000).toISOString(),
    finish_time: new Date(baseTime + 9000000).toISOString(),
    penalty_count: 5,
    completed: true,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("jerrican_carry").insert(jerricanData);
  console.log("✅ Jerrican data inserted");

  // Manual scores (Rapid Fire + Finish Q)
  console.log("✍️ Inserting manual scores...");
  const manualData = [
    { team_id: "alpha", rapid_fire: 12, finish_questionnaire: 4 },
    { team_id: "bravo", rapid_fire: 9, finish_questionnaire: 3 },
    { team_id: "charlie", rapid_fire: 14, finish_questionnaire: 2 },
    { team_id: "delta", rapid_fire: 7, finish_questionnaire: 5 },
  ];

  for (const m of manualData) {
    await supabase.from("manual_scores").upsert({
      id: `manual_${m.team_id}`,
      team_id: m.team_id,
      rapid_fire: m.rapid_fire,
      finish_questionnaire: m.finish_questionnaire,
      updated_at: new Date().toISOString(),
    });
  }
  console.log("✅ Manual scores inserted");

  // Finish Questionnaire answers (individual)
  console.log("📝 Inserting Finish Questionnaire answers (individual)...");
  const fqAnswers = [];

  // Only the 5 who reached finish submit
  const finishers = participants.slice(0, 5);

  finishers.forEach((p, i) => {
    fqAnswers.push({
      id: `fq-${p.id}`,
      cyclist_id: p.id,
      cyclist_name: p.name,
      team_id: p.team_id,
      game: "finish_questionnaire",
      answers: {
        0: i % 2 === 0 ? "Rohan Sharma" : "Karan Malhotra",
        1: "Vikram Singh",
        2: i < 2 ? "Sneha Gupta" : "No one",
      },
      score: 0,
      total: 3,
      submitted_at: new Date().toISOString(),
    });
  });

  await supabase.from("game_answers").insert(fqAnswers);
  console.log(`✅ Inserted ${fqAnswers.length} Finish Questionnaire responses`);

  console.log("\n✅ Test data seeding complete!");
  console.log("Restart your app (npm run dev) to see the data.");
  console.log("Then check the Leaderboard and Admin sections.");
}

seed().catch(console.error);
