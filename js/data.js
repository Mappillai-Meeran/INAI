// ============================================================
// data.js — INAI Data API Client
// Connects to the Node.js/Express Backend on localhost:5000
// ============================================================

const API_BASE = (window.location.hostname && (window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1") || window.location.protocol === "file:"))
  ? `http://localhost:5000/api`
  : `https://inai-backend-8b08.onrender.com/api`;
let USERS_CACHE = [];
let REQUESTS_CACHE = [];
let SESSIONS_CACHE = [];
let BACKEND_DOWN = false;

function isBackendDown() {
  return BACKEND_DOWN;
}

// ── Initialize from MongoDB ───────────────────────────────────
async function initData() {
  try {
    const userToken = sessionStorage.getItem("inai_user_token") || "";
    const adminToken = sessionStorage.getItem("inai_admin_token") || "";
    const token = userToken || adminToken;
    const headers = { "Content-Type": "application/json" };
    if (token && token.trim().length > 10) {
      headers["Authorization"] = "Bearer " + token;
    }

    const [uRes, rRes] = await Promise.all([
      fetch(`${API_BASE}/users`, { headers }),
      fetch(`${API_BASE}/requests`, { headers })
    ]);

    // Handle 401: token expired or invalid — redirect to login
    if (uRes.status === 401 || rRes.status === 401) {
      clearSession("expired");
      window.location.href = "register.html?tab=login";
      return;
    }

    if (!uRes.ok || !rRes.ok) throw new Error("Failed to fetch from server");

    USERS_CACHE = await uRes.json();
    REQUESTS_CACHE = await rRes.json();
    BACKEND_DOWN = false;
    console.log("[INAI] Data loaded:", USERS_CACHE.length, "users");

    // Re-hydrate the session with live database data
    const session = getSession();
    if (session) {
      const fresh = getUserById(session.id);
      if (fresh) {
        setSession(fresh);
      }
    }
  } catch (err) {
    console.error("[INAI] Backend unreachable:", err);
    BACKEND_DOWN = true;
  }
}

// ── CRUD helpers (Synchronous reads using cache) ──────────────
function getAllUsers() {
  return USERS_CACHE;
}
function getUserById(id) {
  return USERS_CACHE.find(u => u.id === id) || null;
}
function getAllRequests() {
  return REQUESTS_CACHE;
}
function getIncomingRequests(userId) {
  return REQUESTS_CACHE.filter(r => r.to === userId);
}
function getOutgoingRequests(userId) {
  return REQUESTS_CACHE.filter(r => r.from === userId);
}

// Get the latest request (in either direction) between two users
function getRequestState(userA, userB) {
  const reqs = REQUESTS_CACHE.filter(r =>
    (r.from === userA && r.to === userB) ||
    (r.from === userB && r.to === userA)
  );
  if (reqs.length === 0) return null;
  return reqs.reduce((latest, r) => r.timestamp > latest.timestamp ? r : latest, reqs[0]);
}

function isMutuallyConnected(userA, userB) {
  const req = getRequestState(userA, userB);
  return req ? req.status === "accepted" : false;
}

function requestAlreadySent(fromId, toId) {
  return REQUESTS_CACHE.some(r => r.from === fromId && r.to === toId && r.status === "pending");
}

function getIncomingSessionProposals(userId) {
  return SESSIONS_CACHE.filter(s => s.targetId === userId && s.status === "pending");
}

function getPendingSessionsForUser(userId) {
  return SESSIONS_CACHE.filter(s =>
    (s.targetId === userId || s.proposerId === userId) &&
    (s.status === "pending" || s.status === "confirmed")
  );
}

// ── Async Writes ──────────────────────────────────────────────
async function loginUser(name, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      sessionStorage.setItem("inai_user_token", data.token);
    }
    return data;
  } catch (err) {
    return { success: false, message: "Server error" };
  }
}



async function verifyAdminPassword(password) {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      sessionStorage.setItem("inai_admin_token", data.token);
    }
    return data;
  } catch (err) {
    return { success: false, message: "Server error" };
  }
}

async function saveUser(userData) {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (data.success) {
      USERS_CACHE.push(data.user);
      if (data.token) {
        sessionStorage.setItem("inai_user_token", data.token);
      }
    }
    return data;
  } catch (err) {
    return { success: false, message: "Server error" };
  }
}

async function updateUser(id, updates) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      const idx = USERS_CACHE.findIndex(u => u.id === id);
      if (idx !== -1) USERS_CACHE[idx] = data.user;
      const session = getSession();
      if (session && session.id === id) setSession(data.user);
    }
    return data.success;
  } catch (err) {
    return false;
  }
}

async function saveRequest(requestObj) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(requestObj)
    });
    const data = await res.json();
    if (data.success) {
      REQUESTS_CACHE.push(data.request || requestObj);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function updateRequest(requestId, status) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const updatedAt = Date.now();
    const res = await fetch(`${API_BASE}/requests/${requestId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ status, updatedAt })
    });
    const data = await res.json();
    if (data.success) {
      const idx = REQUESTS_CACHE.findIndex(r => r.id === requestId);
      if (idx !== -1) Object.assign(REQUESTS_CACHE[idx], { status, updatedAt });
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function deleteUserAPI(userId) {
  try {
    // Use user token for self-deletion, fall back to admin token if available
    const userToken = sessionStorage.getItem("inai_user_token") || "";
    const adminToken = sessionStorage.getItem("inai_admin_token") || "";
    const token = adminToken || userToken;
    const authHeaders = { "Authorization": "Bearer " + token };
    await fetch(`${API_BASE}/requests/user/${userId}`, { method: "DELETE", headers: authHeaders });
    const res = await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE", headers: authHeaders });
    const data = await res.json();
    if (data.success) {
      USERS_CACHE = USERS_CACHE.filter(u => u.id !== userId);
      REQUESTS_CACHE = REQUESTS_CACHE.filter(r => r.from !== userId && r.to !== userId);
    }
    return data.success;
  } catch (err) {
    return false;
  }
}

// ── Gamification: Streak & Badges ──────────────────────────────
const BADGE_DEFS = [
  { id: "first_connect", label: "First Connection", icon: "\u{1F91D}", desc: "Made your first connection" },
  { id: "networker",     label: "Networker",        icon: "\u{1F578}\u{FE0F}", desc: "Connected with 5 people" },
  { id: "scholar",       label: "Scholar",           icon: "\u{1F393}", desc: "Connected with 10 people" },
  { id: "early_bird",    label: "Early Adopter",     icon: "\u{1F41B}", desc: "Joined in the first week" },
  { id: "streak_3",      label: "3-Day Streak",      icon: "\u{1F525}", desc: "Logged in 3 days in a row" },
  { id: "streak_7",      label: "7-Day Streak",      icon: "\u{1F31F}", desc: "Logged in 7 days in a row" },
  { id: "social",        label: "Social Butterfly",  icon: "\u{1F338}", desc: "Sent 10 requests" },
];

function computeBadges(user) {
  const badges = [];
  const allReqs = getAllRequests();
  const myReqs = allReqs.filter(r => r.from === user.id || r.to === user.id);
  const accepted = myReqs.filter(r => r.status === "accepted");
  const sentCount = allReqs.filter(r => r.from === user.id).length;

  if (accepted.length >= 1)  badges.push("first_connect");
  if (accepted.length >= 5)  badges.push("networker");
  if (accepted.length >= 10) badges.push("scholar");
  if (sentCount >= 10)       badges.push("social");

  const streak = getLoginStreak();
  if (streak >= 3) badges.push("streak_3");
  if (streak >= 7) badges.push("streak_7");

  return badges;
}

function getLoginStreak() {
  try {
    const raw = localStorage.getItem("inai_streak");
    if (!raw) return 0;
    const { count, lastDate } = JSON.parse(raw);
    const last = new Date(lastDate);
    const today = new Date();
    const diffDays = Math.floor((today - last) / 86400000);
    if (diffDays === 0) return count;
    if (diffDays === 1) return count; // will be updated on setSession
    return 0; // streak broken
  } catch { return 0; }
}

function updateLoginStreak() {
  const today = new Date().toDateString();
  const raw = localStorage.getItem("inai_streak");
  let count = 1;
  if (raw) {
    try {
      const data = JSON.parse(raw);
      const last = new Date(data.lastDate);
      const todayDate = new Date();
      const diffDays = Math.floor((todayDate - last) / 86400000);
      if (diffDays === 0) { count = data.count; } // same day, no change
      else if (diffDays === 1) { count = data.count + 1; } // consecutive
      else { count = 1; } // streak broken
    } catch { count = 1; }
  }
  localStorage.setItem("inai_streak", JSON.stringify({ count, lastDate: today }));
  return count;
}

function renderBadges(badgeIds) {
  return badgeIds.map(id => {
    const def = BADGE_DEFS.find(b => b.id === id);
    if (!def) return "";
    return `<span title="${sanitize(def.desc)}" style="
      display:inline-flex; align-items:center; gap:4px;
      background:rgba(255,255,255,0.05); border:1px solid var(--border);
      border-radius:20px; padding:4px 12px 4px 8px;
      font-size:12px; font-weight:600; color:var(--offwht);
      cursor:default; transition:all 0.2s;
    " onmouseover="this.style.borderColor='var(--violet)'" onmouseout="this.style.borderColor='var(--border)'">
      ${def.icon} ${sanitize(def.label)}
    </span>`;
  }).join("");
}

// ── Brain Match Quiz API ──────────────────────────────────────
async function clearQuizAnswers() {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/quiz/clear`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    return await res.json();
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function saveQuizAnswers(answers) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/quiz/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ answers })
    });
    return await res.json();
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function fetchQuizMatches() {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/quiz/matches`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) { return []; }
}

// ── Study Session API ─────────────────────────────────────────
async function createStudySession(data) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success && result.session) {
      SESSIONS_CACHE.unshift(result.session);
    }
    return result;
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function fetchMySessions() {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/sessions`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return [];
    const sessions = await res.json();
    SESSIONS_CACHE = sessions;
    return sessions;
  } catch (err) { return []; }
}

async function completeSession(sessionId, rating) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const body = rating ? { rating } : {};
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      const idx = SESSIONS_CACHE.findIndex(s => s.id === sessionId);
      if (idx !== -1) SESSIONS_CACHE[idx] = data.session;
      await initData();
    }
    return data;
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function confirmSession(sessionId) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/confirm`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    if (data.success) {
      const idx = SESSIONS_CACHE.findIndex(s => s.id === sessionId);
      if (idx !== -1) SESSIONS_CACHE[idx] = data.session;
    }
    return data;
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function declineSession(sessionId) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/decline`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    if (data.success) {
      const idx = SESSIONS_CACHE.findIndex(s => s.id === sessionId);
      if (idx !== -1) SESSIONS_CACHE[idx] = data.session;
    }
    return data;
  } catch (err) { return { success: false, message: "Server error" }; }
}

// ── Study Room API ────────────────────────────────────────────
async function createStudyRoom(data) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function fetchStudyRooms() {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/rooms`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) { return []; }
}

async function joinStudyRoom(roomId) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    return await res.json();
  } catch (err) { return { success: false, message: "Server error" }; }
}

async function leaveStudyRoom(roomId) {
  try {
    const token = sessionStorage.getItem("inai_user_token") || "";
    const res = await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    return await res.json();
  } catch (err) { return { success: false, message: "Server error" }; }
}
function formatTimeUntil(timestamp) {
  if (!timestamp) return "Flexible";
  const diff = timestamp - Date.now();
  if (diff <= 0) return "Started";
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Starting in ${days}d ${hours % 24}h`;
  if (hours > 0) return `Starting in ${hours}h ${mins % 60}m`;
  if (mins > 0) return `Starting in ${mins}m`;
  return "Starting soon";
}

function setSession(user) {
  sessionStorage.setItem("inai_current_user", JSON.stringify(user));
  sessionStorage.setItem("inai_session_time", Date.now());
  try { updateLoginStreak(); } catch(e) {}
}
function getSession() {
  const time = sessionStorage.getItem("inai_session_time");
  if (time && Date.now() - parseInt(time) > 28800000) { // 8 hours
    clearSession("expired");
    return null;
  }
  const data = sessionStorage.getItem("inai_current_user");
  return data ? JSON.parse(data) : null;
}
function clearSession(reason) {
  if (reason === "expired") {
    sessionStorage.setItem("inai_session_expired", "1");
  }
  sessionStorage.removeItem("inai_current_user");
  sessionStorage.removeItem("inai_session_time");
  sessionStorage.removeItem("inai_user_token");
  sessionStorage.removeItem("inai_admin_token");
  sessionStorage.removeItem("inai_admin_auth");
}
