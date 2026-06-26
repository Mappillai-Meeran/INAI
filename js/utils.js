// ============================================================
// utils.js — INAI Shared Utility Functions
// Used by every other JS file in the project.
// ============================================================

// ── XSS Sanitization Utility ──────────────────────────────────
function sanitize(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Guard: redirect to login if not logged in ─────────────────
function requireLogin() {
  const expired = sessionStorage.getItem("inai_session_expired");
  if (expired) {
    sessionStorage.removeItem("inai_session_expired");
    sessionStorage.setItem("inai_show_expired_toast", "1");
  }
  const user = getSession();
  if (!user) {
    window.location.href = "register.html?tab=login";
    return null;
  }
  return user;
}

// ── Guard: redirect to dashboard if already logged in ────────
function requireGuest() {
  const user = getSession();
  if (user) {
    window.location.href = "dashboard.html";
  }
}

// ── Generate a unique ID ──────────────────────────────────────
function generateId(prefix = "id") {
  return prefix + "_" + crypto.randomUUID();
}

// ── Get avatar background color based on name ────────────────
const AVATAR_COLORS = [
  "#6C3FC7", "#00C9E4", "#22C55E", "#F5C542",
  "#EF4444", "#3B82F6", "#EC4899", "#F97316"
];
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length];
}

// ── Get initials from name ────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Render an avatar circle ───────────────────────────────────
function renderAvatar(name, size = 44) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  return `
    <div style="
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:${Math.round(size * 0.38)}px;
      font-weight:700; color:#fff;
      flex-shrink:0;
      font-family:'Space Grotesk', sans-serif;
    ">${sanitize(initials)}</div>
  `;
}

// ── Render an anonymous avatar (for anonymized discovery) ────
function renderAnonymousAvatar(displayInitials, isRevealed, size = 44) {
  if (isRevealed) {
    return renderAvatar(displayInitials === "?" ? "??" : displayInitials, size);
  }
  return `
    <div style="
      width:${size}px; height:${size}px;
      background:rgba(255,255,255,0.05);
      border:2px dashed var(--border);
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:${Math.round(size * 0.4)}px;
      font-weight:700; color:var(--muted);
      flex-shrink:0;
      font-family:'Space Grotesk', sans-serif;
    ">\u{1F575}</div>
  `;
}

// ── Skill level badge ─────────────────────────────────────────
const LEVEL_COLORS = {
  "Expert": { bg: "#14532d", text: "#22C55E", border: "#22C55E" },
  "Good": { bg: "#1e3a5f", text: "#60A5FA", border: "#3B82F6" },
  "Basic": { bg: "#3b2f00", text: "#F5C542", border: "#F5C542" }
};

function skillBadge(subject, level = null) {
  const cleanSubj = sanitize(subject);
  if (level && LEVEL_COLORS[level]) {
    const c = LEVEL_COLORS[level];
    return `<span style="
      background:${c.bg}; color:${c.text};
      border:1px solid ${c.border};
      padding:2px 8px; border-radius:12px;
      font-size:11px; font-weight:600;
      display:inline-block; margin:2px;
    ">${cleanSubj} · ${level}</span>`;
  }
  return `<span style="
    background:#1A2560; color:#00C9E4;
    border:1px solid #2D3A8C;
    padding:2px 8px; border-radius:12px;
    font-size:11px; font-weight:600;
    display:inline-block; margin:2px;
  ">${cleanSubj}</span>`;
}

// ── Free Now badge ────────────────────────────────────────────
function freeNowBadge(isFree) {
  if (isFree) {
    return `<span style="
      background:#14532d; color:#22C55E;
      border:1px solid #22C55E;
      padding:2px 10px; border-radius:12px;
      font-size:11px; font-weight:700;
      display:inline-flex; align-items:center; gap:4px;
    "><span style="width:7px;height:7px;background:#22C55E;border-radius:50%;display:inline-block;"></span> Free Now</span>`;
  }
  return `<span style="
    background:#1f1f1f; color:#9CA3AF;
    border:1px solid #374151;
    padding:2px 10px; border-radius:12px;
    font-size:11px; font-weight:600;
    display:inline-flex; align-items:center; gap:4px;
  "><span style="width:7px;height:7px;background:#6B7280;border-radius:50%;display:inline-block;"></span> Busy</span>`;
}

// ── Match % score ring ────────────────────────────────────────
function scoreRing(score) {
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F5C542" : "#9CA3AF";
  return `
    <div style="
      width:52px; height:52px; border-radius:50%;
      background: conic-gradient(${color} ${score * 3.6}deg, #1A2560 0deg);
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    ">
      <div style="
        width:38px; height:38px; border-radius:50%;
        background:#0F1B4C;
        display:flex; align-items:center; justify-content:center;
        font-size:11px; font-weight:800; color:${color};
      ">${score}%</div>
    </div>`;
}

// ── Toast notification ────────────────────────────────────────
function showToast(message, type = "success") {
  // Remove existing toast
  const existing = document.getElementById("inai-toast");
  if (existing) existing.remove();

  const colors = {
    success: { bg: "#14532d", border: "#22C55E", text: "#22C55E" },
    error: { bg: "#450a0a", border: "#EF4444", text: "#EF4444" },
    info: { bg: "#0c1a3a", border: "#00C9E4", text: "#00C9E4" },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.id = "inai-toast";
  toast.innerHTML = sanitize(message);
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
    padding:12px 24px; border-radius:10px;
    font-size:13px; font-weight:600; font-family:'Space Grotesk', sans-serif;
    z-index:9999; box-shadow:0 8px 24px rgba(0,0,0,0.4);
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Confetti burst ──────────────────────────────────────────────
function burstConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = ["#6C3FC7","#00C9E4","#22C55E","#F5C542","#EF4444","#3B82F6","#EC4899"];
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 6,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * 360,
    rv: (Math.random() - 0.5) * 8,
    gravity: 0.12,
    drag: 0.98
  }));
  let frame = 0;
  const maxFrames = 180;
  function draw() {
    if (frame++ > maxFrames) { canvas.remove(); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.vx *= p.drag;
      p.rot += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Confirm modal ─────────────────────────────────────────────
function showConfirm(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center;
    z-index:9998; font-family:'Space Grotesk', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="
      background:#0F1B4C; border:1px solid #2D3A8C;
      border-radius:16px; padding:28px 32px; max-width:380px; width:90%;
      text-align:center;
    ">
      <p style="color:#E8EAF6; font-size:15px; margin:0 0 20px;">${sanitize(message)}</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="confirm-yes" style="
          background:#6C3FC7; color:#fff; border:none;
          padding:10px 24px; border-radius:8px;
          font-size:13px; font-weight:700; cursor:pointer;
        ">Yes, confirm</button>
        <button id="confirm-no" style="
          background:transparent; color:#9CA3AF;
          border:1px solid #374151;
          padding:10px 24px; border-radius:8px;
          font-size:13px; cursor:pointer;
        ">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("confirm-yes").onclick = () => { overlay.remove(); onConfirm(); };
  document.getElementById("confirm-no").onclick = () => overlay.remove();
}

// ── Relative time ─────────────────────────────────────────────
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Page loader ───────────────────────────────────────────────
function showLoader() {
  const loader = document.createElement("div");
  loader.id = "inai-loader";
  loader.style.cssText = `
    position:fixed; inset:0; background:#0A1128;
    display:flex; align-items:center; justify-content:center;
    z-index:99999;
  `;
  loader.innerHTML = `
    <div style="text-align:center;">
      <div style="
        width:48px; height:48px; border-radius:50%;
        border:3px solid #1A2560; border-top-color:#6C3FC7;
        animation: spin 0.8s linear infinite; margin:0 auto 16px;
      "></div>
      <p style="color:#6C3FC7; font-size:14px; font-weight:700;
        font-family:'Space Grotesk',sans-serif; letter-spacing:2px;">INAI</p>
    </div>`;
  document.body.appendChild(loader);
}

function hideLoader() {
  const loader = document.getElementById("inai-loader");
  if (loader) loader.remove();
}

// ── Shared CSS keyframes (injected once) ──────────────────────
function injectBaseStyles() {
  if (document.getElementById("inai-base-styles")) return;
  const style = document.createElement("style");
  style.id = "inai-base-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:    #0B0D17;
      --dark:    #05050A;
      --indigo:  #131524;
      --violet:  #6366F1;
      --cyan:    #06B6D4;
      --gold:    #FBBF24;
      --green:   #10B981;
      --red:     #EF4444;
      --white:   #FFFFFF;
      --offwht:  #F8FAFC;
      --muted:   #94A3B8;
      --border:  #1E293B;
    }

    body {
      background-color: var(--dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
      background-attachment: fixed;
      background-size: 200% 200%;
      animation: gradientMove 15s ease infinite alternate;
      color: var(--offwht);
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh;
    }

    @keyframes gradientMove {
      0% { background-position: 0% 0%; }
      50% { background-position: 100% 100%; }
      100% { background-position: 0% 100%; }
    }

    h1, h2, h3, h4, h5 {
      font-family: 'Space Grotesk', sans-serif;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity:0; }
      to   { transform: translateX(-50%) translateY(0);   opacity:1; }
    }
    @keyframes fadeIn {
      from { opacity:0; transform: translateY(12px); }
      to   { opacity:1; transform: translateY(0); }
    }
    @keyframes fadeInUp {
      from { opacity:0; transform: translateY(20px) scale(0.96); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse {
      0%, 100% { opacity:1; }
      50%       { opacity:0.5; }
    }

    .inai-card {
      background: rgba(19, 21, 36, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s ease;
    }
    .inai-card:hover {
      transform: translateY(-2px);
      border-color: #3f3f46;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }

    .inai-btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 6px; padding: 10px 20px;
      border-radius: 8px; border: 1px solid transparent;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s ease;
      text-decoration: none;
    }
    .inai-btn-primary {
      background: var(--offwht); color: var(--dark);
      border-color: var(--offwht);
    }
    .inai-btn-primary:hover {
      background: var(--white); transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255,255,255,0.1);
    }
    .inai-btn-cyan {
      background: var(--dark); color: var(--offwht);
      border: 1px solid var(--border);
    }
    .inai-btn-cyan:hover {
      border-color: #3f3f46; background: #1f1f22;
    }
    .inai-btn-outline {
      background: transparent; color: var(--muted);
      border: 1px solid var(--border);
    }
    .inai-btn-outline:hover {
      border-color: var(--offwht); color: var(--offwht);
    }
    .inai-btn-ghost {
      background: transparent; color: var(--offwht); padding: 6px 12px;
    }
    .inai-btn-ghost:hover { background: rgba(255,255,255,0.05); }

    .inai-input {
      width: 100%; padding: 11px 14px;
      background: var(--dark); border: 1px solid var(--border);
      border-radius: 8px; color: var(--offwht);
      font-family: 'DM Sans', sans-serif; font-size: 13.5px;
      transition: all 0.2s ease;
      outline: none;
    }
    .inai-input:focus {
      border-color: var(--violet);
      background: #111111;
      box-shadow: 0 0 0 1px var(--violet);
    }
    .inai-input::placeholder { color: var(--muted); }

    .inai-label {
      display: block; font-size: 12px; font-weight: 600;
      color: var(--muted); margin-bottom: 5px;
      font-family: 'Space Grotesk', sans-serif;
      letter-spacing: 0.5px; text-transform: uppercase;
    }

    .inai-select {
      width: 100%; padding: 11px 14px;
      background: var(--dark); border: 1px solid var(--border);
      border-radius: 8px; color: var(--offwht);
      font-family: 'DM Sans', sans-serif; font-size: 13.5px;
      outline: none; cursor: pointer;
      transition: all 0.2s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
    }
    .inai-select:focus { 
      border-color: var(--violet); 
      background-color: #111111;
      box-shadow: 0 0 0 1px var(--violet);
    }

    /* Navbar */
    .inai-nav {
      background: rgba(10, 10, 10, 0.65);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 100px;
      padding: 0 24px; height: 60px;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 16px; z-index: 100;
      margin: 16px auto 32px;
      max-width: 1200px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    }
    .inai-nav-logo {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 22px; font-weight: 800;
      color: var(--white); letter-spacing: -0.5px;
    }
    .inai-nav-logo span { color: var(--cyan); }

    /* Page container */
    .inai-page {
      max-width: 900px; margin: 0 auto;
      padding: 24px 20px;
      animation: fadeIn 0.4s ease;
    }

    /* Section heading */
    .inai-section-title {
      font-size: 20px; font-weight: 800;
      color: var(--white); margin-bottom: 4px;
    }
    .inai-section-sub {
      font-size: 13px; color: var(--muted); margin-bottom: 20px;
    }

    /* Tab buttons */
    .inai-tabs {
      display: flex; gap: 6px;
      background: var(--indigo); border-radius: 12px;
      padding: 5px; margin-bottom: 20px;
    }
    .inai-tab {
      flex: 1; padding: 9px 12px; border-radius: 8px;
      border: none; background: transparent;
      color: var(--muted); font-family: 'Space Grotesk', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .inai-tab.active {
      background: var(--violet); color: #fff;
      box-shadow: 0 2px 8px rgba(108,63,199,0.4);
    }

    /* Divider */
    .inai-divider {
      height: 1px; background: var(--border); margin: 20px 0;
    }

    /* Empty state */
    .inai-empty {
      text-align: center; padding: 48px 20px;
      color: var(--muted); font-size: 14px;
    }
    .inai-empty-icon {
      font-size: 40px; margin-bottom: 12px; opacity: 0.4;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--dark); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--violet); }
  `;
  document.head.appendChild(style);
}

// ── Render shared navbar ──────────────────────────────────────
function renderNav(activePage = "") {
  const user = getSession();
  const pendingCount = user ? getIncomingRequests(user.id).filter(r => r.status === "pending").length : 0;
  const sessionPendingCount = user && typeof getIncomingSessionProposals === "function"
    ? getIncomingSessionProposals(user.id).length : 0;

  const navLinks = [
    { href: "dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "match.html", label: "Find Match", key: "match" },
    { href: "requests.html", label: "Requests", key: "requests", badgeId: "nav-requests-badge", badgeCount: pendingCount },
    { href: "study-rooms.html", label: "Rooms", key: "rooms" },
    { href: "sessions.html", label: "Sessions", key: "sessions", badgeId: "nav-sessions-badge", badgeCount: sessionPendingCount },
    { href: "quiz.html", label: "Brain Match", key: "quiz" },
    { href: "hostel-map.html", label: "Hostel Map", key: "map" },
    { href: "profile.html", label: "Profile", key: "profile" },
  ];

  const links = navLinks.map(l => {
    const badgeHtml = l.badgeId ? `<span id="${l.badgeId}" style="
          background:var(--red); color:#fff;
          border-radius:50%; width:18px; height:18px;
          font-size:10px; font-weight:700;
          display:${l.badgeCount > 0 ? "inline-flex" : "none"}; align-items:center; justify-content:center;
          margin-left:4px;">${l.badgeCount || ""}</span>` : "";

    return `
      <a href="${l.href}" style="
        color: ${activePage === l.key ? "var(--cyan)" : "var(--muted)"};
        font-family: 'Space Grotesk', sans-serif;
        font-size: 13px; font-weight: 600;
        text-decoration: none; padding: 6px 12px;
        border-radius: 8px;
        background: ${activePage === l.key ? "rgba(0,201,228,0.08)" : "transparent"};
        transition: all 0.2s;
        display: inline-flex; align-items: center;
      "
      onmouseover="this.style.color='var(--offwht)'"
      onmouseout="this.style.color='${activePage === l.key ? "var(--cyan)" : "var(--muted)"}'">
        ${l.label}${badgeHtml}
      </a>`;
  }).join("");

  const freeToggleBtn = user ? `
    <button id="nav-free-toggle" onclick="toggleNavFreeNow()" class="inai-btn" style="
      padding:5px 12px; font-size:11px; font-weight:700; cursor:pointer;
      background:${user.freeNow ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)"};
      color:${user.freeNow ? "var(--green)" : "var(--muted)"};
      border:1px solid ${user.freeNow ? "rgba(16,185,129,0.35)" : "var(--border)"};
    ">${user.freeNow ? "🟢 Free" : "🔴 Busy"}</button>` : "";

  return `
    <nav class="inai-nav">
      <div class="inai-nav-top">
        <div class="inai-nav-logo" style="display:flex;align-items:center;gap:8px;height:34px;">
          <img src="assets/logo-dark-bg-removed.png" alt="INAI Logo" style="height:34px;max-width:100%;object-fit:contain;flex-shrink:0;" />
        </div>
        <button type="button" class="nav-hamburger" onclick="toggleNavMenu()" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="nav-links" id="nav-links-panel">
        ${links}
      </div>
      <div class="inai-nav-actions">
        ${user ? `
          <span style="font-size:12px;color:var(--muted);">Hi, ${sanitize(user.name.split(" ")[0])}</span>
          ${freeToggleBtn}
          <button onclick="handleLogout()" class="inai-btn inai-btn-outline" style="padding:6px 14px;font-size:12px;">
            Logout
          </button>` : `
          <a href="register.html" class="inai-btn inai-btn-primary" style="padding:7px 18px;">
            Get Started
          </a>`}
      </div>
    </nav>`;
}

function toggleNavMenu() {
  const panel = document.getElementById("nav-links-panel");
  const btn = document.querySelector(".nav-hamburger");
  if (!panel) return;
  panel.classList.toggle("nav-open");
  if (btn) btn.classList.toggle("nav-open");
}

async function toggleNavFreeNow() {
  const user = getSession();
  if (!user) return;
  const updated = !user.freeNow;
  const success = await updateUser(user.id, { freeNow: updated });
  if (success) {
    showToast(updated ? "You are now Free Now!" : "Status set to Busy", "success");
    const btn = document.getElementById("nav-free-toggle");
    const fresh = getSession();
    if (btn && fresh) {
      btn.textContent = fresh.freeNow ? "🟢 Free" : "🔴 Busy";
      btn.style.background = fresh.freeNow ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)";
      btn.style.color = fresh.freeNow ? "var(--green)" : "var(--muted)";
      btn.style.borderColor = fresh.freeNow ? "rgba(16,185,129,0.35)" : "var(--border)";
    }
    const dashBtn = document.querySelector("button[onclick='toggleFreeNow()']");
    if (dashBtn && fresh) {
      dashBtn.textContent = fresh.freeNow ? "\u{1F7E2} I'm Free Now" : "\u{1F534} I'm Busy";
      dashBtn.style.background = fresh.freeNow ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.05)";
      dashBtn.style.color = fresh.freeNow ? "var(--green)" : "var(--muted)";
      dashBtn.style.borderColor = fresh.freeNow ? "rgba(16,185,129,0.3)" : "var(--border)";
    }
  } else {
    showToast("Failed to update status", "error");
  }
}

// ── Logout ────────────────────────────────────────────────────
function handleLogout() {
  showConfirm("Are you sure you want to logout?", () => {
    clearSession();
    showToast("Logged out successfully", "info");
    setTimeout(() => window.location.href = "register.html?tab=login", 800);
  });
}

// ── Floating Notification Bubble ──────────────────────────────
function checkNotifications() {
  const user = getSession();
  if (!user) return;
  const pending = getIncomingRequests(user.id).filter(r => r.status === "pending").length;
  if (pending > 0) {
    // Only show on non-requests pages
    if (window.location.pathname.includes("requests.html")) return;

    const dismissedAt = sessionStorage.getItem("inai_bubble_dismissed_at");
    if (dismissedAt) return; // Suppress for this session

    const container = document.createElement("div");
    container.id = "inai-notification-bubble";
    container.style.cssText = `
      position:fixed; bottom:24px; right:24px;
      background:var(--violet); color:#fff;
      padding:12px 20px; border-radius:30px;
      font-size:13px; font-weight:700; font-family:'Space Grotesk', sans-serif;
      box-shadow:0 8px 24px rgba(108,63,199,0.4);
      z-index:9999; animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
      display:flex; align-items:center; gap:12px; transition: transform 0.2s;
    `;
    
    const link = document.createElement("a");
    link.href = "requests.html";
    link.innerHTML = `\u{1F514} You have ${pending} pending request${pending > 1 ? 's' : ''}!`;
    link.style.cssText = "color:#fff; text-decoration:none; display:flex; align-items:center; gap:8px;";
    link.onmouseover = () => container.style.transform = "scale(1.05)";
    link.onmouseout = () => container.style.transform = "scale(1)";

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.7); font-size:18px; font-weight:700; cursor:pointer; padding:0 4px; line-height:1;";
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      sessionStorage.setItem("inai_bubble_dismissed_at", Date.now());
      container.remove();
    };

    container.appendChild(link);
    container.appendChild(closeBtn);
    
    if (!document.getElementById("bubble-keyframe")) {
      const style = document.createElement("style");
      style.id = "bubble-keyframe";
      style.textContent = `
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(container);
  }
}

// ── Session Expiry Warnings ──────────────────────────────────
function checkSessionExpiry() {
  const time = sessionStorage.getItem("inai_session_time");
  if (!time) return;
  const elapsed = Date.now() - parseInt(time);
  const timeLeft = 3600000 - elapsed;
  if (timeLeft <= 0) return;
  const warningTime = 55 * 60 * 1000; // 55 mins
  if (elapsed >= warningTime) {
    showToast("Your session is about to expire. Please save your work.", "info");
  } else {
    setTimeout(() => {
      showToast("Your session is about to expire. Please save your work.", "info");
    }, warningTime - elapsed);
  }
}

// ── Lightweight background polling ──────────────────────────
function startRequestPolling() {
  setInterval(async () => {
    const user = getSession();
    if (!user) return;
    try {
      const userToken = sessionStorage.getItem("inai_user_token") || "";
      const adminToken = sessionStorage.getItem("inai_admin_token") || "";
      const token = userToken || adminToken;
      const headers = {};
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
      const [reqRes, sessRes] = await Promise.all([
        fetch(`${API_BASE}/requests`, { headers }),
        fetch(`${API_BASE}/sessions`, { headers })
      ]);
      if (reqRes.ok) {
        const reqs = await reqRes.json();
        REQUESTS_CACHE = reqs;
        const pendingCount = reqs.filter(r => r.to === user.id && r.status === "pending").length;
        const badgeEl = document.getElementById("nav-requests-badge");
        if (badgeEl) {
          badgeEl.textContent = pendingCount || "";
          badgeEl.style.display = pendingCount > 0 ? "inline-flex" : "none";
        }
        const bubble = document.getElementById("inai-notification-bubble");
        if (pendingCount === 0 && bubble) {
          bubble.remove();
        } else if (pendingCount > 0 && !bubble && !sessionStorage.getItem("inai_bubble_dismissed_at")) {
          checkNotifications();
        }
      }
      if (sessRes.ok) {
        const sessions = await sessRes.json();
        SESSIONS_CACHE = sessions;
        const sessionPending = sessions.filter(s => s.targetId === user.id && s.status === "pending").length;
        const sessBadge = document.getElementById("nav-sessions-badge");
        if (sessBadge) {
          sessBadge.textContent = sessionPending || "";
          sessBadge.style.display = sessionPending > 0 ? "inline-flex" : "none";
        }
        if (sessionPending > 0 && !window.location.pathname.includes("sessions.html")) {
          checkSessionNotifications(sessionPending);
        }
      }
    } catch (err) {
      console.warn("Polling failed", err);
    }
  }, 60000);
}

function checkSessionNotifications(pending) {
  if (document.getElementById("inai-session-bubble")) return;
  if (sessionStorage.getItem("inai_session_bubble_dismissed")) return;

  const container = document.createElement("div");
  container.id = "inai-session-bubble";
  container.style.cssText = `
    position:fixed; bottom:24px; right:24px;
    background:var(--cyan); color:#0A1128;
    padding:12px 20px; border-radius:30px;
    font-size:13px; font-weight:700; font-family:'Space Grotesk', sans-serif;
    box-shadow:0 8px 24px rgba(6,182,212,0.35);
    z-index:9998; display:flex; align-items:center; gap:12px;
  `;
  const link = document.createElement("a");
  link.href = "sessions.html";
  link.textContent = `\u{1F4C5} ${pending} session proposal${pending > 1 ? "s" : ""} waiting!`;
  link.style.cssText = "color:#0A1128;text-decoration:none;font-weight:700;";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = "background:transparent;border:none;color:rgba(0,0,0,0.5);font-size:18px;font-weight:700;cursor:pointer;";
  closeBtn.onclick = (e) => {
    e.preventDefault();
    sessionStorage.setItem("inai_session_bubble_dismissed", "1");
    container.remove();
  };
  container.appendChild(link);
  container.appendChild(closeBtn);
  document.body.appendChild(container);
}

// ── Show inline field error ───────────────────────────────────
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return showToast(message, "error");

  field.style.borderColor = "var(--red)";
  field.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.2)";

  let err = field.parentElement.querySelector(".field-error");
  if (!err) {
    err = document.createElement("p");
    err.className = "field-error";
    err.style.cssText = "color:var(--red); font-size:11px; margin-top:4px; font-weight:600;";
    field.parentElement.appendChild(err);
  }
  err.textContent = message;

  field.addEventListener("input", () => {
    field.style.borderColor = "";
    field.style.boxShadow = "";
    if (err) err.remove();
  }, { once: true });
}

// Auto-inject base styles and check notifications when utils.js loads
document.addEventListener("DOMContentLoaded", () => {
  injectBaseStyles();
  if (sessionStorage.getItem("inai_show_expired_toast")) {
    sessionStorage.removeItem("inai_show_expired_toast");
    setTimeout(() => showToast("Your session expired after 1 hour. Please log in again.", "info"), 300);
  }
  checkNotifications();
  checkSessionExpiry();
  startRequestPolling();
  if (typeof fetchMySessions === "function") {
    fetchMySessions().then(sessions => {
      const user = getSession();
      if (user && sessions.length) {
        const pending = sessions.filter(s => s.targetId === user.id && s.status === "pending").length;
        if (pending > 0) checkSessionNotifications(pending);
      }
    }).catch(() => {});
  }
});
