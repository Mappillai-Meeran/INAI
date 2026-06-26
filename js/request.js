// ============================================================
// request.js — INAI Request System
// Send, Accept, Decline, Room Reveal logic
// ============================================================

// ── Send a study / roommate request ──────────────────────────
async function sendRequest(fromUser, toUserId, type = "study") {
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
  const ok = await saveRequest(req);
  if (ok) {
    const connected = isMutuallyConnected(fromUser.id, toUserId);
    const received = requestAlreadySent(toUserId, fromUser.id);
    const isRevealed = connected || received;
    showToast(`Request sent to ${isRevealed ? toUser.name : "Anonymous Student"}!`, "success");
    return true;
  } else {
    showToast("Failed to send request.", "error");
    return false;
  }
}

// ── Accept a request ─────────────────────────────────────────
async function acceptRequest(requestId) {
  const ok = await updateRequest(requestId, "accepted");
  if (ok) {
    showToast("Request accepted! Room number is now visible.", "success");
    if (typeof burstConfetti === "function") burstConfetti();
    if (typeof renderRequestsPage === "function") setTimeout(renderRequestsPage, 300);
  } else {
    showToast("Failed to accept request.", "error");
  }
}

// ── Decline a request ────────────────────────────────────────
async function declineRequest(requestId) {
  return new Promise((resolve) => {
    showConfirm("Decline this request?", async () => {
      const ok = await updateRequest(requestId, "declined");
      if (ok) {
        showToast("Request declined.", "info");
        if (typeof renderRequestsPage === "function") setTimeout(renderRequestsPage, 300);
        resolve(true);
      } else {
        showToast("Failed to decline request.", "error");
        resolve(false);
      }
    });
  });
}

// ── Disconnect a connection ──────────────────────────────────
async function disconnectUser(requestId) {
  return new Promise((resolve) => {
    showConfirm("Remove this connection?", async () => {
      const ok = await updateRequest(requestId, "disconnected");
      if (ok) {
        showToast("Connection removed.", "info");
        if (typeof renderRequestsPage === "function") {
          setTimeout(renderRequestsPage, 300);
        } else {
          const card = document.querySelector(`[onclick*="${requestId}"]`)?.closest(".inai-card, .request-card");
          if (card) card.remove();
        }
        resolve(true);
      } else {
        showToast("Failed to remove connection.", "error");
        resolve(false);
      }
    });
  });
}

// ── Render the full requests page ────────────────────────────
function renderRequestsPage() {
  const currentUser = requireLogin();
  if (!currentUser) return;

  const incoming = getIncomingRequests(currentUser.id);
  const outgoing = getOutgoingRequests(currentUser.id);

  const incomingPending   = incoming.filter(r => r.status === "pending");
  const incomingAccepted  = incoming.filter(r => r.status === "accepted");
  const outgoingActive    = outgoing.filter(r => r.status === "pending" || r.status === "accepted");
  const history           = [...incoming, ...outgoing].filter(r => r.status === "declined" || r.status === "disconnected");

  renderRequestSection("incoming-pending",  incomingPending,  currentUser, "incoming-pending");
  renderRequestSection("incoming-accepted", incomingAccepted, currentUser, "incoming-accepted");
  renderRequestSection("outgoing-list",     outgoingActive,   currentUser, "outgoing");
  renderRequestSection("history-list",      history,          currentUser, "history");

  // Update tab headers dynamically
  const incomingPendingBadge = document.getElementById("incoming-pending-badge");
  if (incomingPendingBadge) {
    incomingPendingBadge.innerHTML = incomingPending.length > 0 ? `<span style="background:var(--red);color:#fff;
      border-radius:50%;width:18px;height:18px;font-size:10px;
      display:inline-flex;align-items:center;justify-content:center;
      margin-left:6px;">${incomingPending.length}</span>` : "";
  }

  const outgoingActiveCount = document.getElementById("outgoing-active-count");
  if (outgoingActiveCount) {
    outgoingActiveCount.textContent = `(${outgoingActive.length})`;
  }

  const historyCount = document.getElementById("history-count");
  if (historyCount) {
    historyCount.textContent = `(${history.length})`;
  }

  // Update badges
  const badge = document.getElementById("pending-badge");
  if (badge) badge.textContent = incomingPending.length || "";
}

// ── Render a list of request cards ───────────────────────────
function renderRequestSection(containerId, requests, currentUser, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (requests.length === 0) {
    if (typeof isBackendDown === "function" && isBackendDown()) {
      container.innerHTML = `
        <div class="inai-empty" style="border: 1px dashed var(--red); background: rgba(239, 68, 68, 0.05); border-radius: 12px; padding: 24px;">
          <div class="inai-empty-icon" style="color: var(--red); margin-bottom: 8px;">⚠️</div>
          <p style="color: var(--red); font-weight: 700;">Connection Offline</p>
          <p style="font-size: 12px; margin-top: 4px; color: var(--muted);">Unable to load requests. Please check if the backend is running.</p>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="inai-empty">
        <div class="inai-empty-icon">📂</div>
        <p>No requests here yet</p>
      </div>`;
    return;
  }

  container.innerHTML = requests.map(req => {
    const isIncoming = type !== "outgoing" && type !== "history";
    const otherId    = req.from === currentUser.id ? req.to : req.from;
    const otherUser  = getUserById(otherId);
    if (!otherUser) {
      return `
        <div class="request-card" style="display:flex; align-items:center;
          gap:16px; padding:16px 20px; 
          background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05);
          transition:background 0.2s; animation:fadeIn 0.3s ease both;">
          <div style="width:44px; height:44px; border-radius:50%; background:#333; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-family:'Space Grotesk', sans-serif;">?</div>
          <div style="flex:1; min-width:0;">
            <h4 style="font-size:15px; font-weight:700; color:var(--white); font-family:'Space Grotesk',sans-serif;">User no longer exists</h4>
            <p style="font-size:13px; color:var(--muted); margin-top:4px;">This account has been deleted.</p>
          </div>
          <div class="request-card-actions" style="flex-shrink:0;">
            <button onclick="disconnectUser('${req.id}')" style="background:transparent; border:1px solid var(--red); color:var(--red); padding:6px 10px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">
              Remove
            </button>
          </div>
        </div>`;
    }

    const connected = req.status === "accepted";
    const isRevealed = connected || (isIncoming && req.status === "pending") || req.status === "declined" || req.status === "disconnected";
    const displayName = isRevealed ? otherUser.name : "Anonymous Student";
    const roomInfo  = connected
      ? `<span style="color:var(--green); font-weight:700;">
          🔓 Room ${sanitize(otherUser.room)}, Block ${sanitize(otherUser.block)}
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
        ✕ Declined
      </span>`;
    } else if (req.status === "disconnected") {
      actions = `<span style="
        color:var(--muted); font-size:12px; font-weight:600;
        background:rgba(255,255,255,0.05); border:1px solid var(--border);
        padding:6px 14px; border-radius:8px; display:inline-block;">
        Disconnected
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
        ${isRevealed ? renderAvatar(otherUser.name, 44) : renderAnonymousAvatar("?", false, 44)}
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <h4 style="font-size:15px; font-weight:700; color:var(--white);
              font-family:'Space Grotesk',sans-serif;">${sanitize(displayName)}</h4>
            <span style="font-size:11px; color:var(--muted); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:10px;">
              ${req.type === "study" ? "Study" : "Roommate"}
            </span>
          </div>
          <p style="font-size:13px; color:var(--muted); margin-top:4px;">
            ${sanitize(otherUser.year)} · ${sanitize(otherUser.branch)} <span style="opacity:0.5">·</span> ${timeAgo(req.timestamp)}
          </p>
          <p style="font-size:12px; margin-top:4px;">${roomInfo}</p>
        </div>
        <div class="request-card-actions" style="flex-shrink:0;">${actions}</div>
      </div>`;
  }).join("");
}
