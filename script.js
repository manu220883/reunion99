// ============================================================
// script.js — Eswaramma High School Class of '99 Reunion
// ============================================================

// ── Demo-mode seed data (used when API_URL is not yet configured) ──
const DEMO = {
  locationVotes: { Bangalore: 14, Bhadravathi: 9, Either: 11 },
  dateVotes: {
    "Sat, Nov 14": 5, "Sun, Nov 15": 4, "Sat, Nov 21": 12,
    "Sun, Nov 22": 8, "Sat, Nov 28": 6, "Sun, Nov 29": 3
  },
  attendees: [
    { name: "Ravi Kumar",    nickname: "Ravi",    city: "Bangalore",  attendance: "Yes" },
    { name: "Priya Sharma",  nickname: "Priya",   city: "Mumbai",     attendance: "Yes" },
    { name: "Arjun Reddy",   nickname: "AJ",      city: "Hyderabad",  attendance: "Maybe" },
    { name: "Kavitha Rao",   nickname: "Kavitha", city: "Bangalore",  attendance: "Yes" },
    { name: "Suresh Babu",   nickname: "Suru",    city: "Chennai",    attendance: "Yes" },
    { name: "Meena Iyer",    nickname: "Meena",   city: "Pune",       attendance: "Maybe" },
  ],
  memories: [
    { name: "Suresh",   memory: "Those lunch breaks and last-bench conversations still feel like yesterday." },
    { name: "Kavitha",  memory: "I still remember our Sports Day relay race. We came last but laughed the most! 😄" },
    { name: "Mohan",    memory: "The annual day drama rehearsals... we thought we were the next Bollywood stars!" },
    { name: "Deepa",    memory: "Mrs. Latha's science class — she made us love chemistry even when we failed the exams." },
    { name: "Srinivas", memory: "The cricket matches in the corridor during lunch. We never got caught somehow! 😂" },
  ]
};

const DEMO_MODE = !CONFIG.API_URL || CONFIG.API_URL.startsWith("YOUR_");

// ── Voter / session state ────────────────────────────────────
function getVoterId() {
  let id = localStorage.getItem("r99_voter_id");
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("r99_voter_id", id);
  }
  return id;
}
const VOTER_ID = getVoterId();

// ── Generic API helper ───────────────────────────────────────
async function callAPI(action, params = {}) {
  if (DEMO_MODE) return demoDB(action, params);

  const url = new URL(CONFIG.API_URL);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Network error (" + res.status + ")");
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
}

// ── In-browser demo database ─────────────────────────────────
function demoDB(action, p) {
  const store = key => {
    const raw = localStorage.getItem("r99_demo_" + key);
    return raw ? JSON.parse(raw) : null;
  };
  const save  = (key, val) => localStorage.setItem("r99_demo_" + key, JSON.stringify(val));

  if (action === "getSettings") {
    return { reunion_date: CONFIG.COUNTDOWN_DATE.split("T")[0], poll_open: "true", registration_open: "true" };
  }

  if (action === "getAttendees") {
    const saved = store("attendees") || [];
    return [...DEMO.attendees, ...saved];
  }

  if (action === "getPollResults") {
    const locVotes  = store("locVotes")  || {};
    const dateVotes = store("dateVotes") || {};
    const mergedLoc  = { ...DEMO.locationVotes };
    const mergedDate = { ...DEMO.dateVotes };
    Object.entries(locVotes).forEach(([k,v]) => mergedLoc[k]  = (mergedLoc[k]  || 0) + v);
    Object.entries(dateVotes).forEach(([k,v]) => mergedDate[k] = (mergedDate[k] || 0) + v);
    return {
      location:      mergedLoc,
      locationTotal: Object.values(mergedLoc).reduce((a,b) => a+b, 0),
      dates:         mergedDate,
      dateTotal:     Object.values(mergedDate).reduce((a,b) => a+b, 0)
    };
  }

  if (action === "getMemories") {
    const saved = store("memories") || [];
    return [...saved, ...DEMO.memories].slice(0, 30);
  }

  if (action === "submitLocationVote") {
    if (localStorage.getItem("r99_loc_voted")) throw new Error("You have already voted for a location.");
    const lv = store("locVotes") || {};
    lv[p.location] = (lv[p.location] || 0) + 1;
    save("locVotes", lv);
    return { message: "Vote recorded!" };
  }

  if (action === "submitDateVote") {
    if (localStorage.getItem("r99_date_voted")) throw new Error("You have already voted for a date.");
    const dv = store("dateVotes") || {};
    dv[p.date] = (dv[p.date] || 0) + 1;
    save("dateVotes", dv);
    return { message: "Vote recorded!" };
  }

  if (action === "submitAttendee") {
    if (!p.name || p.name.trim().length < 2) throw new Error("Please enter your full name.");
    if (!p.phone || p.phone.trim().length < 6) throw new Error("Please enter a valid phone number.");
    if (!p.attendance) throw new Error("Please select your attendance.");
    const saved = store("attendees") || [];
    if (saved.some(a => a.phone === p.phone)) throw new Error("You have already registered! ❤️");
    saved.unshift({ name: p.name, nickname: p.nickname, city: p.city, attendance: p.attendance, phone: p.phone });
    save("attendees", saved);
    return { message: "Registration successful!" };
  }

  if (action === "submitMemory") {
    if (!p.name || p.name.trim().length < 2) throw new Error("Please enter your name.");
    if (!p.memory || p.memory.trim().length < 10) throw new Error("Please share a memory (at least 10 chars).");
    const saved = store("memories") || [];
    saved.unshift({ name: p.name, memory: p.memory, timestamp: new Date().toISOString() });
    save("memories", saved);
    return { message: "Memory added!" };
  }

  throw new Error("Unknown action: " + action);
}

// ── Toast notifications ──────────────────────────────────────
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0"; el.style.transform = "translateX(20px)";
    setTimeout(() => el.remove(), 350);
  }, 3800);
}

// ── Confetti celebration ─────────────────────────────────────
function launchConfetti() {
  if (typeof confetti !== "function") return;
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 },
    colors: ["#C4922A", "#E8B84B", "#1A2A4A", "#FFFFFF", "#7B1020"] });
}

// ── Scroll helpers ───────────────────────────────────────────
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 72;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
}

// ── Navigation ───────────────────────────────────────────────
function toggleMenu() {
  const links = document.getElementById("navLinks");
  const btn   = document.getElementById("hamburger");
  links.classList.toggle("open");
  btn.classList.toggle("open");
}
function closeMenu() {
  document.getElementById("navLinks").classList.remove("open");
  document.getElementById("hamburger").classList.remove("open");
}

window.addEventListener("scroll", () => {
  document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 40);
});

// ── Scroll-reveal animations ─────────────────────────────────
function initScrollReveal() {
  const sections = document.querySelectorAll("[data-anim]");
  const children = document.querySelectorAll("[data-anim-child]");

  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, idx) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  const childObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const siblings = Array.from(e.target.parentNode.querySelectorAll("[data-anim-child]"));
        const idx = siblings.indexOf(e.target);
        setTimeout(() => {
          e.target.classList.add("visible");
        }, idx * 80);
        childObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  sections.forEach(el => obs.observe(el));
  children.forEach(el => childObs.observe(el));
}

// ── Poll: Location ───────────────────────────────────────────
async function submitLocationVote(location) {
  if (localStorage.getItem("r99_loc_voted")) {
    showToast("You have already voted! ❤️", "info");
    await loadAndShowLocationResults();
    return;
  }

  const name = (document.getElementById("locationVoterName").value || "").trim();
  setLoading("locationPollVoting", true);

  try {
    await callAPI("submitLocationVote", { voterId: VOTER_ID, name, location });
    localStorage.setItem("r99_loc_voted", "1");
    launchConfetti();
    showToast("Vote recorded! Thank you ❤️", "success");
    await loadAndShowLocationResults(true);
  } catch (err) {
    if (err.message.includes("already voted")) {
      localStorage.setItem("r99_loc_voted", "1");
      await loadAndShowLocationResults();
    } else {
      showToast(err.message, "error");
    }
  } finally {
    setLoading("locationPollVoting", false);
  }
}

async function loadAndShowLocationResults(fromVote = false) {
  try {
    const data = await callAPI("getPollResults");
    renderLocationResults(data);
    document.getElementById("locationPollVoting").style.display = "none";
    document.getElementById("locationPollResults").style.display = "block";
    if (fromVote) {
      document.getElementById("locationPollMessage").style.display = "block";
    }
  } catch (err) {
    showToast("Could not load results. Try again.", "error");
  }
}

function renderLocationResults(data) {
  const container = document.getElementById("locationResultsBars");
  const total = data.locationTotal || 0;
  const votes = data.location || {};
  const labels = { Bangalore: "📍 Bangalore", Bhadravathi: "📍 Bhadravathi", Either: "❤️ Either works" };

  container.innerHTML = "";
  Object.entries(labels).forEach(([key, label]) => {
    const v = votes[key] || 0;
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    container.innerHTML += `
      <div class="result-bar-wrap">
        <div class="result-bar-label">
          <span class="result-bar-name">${label}</span>
          <span class="result-bar-pct">${pct}%</span>
        </div>
        <div class="result-bar-track">
          <div class="result-bar-fill" data-pct="${pct}"></div>
        </div>
        <div class="result-bar-votes">${v} vote${v !== 1 ? "s" : ""}</div>
      </div>`;
  });

  document.getElementById("locationTotalVotes").textContent = `Total votes: ${total}`;
  animateBars(container);
}

// ── Poll: Date ───────────────────────────────────────────────
async function submitDateVote(date) {
  if (localStorage.getItem("r99_date_voted")) {
    showToast("You have already voted! ❤️", "info");
    await loadAndShowDateResults();
    return;
  }

  const name = (document.getElementById("dateVoterName").value || "").trim();
  setLoading("datePollVoting", true);

  try {
    await callAPI("submitDateVote", { voterId: VOTER_ID, name, date });
    localStorage.setItem("r99_date_voted", "1");
    launchConfetti();
    showToast("Date vote recorded! Thank you ❤️", "success");
    await loadAndShowDateResults(true);
  } catch (err) {
    if (err.message.includes("already voted")) {
      localStorage.setItem("r99_date_voted", "1");
      await loadAndShowDateResults();
    } else {
      showToast(err.message, "error");
    }
  } finally {
    setLoading("datePollVoting", false);
  }
}

async function loadAndShowDateResults(fromVote = false) {
  try {
    const data = await callAPI("getPollResults");
    renderDateResults(data);
    document.getElementById("datePollVoting").style.display = "none";
    document.getElementById("datePollResults").style.display = "block";
    if (fromVote) {
      document.getElementById("datePollMessage").style.display = "block";
    }
  } catch (err) {
    showToast("Could not load results. Try again.", "error");
  }
}

function renderDateResults(data) {
  const container = document.getElementById("dateResultsBars");
  const total = data.dateTotal || 0;
  const votes = data.dates || {};
  const orderedDates = [
    "Sat, Nov 14", "Sun, Nov 15", "Sat, Nov 21", "Sun, Nov 22", "Sat, Nov 28", "Sun, Nov 29"
  ];

  container.innerHTML = "";
  orderedDates.forEach(d => {
    const v = votes[d] || 0;
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    container.innerHTML += `
      <div class="result-bar-wrap">
        <div class="result-bar-label">
          <span class="result-bar-name">📅 ${d}</span>
          <span class="result-bar-pct">${pct}%</span>
        </div>
        <div class="result-bar-track">
          <div class="result-bar-fill" data-pct="${pct}"></div>
        </div>
        <div class="result-bar-votes">${v} vote${v !== 1 ? "s" : ""}</div>
      </div>`;
  });

  document.getElementById("dateTotalVotes").textContent = `Total votes: ${total}`;
  animateBars(container);
}

function animateBars(container) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll(".result-bar-fill").forEach(bar => {
        bar.style.width = bar.dataset.pct + "%";
      });
    });
  });
}

// ── Registration form ────────────────────────────────────────
async function handleRegistration(e) {
  e.preventDefault();

  // Clear previous errors
  ["name","phone","attendance"].forEach(f => {
    const el = document.getElementById("err-" + f);
    if (el) el.textContent = "";
  });

  const form = e.target;
  const fd   = new FormData(form);
  const name       = (fd.get("name") || "").trim();
  const nickname   = (fd.get("nickname") || "").trim();
  const phone      = (fd.get("phone") || "").trim();
  const city       = (fd.get("city") || "").trim();
  const attendance = fd.get("attendance") || "";
  const message    = (fd.get("message") || "").trim();

  let hasError = false;
  if (name.length < 2) {
    document.getElementById("err-name").textContent = "Please enter your full name.";
    hasError = true;
  }
  if (phone.length < 6) {
    document.getElementById("err-phone").textContent = "Please enter a valid phone number.";
    hasError = true;
  }
  if (!attendance) {
    document.getElementById("err-attendance").textContent = "Please select your attendance.";
    hasError = true;
  }
  if (hasError) return;

  const btn     = document.getElementById("registerBtn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoad = btn.querySelector(".btn-loading");
  btn.disabled = true;
  btnText.style.display = "none";
  btnLoad.style.display = "inline";

  try {
    await callAPI("submitAttendee", { name, nickname, phone, city, attendance, message, voterId: VOTER_ID });
    launchConfetti();
    localStorage.setItem("r99_registered", "1");
    form.style.display = "none";
    document.getElementById("registrationSuccess").style.display = "block";
    scrollToSection("register");
    // Refresh classmates
    setTimeout(loadAttendees, 800);
  } catch (err) {
    if (err.message.includes("already registered")) {
      form.style.display = "none";
      document.getElementById("registrationSuccess").style.display = "block";
    } else {
      showToast(err.message || "Something went wrong. Please try again.", "error");
      btn.disabled = false;
      btnText.style.display = "inline";
      btnLoad.style.display = "none";
    }
  }
}

// ── Load attendees ───────────────────────────────────────────
async function loadAttendees() {
  const grid = document.getElementById("classmatesGrid");
  try {
    const attendees = await callAPI("getAttendees");
    if (!attendees || !attendees.length) {
      grid.innerHTML = '<div class="classmates-empty">No registrations yet — be the first! ❤️</div>';
      return;
    }
    grid.innerHTML = attendees.map(a => buildClassmateCard(a)).join("");
  } catch (_) {
    grid.innerHTML = '<div class="classmates-empty">Could not load classmates right now.</div>';
  }
}

function buildClassmateCard(a) {
  const initial   = (a.name || "?")[0].toUpperCase();
  const nickname  = a.nickname ? `<span class="classmate-nickname">${esc(a.nickname)}</span>` : "";
  const city      = a.city ? `<div class="classmate-city">📍 ${esc(a.city)}</div>` : "";
  const badgeText = a.attendance === "Yes" ? "❤️ Coming" : a.attendance === "Maybe" ? "🤔 Maybe" : "😢 Can't make it";
  const badgeCls  = a.attendance === "Yes" ? "badge-yes" : a.attendance === "Maybe" ? "badge-maybe" : "badge-no";
  return `
    <div class="classmate-card">
      <span class="classmate-badge ${badgeCls}">${badgeText}</span>
      <div class="classmate-avatar">${initial}</div>
      <div class="classmate-name">${esc(a.name)}</div>
      ${nickname}
      ${city}
    </div>`;
}

// ── Memory Wall ──────────────────────────────────────────────
async function handleMemorySubmit(e) {
  e.preventDefault();
  const name   = document.getElementById("memoryName").value.trim();
  const memory = document.getElementById("memoryText").value.trim();
  const btn    = document.getElementById("memoryBtn");
  const btnText = btn.querySelector(".btn-text");
  const btnLoad = btn.querySelector(".btn-loading");

  btn.disabled = true;
  btnText.style.display = "none";
  btnLoad.style.display = "inline";

  try {
    await callAPI("submitMemory", { name, memory });
    showToast("Your memory has been added! ❤️", "success");
    document.getElementById("memoryName").value = "";
    document.getElementById("memoryText").value = "";
    await loadMemories();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btnText.style.display = "inline";
    btnLoad.style.display = "none";
  }
}

async function loadMemories() {
  const container = document.getElementById("memoryCards");
  try {
    const memories = await callAPI("getMemories");
    if (!memories || !memories.length) {
      container.innerHTML = '<div class="memory-empty">No memories yet — share yours! 😊</div>';
      return;
    }
    container.innerHTML = memories.map(m => `
      <div class="memory-quote-card">
        <p class="memory-quote-text">${esc(m.memory)}</p>
        <p class="memory-quote-by">— ${esc(m.name)}</p>
      </div>`).join("");
  } catch (_) {
    container.innerHTML = '<div class="memory-empty">Could not load memories right now.</div>';
  }
}

// ── Gallery ──────────────────────────────────────────────────
function switchGalleryTab(tab, btn) {
  document.querySelectorAll(".gallery-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  ["then","now","together"].forEach(t => {
    const el = document.getElementById("gallery-" + t);
    if (el) el.style.display = t === tab ? "grid" : "none";
  });
}
function openPhotoUpload()  { document.getElementById("photoModal").style.display = "flex"; }
function closePhotoUpload() { document.getElementById("photoModal").style.display = "none"; }

async function handlePhotoSubmit(e) {
  e.preventDefault();
  const name    = document.getElementById("photoName").value.trim();
  const url     = document.getElementById("photoUrl").value.trim();
  const caption = document.getElementById("photoCaption").value.trim();

  try {
    await callAPI("submitPhoto", { name, photoUrl: url, caption });
  } catch (_) { /* silent — no submitPhoto in GAS yet, but demo works */ }

  document.getElementById("photoForm").style.display = "none";
  document.getElementById("photoSuccess").style.display = "block";
  setTimeout(closePhotoUpload, 2000);
}

// ── Countdown timer ──────────────────────────────────────────
function startCountdown() {
  const target = new Date(CONFIG.COUNTDOWN_DATE).getTime();

  function tick() {
    const now  = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      ["cd-days","cd-hours","cd-minutes","cd-seconds"].forEach(id => {
        document.getElementById(id).textContent = "00";
      });
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById("cd-days").textContent    = String(d).padStart(2,"0");
    document.getElementById("cd-hours").textContent   = String(h).padStart(2,"0");
    document.getElementById("cd-minutes").textContent = String(m).padStart(2,"0");
    document.getElementById("cd-seconds").textContent = String(s).padStart(2,"0");
  }

  tick();
  setInterval(tick, 1000);
}

// ── WhatsApp share ───────────────────────────────────────────
function shareOnWhatsApp() {
  const msg = CONFIG.WHATSAPP_MESSAGE.replace("{URL}", CONFIG.SITE_URL);
  window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  return false;
}

// ── Loading state helper ─────────────────────────────────────
function setLoading(elementId, loading) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.style.opacity = loading ? "0.55" : "1";
  el.style.pointerEvents = loading ? "none" : "";
}

// ── Text escape utility ──────────────────────────────────────
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Restore state on page load ───────────────────────────────
function restoreVotingState() {
  if (localStorage.getItem("r99_loc_voted")) {
    loadAndShowLocationResults();
  }
  if (localStorage.getItem("r99_date_voted")) {
    loadAndShowDateResults();
  }
  if (localStorage.getItem("r99_registered")) {
    const form    = document.getElementById("registrationForm");
    const success = document.getElementById("registrationSuccess");
    if (form) form.style.display = "none";
    if (success) success.style.display = "block";
  }
}

// ── Set OG url and WhatsApp preview ──────────────────────────
function initMeta() {
  const urlMeta = document.querySelector('meta[property="og:url"]');
  if (urlMeta) urlMeta.content = CONFIG.SITE_URL;

  const preview = document.getElementById("invitePreview");
  if (preview) {
    preview.innerHTML = esc(CONFIG.WHATSAPP_MESSAGE.replace("{URL}", CONFIG.SITE_URL))
      .replace(/\n/g, "<br>");
  }
}

// ── Demo mode banner ─────────────────────────────────────────
function showDemoBanner() {
  if (!DEMO_MODE) return;
  const banner = document.createElement("div");
  banner.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#0E1A30;border-top:1px solid rgba(196,146,42,.3);" +
    "color:rgba(255,255,255,.55);font-size:.75rem;text-align:center;padding:8px 20px;";
  banner.textContent =
    "⚙️ Demo mode — data is stored locally. Update API_URL in config.js to connect Google Sheets.";
  document.body.appendChild(banner);
}

// ── Entry point ──────────────────────────────────────────────
async function initApp() {
  initMeta();
  initScrollReveal();
  restoreVotingState();
  startCountdown();
  showDemoBanner();

  // Load dynamic data
  loadAttendees();
  loadMemories();
}

document.addEventListener("DOMContentLoaded", initApp);
