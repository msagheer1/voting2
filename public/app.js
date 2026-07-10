// State Management
let currentUser = null;
let allPolls = [];
let activeClosingPollId = null; // Tracks which poll the admin is currently closing

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const voterScreen = document.getElementById('voter-screen');
const adminScreen = document.getElementById('admin-screen');

const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const appHeader = document.getElementById('app-header');
const voterNameBadge = document.getElementById('voter-name-badge');
const voterRoleBadge = document.getElementById('voter-role-badge');

const voterPollsContainer = document.getElementById('voter-polls');
const adminPollsContainer = document.getElementById('admin-polls-list');
const createPollForm = document.getElementById('create-poll-form');
const addOptionBtn = document.getElementById('add-option-btn');
const dynamicOptionsContainer = document.getElementById('dynamic-options');

// Sidebar/Leaderboard targets
const voterLeaderboardList = document.getElementById('voter-leaderboard-list');
const adminLeaderboardList = document.getElementById('admin-leaderboard-list');
const profileCardName = document.getElementById('profile-card-name');
const profileCardMobile = document.getElementById('profile-card-mobile');
const profileCardScore = document.getElementById('profile-card-score');

// SVGs and Icons
const ICONS = {
  check: `<svg viewBox="0 0 20 20" fill="currentColor" class="user-vote-check" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l5-5z" clip-rule="evenodd" /></svg>`,
  cross: `<svg viewBox="0 0 20 20" fill="currentColor" style="color: var(--error); margin-left: 4px;" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`,
  crown: `<svg viewBox="0 0 20 20" fill="currentColor" class="winner-crown" width="16" height="16"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" /></svg>`,
  empty: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
  trophy: `<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style="color: #fbbf24;"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>`
};

// Toast Notification System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  container.appendChild(toast);

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Show/Hide App Screens
function showScreen(screen) {
  authScreen.classList.remove('active');
  voterScreen.classList.remove('active');
  adminScreen.classList.remove('active');
  
  authScreen.style.display = 'none';
  voterScreen.style.display = 'none';
  adminScreen.style.display = 'none';

  screen.style.display = 'block';
  setTimeout(() => {
    screen.classList.add('active');
  }, 50);

  if (screen === authScreen) {
    appHeader.style.display = 'none';
  } else {
    appHeader.style.display = 'flex';
  }
}

// Format Unix Timestamp
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

// Initialize application state
function initApp() {
  const storedUser = localStorage.getItem('pollball_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateUserHeaderUI();
      
      if (currentUser.role === 'admin') {
        showScreen(adminScreen);
      } else {
        showScreen(voterScreen);
      }
      loadPolls();
    } catch (e) {
      localStorage.removeItem('pollify_user');
      showScreen(authScreen);
    }
  } else {
    showScreen(authScreen);
  }
}

// Update Header User Info Display
function updateUserHeaderUI() {
  if (!currentUser) return;
  
  if (currentUser.role === 'admin') {
    voterNameBadge.textContent = currentUser.name;
    voterRoleBadge.textContent = currentUser.role;
    voterRoleBadge.className = `badge ${currentUser.role}`;
  } else {
    const formattedScore = (currentUser.score >= 0 ? '+' : '') + currentUser.score;
    voterNameBadge.textContent = `${currentUser.name} (Score: ${formattedScore})`;
    voterRoleBadge.textContent = currentUser.role;
    voterRoleBadge.className = `badge ${currentUser.role}`;

    // Update profile sidebar card details
    if (profileCardName) profileCardName.textContent = currentUser.name;
    if (profileCardMobile) {
      // Mask mobile for privacy
      const mob = currentUser.mobile;
      profileCardMobile.textContent = mob.length >= 4 
        ? '*'.repeat(mob.length - 4) + mob.slice(-4) 
        : mob;
    }
    if (profileCardScore) {
      profileCardScore.textContent = formattedScore;
      profileCardScore.className = `score-badge ${currentUser.score < 0 ? 'negative' : ''}`;
    }
    const profileCorrect = document.getElementById('profile-card-correct');
    if (profileCorrect && currentUser.correctCount !== undefined) {
      profileCorrect.textContent = currentUser.correctCount;
    }
    const profileWrong = document.getElementById('profile-card-wrong');
    if (profileWrong && currentUser.wrongCount !== undefined) {
      profileWrong.textContent = currentUser.wrongCount;
    }
  }
}

// Fetch Polls & Leaderboard from server
async function loadPolls() {
  if (!currentUser) return;

  try {
    const response = await fetch(`/api/polls?name=${encodeURIComponent(currentUser.name)}&mobile=${encodeURIComponent(currentUser.mobile)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch polls.');
    }

    const data = await response.json();
    allPolls = data.polls;

    // Update current user score from response
    if (currentUser.role !== 'admin') {
      currentUser.score = data.score;
      currentUser.correctCount = data.correctCount;
      currentUser.wrongCount = data.wrongCount;
      localStorage.setItem('pollify_user', JSON.stringify(currentUser));
      updateUserHeaderUI();
    }

    // Render leaderboard
    renderLeaderboard(data.leaderboard);

    if (currentUser.role === 'admin') {
      renderAdminPolls();
    } else {
      renderVoterPolls();
    }
  } catch (error) {
    console.error("Error loading polls:", error);
    showToast(error.message, 'error');
  }
}

// Render Leaderboard
function renderLeaderboard(leaderboard) {
  const listContainer = currentUser.role === 'admin' ? adminLeaderboardList : voterLeaderboardList;
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!leaderboard || leaderboard.length === 0) {
    listContainer.innerHTML = `<p style="font-size: 13px; color: var(--color-text-muted); text-align: center;">No rankings yet.</p>`;
    return;
  }

  leaderboard.forEach((voter, index) => {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.style.animationDelay = `${index * 0.05}s`;
    
    const scoreText = (voter.score >= 0 ? '+' : '') + voter.score;

    item.innerHTML = `
      <div class="leaderboard-rank">${index + 1}</div>
      <div class="leaderboard-info">
        <span class="leaderboard-name">${voter.name}</span>
        <span class="leaderboard-mobile">${voter.mobileMasked}</span>
        <div style="display: flex; gap: 8px; font-size: 10px; margin-top: 2px;">
          <span style="color: var(--success);">✔ ${voter.correctCount || 0}</span>
          <span style="color: var(--error);">✖ ${voter.wrongCount || 0}</span>
        </div>
      </div>
      <div class="leaderboard-score">${scoreText} pts</div>
    `;

    listContainer.appendChild(item);
  });
}

// Cast Vote
async function castVote(pollId, optionIndex) {
  try {
    const response = await fetch(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: currentUser.name,
        mobile: currentUser.mobile,
        optionIndex: optionIndex
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to cast vote.');
    }

    showToast("Vote cast successfully!");
    
    // Update local list index directly and re-render
    const pollIdx = allPolls.findIndex(p => p.id === pollId);
    if (pollIdx !== -1) {
      allPolls[pollIdx] = data.poll;
    }

    // Update score
    currentUser.score = data.score;
    currentUser.correctCount = data.correctCount;
    currentUser.wrongCount = data.wrongCount;
    localStorage.setItem('pollify_user', JSON.stringify(currentUser));
    updateUserHeaderUI();

    // Reload entire list to refresh leaderboard and other items
    loadPolls();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Render voter view
function renderVoterPolls() {
  voterPollsContainer.innerHTML = '';

  if (allPolls.length === 0) {
    voterPollsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        ${ICONS.empty}
        <p>No polls available at the moment.</p>
      </div>
    `;
    return;
  }

  allPolls.forEach(poll => {
    const card = document.createElement('div');
    card.className = `poll-card`;
    if (poll.hasVoted) card.classList.add('voted-card');
    if (poll.status === 'closed') card.classList.add('closed-card');

    // Scoring result feedback state on cards
    let scoreIndicatorHtml = '';
    const isQuizPoll = poll.correctOptionIndex !== null && poll.correctOptionIndex !== undefined;

    if (isQuizPoll && (poll.hasVoted || poll.status === 'closed')) {
      const isUserCorrect = poll.userSelection === poll.correctOptionIndex;
      
      if (poll.hasVoted) {
        if (isUserCorrect) {
          card.classList.add('correct-outcome');
          scoreIndicatorHtml = `<span class="card-score-indicator plus">+3 Pts</span>`;
        } else {
          card.classList.add('wrong-outcome');
          scoreIndicatorHtml = `<span class="card-score-indicator minus">-1 Pt</span>`;
        }
      }
    }

    // Header Status Tags
    let statusText = 'Active';
    let statusClass = 'active';
    if (poll.status === 'closed') {
      statusText = 'Closed';
      statusClass = 'closed';
    } else if (poll.status === 'frozen') {
      statusText = 'Frozen';
      statusClass = 'frozen';
    }
    
    // Total Votes Count
    let totalVotesText = '';
    if (poll.totalVotes !== null && poll.totalVotes !== undefined) {
      totalVotesText = `${poll.totalVotes} vote${poll.totalVotes === 1 ? '' : 's'}`;
    }

    let optionsHtml = '';

    // If voter has voted OR if poll is closed (results view) OR frozen
    if (poll.hasVoted || poll.status === 'closed' || poll.status === 'frozen') {
      let maxVotes = -1;
      let winningIndex = -1;
      if (poll.votes) {
        maxVotes = Math.max(...poll.votes);
        if (maxVotes > 0) {
          winningIndex = poll.votes.indexOf(maxVotes);
        }
      }

      poll.options.forEach((option, idx) => {
        const optionVotes = poll.votes ? poll.votes[idx] : 0;
        const total = poll.totalVotes || 1;
        const percentage = poll.totalVotes > 0 ? Math.round((optionVotes / total) * 100) : 0;
        
        const isUserSelected = poll.userSelection === idx;
        const isWinner = idx === winningIndex && maxVotes > 0;
        
        // CSS highlights for quiz answers
        let optionClass = 'option-result';
        let iconsHtml = '';

        if (isQuizPoll) {
          const isCorrectAnswer = idx === poll.correctOptionIndex;
          if (isCorrectAnswer) {
            // Highlight the correct option in green
            optionClass += ' correct-option';
            iconsHtml = ICONS.check + ` <span style="color: var(--success); font-size: 11px; font-weight: 700; margin-left: 4px;">Correct Answer</span>`;
          } else if (isUserSelected) {
            // User selected this option, but it was incorrect. Highlight in red.
            optionClass += ' incorrect-option';
            iconsHtml = ICONS.cross + ` <span style="color: var(--error); font-size: 11px; font-weight: 700; margin-left: 4px;">Your Choice</span>`;
          }
        } else {
          // Standard opinion poll highlights
          if (isUserSelected) {
            optionClass += ' selected';
            iconsHtml = ICONS.check;
          }
          if (isWinner) {
            optionClass += ' winner';
            iconsHtml += ' ' + ICONS.crown;
          }
        }

        optionsHtml += `
          <div class="${optionClass}">
            <div class="progress-bar-bg" style="width: ${percentage}%"></div>
            <div class="option-result-label">
              <span class="option-label-text">
                ${option}
                ${iconsHtml}
              </span>
              <span class="option-result-percent">${percentage}%</span>
            </div>
            <div class="option-result-label" style="z-index: 2;">
              <span class="option-result-votes">${optionVotes} vote${optionVotes === 1 ? '' : 's'}</span>
            </div>
          </div>
        `;
      });
    } else if (poll.status === 'active') {
      // Unvoted, active poll: Render interactive buttons
      poll.options.forEach((option, idx) => {
        optionsHtml += `
          <button class="option-btn" onclick="castVote('${poll.id}', ${idx})">
            <span>${option}</span>
          </button>
        `;
      });
    } else if (poll.status === 'frozen') {
      poll.options.forEach((option, idx) => {
        optionsHtml += `
          <button class="option-btn" disabled style="opacity: 0.6; cursor: not-allowed;">
            <span>${option}</span>
          </button>
        `;
      });
    }

    card.innerHTML = `
      <div class="poll-status-tag ${statusClass}">${statusText}</div>
      <p class="poll-question">${poll.question}</p>
      ${poll.supportingFacts ? `<div class="poll-supporting-facts"><span class="facts-label">💡 Supporting Facts</span>${poll.supportingFacts}</div>` : ''}
      <div class="poll-options-list">${optionsHtml}</div>
      <div class="poll-footer">
        <span>${totalVotesText}</span>
        ${poll.status === 'frozen' ? `<span style="color: var(--accent); font-weight: 700; font-size: 11px;">&#x2745; FROZEN</span>` : ''}
      </div>
    `;

    voterPollsContainer.appendChild(card);
  });
}

// Render Admin Console
function renderAdminPolls() {
  adminPollsContainer.innerHTML = '';

  if (allPolls.length === 0) {
    adminPollsContainer.innerHTML = `
      <div class="empty-state">
        ${ICONS.empty}
        <p>No polls created yet. Fill out the form on the left to create your first poll!</p>
      </div>
    `;
    return;
  }

  allPolls.forEach(poll => {
    const row = document.createElement('div');
    row.className = 'admin-poll-row';
    row.style.flexDirection = 'column'; // Allow actions underneath comfortably if closing
    row.style.alignItems = 'stretch';

    const totalVotes = poll.totalVotes || 0;
    const statusText = poll.status === 'active' ? 'Active' : (poll.status === 'frozen' ? 'Frozen' : 'Closed');
    const statusClass = poll.status === 'active' ? 'active' : (poll.status === 'frozen' ? 'frozen' : 'closed');

    let optionsTextSummary = poll.options.map((opt, idx) => {
      const votes = poll.votes ? poll.votes[idx] : 0;
      let suffix = '';
      if (poll.status === 'closed' && poll.correctOptionIndex === idx) {
        suffix = ' ⭐ (Correct)';
      }
      
      let votersStr = '';
      if (poll.optionVoters && poll.optionVoters[idx] && poll.optionVoters[idx].length > 0) {
        votersStr = `<div style="font-size: 11px; color: var(--primary); margin-left: 12px; line-height: 1.2;">Voters: ${poll.optionVoters[idx].join(', ')}</div>`;
      }

      return `<div style="margin-bottom: 4px;">• ${opt} (${votes})${suffix}${votersStr}</div>`;
    }).join('');

    // Check if correct answer is set
    let correctAnsText = '';
    if (poll.status === 'closed') {
      if (poll.correctOptionIndex !== null && poll.correctOptionIndex !== undefined) {
        correctAnsText = `<span style="color: var(--success); font-weight: 600;">Answer Key: Option ${poll.correctOptionIndex + 1} (${poll.options[poll.correctOptionIndex]})</span>`;
      } else {
        correctAnsText = `<span style="color: var(--color-text-secondary);">Opinion Poll (No correct answer)</span>`;
      }
    }

    // Normal Row content
    const normalRowContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
        <div class="admin-poll-info">
          <h4 class="admin-poll-question">${poll.question}</h4>
          ${poll.supportingFacts ? `<div class="poll-supporting-facts" style="margin-bottom: 8px;"><span class="facts-label">💡 Supporting Facts</span>${poll.supportingFacts}</div>` : ''}
          <div style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 8px;">
            <strong>Options:</strong>
            <div style="margin-top: 4px;">${optionsTextSummary}</div>
          </div>
          <div class="admin-poll-meta">
            <span class="poll-status-tag ${statusClass}" style="margin: 0;">${statusText}</span>
            <span><strong>Total Votes:</strong> ${totalVotes}</span>
            <span>Created: ${formatDate(poll.createdAt)}</span>
            ${correctAnsText ? `<span>• ${correctAnsText}</span>` : ''}
          </div>
        </div>
        <div class="admin-poll-actions">
          ${poll.status === 'active' ? `
            <button class="btn btn-secondary btn-icon" onclick="freezePoll('${poll.id}')" title="Freeze Voting">
              <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.23.615 1.738 5.42a1 1 0 11-1.904.61L15.116 11.5l-4.116 1.646V17a1 1 0 11-2 0v-3.854l-4.116-1.646-1.127 3.518a1 1 0 01-1.904-.61l1.738-5.42-1.23-.615a1 1 0 01.894-1.79l1.599.8L9 3.323V3a1 1 0 011-1z"/>
              </svg>
            </button>
            <button class="btn btn-secondary btn-icon" onclick="setupClosePoll('${poll.id}')" title="Close Poll">
              <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
              </svg>
            </button>
          ` : ''}
          ${poll.status === 'frozen' ? `
            <button class="btn btn-primary btn-icon" onclick="setupClosePoll('${poll.id}')" title="Close Poll & Score">
              <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
              </svg>
            </button>
          ` : ''}
          <button class="btn btn-danger btn-icon" onclick="deletePoll('${poll.id}')" title="Delete Poll">
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;

    // Close poll inline form (only displayed for the poll being closed)
    let closeFormContent = '';
    if (activeClosingPollId === poll.id) {
      let optionItems = poll.options.map((opt, idx) => {
        return `<option value="${idx}">Option ${idx + 1}: ${opt}</option>`;
      }).join('');

      closeFormContent = `
        <div class="admin-close-action-box">
          <div style="font-size: 13px; font-weight: 600; color: #fff;">
            Specify the correct answer to calculate scores:
          </div>
          <select id="close-select-${poll.id}" class="admin-select-dropdown">
            <option value="-1">No correct answer (Standard Opinion Poll)</option>
            ${optionItems}
          </select>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="submitClosePoll('${poll.id}')" style="padding: 6px 14px; font-size: 12px;">
              Confirm Close & Score
            </button>
            <button class="btn btn-secondary" onclick="cancelClosePoll()" style="padding: 6px 14px; font-size: 12px;">
              Cancel
            </button>
          </div>
        </div>
      `;
    }

    row.innerHTML = normalRowContent + closeFormContent;
    adminPollsContainer.appendChild(row);
  });
}

// Setup Close poll trigger
function setupClosePoll(pollId) {
  activeClosingPollId = pollId;
  renderAdminPolls();
}

// Cancel close poll
function cancelClosePoll() {
  activeClosingPollId = null;
  renderAdminPolls();
}

// Submit Close poll with correct option index
async function submitClosePoll(pollId) {
  const dropdown = document.getElementById(`close-select-${pollId}`);
  const correctOptionIndex = parseInt(dropdown.value, 10);

  try {
    const response = await fetch(`/api/polls/${pollId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminName: currentUser.name,
        adminMobile: currentUser.mobile,
        correctOptionIndex: correctOptionIndex
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to close poll.');
    }

    showToast("Poll closed and scores updated successfully.");
    activeClosingPollId = null;
    loadPolls(); // Reload list to update local leaderboard
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Dynamic Admin Options Helper (Adding fields)
function addOptionField() {
  const currentFieldsCount = dynamicOptionsContainer.querySelectorAll('.dynamic-option-item').length;
  if (currentFieldsCount >= 6) {
    showToast("Maximum of 6 options allowed.", "error");
    return;
  }

  const optionItem = document.createElement('div');
  optionItem.className = 'dynamic-option-item';
  optionItem.innerHTML = `
    <input type="text" class="form-input option-input" placeholder="Option ${currentFieldsCount + 1}" required>
    <button type="button" class="btn btn-secondary btn-icon remove-option-btn" title="Remove Option">
      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
        <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
      </svg>
    </button>
  `;

  dynamicOptionsContainer.appendChild(optionItem);

  optionItem.querySelector('.remove-option-btn').addEventListener('click', () => {
    if (dynamicOptionsContainer.querySelectorAll('.dynamic-option-item').length <= 2) {
      showToast("A poll must have at least 2 options.", "error");
      return;
    }
    optionItem.remove();
    reindexOptionPlaceholders();
  });
}

function reindexOptionPlaceholders() {
  const inputs = dynamicOptionsContainer.querySelectorAll('.option-input');
  inputs.forEach((input, index) => {
    input.placeholder = `Option ${index + 1}`;
  });
}

// Delete Poll API call
async function deletePoll(pollId) {
  if (!confirm("Are you sure you want to permanently delete this poll? This cannot be undone.")) return;

  try {
    const response = await fetch(`/api/polls/${pollId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminName: currentUser.name,
        adminMobile: currentUser.mobile
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete poll.');
    }

    showToast("Poll deleted successfully.");
    loadPolls();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Freeze Poll API call
async function freezePoll(pollId) {
  if (!confirm("Freeze this poll? Voters will not be able to change their answers, but the correct answer will not be revealed yet.")) return;

  try {
    const response = await fetch(`/api/polls/${pollId}/freeze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminName: currentUser.name,
        adminMobile: currentUser.mobile
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to freeze poll.');
    }

    showToast("Poll frozen successfully.");
    loadPolls();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Reset Database API call
async function resetDatabase() {
  if (!confirm("Reset database to standard sample polls? All current voter logs will be deleted!")) return;

  try {
    const response = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminName: currentUser.name,
        adminMobile: currentUser.mobile
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset database.');
    }

    showToast("Database reset to sample polls.");
    loadPolls();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- Event Listeners ---

// 1. Submit Login Form
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('login-name').value;
  const mobile = document.getElementById('login-mobile').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, mobile })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    // Save in state & localStorage
    currentUser = data;
    localStorage.setItem('pollball_user', JSON.stringify(currentUser));
    
    // Update UI
    updateUserHeaderUI();

    // Switch screen
    if (currentUser.role === 'admin') {
      showScreen(adminScreen);
    } else {
      showScreen(voterScreen);
    }

    showToast(`Welcome back, ${currentUser.name}!`);
    loadPolls();

    loginForm.reset();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// 2. Logout Event
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('pollball_user');
  currentUser = null;
  allPolls = [];
  showScreen(authScreen);
  showToast("Logged out successfully.");
});

// 3. Admin Dynamic Option Fields Setup
addOptionBtn.addEventListener('click', addOptionField);

document.querySelectorAll('.remove-option-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (dynamicOptionsContainer.querySelectorAll('.dynamic-option-item').length <= 2) {
      showToast("A poll must have at least 2 options.", "error");
      return;
    }
    e.currentTarget.parentElement.remove();
    reindexOptionPlaceholders();
  });
});

// 4. Create Poll Form Submit
createPollForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = document.getElementById('poll-question-input').value;
  const optionInputs = dynamicOptionsContainer.querySelectorAll('.option-input');
  
  const options = Array.from(optionInputs)
    .map(input => input.value.trim())
    .filter(val => val !== '');

  if (options.length < 2) {
    showToast("Please enter at least 2 non-empty options.", "error");
    return;
  }

  try {
    const response = await fetch('/api/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminName: currentUser.name,
        adminMobile: currentUser.mobile,
        question: question,
        supportingFacts: document.getElementById('poll-facts-input').value,
        options: options
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create poll.');
    }

    showToast("New poll created successfully!");
    
    document.getElementById('poll-question-input').value = '';
    document.getElementById('poll-facts-input').value = '';
    
    dynamicOptionsContainer.innerHTML = `
      <div class="dynamic-option-item">
        <input type="text" class="form-input option-input" placeholder="Option 1" required>
        <button type="button" class="btn btn-secondary btn-icon remove-option-btn" title="Remove Option">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div class="dynamic-option-item">
        <input type="text" class="form-input option-input" placeholder="Option 2" required>
        <button type="button" class="btn btn-secondary btn-icon remove-option-btn" title="Remove Option">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;

    dynamicOptionsContainer.querySelectorAll('.remove-option-btn').forEach(btn => {
      btn.addEventListener('click', (event) => {
        if (dynamicOptionsContainer.querySelectorAll('.dynamic-option-item').length <= 2) {
          showToast("A poll must have at least 2 options.", "error");
          return;
        }
        event.currentTarget.parentElement.remove();
        reindexOptionPlaceholders();
      });
    });

    loadPolls();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

// Start App
initApp();
