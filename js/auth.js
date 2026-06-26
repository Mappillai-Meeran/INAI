// ============================================================
// auth.js — INAI Authentication Logic
// Handles: Register, Login, Form Validation
// ============================================================

// ── Register a new user ───────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();

  // Collect form values
  const name = document.getElementById("reg-name").value.trim();
  const password = document.getElementById("reg-password").value;
  const gender = document.getElementById("reg-gender").value;
  const hostel = document.getElementById("reg-hostel").value.trim();
  const block = document.getElementById("reg-block").value.trim();
  const room = document.getElementById("reg-room").value.trim();
  const year = document.getElementById("reg-year").value.trim();
  const branch = document.getElementById("reg-branch").value.trim();
  const state = document.getElementById("reg-state").value.trim();
  const language = document.getElementById("reg-language").value.trim();

  // Collect strong skills with levels
  const strongSkills = [];
  document.querySelectorAll(".strong-skill-row").forEach(row => {
    const subj = row.querySelector(".skill-subject").value.trim();
    const level = row.querySelector(".skill-level").value;
    if (subj) strongSkills.push({ subject: subj, level });
  });

  // Collect need help skills
  const needHelpStr = document.getElementById("reg-need-help")?.value.trim();
  const needHelpSkills = needHelpStr ? needHelpStr.split(',').map(s => s.trim()).filter(s => s) : [];

  // Lifestyle
  const sleepSchedule = document.getElementById("reg-sleep").value;
  const studyStyle = document.getElementById("reg-study").value;

  // ── Validation ──────────────────────────────────────────────
  if (!name) return showFieldError("reg-name", "Name is required");
  if (name.length < 3) return showFieldError("reg-name", "Name too short (min 3 characters)");
  if (name.length > 50) return showFieldError("reg-name", "Name too long (max 50 characters)");
  
  if (!password) return showFieldError("reg-password", "Password is required");
  if (password.length < 6) return showFieldError("reg-password", "Use at least 6 characters");
  if (!gender) return showFieldError("reg-gender", "Select your gender");
  if (!hostel) return showFieldError("reg-hostel", "Enter your hostel name");
  if (!block) return showFieldError("reg-block", "Enter your block");
  
  if (!room) return showFieldError("reg-room", "Enter your room number");
  if (!/^[A-Za-z0-9\-]{1,10}$/.test(room)) {
    return showFieldError("reg-room", "Room must be alphanumeric (dashes allowed, max 10 chars)");
  }
  
  if (!year) return showFieldError("reg-year", "Enter your year");
  if (!branch) return showFieldError("reg-branch", "Enter your branch");
  if (!state) return showFieldError("reg-state", "Enter your state");
  if (strongSkills.length === 0)
    return showToast("Add at least one subject you are strong in", "error");
  if (needHelpSkills.length === 0)
    return showFieldError("reg-need-help", "Select at least one subject you need help in");

  // Build user object
  const newUser = {
    id: generateId("u"),
    name,
    password,
    gender,
    hostel,
    block,
    room,
    year,
    branch,
    strongSkills,
    needHelpSkills,
    state,
    language: language || state,
    freeNow: true,
    lifestyle: { sleepSchedule, studyStyle },
    avatar: getInitials(name),
    bio: "",
    rating: 0,
    ratingCount: 0,
    helpCount: 0,
    joinedAt: Date.now()
  };

  // Save to MongoDB
  if (typeof showLoader === 'function') showLoader();
  let result;
  try {
    result = await saveUser(newUser);
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }
  if (!result.success) {
    return showToast(result.message, "error");
  }

  // Set session and redirect
  setSession(result.user);
  showToast("Welcome to INAI, " + name.split(" ")[0] + "!", "success");
  setTimeout(() => window.location.href = "dashboard.html", 1000);
}

// ── Login an existing user ────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();

  const name = document.getElementById("login-name").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!name) return showFieldError("login-name", "Enter your name");
  if (!password) return showFieldError("login-password", "Enter your password");

  if (typeof showLoader === 'function') showLoader();
  let result;
  try {
    result = await loginUser(name, password);
  } finally {
    if (typeof hideLoader === 'function') hideLoader();
  }

  if (!result.success) {
    return showToast(result.message, "error");
  }

  setSession(result.user);
  showToast("Welcome back, " + result.user.name.split(" ")[0] + "!", "success");
  setTimeout(() => window.location.href = "dashboard.html", 800);
}





function addStrongSkillRow() {
  const container = document.getElementById("strong-skills-container");
  const rows = container.querySelectorAll(".strong-skill-row");
  if (rows.length >= 5) {
    return showToast("Maximum 5 strong subjects allowed", "info");
  }

  const row = document.createElement("div");
  row.className = "strong-skill-row";
  row.style.cssText = "display:flex; gap:8px; margin-bottom:8px; align-items:center;";
  row.innerHTML = `
    <input type="text" class="skill-subject inai-sel" placeholder="e.g. DSA, Python" list="skills-list"
      style="flex:2; padding:11px 14px; background:var(--navy); border:1px solid var(--border); border-radius:10px; color:var(--offwht); font-size:13px; outline:none;" />
    <select class="inai-select skill-level" style="flex:1; padding:11px 14px; background:var(--navy); border:1px solid var(--border); border-radius:10px; color:var(--offwht); font-size:13px; outline:none;">
      <option value="Basic">Basic</option>
      <option value="Good" selected>Good</option>
      <option value="Expert">Expert</option>
    </select>
    <button type="button" onclick="removeSkillRow(this)"
      style="background:transparent; border:1px solid #374151;
        color:var(--red); border-radius:8px; padding:8px 12px;
        cursor:pointer; font-size:14px; flex-shrink:0;">✕</button>
  `;
  container.appendChild(row);
}

function removeSkillRow(btn) {
  const row = btn.closest(".strong-skill-row");
  const container = document.getElementById("strong-skills-container");
  if (container.querySelectorAll(".strong-skill-row").length > 1) {
    row.remove();
  } else {
    showToast("At least one strong subject is required", "error");
  }
}

// ── Toggle between Register and Login tabs ────────────────────
function switchTab(tab) {
  const regForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");
  const forgotForm = document.getElementById("forgot-form");
  const regTab = document.getElementById("tab-register");
  const loginTab = document.getElementById("tab-login");

  if (tab === "register") {
    regForm.style.display = "block";
    loginForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "none";
    regTab.classList.add("active");
    loginTab.classList.remove("active");
  } else if (tab === "login") {
    regForm.style.display = "none";
    loginForm.style.display = "block";
    if (forgotForm) forgotForm.style.display = "none";
    loginTab.classList.add("active");
    regTab.classList.remove("active");
  } else {
    regForm.style.display = "none";
    loginForm.style.display = "none";
    if (forgotForm) forgotForm.style.display = "block";
    loginTab.classList.add("active");
    regTab.classList.remove("active");
  }
}

// ── Build need-help checkboxes ────────────────────────────────
function buildNeedHelpCheckboxes() {
  // Deprecated
}

// ── Check URL for tab switch on load and setup autocomplete ────
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "login") {
    switchTab("login");
  }

  // Setup Skills autocomplete list
  if (!document.getElementById("skills-list")) {
    const dl = document.createElement("datalist");
    dl.id = "skills-list";
    const subjects = ["DSA", "DBMS", "OS", "Python", "Java", "Maths", "Physics", "React", "Node.js", "Web Development", "Machine Learning", "Networks"];
    dl.innerHTML = subjects.map(s => `<option value="${s}"></option>`).join("");
    document.body.appendChild(dl);
  }
});
