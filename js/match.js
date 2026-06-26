// ============================================================
// match.js — INAI Matching Algorithm
// Quick Match + Preference Match logic
// ============================================================

// ── UTILITY: Case-insensitive string matching ───────────────────
function isSameString(a, b) {
  if (!a || !b) return false;
  return String(a).toLowerCase().trim() === String(b).toLowerCase().trim();
}

// ── CORE SCORING FUNCTION (Preference Match) ──────────────────
function calculateScore(currentUser, otherUser, sameGenderOnly = true) {
  if (sameGenderOnly && currentUser.gender !== otherUser.gender) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  // Proximity (40%)
  if (otherUser.sameBlock && otherUser.sameHostel) {
    score += 40;
    reasons.push({ text: "Same Block", color: "#00C9E4" });
  } else if (otherUser.sameHostel) {
    score += 20;
    reasons.push({ text: "Same Hostel", color: "#00C9E4" });
  }

  // Skill complementarity (30%)
  const theirSubjects = otherUser.strongSkills.map(s => String(s.subject || "").toLowerCase().trim());
  const matchedSkills = currentUser.needHelpSkills.filter(skill =>
    theirSubjects.includes(String(skill || "").toLowerCase().trim())
  );
  if (matchedSkills.length > 0) {
    score += 30;
    reasons.push({
      text: "Helps with " + matchedSkills.map(s => sanitize(s)).join(", "),
      color: "#22C55E"
    });
  }

  // Academic similarity (20%)
  if (isSameString(currentUser.branch, otherUser.branch)) {
    score += 10;
    reasons.push({ text: "Same Branch", color: "#F5C542" });
  }
  if (isSameString(currentUser.year, otherUser.year)) {
    score += 10;
    reasons.push({ text: "Same Year", color: "#F5C542" });
  }

  // State / language (10%)
  if (isSameString(currentUser.state, otherUser.state)) {
    score += 10;
    reasons.push({ text: "Same State", color: "#6C3FC7" });
  }

  return { score, reasons };
}

// ── QUICK MATCH ───────────────────────────────────────────────
function getQuickMatches(currentUser, filters = {}) {
  const users = getAllUsers();
  // Same-gender by default; pass sameGenderOnly:false to override
  const sameGenderOnly = filters.sameGenderOnly !== false;

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => !sameGenderOnly || u.gender === currentUser.gender)
    .map(u => {
      let proximityScore = 0;
      if (u.sameHostel && u.sameBlock)
        proximityScore = 2;
      else if (u.sameHostel)
        proximityScore = 1;

      return { ...u, proximityScore };
    })
    .sort((a, b) => {
      // Free now first
      if (b.freeNow !== a.freeNow) return b.freeNow - a.freeNow;
      // Then by proximity
      return b.proximityScore - a.proximityScore;
    });
}

// ── PREFERENCE MATCH ──────────────────────────────────────────
function getPreferenceMatches(currentUser, filters = {}) {
  const users = getAllUsers();
  // Same-gender by default; pass sameGenderOnly:false to override
  const sameGenderOnly = filters.sameGenderOnly !== false;

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => !sameGenderOnly || u.gender === currentUser.gender)
    .map(u => {
      const { score, reasons } = calculateScore(currentUser, u, false);
      return { ...u, score, reasons };
    })
    .filter(u => {
      // Apply optional filters
      if (filters.subject) {
        const searchSubj = String(filters.subject).toLowerCase().trim();
        if (searchSubj.length >= 2) {
          const hasSubject = (u.strongSkills || []).some(s => String(s.subject).toLowerCase().trim().includes(searchSubj));
          if (!hasSubject) return false;
        }
      }
      if (filters.freeOnly && !u.freeNow) return false;
      if (filters.sameBlock && !u.sameBlock) return false;
      if (filters.minScore && u.score < filters.minScore) return false;
      return true;
    })
    // Show all users, not just those with score > 0 — sort by score descending
    .sort((a, b) => b.score - a.score);
}

// ── ROOMMATE MATCH ────────────────────────────────────────────
function getRoommateMatches(currentUser, filters = {}) {
  const users = getAllUsers();
  const sameGenderOnly = filters.sameGenderOnly !== false;

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => !sameGenderOnly || u.gender === currentUser.gender)
    .filter(u => u.sameHostel)
    .map(u => {
      let score = 0;
      const reasons = [];

      // Proximity (50%)
      if (u.sameBlock) {
        score += 30; reasons.push({ text: "Same Block", color: "#00C9E4" });
      } else {
        score += 15; reasons.push({ text: "Same Hostel", color: "#00C9E4" });
      }

      // Lifestyle (50%)
      if (u.lifestyle && currentUser.lifestyle) {
        if (u.lifestyle.sleepSchedule === currentUser.lifestyle.sleepSchedule) {
          score += 25; reasons.push({ text: "Same Sleep Schedule", color: "#22C55E" });
        }
        if (u.lifestyle.studyStyle === currentUser.lifestyle.studyStyle) {
          score += 25; reasons.push({ text: "Same Study Style", color: "#F5C542" });
        }
      }

      // Same state bonus
      if (isSameString(u.state, currentUser.state)) {
        score += 10; reasons.push({ text: "Same State", color: "#6C3FC7" });
      }

      return { ...u, score, reasons };
    })
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── Render a match card ───────────────────────────────────────
function renderMatchCard(user, currentUser, mode = "preference", delay = 0) {
  const connected = isMutuallyConnected(currentUser.id, user.id);
  const sent      = requestAlreadySent(currentUser.id, user.id);
  const received  = requestAlreadySent(user.id, currentUser.id);
  const isSelf    = user.id === currentUser.id;

  // Anonymized discovery: hide name & avatar until connected
  const isRevealed = connected || isSelf || received;
  const genderIcon = user.gender === "Female" ? "\u{2640}" : "\u{2642}";
  const displayName = isRevealed ? user.name : "Anonymous Student " + genderIcon;
  const displayInitials = isRevealed ? getInitials(user.name) : "?";

  const roomDisplay = `<span class="match-card-room">${connected
    ? `<span style="color:var(--green);">Room ${sanitize(user.room)}</span>`
    : `<span style="color:var(--muted);">\u{1F512} Room hidden</span>`
  }</span>`;

  const skillsHtml = user.strongSkills
    .map(s => skillBadge(s.subject, s.level)).join("");

  const needHtml = user.needHelpSkills.length 
    ? user.needHelpSkills.map(s => skillBadge(s)).join("")
    : `<span style="color:var(--muted); font-size:12px;">Not specified</span>`;

  const reasonsHtml = (user.reasons || [])
    .map(r => `<span style="
      color:${r.color}; font-size:11px; font-weight:600;
      background:rgba(0,0,0,0.2); border-radius:6px;
      padding:2px 8px; display:inline-block; margin:2px;">
      \u{2713} ${sanitize(r.text)}
    </span>`).join("");

  let actionBtn = "";
  if (connected) {
    actionBtn = `<button class="inai-btn" style="
      background:#14532d; color:#22C55E; border:1px solid #22C55E;
      padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
      cursor:default;">
      \u{2713} Connected
    </button>`;
  } else if (sent) {
    actionBtn = `<button class="inai-btn inai-btn-outline" style="
      padding:8px 16px; font-size:12px;" disabled>
      Request Sent
    </button>`;
  } else if (received) {
    actionBtn = `<button class="inai-btn" onclick="acceptFromCard('${user.id}')" style="
      background:var(--green); color:#fff; border:none;
      padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
      cursor:pointer;">
      Accept Request
    </button>`;
  } else {
    const requestType = (mode === "roommate") ? "roommate" : "study";
    actionBtn = `<button class="inai-btn inai-btn-primary"
      onclick="sendRequestFromCard('${user.id}', '${requestType}')"
      style="padding:8px 16px; font-size:12px;">
      Send Request
    </button>`;
  }

  const scoreDisplay = mode === "quick"
    ? `<div style="
        background:var(--indigo); border:1px solid var(--border);
        border-radius:8px; padding:4px 10px;
        font-size:11px; color:var(--muted); font-weight:600;">
        ${user.sameBlock ? "\u{1F4CD} Same Block" : "\u{1F3E0} Same Hostel"}
      </div>`
    : scoreRing(user.score || 0);

  const locationDisplay = connected
    ? `${sanitize(user.hostel)}, Block ${sanitize(user.block)}`
    : (user.sameHostel ? `${sanitize(user.hostel)}` : "Hostel hidden");

  return `
    <div class="inai-card match-card" data-user-id="${user.id}" style="
      animation: fadeIn 0.35s ease both;
      animation-delay: ${delay}s;
      display:flex; flex-direction:column; gap:12px;">

      <!-- Top row -->
      <div class="match-card-top" style="display:flex; align-items:flex-start; gap:12px;">
        ${renderAnonymousAvatar(displayInitials, isRevealed, 48)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h3 style="font-size:15px; font-weight:700; color:var(--white);
              font-family:'Space Grotesk',sans-serif;">${sanitize(displayName)}</h3>
            ${!isRevealed ? `<span style="font-size:10px; color:var(--muted); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:6px;">Hidden until connect</span>` : ""}
            ${freeNowBadge(user.freeNow)}
          </div>
          <p style="font-size:12px; color:var(--muted); margin-top:2px;">
            ${sanitize(user.year)} · ${sanitize(user.branch)} · ${locationDisplay}
          </p>
          <p style="font-size:12px; color:var(--muted);">
            ${roomDisplay} · ${sanitize(user.state)}
          </p>
        </div>
        ${scoreDisplay}
      </div>

      <!-- Skills -->
      <div>
        <p style="font-size:11px; color:var(--muted); font-weight:600;
          text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
          Strong in
        </p>
        <div>${skillsHtml}</div>
      </div>

      <div>
        <p style="font-size:11px; color:var(--muted); font-weight:600;
          text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
          Needs help in
        </p>
        <div>${needHtml}</div>
      </div>

      <!-- Match reasons -->
      ${reasonsHtml ? `<div>${reasonsHtml}</div>` : ""}

      <!-- Rating + Bio -->
      ${user.rating > 0 && user.helpCount > 0 ? `
        <p style="font-size:12px; color:var(--gold);">
          \u{2605} ${user.rating} · ${user.helpCount} sessions helped
        </p>` : ""}
      ${user.bio ? `<p style="font-size:12px; color:var(--muted); font-style:italic;">
        "${sanitize(user.bio)}"</p>` : ""}

      <!-- Action -->
      <div class="match-card-actions" style="display:flex; justify-content:flex-end;">
        ${actionBtn}
      </div>
    </div>`;
}

// ── Quick send from card ──────────────────────────────────────
async function sendRequestFromCard(toId, type = "study") {
  const currentUser = getSession();
  if (!currentUser) return;

  if (requestAlreadySent(currentUser.id, toId)) {
    return showToast("Request already sent!", "info");
  }

  const toUser = getUserById(toId);
  if (!toUser) return;

  const ok = await saveRequest({
    id:        generateId("req"),
    from:      currentUser.id,
    fromName:  currentUser.name,
    to:        toId,
    toName:    toUser.name,
    type:      type,
    status:    "pending",
    timestamp: Date.now()
  });

  if (ok) {
    const connected = isMutuallyConnected(currentUser.id, toId);
    const received = requestAlreadySent(toId, currentUser.id);
    const isRevealed = connected || received;
    showToast(`Request sent to ${isRevealed ? toUser.name : "Anonymous Student"}!`, "success");
    // Update the card in-place
    const card = document.querySelector(`.match-card[data-user-id="${toId}"]`);
    if (card) {
      const actionsDiv = card.querySelector('.match-card-actions');
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <button class="inai-btn inai-btn-outline" style="
            padding:8px 16px; font-size:12px;" disabled>
            Request Sent
          </button>`;
      }
    }
  } else {
    showToast("Failed to send request.", "error");
  }
}

async function acceptFromCard(fromId) {
  const currentUser = getSession();
  const req = getIncomingRequests(currentUser.id).find(r => r.from === fromId && r.status === "pending");
  if (req) {
    const ok = await updateRequest(req.id, "accepted");
    if (ok) {
      showToast("Connected! Room number is now visible.", "success");
      if (typeof burstConfetti === "function") burstConfetti();
      // Update the card in-place
      const otherUser = getUserById(fromId);
      if (otherUser) {
        const card = document.querySelector(`.match-card[data-user-id="${fromId}"]`);
        if (card) {
          const actionsDiv = card.querySelector('.match-card-actions');
          if (actionsDiv) {
            actionsDiv.innerHTML = `
              <button class="inai-btn" style="
                background:#14532d; color:#22C55E; border:1px solid #22C55E;
                padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
                cursor:default;">
                \u{2713} Connected
              </button>`;
          }
          const roomDiv = card.querySelector('.match-card-room');
          if (roomDiv) {
            roomDiv.innerHTML = `<span style="color:var(--green);">Room ${sanitize(otherUser.room)}</span>`;
          }
        }
      }
    } else {
      showToast("Failed to accept request.", "error");
    }
  }
}
