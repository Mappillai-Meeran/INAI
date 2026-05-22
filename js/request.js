// ============================================================
// request.js — INAI Request System
// Send, Accept, Decline, Room Reveal logic
// ============================================================

// ── Send a study / roommate request ──────────────────────────
function sendRequest(fromUser, toUserId, type = "study") {
  if (requestAlreadySent(fromUser.id, toUserId)) {
    showToast("You already sent a request to this person.", "info");
    return false;
  }
  if (isMutuallyConnected(fromUser.id, toUserId)) {
    showToast("You are already connected!", "info");
    return false;
  }
  const toUser = getUserById(toUserId);
  if (!toUser) return false;

  const req = {
    id:        generateId("req"),
    from:      fromUser.id,
    fromName:  fromUser.name,
    to:        toUserId,
    toName:    toUser.name,
    type,
    status:    "pending",
    timestamp: Date.now(),
    updatedAt: null
  };
  saveRequest(req);
  showToast(`Request sent to ${toUser.name}!`, "success");
  return true;
}

// ── Accept a request ─────────────────────────────────────────
function acceptRequest(requestId) {
  const ok = updateRequest(requestId, "accepted");
  if (ok) {
    showToast("Request accepted! Room number is now visible.", "success");
    setTimeout(renderRequestsPage, 600);
  }
}

// ── Decline a request ────────────────────────────────────────
function declineRequest(requestId) {
  showConfirm("Decline this request?", () => {
    const ok = updateRequest(requestId, "declined");
    if (ok) {
      showToast("Request declined.", "info");
      setTimeout(renderRequestsPage, 400);
    }
  });
}

// ── Disconnect a connection ──────────────────────────────────
function disconnectUser(requestId) {
  showConfirm("Remove this connection?", () => {
    const ok = updateRequest(requestId, "disconnected");
    if (ok) {
      showToast("Connection removed.", "info");
      setTimeout(() => window.location.reload(), 400);
    }
  });
}

// ── Render the full requests page ────────────────────────────
function renderRequestsPage() {
  const currentUser = requireLogin();
  if (!currentUser) return;

  const incoming = getIncomingRequests(currentUser.id);
  const outgoing = getOutgoingRequests(currentUser.id);

  const pending   = incoming.filter(r => r.status === "pending");
  const accepted  = incoming.filter(r => r.status === "accepted");
  const declined  = incoming.filter(r => r.status === "declined");

  renderRequestSection("incoming-pending",  pending,  currentUser, "incoming-pending");
  renderRequestSection("incoming-accepted", accepted, currentUser, "incoming-accepted");
  renderRequestSection("outgoing-list",     outgoing, currentUser, "outgoing");

  // Update badges
  const badge = document.getElementById("pending-badge");
  if (badge) badge.textContent = pending.length || "";

  const tabs = document.querySelectorAll(".req-tab-count");
  tabs.forEach(t => {
    if (t.dataset.type === "pending")  t.textContent = pending.length;
    if (t.dataset.type === "accepted") t.textContent = accepted.length;
    if (t.dataset.type === "outgoing") t.textContent = outgoing.length;
  });
}

// ── Render a list of request cards ───────────────────────────
function renderRequestSection(containerId, requests, currentUser, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = `
      <div class="inai-empty">
        <div class="inai-empty-icon">📭</div>
        <p>No requests here yet</p>
      </div>`;
    return;
  }

  container.innerHTML = requests.map(req => {
    const isIncoming = type !== "outgoing";
    const otherId    = isIncoming ? req.from : req.to;
    const otherUser  = getUserById(otherId);
    if (!otherUser) return "";

    const connected = req.status === "accepted";
    const roomInfo  = connected
      ? `<span style="color:var(--green); font-weight:700;">
          🔓 Room ${otherUser.room}, Block ${otherUser.block}
         </span>`
      : `<span style="color:var(--muted);">🔒 Room hidden until accepted</span>`;

    let actions = "";
    if (isIncoming && req.status === "pending") {
      actions = `
        <div style="display:flex; gap:8px;">
          <button onclick="acceptRequest('${req.id}')" class="inai-btn" style="
            background:var(--green); color:#fff; border:none;
            padding:8px 18px; border-radius:8px;
            font-size:12px; font-weight:700; cursor:pointer;">
            ✓ Accept
          </button>
          <button onclick="declineRequest('${req.id}')" class="inai-btn inai-btn-outline"
            style="padding:8px 14px; font-size:12px;">
            Decline
          </button>
        </div>`;
    } else if (req.status === "accepted") {
      actions = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="
            color:var(--green); font-size:12px; font-weight:700;
            background:#14532d; border:1px solid #22C55E;
            padding:6px 14px; border-radius:8px; display:inline-block;">
            ✓ Connected
          </span>
          <button onclick="disconnectUser('${req.id}')" style="background:transparent; border:1px solid var(--red); color:var(--red); padding:6px 10px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">
            Remove
          </button>
        </div>`;
    } else if (req.status === "declined") {
      actions = `<span style="
        color:var(--red); font-size:12px; font-weight:600;
        background:#450a0a; border:1px solid #EF4444;
        padding:6px 14px; border-radius:8px; display:inline-block;">
        ✗ Declined
      </span>`;
    } else if (req.status === "pending" && !isIncoming) {
      actions = `<span style="
        color:var(--muted); font-size:12px; font-weight:600;
        background:var(--indigo); border:1px solid var(--border);
        padding:6px 14px; border-radius:8px; display:inline-block;">
        ⏳ Pending
      </span>`;
    }

    return `
      <div class="request-card" style="display:flex; align-items:center;
        gap:16px; padding:16px 20px; 
        background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05);
        transition:background 0.2s; animation:fadeIn 0.3s ease both;
        ${isIncoming && req.status === "pending" ? "border-left: 3px solid var(--cyan);" : ""}"
        onmouseover="this.style.background='rgba(255,255,255,0.05)'"
        onmouseout="this.style.background='rgba(255,255,255,0.02)'">
        ${renderAvatar(otherUser.name, 44)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h4 style="font-size:15px; font-weight:700; color:var(--white);
              font-family:'Space Grotesk',sans-serif;">${otherUser.name}</h4>
            <span style="font-size:11px; color:var(--muted); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px;">
              ${req.type === "study" ? "Study" : "Roommate"}
            </span>
          </div>
          <p style="font-size:13px; color:var(--muted); margin-top:4px;">
            ${otherUser.year} · ${otherUser.branch} <span style="opacity:0.5">·</span> ${timeAgo(req.timestamp)}
          </p>
          <p style="font-size:12px; margin-top:4px;">${roomInfo}</p>
        </div>
        <div class="request-card-actions" style="flex-shrink:0;">${actions}</div>
      </div>`;
  }).join("");
}
