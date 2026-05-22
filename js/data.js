// ============================================================
// data.js — INAI Data API Client
// Connects to the Node.js/Express Backend on localhost:5000
// ============================================================

const API_BASE = "http://localhost:5000/api";
let USERS_CACHE = [];
let REQUESTS_CACHE = [];

// ── Initialize from MongoDB ───────────────────────────────────
async function initData() {
  try {
    const [uRes, rRes] = await Promise.all([
      fetch(`${API_BASE}/users`),
      fetch(`${API_BASE}/requests`)
    ]);
    if (!uRes.ok || !rRes.ok) throw new Error("Failed to fetch from server");
    
    USERS_CACHE = await uRes.json();
    REQUESTS_CACHE = await rRes.json();
    console.log("[INAI] Data loaded from MongoDB:", USERS_CACHE.length, "users");
  } catch (err) {
    console.error("[INAI] Failed to connect to MongoDB Backend:", err);
    // Fallback for UI testing if server is off
    console.warn("Using empty cache as fallback.");
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
function isMutuallyConnected(userA, userB) {
  return REQUESTS_CACHE.some(r =>
    r.status === "accepted" &&
    ((r.from === userA && r.to === userB) ||
     (r.from === userB && r.to === userA))
  );
}
function requestAlreadySent(fromId, toId) {
  return REQUESTS_CACHE.some(r =>
    r.from === fromId && r.to === toId && r.status === "pending"
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
    return await res.json();
  } catch (err) {
    return { success: false, message: "Server error" };
  }
}

async function resetPassword(payload) {
  try {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
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
    return await res.json();
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
    if (data.success) USERS_CACHE.push(data.user);
    return data;
  } catch (err) {
    return { success: false, message: "Server error" };
  }
}

async function updateUser(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestObj)
    });
    REQUESTS_CACHE.push(requestObj);
    return true;
  } catch (err) {
    return false;
  }
}

async function updateRequest(requestId, status) {
  try {
    const updatedAt = Date.now();
    await fetch(`${API_BASE}/requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, updatedAt })
    });
    const idx = REQUESTS_CACHE.findIndex(r => r.id === requestId);
    if (idx !== -1) Object.assign(REQUESTS_CACHE[idx], { status, updatedAt });
    return true;
  } catch (err) {
    return false;
  }
}

async function deleteUserAPI(userId) {
  try {
    const adminPassword = sessionStorage.getItem("inai_admin_password") || "";
    const adminHeaders = { "x-admin-password": adminPassword };
    await fetch(`${API_BASE}/requests/user/${userId}`, { method: "DELETE", headers: adminHeaders });
    const res = await fetch(`${API_BASE}/users/${userId}`, { method: "DELETE", headers: adminHeaders });
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

// ── Session helpers ───────────────────────────────────────────
function setSession(user) {
  sessionStorage.setItem("inai_current_user", JSON.stringify(user));
  sessionStorage.setItem("inai_session_time", Date.now());
}
function getSession() {
  const time = sessionStorage.getItem("inai_session_time");
  if (time && Date.now() - parseInt(time) > 3600000) { // 1 hour
    clearSession();
    return null;
  }
  const data = sessionStorage.getItem("inai_current_user");
  return data ? JSON.parse(data) : null;
}
function clearSession() {
  sessionStorage.removeItem("inai_current_user");
  sessionStorage.removeItem("inai_session_time");
}
