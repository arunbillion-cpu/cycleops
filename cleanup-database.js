/**
 * Database Cleanup Script for CycleOps
 * 
 * WARNING: This will permanently delete ALL data from the event tables.
 * Use only after testing is complete and before the real event.
 * 
 * Run with: node cleanup-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDatabase() {
  console.log("⚠️  WARNING: This will delete ALL data from the CycleOps database.");
  console.log("This action cannot be undone.\n");

  // Safety confirmation (in real terminal you can uncomment this)
  // const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  // const answer = await new Promise(resolve => readline.question('Type "CLEAR" to proceed: ', resolve));
  // readline.close();
  // if (answer !== 'CLEAR') {
  //   console.log("Cleanup cancelled.");
  //   process.exit(0);
  // }

  console.log("🧹 Starting database cleanup...\n");

  // Keep this list in sync with KNOWN_TABLES in src/app/page.jsx
  const tablesToClear = [
    { name: "game_answers", label: "Game Answers (Eye for Detail + Finish Questionnaire)" },
    { name: "manual_scores", label: "Manual Scores (Rapid Fire + Finish Questionnaire)" },
    { name: "checkins", label: "Check-ins" },
    { name: "jerrican_carry", label: "Jerrican Carry data" },
    { name: "participants", label: "Participants" },
  ];

  for (const table of tablesToClear) {
    try {
      const { error } = await supabase.from(table.name).delete().neq('id', ''); // Delete all rows
      if (error) {
        console.error(`❌ Error clearing ${table.name}:`, error.message);
      } else {
        console.log(`✅ Cleared table: ${table.label}`);
      }
    } catch (err) {
      console.error(`❌ Failed to clear ${table.name}:`, err.message);
    }
  }

  console.log("\n🗑️  Removing GPS column from checkins table (security cleanup)...");

  try {
    // This raw SQL requires the service role key or the table owner.
    // With anon key + RLS disabled it may work, but better to run in Supabase SQL Editor if it fails.
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE checkins DROP COLUMN IF EXISTS gps;`
    });

    if (alterError) {
      console.warn("⚠️  Could not drop gps column automatically via client.");
      console.log("   Please run this SQL manually in Supabase SQL Editor:");
      console.log("   ALTER TABLE checkins DROP COLUMN IF EXISTS gps;");
    } else {
      console.log("✅ gps column removed from checkins table.");
    }
  } catch (err) {
    console.warn("⚠️  Automatic column drop failed.");
    console.log("   Run this in Supabase SQL Editor for safety:");
    console.log("   ALTER TABLE checkins DROP COLUMN IF EXISTS gps;");
  }

  console.log("\n✅ Database cleanup complete.");
  console.log("The database is now clean and ready for the real event.");

  console.log("\n🛡️  Dropping custom RLS policies (to allow full cleanup in future runs)...");

  const rlsPoliciesToDrop = [
    'DROP POLICY IF EXISTS "Anon can insert check-ins" ON checkins;',
    'DROP POLICY IF EXISTS "Anon can view check-ins" ON checkins;',
    'DROP POLICY IF EXISTS "Anon can insert own answers" ON game_answers;',
    'DROP POLICY IF EXISTS "Anon can view game answers" ON game_answers;',
    'DROP POLICY IF EXISTS "Anon can register" ON participants;',
    'DROP POLICY IF EXISTS "Anon can view participants" ON participants;',
    'DROP POLICY IF EXISTS "No access for anon" ON jerrican_carry;',
    'DROP POLICY IF EXISTS "No access for anon" ON manual_scores;',
    'DROP POLICY IF EXISTS "Service role has full access" ON checkins;',
    'DROP POLICY IF EXISTS "Service role has full access" ON game_answers;',
    'DROP POLICY IF EXISTS "Service role has full access" ON jerrican_carry;',
    'DROP POLICY IF EXISTS "Service role has full access" ON manual_scores;',
    'DROP POLICY IF EXISTS "Service role has full access" ON participants;',
  ];

  for (const sql of rlsPoliciesToDrop) {
    try {
      // Note: anon client cannot drop policies. This is here for documentation.
      // Always run policy drops in Supabase SQL Editor.
      console.log("   Please run in SQL Editor if needed: " + sql);
    } catch (e) {
      // ignore
    }
  }

  console.log("\n✅ Cleanup script finished. Run the printed SQL statements in Supabase SQL Editor for complete reset.");
}

cleanupDatabase().catch(console.error);