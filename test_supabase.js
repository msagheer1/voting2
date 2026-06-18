require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Clean Supabase URL
let supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
}
if (supabaseUrl && supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

const supabaseKey = process.env.SUPABASE_KEY;

console.log("Connecting with cleaned URL:", supabaseUrl);
console.log("Supabase Key Present:", !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  try {
    console.log("\n--- Testing 'polls' Table ---");
    const { data: polls, error: pollsError } = await supabase.from('polls').select('*').limit(3);
    if (pollsError) {
      console.error("❌ 'polls' Table Error:", pollsError.message);
    } else {
      console.log("✅ 'polls' Table Success! Row count:", polls.length);
      console.log("Polls sample:", polls);
    }

    console.log("\n--- Testing 'votes_records' Table ---");
    const { data: votes, error: votesError } = await supabase.from('votes_records').select('*').limit(3);
    if (votesError) {
      console.error("❌ 'votes_records' Table Error:", votesError.message);
    } else {
      console.log("✅ 'votes_records' Table Success! Row count:", votes.length);
      console.log("Votes sample:", votes);
    }
  } catch (err) {
    console.error("❌ Diagnostic Script Failure:", err.message);
  }
}

runDiagnostics();
