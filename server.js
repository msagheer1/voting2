require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
  console.warn("⚠️ Warning: Supabase URL or Key is missing or using placeholder! Please configure your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin credentials helper
const isAdmin = (name, mobile) => {
  return name && name.trim().toLowerCase() === 'admin' && mobile && mobile.trim() === '0000000000';
};

// Seeding Default Database Data in Supabase if empty
const seedDatabaseIfNeeded = async () => {
  try {
    const { data: polls, error } = await supabase.from('polls').select('id').limit(1);
    
    if (error) {
      console.error("❌ Error querying Supabase. Have you created the 'polls' and 'votes_records' tables yet? Error:", error.message);
      return;
    }

    if (polls.length === 0) {
      console.log("🌱 Supabase database is empty. Seeding default sample data...");
      
      const defaultPolls = [
        {
          id: "poll_1",
          question: "Which protocol works at the Transport Layer?",
          options: ["HTTP", "IP", "TCP", "DNS"],
          votes: [12, 8, 25, 4],
          status: "closed",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          correct_option_index: 2
        },
        {
          id: "poll_2",
          question: "Which feature should we build next for our workspace?",
          options: ["Dark Mode Theme", "Keyboard Shortcuts", "AI Chat Integration", "Export to PDF"],
          votes: [15, 8, 30, 4],
          status: "active",
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          correct_option_index: null
        },
        {
          id: "poll_3",
          question: "Where should we host the upcoming company retreat?",
          options: ["Mountain Resort", "Beachside Hotel", "Country Ranch", "Staycation / City Centre"],
          votes: [5, 24, 9, 12],
          status: "active",
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          correct_option_index: null
        }
      ];

      const defaultVotes = [
        { poll_id: "poll_1", voter_name: "John Doe", voter_mobile: "9876543210", option_index: 2, voted_at: new Date(Date.now() - 86400000 * 2.5).toISOString() },
        { poll_id: "poll_1", voter_name: "Jane Smith", voter_mobile: "8888888888", option_index: 2, voted_at: new Date(Date.now() - 86400000 * 2.4).toISOString() },
        { poll_id: "poll_1", voter_name: "Bob Johnson", voter_mobile: "7777777777", option_index: 0, voted_at: new Date(Date.now() - 86400000 * 2.3).toISOString() },
        { poll_id: "poll_2", voter_name: "John Doe", voter_mobile: "9876543210", option_index: 2, voted_at: new Date(Date.now() - 86400000 * 1.5).toISOString() }
      ];

      const { error: pError } = await supabase.from('polls').insert(defaultPolls);
      if (pError) throw pError;

      const { error: vError } = await supabase.from('votes_records').insert(defaultVotes);
      if (vError) throw vError;

      console.log("✅ Seeding completed successfully in Supabase cloud!");
    } else {
      console.log("📊 Database already has polls. Seeding skipped.");
    }
  } catch (err) {
    console.error("⚠️ Failed to check/seed Supabase database:", err.message);
  }
};

// Helper: Calculate Leaderboard and individual voter score
const computeScoresAndLeaderboard = (polls, votesRecords, targetName, targetMobile) => {
  const scoresMap = {};

  // Initialize all voters from vote records
  votesRecords.forEach(record => {
    const key = `${record.voter_name.trim().toLowerCase()}_${record.voter_mobile.trim()}`;
    if (!scoresMap[key]) {
      scoresMap[key] = {
        name: record.voter_name.trim(),
        mobile: record.voter_mobile.trim(),
        score: 0
      };
    }

    // Find the poll
    const poll = polls.find(p => p.id === record.poll_id);
    if (poll && poll.status === 'closed' && poll.correct_option_index !== null && poll.correct_option_index !== undefined && poll.correct_option_index !== -1) {
      if (record.option_index === poll.correct_option_index) {
        scoresMap[key].score += 3;
      } else {
        scoresMap[key].score -= 1;
      }
    }
  });

  // Calculate target user score
  let targetUserScore = 0;
  if (targetName && targetMobile) {
    const targetKey = `${targetName.trim().toLowerCase()}_${targetMobile.trim()}`;
    if (scoresMap[targetKey]) {
      targetUserScore = scoresMap[targetKey].score;
    }
  }

  // Compile and format leaderboard (top 5)
  const leaderboardList = Object.values(scoresMap)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map(v => {
      const cleanMobile = v.mobile;
      const masked = cleanMobile.length >= 4 
        ? '*'.repeat(cleanMobile.length - 4) + cleanMobile.slice(-4)
        : '******';
      return {
        name: v.name,
        mobileMasked: masked,
        score: v.score
      };
    });

  return { targetUserScore, leaderboardList };
};

// API Routes

// 1. User Authentication Login
app.post('/api/login', async (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: "Mobile number is required." });
  }

  const cleanName = name.trim();
  const cleanMobile = mobile.trim();

  // Check if admin
  if (isAdmin(cleanName, cleanMobile)) {
    return res.json({
      role: 'admin',
      name: 'Admin',
      mobile: '0000000000',
      score: 0
    });
  }

  try {
    // Fetch polls & votes records from Supabase to compute score
    const { data: polls, error: pErr } = await supabase.from('polls').select('*');
    if (pErr) throw pErr;

    const { data: votesRecords, error: vErr } = await supabase.from('votes_records').select('*');
    if (vErr) throw vErr;

    // Calculate score for this voter on login
    const { targetUserScore } = computeScoresAndLeaderboard(polls, votesRecords, cleanName, cleanMobile);

    return res.json({
      role: 'voter',
      name: cleanName,
      mobile: cleanMobile,
      score: targetUserScore
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Database error during login. " + error.message });
  }
});

// 2. Fetch Polls + Leaderboard
app.get('/api/polls', async (req, res) => {
  const { name, mobile } = req.query;

  if (!name || !mobile) {
    return res.status(401).json({ error: "Authentication details missing. Please log in." });
  }

  try {
    const isUserAdmin = isAdmin(name, mobile);

    // Fetch polls and votes records from Supabase
    const { data: polls, error: pErr } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    if (pErr) throw pErr;

    const { data: votesRecords, error: vErr } = await supabase.from('votes_records').select('*');
    if (vErr) throw vErr;

    // Compute leaderboard and user score
    const { targetUserScore, leaderboardList } = computeScoresAndLeaderboard(polls, votesRecords, name, mobile);

    // Map polls to customize data visibility
    const processedPolls = polls.map(poll => {
      // Find if this voter has voted on this poll
      const voteRecord = votesRecords.find(
        record => record.poll_id === poll.id && 
                  record.voter_name.toLowerCase() === name.trim().toLowerCase() && 
                  record.voter_mobile.trim() === mobile.trim()
      );

      const hasVoted = !!voteRecord;
      const isClosed = poll.status === 'closed';

      // Output poll format
      const outputPoll = {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        status: poll.status,
        createdAt: new Date(poll.created_at).getTime(),
        hasVoted: hasVoted,
        userSelection: hasVoted ? voteRecord.option_index : null
      };

      // Voters can see percentages ONLY if they have voted, OR if the poll is closed, OR if they are Admin.
      if (isUserAdmin || hasVoted || isClosed) {
        outputPoll.votes = poll.votes;
        outputPoll.totalVotes = poll.votes.reduce((a, b) => a + b, 0);
      } else {
        outputPoll.votes = null; 
        outputPoll.totalVotes = null;
      }

      // Hide correct answer on active polls
      if (isClosed) {
        outputPoll.correctOptionIndex = poll.correct_option_index;
      } else {
        outputPoll.correctOptionIndex = null;
      }

      return outputPoll;
    });

    res.json({ 
      polls: processedPolls, 
      isAdmin: isUserAdmin, 
      score: targetUserScore, 
      leaderboard: leaderboardList 
    });
  } catch (error) {
    console.error("Fetch Polls Error:", error);
    res.status(500).json({ error: "Failed to fetch polls. " + error.message });
  }
});

// 3. Vote on a Poll
app.post('/api/polls/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { name, mobile, optionIndex } = req.body;

  if (!name || !mobile) {
    return res.status(401).json({ error: "User authentication details are required to vote." });
  }

  if (optionIndex === undefined || optionIndex === null) {
    return res.status(400).json({ error: "Option selection is required." });
  }

  try {
    // Check if voter already voted
    const { data: existingVote, error: evErr } = await supabase
      .from('votes_records')
      .select('id')
      .eq('poll_id', id)
      .ilike('voter_name', name.trim())
      .eq('voter_mobile', mobile.trim())
      .limit(1);
    
    if (evErr) throw evErr;
    if (existingVote && existingVote.length > 0) {
      return res.status(400).json({ error: "You have already voted on this poll." });
    }

    // Get the poll
    const { data: poll, error: pErr } = await supabase.from('polls').select('*').eq('id', id).single();
    if (pErr) throw pErr;

    if (!poll) {
      return res.status(404).json({ error: "Poll not found." });
    }

    if (poll.status !== 'active') {
      return res.status(400).json({ error: "This poll has been closed." });
    }

    const optIdx = parseInt(optionIndex, 10);
    if (isNaN(optIdx) || optIdx < 0 || optIdx >= poll.options.length) {
      return res.status(400).json({ error: "Invalid option selection." });
    }

    // Record the vote
    const updatedVotes = [...poll.votes];
    updatedVotes[optIdx] = (updatedVotes[optIdx] || 0) + 1;

    // Insert vote record
    const { error: ivErr } = await supabase.from('votes_records').insert({
      poll_id: id,
      voter_name: name.trim(),
      voter_mobile: mobile.trim(),
      option_index: optIdx
    });
    if (ivErr) throw ivErr;

    // Update poll votes array
    const { error: upErr } = await supabase.from('polls').update({ votes: updatedVotes }).eq('id', id);
    if (upErr) throw upErr;

    // Fetch all records to compile updated scores
    const { data: allPolls, error: apErr } = await supabase.from('polls').select('*');
    if (apErr) throw apErr;

    const { data: votesRecords, error: avErr } = await supabase.from('votes_records').select('*');
    if (avErr) throw avErr;

    const { targetUserScore, leaderboardList } = computeScoresAndLeaderboard(allPolls, votesRecords, name, mobile);

    const totalVotes = updatedVotes.reduce((a, b) => a + b, 0);

    res.json({
      message: "Vote cast successfully!",
      poll: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        status: poll.status,
        createdAt: new Date(poll.created_at).getTime(),
        hasVoted: true,
        userSelection: optIdx,
        votes: updatedVotes,
        totalVotes: totalVotes,
        correctOptionIndex: null // Active, so correct index masked
      },
      score: targetUserScore,
      leaderboard: leaderboardList
    });
  } catch (error) {
    console.error("Vote Error:", error);
    res.status(500).json({ error: "Failed to cast vote. " + error.message });
  }
});

// 4. Create a Poll (Admin only)
app.post('/api/polls', async (req, res) => {
  const { adminName, adminMobile, question, options } = req.body;

  if (!isAdmin(adminName, adminMobile)) {
    return res.status(403).json({ error: "Access denied. Only administrators can perform this action." });
  }

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Poll question is required." });
  }

  if (!options || !Array.isArray(options) || options.filter(opt => opt && opt.trim()).length < 2) {
    return res.status(400).json({ error: "A poll must have at least 2 valid options." });
  }

  const cleanOptions = options.map(opt => opt.trim()).filter(opt => opt);
  
  try {
    const newPoll = {
      id: "poll_" + Date.now(),
      question: question.trim(),
      options: cleanOptions,
      votes: new Array(cleanOptions.length).fill(0),
      status: 'active',
      correct_option_index: null
    };

    const { error } = await supabase.from('polls').insert(newPoll);
    if (error) throw error;

    res.status(201).json({ message: "Poll created successfully!", poll: newPoll });
  } catch (error) {
    console.error("Create Poll Error:", error);
    res.status(500).json({ error: "Failed to create poll. " + error.message });
  }
});

// 5. Close a Poll with specifying Answer Key (Admin only)
app.post('/api/polls/:id/close', async (req, res) => {
  const { adminName, adminMobile, correctOptionIndex } = req.body;
  const { id } = req.params;

  if (!isAdmin(adminName, adminMobile)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    // Get the poll first to see options length
    const { data: poll, error: pErr } = await supabase.from('polls').select('*').eq('id', id).single();
    if (pErr) throw pErr;

    if (!poll) {
      return res.status(404).json({ error: "Poll not found." });
    }

    let correctIdx = null;
    if (correctOptionIndex !== undefined && correctOptionIndex !== null) {
      const parsed = parseInt(correctOptionIndex, 10);
      if (!isNaN(parsed) && parsed >= -1 && parsed < poll.options.length) {
        correctIdx = parsed === -1 ? null : parsed;
      }
    }

    const { error: clErr } = await supabase
      .from('polls')
      .update({
        status: 'closed',
        correct_option_index: correctIdx
      })
      .eq('id', id);
      
    if (clErr) throw clErr;

    res.json({ message: "Poll closed and answer key set successfully!" });
  } catch (error) {
    console.error("Close Poll Error:", error);
    res.status(500).json({ error: "Failed to close poll. " + error.message });
  }
});

// 6. Delete a Poll (Admin only)
app.delete('/api/polls/:id', async (req, res) => {
  const { adminName, adminMobile } = req.body;
  const { id } = req.params;

  if (!isAdmin(adminName, adminMobile)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    // Delete poll (foreign key cascade deletes votes records on Supabase automatically)
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: "Poll deleted successfully!" });
  } catch (error) {
    console.error("Delete Poll Error:", error);
    res.status(500).json({ error: "Failed to delete poll. " + error.message });
  }
});

// 7. Reset database to default samples (Admin only)
app.post('/api/admin/reset', async (req, res) => {
  const { adminName, adminMobile } = req.body;

  if (!isAdmin(adminName, adminMobile)) {
    return res.status(403).json({ error: "Access denied." });
  }

  try {
    // Delete all votes records first, then all polls (or CASCADE deletes them)
    const { error: vErr } = await supabase.from('votes_records').delete().neq('id', 0); // Deletes all records
    if (vErr) throw vErr;

    const { error: pErr } = await supabase.from('polls').delete().neq('id', '0'); // Deletes all polls
    if (pErr) throw pErr;

    // Trigger seed again
    await seedDatabaseIfNeeded();

    res.json({ message: "Database reset to sample polls successfully!" });
  } catch (error) {
    console.error("Reset DB Error:", error);
    res.status(500).json({ error: "Failed to reset database. " + error.message });
  }
});

// Check seeding and start Server
seedDatabaseIfNeeded().then(() => {
  app.listen(PORT, () => {
    console.log(`Pollify server running at http://localhost:${PORT}`);
  });
});
