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
function calculateScore(currentUser, otherUser) {
  // Hard block — different gender = 0 score always
  if (currentUser.gender !== otherUser.gender) return { score: 0, reasons: [] };

  let score = 0;
  const reasons = [];

  // 40% — Proximity
  if (isSameString(currentUser.block, otherUser.block) &&
      isSameString(currentUser.hostel, otherUser.hostel)) {
    score += 40;
    reasons.push({ text: "Same Block", color: "#00C9E4" });
  } else if (isSameString(currentUser.hostel, otherUser.hostel)) {
    score += 20;
    reasons.push({ text: "Same Hostel", color: "#00C9E4" });
  }

  // 30% — Skill complementarity
  const theirSubjects = otherUser.strongSkills.map(s => String(s.subject || "").toLowerCase().trim());
  const matchedSkills = currentUser.needHelpSkills.filter(skill =>
    theirSubjects.includes(String(skill || "").toLowerCase().trim())
  );
  if (matchedSkills.length > 0) {
    score += 30;
    reasons.push({
      text: "Helps with " + matchedSkills.join(", "),
      color: "#22C55E"
    });
  }

  // 20% — Academic similarity
  if (isSameString(currentUser.branch, otherUser.branch)) {
    score += 10;
    reasons.push({ text: "Same Branch", color: "#F5C542" });
  }
  if (isSameString(currentUser.year, otherUser.year)) {
    score += 10;
    reasons.push({ text: "Same Year", color: "#F5C542" });
  }

  // 10% — State / language
  if (isSameString(currentUser.state, otherUser.state)) {
    score += 10;
    reasons.push({ text: "Same State", color: "#6C3FC7" });
  }

  return { score, reasons };
}

// ── QUICK MATCH ───────────────────────────────────────────────
// Returns users sorted by proximity, same gender, free now first
function getQuickMatches(currentUser) {
  const users = getAllUsers();

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => u.gender === currentUser.gender)
    .map(u => {
      let proximityScore = 0;
      if (isSameString(u.hostel, currentUser.hostel) && isSameString(u.block, currentUser.block))
        proximityScore = 2;
      else if (isSameString(u.hostel, currentUser.hostel))
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
// Returns users scored and sorted by the algorithm
function getPreferenceMatches(currentUser, filters = {}) {
  const users = getAllUsers();

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => u.gender === currentUser.gender)
    .map(u => {
      const { score, reasons } = calculateScore(currentUser, u);
      return { ...u, score, reasons };
    })
    .filter(u => {
      // Apply optional filters
      if (filters.subject) {
        const searchSubj = String(filters.subject).toLowerCase().trim();
        const hasSubject = u.strongSkills.some(s => String(s.subject).toLowerCase().trim().includes(searchSubj));
        if (!hasSubject) return false;
      }
      if (filters.freeOnly && !u.freeNow) return false;
      if (filters.sameBlock && !isSameString(u.block, currentUser.block)) return false;
      if (filters.minScore && u.score < filters.minScore) return false;
      return true;
    })
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── ROOMMATE MATCH ────────────────────────────────────────────
// Scores based on lifestyle + proximity
function getRoommateMatches(currentUser) {
  const users = getAllUsers();

  return users
    .filter(u => u.id !== currentUser.id)
    .filter(u => u.gender === currentUser.gender)
    .filter(u => isSameString(u.hostel, currentUser.hostel))
    .map(u => {
      let score = 0;
      const reasons = [];

      // Proximity (50%)
      if (isSameString(u.block, currentUser.block)) {
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
function renderMatchCard(user, currentUser, mode = "preference") {
  const connected = isMutuallyConnected(currentUser.id, user.id);
  const sent      = requestAlreadySent(currentUser.id, user.id);
  const received  = requestAlreadySent(user.id, currentUser.id);

  const roomDisplay = connected
    ? `<span style="color:var(--green);">Room ${user.room}</span>`
    : `<span style="color:var(--muted);">🔒 Room hidden</span>`;

  const skillsHtml = user.strongSkills
    .map(s => skillBadge(s.subject, s.level)).join("");

  const needHtml = user.needHelpSkills
    .map(s => skillBadge(s)).join("");

  const reasonsHtml = (user.reasons || [])
    .map(r => `<span style="
      color:${r.color}; font-size:11px; font-weight:600;
      background:rgba(0,0,0,0.2); border-radius:6px;
      padding:2px 8px; display:inline-block; margin:2px;">
      ✓ ${r.text}
    </span>`).join("");

  let actionBtn = "";
  if (connected) {
    actionBtn = `<button class="inai-btn" style="
      background:#14532d; color:#22C55E; border:1px solid #22C55E;
      padding:8px 16px; border-radius:8px; font-size:12px; font-weight:700;
      cursor:default;">
      ✓ Connected
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
    actionBtn = `<button class="inai-btn inai-btn-primary"
      onclick="sendRequestFromCard('${user.id}')"
      style="padding:8px 16px; font-size:12px;">
      Send Request
    </button>`;
  }

  const scoreDisplay = mode === "quick"
    ? `<div style="
        background:var(--indigo); border:1px solid var(--border);
        border-radius:8px; padding:4px 10px;
        font-size:11px; color:var(--muted); font-weight:600;">
        ${isSameString(user.block, currentUser.block) ? "📍 Same Block" : "🏠 Same Hostel"}
      </div>`
    : scoreRing(user.score || 0);

  return `
    <div class="inai-card match-card" style="
      animation: fadeIn 0.3s ease both;
      display:flex; flex-direction:column; gap:12px;">

      <!-- Top row -->
      <div class="match-card-top" style="display:flex; align-items:flex-start; gap:12px;">
        ${renderAvatar(user.name, 48)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h3 style="font-size:15px; font-weight:700; color:var(--white);
              font-family:'Space Grotesk',sans-serif;">${user.name}</h3>
            ${freeNowBadge(user.freeNow)}
          </div>
          <p style="font-size:12px; color:var(--muted); margin-top:2px;">
            ${user.year} · ${user.branch} · ${user.hostel}, Block ${user.block}
          </p>
          <p style="font-size:12px; color:var(--muted);">
            ${roomDisplay} · ${user.state}
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
      ${user.rating > 0 ? `
        <p style="font-size:12px; color:var(--gold);">
          ★ ${user.rating} · ${user.helpCount} sessions helped
        </p>` : ""}
      ${user.bio ? `<p style="font-size:12px; color:var(--muted); font-style:italic;">
        "${user.bio}"</p>` : ""}

      <!-- Action -->
      <div class="match-card-actions" style="display:flex; justify-content:flex-end;">
        ${actionBtn}
      </div>
    </div>`;
}

// ── Quick send from card ──────────────────────────────────────
async function sendRequestFromCard(toId) {
  const currentUser = getSession();
  if (!currentUser) return;

  if (requestAlreadySent(currentUser.id, toId)) {
    return showToast("Request already sent!", "info");
  }

  const toUser = getUserById(toId);
  await saveRequest({
    id:        generateId("req"),
    from:      currentUser.id,
    fromName:  currentUser.name,
    to:        toId,
    toName:    toUser.name,
    type:      "study",
    status:    "pending",
    timestamp: Date.now()
  });

  showToast(`Request sent to ${toUser.name}!`, "success");

  // Refresh the card
  setTimeout(() => window.location.reload(), 800);
}

async function acceptFromCard(fromId) {
  const currentUser = getSession();
  const requests    = getAllRequests();
  const req = requests.find(r => r.from === fromId && r.to === currentUser.id
    && r.status === "pending");
  if (req) {
    await updateRequest(req.id, "accepted");
    showToast("Connected! Room number is now visible.", "success");
    setTimeout(() => window.location.reload(), 800);
  }
}
