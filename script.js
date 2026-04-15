/**
 * script.js – CardioPulse AI Heart Disease Risk Predictor
 * -------------------------------------------------------
 * Handles:
 *   1. Form submission → JSON → POST /predict
 *   2. Animated SVG gauge + percentage counter
 *   3. Risk-level badge colouring
 *   4. Dynamic detail cards
 *   5. Loading state + error display
 */

// ── Constants ──────────────────────────────────────────
const PREDICT_URL = "/predict";

const GAUGE_CIRCUMFERENCE = 251.2;    // half-circle arc length (π × r where r=80)
const GAUGE_ROTATION_RANGE = 180;     // degrees

// ── DOM refs ────────────────────────────────────────────
const form          = document.getElementById("predict-form");
const predictBtn    = document.getElementById("predict-btn");
const resultPanel   = document.getElementById("result-panel");
const resultWaiting = document.getElementById("result-waiting");
const errorPanel    = document.getElementById("error-panel");
const errorMsg      = document.getElementById("error-msg");
const resultPct     = document.getElementById("result-pct");
const resultBadge   = document.getElementById("result-badge");
const gaugeFill     = document.getElementById("gauge-fill");
const gaugeNeedle   = document.getElementById("gauge-needle");
const metabolicEl   = document.getElementById("metabolic-score");
const bpEl          = document.getElementById("bp-assessment");

// ── Helpers ─────────────────────────────────────────────

/**
 * Toggle loading state of the Predict button.
 */
function setLoading(isLoading) {
  if (isLoading) {
    predictBtn.classList.add("loading");
    predictBtn.disabled = true;
  } else {
    predictBtn.classList.remove("loading");
    predictBtn.disabled = false;
  }
}

/**
 * Show or hide the error panel.
 */
function showError(message) {
  if (message) {
    errorMsg.textContent = message;
    errorPanel.hidden = false;
  } else {
    errorPanel.hidden = true;
  }
}

/**
 * Animate the SVG gauge to the given percentage.
 */
function animateGauge(pct) {
  const ratio = pct / 100;
  const offset = GAUGE_CIRCUMFERENCE * (1 - ratio);
  gaugeFill.style.strokeDashoffset = offset.toFixed(2);

  const angle = -90 + ratio * GAUGE_ROTATION_RANGE;
  gaugeNeedle.style.transform = `rotate(${angle}deg)`;

  // Colour by risk tier
  if (pct < 30) {
    gaugeFill.style.stroke = "#22c55e";
  } else if (pct < 60) {
    gaugeFill.style.stroke = "#f59e0b";
  } else {
    gaugeFill.style.stroke = "#ef4444";
  }
}

/**
 * Animate percentage counter from 0 to target.
 */
function animateCounter(target, duration = 1200) {
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = target * ease;
    resultPct.textContent = current.toFixed(1) + "%";
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Map risk level to badge class and label.
 */
function applyBadge(riskLevel) {
  const map = {
    "Low":      { cls: "low",  label: "✔ Low Risk" },
    "Moderate": { cls: "mod",  label: "⚡ Moderate Risk" },
    "High":     { cls: "high", label: "✖ High Risk" },
  };
  const info = map[riskLevel] || { cls: "mod", label: riskLevel };
  resultBadge.className = `result-badge ${info.cls}`;
  resultBadge.textContent = info.label;
}

/**
 * Update detail cards based on risk percentage.
 */
function updateDetails(pct) {
  // Metabolic score
  if (pct < 30) {
    metabolicEl.textContent = "Healthy Range";
  } else if (pct < 60) {
    metabolicEl.textContent = "Borderline Elevated";
  } else {
    metabolicEl.textContent = "Critical Range";
  }

  // BP assessment
  if (pct < 30) {
    bpEl.textContent = "Stable";
  } else if (pct < 60) {
    bpEl.textContent = "Requires Monitoring";
  } else {
    bpEl.textContent = "Immediate Review Needed";
  }
}

/**
 * Read all form fields and return a plain JS object.
 */
function collectFormData() {
  const fields = [
    "patient_name", "patient_phone",
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalch", "exang", "oldpeak", "slope", "ca", "thal",
  ];

  const payload = {};
  for (const field of fields) {
    const el  = document.getElementById(field);
    const val = el ? el.value.trim() : "";
    if (val !== "") {
      payload[field] = val;
    }
  }
  return payload;
}

// ── Main Event Listener ──────────────────────────────────
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Hide previous results / errors
  resultPanel.hidden = true;
  if (resultWaiting) resultWaiting.hidden = false;
  showError(null);

  // Validate required fields
  const required = ["patient_name", "age", "sex", "cp"];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      const labelText = el?.labels?.[0]?.textContent?.trim() || id;
      showError(`Please fill in the required field: "${labelText}"`);
      el?.focus();
      return;
    }
  }

  const payload = collectFormData();
  setLoading(true);

  try {
    const response = await fetch(PREDICT_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      let errText = `Server error (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error) errText = errData.error;
      } catch { /* ignore parse error */ }
      throw new Error(errText);
    }

    const data = await response.json();

    const pct       = parseFloat(data.probability);
    const riskLevel = data.risk_level || (pct < 30 ? "Low" : pct < 60 ? "Moderate" : "High");

    // Hide waiting, show result
    if (resultWaiting) resultWaiting.hidden = true;
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Animate
    animateGauge(pct);
    animateCounter(pct, 1200);
    applyBadge(riskLevel);
    updateDetails(pct);

    // Refresh patient history
    loadHistory();

  } catch (err) {
    showError(err.message || "Unable to reach the prediction server. Is Flask running?");
  } finally {
    setLoading(false);
  }
});

// ── Navbar scroll effect + active link highlighting ──────
const navLinks = document.querySelectorAll(".nav-link");
const sections = [
  { id: "hero", link: navLinks[0] },
  { id: "patient-history-section", link: navLinks[1] },
  { id: "risk-factors-section", link: navLinks[2] },
  { id: "guidelines-section", link: navLinks[3] },
];

function updateActiveNav() {
  const navbar = document.getElementById("navbar");
  const scrollY = window.scrollY;

  // Navbar background
  if (scrollY > 20) {
    navbar.style.background = "rgba(8, 14, 30, 0.92)";
    navbar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)";
  } else {
    navbar.style.background = "rgba(8, 14, 30, 0.75)";
    navbar.style.boxShadow = "none";
  }

  // Active link based on scroll position
  let currentSection = sections[0];
  for (const sec of sections) {
    const el = document.getElementById(sec.id);
    if (el && el.getBoundingClientRect().top <= 120) {
      currentSection = sec;
    }
  }

  navLinks.forEach(link => link.classList.remove("active"));
  if (currentSection.link) {
    currentSection.link.classList.add("active");
  }
}

window.addEventListener("scroll", updateActiveNav);

// ── Smooth scroll for nav links ──────────────────────────
navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

// ── Fade-in animation on scroll ──────────────────────────
const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

document.querySelectorAll(".info-section").forEach(section => {
  section.style.opacity = "0";
  section.style.transform = "translateY(24px)";
  section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  fadeObserver.observe(section);
});

// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// Authentication & Patient History Module
// ══════════════════════════════════════════════════════════

let isAuthenticated = false;

// DOM refs — History
const historyTbody   = document.getElementById("history-tbody");
const historyEmpty   = document.getElementById("history-empty");
const historyTable   = document.getElementById("history-table");
const historySearch  = document.getElementById("history-search");
const btnRefresh     = document.getElementById("btn-refresh-history");
const statTotal      = document.getElementById("stat-total");
const statLow        = document.getElementById("stat-low");
const statMod        = document.getElementById("stat-mod");
const statHigh       = document.getElementById("stat-high");

// DOM refs — Auth
const lockOverlay    = document.getElementById("lock-overlay");
const loginModal     = document.getElementById("login-modal");
const loginForm      = document.getElementById("login-form");
const loginError     = document.getElementById("login-error");
const loginErrorMsg  = document.getElementById("login-error-msg");
const btnLoginTrigger = document.getElementById("btn-login-trigger");
const btnLogout      = document.getElementById("btn-logout");
const modalClose     = document.getElementById("modal-close");

let allPatients = [];

// ── Auth State Management ─────────────────────────────────

function setAuthState(authenticated) {
  isAuthenticated = authenticated;
  if (authenticated) {
    lockOverlay.classList.add("hidden");
    btnLogout.hidden = false;
    loadHistory();
  } else {
    lockOverlay.classList.remove("hidden");
    btnLogout.hidden = true;
    if (historyTbody) historyTbody.innerHTML = "";
    if (historyTable) historyTable.hidden = true;
    if (historyEmpty) historyEmpty.hidden = true;
    allPatients = [];
    statTotal.textContent = "0";
    statLow.textContent = "0";
    statMod.textContent = "0";
    statHigh.textContent = "0";
  }
}

async function checkSession() {
  try {
    const res = await fetch("/auth/status");
    if (res.ok) {
      const data = await res.json();
      setAuthState(data.authenticated === true);
    } else {
      setAuthState(false);
    }
  } catch {
    setAuthState(false);
  }
}

// ── Login Modal ───────────────────────────────────────────

if (btnLoginTrigger) {
  btnLoginTrigger.addEventListener("click", () => {
    loginModal.hidden = false;
    loginError.hidden = true;
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("login-username").focus();
  });
}

if (modalClose) {
  modalClose.addEventListener("click", () => { loginModal.hidden = true; });
}

if (loginModal) {
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) loginModal.hidden = true;
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && loginModal && !loginModal.hidden) {
    loginModal.hidden = true;
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      loginErrorMsg.textContent = "Please enter both username and password.";
      loginError.hidden = false;
      return;
    }

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        loginModal.hidden = true;
        setAuthState(true);
      } else {
        loginErrorMsg.textContent = data.error || "Invalid username or password.";
        loginError.hidden = false;
        document.getElementById("login-password").value = "";
        document.getElementById("login-password").focus();
      }
    } catch {
      loginErrorMsg.textContent = "Unable to connect to server.";
      loginError.hidden = false;
    }
  });
}

// ── Logout ────────────────────────────────────────────────

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try { await fetch("/auth/logout", { method: "POST" }); } catch {}
    setAuthState(false);
  });
}

// ── Patient History (protected) ───────────────────────────

async function loadHistory() {
  if (!isAuthenticated) return;
  try {
    const res = await fetch("/patients");
    if (res.status === 401) { setAuthState(false); return; }
    if (!res.ok) return;
    const data = await res.json();
    allPatients = data.patients || [];
    renderHistory(allPatients);
  } catch {}
}

function renderHistory(patients) {
  statTotal.textContent = patients.length;
  statLow.textContent   = patients.filter(p => p.risk_level === "Low").length;
  statMod.textContent   = patients.filter(p => p.risk_level === "Moderate").length;
  statHigh.textContent  = patients.filter(p => p.risk_level === "High").length;

  if (patients.length === 0) {
    historyTable.hidden = true;
    historyEmpty.hidden = false;
    return;
  }
  historyTable.hidden = false;
  historyEmpty.hidden = true;

  historyTbody.innerHTML = patients.map(p => {
    const badgeCls = p.risk_level === "Low" ? "low" : p.risk_level === "High" ? "high" : "mod";
    const date = p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    }) : "\u2014";
    return `
      <tr>
        <td class="patient-name-cell">${escapeHtml(p.patient_name || "\u2014")}</td>
        <td>${p.age ?? "\u2014"}</td>
        <td>${p.sex || "\u2014"}</td>
        <td>${p.trestbps ?? "\u2014"}</td>
        <td>${p.chol ?? "\u2014"}</td>
        <td>${p.thalch ?? "\u2014"}</td>
        <td><strong>${p.probability ?? "\u2014"}%</strong></td>
        <td><span class="table-badge ${badgeCls}">${p.risk_level || "\u2014"}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn-delete-row" onclick="deletePatient(${p.id})" title="Delete record">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function deletePatient(id) {
  if (!confirm("Delete this patient record?")) return;
  try {
    const res = await fetch(`/patients/${id}`, { method: "DELETE" });
    if (res.ok) loadHistory();
  } catch { alert("Failed to delete record."); }
}

if (historySearch) {
  historySearch.addEventListener("input", () => {
    const query = historySearch.value.toLowerCase().trim();
    if (!query) { renderHistory(allPatients); return; }
    const filtered = allPatients.filter(p =>
      (p.patient_name || "").toLowerCase().includes(query)
    );
    renderHistory(filtered);
  });
}

if (btnRefresh) {
  btnRefresh.addEventListener("click", loadHistory);
}

// Check session on page load
checkSession();
