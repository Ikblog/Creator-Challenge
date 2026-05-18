const STORAGE_KEY = "consistencyChallengeState";
const ICONS = ["💪", "📚", "🧘", "💧", "🥗", "💻", "✍️", "🌅"];
const MOODS = ["😞", "😐", "🙂", "😊", "🤩"];
const CONTENT_PLATFORMS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "X", "Facebook", "Blog", "Podcast"];
const CONTENT_FORMATS = ["Short video", "Carousel", "Article", "Thread", "Script", "Newsletter", "Story", "Live"];
const CONTENT_STATUSES = ["Idea", "Draft", "Scheduled", "Published"];
const QUOTES = [
  "Small promises, kept daily.",
  "Discipline is self-respect in motion.",
  "Make today easy to be proud of.",
  "A streak is built one ordinary day at a time.",
  "Never stop trying to see good in yourself."
];

let state = loadState();
let activeChallengeId = state.challenges.length ? state.challenges[0].id : null;
let activeTab = "daily";
let selectedDate = toISO(new Date());
let calendarCursor = new Date();
let editingChallengeId = null;

const els = {
  homeView: document.querySelector("#homeView"),
  workspaceView: document.querySelector("#workspaceView"),
  challengeGrid: document.querySelector("#challengeGrid"),
  homeStats: document.querySelector("#homeStats"),
  quoteText: document.querySelector("#quoteText"),
  newChallengeBtn: document.querySelector("#newChallengeBtn"),
  navAddBtn: document.querySelector("#navAddBtn"),
  navAddLabel: document.querySelector("#navAddLabel"),
  backBtn: document.querySelector("#backBtn"),
  themeToggle: document.querySelector("#themeToggle"),
  challengeModal: document.querySelector("#challengeModal"),
  challengeForm: document.querySelector("#challengeForm"),
  challengeModalTitle: document.querySelector("#challengeModalTitle"),
  habitModal: document.querySelector("#habitModal"),
  habitForm: document.querySelector("#habitForm"),
  iconPicker: document.querySelector("#iconPicker"),
  habitIconInput: document.querySelector("#habitIconInput"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceGoal: document.querySelector("#workspaceGoal"),
  workspaceMeta: document.querySelector("#workspaceMeta"),
  workspacePct: document.querySelector("#workspacePct"),
  dailyTab: document.querySelector("#dailyTab"),
  habitsTab: document.querySelector("#habitsTab"),
  createNoteTab: document.querySelector("#createNoteTab"),
  analyticsTab: document.querySelector("#analyticsTab"),
  calendarTab: document.querySelector("#calendarTab"),
  toast: document.querySelector("#toast"),
  celebration: document.querySelector("#celebration"),
  closeCelebration: document.querySelector("#closeCelebration"),
  confetti: document.querySelector("#confettiCanvas")
};

function seedChallenge() {
  const startDate = toISO(new Date());
  return {
    id: createId(),
    name: "30 Days Discipline",
    duration: 30,
    startDate,
    accent: "#7D9A6D",
    goal: "Show up with focus, energy, and patience.",
    habits: [
      { id: createId(), icon: "💧", name: "Drink water", time: "09:00", description: "Start the day hydrated." },
      { id: createId(), icon: "📚", name: "Read 10 pages", time: "20:00", description: "A small daily deposit." },
      { id: createId(), icon: "✍️", name: "Journal reflection", time: "", description: "Write one honest paragraph." }
    ],
    days: {}
  };
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState() {
  const fallback = {
    darkMode: false,
    challenges: [seedChallenge()]
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(saved && saved.challenges ? saved : fallback);
  } catch {
    return normalizeState(fallback);
  }
}

function normalizeState(nextState) {
  const safeState = {
    darkMode: Boolean(nextState.darkMode),
    challenges: Array.isArray(nextState.challenges) ? nextState.challenges : []
  };

  safeState.challenges = safeState.challenges.map(challenge => ({
    id: challenge.id || createId(),
    name: challenge.name || "Untitled Challenge",
    duration: Number(challenge.duration) || 30,
    startDate: challenge.startDate || toISO(new Date()),
    accent: challenge.accent || "#7D9A6D",
    goal: challenge.goal || "",
    habits: Array.isArray(challenge.habits) ? challenge.habits : [],
    days: challenge.days && typeof challenge.days === "object" ? challenge.days : {}
  }));

  return safeState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toISO(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getChallenge() {
  return state.challenges.find(challenge => challenge.id === activeChallengeId);
}

function dayIndex(challenge, iso = selectedDate) {
  return Math.floor((fromISO(iso) - fromISO(challenge.startDate)) / 86400000);
}

function isInChallenge(challenge, iso) {
  const idx = dayIndex(challenge, iso);
  return idx >= 0 && idx < Number(challenge.duration);
}

function createEmptyContent() {
  return {
    platform: CONTENT_PLATFORMS[0],
    format: CONTENT_FORMATS[0],
    status: CONTENT_STATUSES[0],
    title: "",
    hook: "",
    script: "",
    caption: "",
    hashtags: "",
    publishTime: ""
  };
}

function getDay(challenge, iso = selectedDate) {
  if (!challenge.days[iso]) {
    challenge.days[iso] = { completed: [], mood: null, notes: "", content: createEmptyContent() };
  }
  if (!challenge.days[iso].completed) {
    challenge.days[iso].completed = [];
  }
  challenge.days[iso].content = Object.assign(createEmptyContent(), challenge.days[iso].content || {});
  return challenge.days[iso];
}

function getContent(challenge, iso = selectedDate) {
  return getDay(challenge, iso).content;
}

function completionFor(challenge, iso) {
  const habits = challenge.habits.length;
  if (!habits || !isInChallenge(challenge, iso)) return 0;
  const day = challenge.days[iso];
  return Math.round((((day && day.completed && day.completed.length) || 0) / habits) * 100);
}

function completedDayCount(challenge) {
  let total = 0;
  for (let i = 0; i < challenge.duration; i++) {
    if (completionFor(challenge, toISO(addDays(fromISO(challenge.startDate), i))) === 100) total++;
  }
  return total;
}

function overallPct(challenge) {
  return Math.round((completedDayCount(challenge) / challenge.duration) * 100);
}

function streaks(challenge) {
  let current = 0;
  let longest = 0;
  let run = 0;
  const today = toISO(new Date());
  for (let i = 0; i < challenge.duration; i++) {
    const iso = toISO(addDays(fromISO(challenge.startDate), i));
    if (completionFor(challenge, iso) === 100) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    if (iso === today) current = run;
  }
  if (!current) {
    const yesterday = toISO(addDays(new Date(), -1));
    for (let i = 0, runToYesterday = 0; i < challenge.duration; i++) {
      const iso = toISO(addDays(fromISO(challenge.startDate), i));
      runToYesterday = completionFor(challenge, iso) === 100 ? runToYesterday + 1 : 0;
      if (iso === yesterday) current = runToYesterday;
    }
  }
  return { current, longest };
}

function render() {
  document.body.classList.toggle("dark", state.darkMode);
  els.quoteText.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  renderHome();
  renderWorkspace();
  updateBottomNav();
}

function renderHome() {
  const total = state.challenges.length;
  const completed = state.challenges.reduce((sum, c) => sum + completedDayCount(c), 0);
  const best = state.challenges.reduce((max, c) => Math.max(max, streaks(c).current), 0);
  const plannedPosts = state.challenges.reduce((sum, c) => sum + contentCount(c), 0);
  els.homeStats.innerHTML = statCard(total, "Challenges") + statCard(completed, "Days completed") + statCard(best, "Best current streak") + statCard(plannedPosts, "Posts planned");

  els.challengeGrid.innerHTML = "";
  if (!state.challenges.length) {
    els.challengeGrid.innerHTML = `<div class="empty-state"><div><h3>No challenges yet</h3><p>Create a folder and give your next season a shape.</p></div></div>`;
    return;
  }

  state.challenges.forEach(challenge => {
    const pct = overallPct(challenge);
    const card = document.createElement("article");
    card.className = "challenge-card";
    card.style.setProperty("--accent", challenge.accent);
    card.innerHTML = `
      <div>
        <p class="eyebrow">${challenge.duration} days</p>
        <h3>${escapeHTML(challenge.name)}</h3>
        <p class="muted">${escapeHTML(challenge.goal || "A focused consistency folder.")}</p>
      </div>
      <div>
        <div class="progress-line"><span style="width:${pct}%"></span></div>
        <p class="muted">${pct}% complete · ${completedDayCount(challenge)} completed days</p>
      </div>
      <div class="card-actions">
        <button class="primary-button" data-open="${challenge.id}">Open</button>
        <button class="secondary-button" data-edit="${challenge.id}">Edit</button>
        <button class="danger-button" data-delete="${challenge.id}">Delete</button>
      </div>
    `;
    els.challengeGrid.append(card);
  });
}

function statCard(value, label) {
  return `<article class="stat-card"><strong>${value}</strong><span>${label}</span></article>`;
}

function renderWorkspace() {
  const challenge = getChallenge();
  if (!challenge) return;
  const idx = dayIndex(challenge) + 1;
  const pct = overallPct(challenge);
  els.workspaceTitle.textContent = challenge.name;
  els.workspaceGoal.textContent = challenge.goal || "No goal added yet.";
  els.workspaceMeta.textContent = `${formatDate(challenge.startDate)} · ${challenge.duration} day challenge`;
  els.workspacePct.textContent = `${pct}%`;
  document.documentElement.style.setProperty("--primary", challenge.accent);
  renderDaily(challenge, idx);
  renderCreateNote(challenge, idx);
  renderHabits(challenge);
  renderAnalytics(challenge);
  renderCalendar(challenge);
  updateBottomNav();
}

function contentCount(challenge) {
  return Object.values(challenge.days).filter(day => {
    const content = day.content;
    return content && Boolean(content.title || content.hook || content.script || content.caption);
  }).length;
}

function publishedContentCount(challenge) {
  return Object.values(challenge.days).filter(day => day.content && day.content.status === "Published").length;
}

function renderCreateNote(challenge, idx) {
  const outOfRange = !isInChallenge(challenge, selectedDate);
  const content = getContent(challenge);
  const contentStatus = `${content.status || "Idea"} · ${content.platform || CONTENT_PLATFORMS[0]} · ${content.format || CONTENT_FORMATS[0]}`;

  els.createNoteTab.innerHTML = `
    <div class="content-layout">
      <section class="content-editor">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${outOfRange ? "Outside challenge" : `Day ${idx} content`}</p>
            <h3>CreateNote</h3>
          </div>
          <span class="content-status">${escapeHTML(contentStatus)}</span>
        </div>
        <div class="content-tools">
          <button class="secondary-button" data-day-nav="-1">Previous</button>
          <button class="secondary-button" data-today>Today</button>
          <button class="secondary-button" data-day-nav="1">Next</button>
          <button class="secondary-button" data-content-template>Use Template</button>
          <button class="primary-button" data-copy-content>Copy Draft</button>
        </div>
        <div class="content-fields">
          <div class="form-row">
            <label>Platform
              <select data-content-field="platform" ${outOfRange ? "disabled" : ""}>
                ${CONTENT_PLATFORMS.map(platform => `<option ${content.platform === platform ? "selected" : ""}>${platform}</option>`).join("")}
              </select>
            </label>
            <label>Content type
              <select data-content-field="format" ${outOfRange ? "disabled" : ""}>
                ${CONTENT_FORMATS.map(format => `<option ${content.format === format ? "selected" : ""}>${format}</option>`).join("")}
              </select>
            </label>
            <label>Status
              <select data-content-field="status" ${outOfRange ? "disabled" : ""}>
                ${CONTENT_STATUSES.map(status => `<option ${content.status === status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="form-row">
            <label>Post title
              <input data-content-field="title" maxlength="90" value="${escapeHTML(content.title)}" ${outOfRange ? "disabled" : ""} placeholder="Day ${Math.max(idx, 1)}: what I learned about consistency">
            </label>
            <label>Publish time
              <input data-content-field="publishTime" type="time" value="${escapeHTML(content.publishTime)}" ${outOfRange ? "disabled" : ""}>
            </label>
          </div>
          <label>Hook
            <textarea data-content-field="hook" rows="3" ${outOfRange ? "disabled" : ""} placeholder="Open with the idea that stops the scroll.">${escapeHTML(content.hook)}</textarea>
          </label>
          <label>Article or script
            <textarea data-content-field="script" rows="9" ${outOfRange ? "disabled" : ""} placeholder="Write the full article, talking points, reel script, thread, or video outline for this day.">${escapeHTML(content.script)}</textarea>
          </label>
          <label>Caption
            <textarea data-content-field="caption" rows="4" ${outOfRange ? "disabled" : ""} placeholder="Final post copy or social caption.">${escapeHTML(content.caption)}</textarea>
          </label>
          <label>Hashtags / keywords
            <input data-content-field="hashtags" value="${escapeHTML(content.hashtags)}" ${outOfRange ? "disabled" : ""} placeholder="#consistency #creator #discipline">
          </label>
        </div>
      </section>
      <aside class="content-queue">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${challenge.duration} day queue</p>
            <h3>Content plan</h3>
          </div>
        </div>
        <div class="content-day-list">
          ${Array.from({ length: challenge.duration }, (_, i) => renderContentDay(challenge, i)).join("")}
        </div>
      </aside>
    </div>`;
}

function renderContentDay(challenge, index) {
  const iso = toISO(addDays(fromISO(challenge.startDate), index));
  const content = getContent(challenge, iso);
  const hasDraft = Boolean(content.title || content.hook || content.script || content.caption);
  const statusClass = (content.status || "Idea").toLowerCase();
  return `
    <button class="content-day ${iso === selectedDate ? "active" : ""}" data-content-day="${iso}">
      <span class="content-day-number">${index + 1}</span>
      <span>
        <span class="content-day-title">${escapeHTML(content.title || "Untitled post")}</span>
        <span class="content-day-meta">${escapeHTML(content.platform || CONTENT_PLATFORMS[0])} · ${hasDraft ? escapeHTML(content.status || "Idea") : "Empty"}</span>
      </span>
      <span class="status-dot ${statusClass}" aria-hidden="true"></span>
    </button>`;
}

function renderDaily(challenge, idx) {
  const day = getDay(challenge);
  const pct = completionFor(challenge, selectedDate);
  const outOfRange = !isInChallenge(challenge, selectedDate);
  const habitRows = challenge.habits.length
    ? challenge.habits.map(habit => {
      const done = day.completed.includes(habit.id);
      return `
        <label class="habit-check ${done ? "done" : ""}">
          <input type="checkbox" data-toggle-habit="${habit.id}" ${done ? "checked" : ""} ${outOfRange ? "disabled" : ""}>
          <span class="habit-icon">${habit.icon}</span>
          <span>
            <span class="habit-title">${escapeHTML(habit.name)}</span>
            <span class="habit-meta">${habit.time ? habit.time + " · " : ""}${escapeHTML(habit.description || "No description")}</span>
          </span>
        </label>`;
    }).join("")
    : `<div class="empty-state"><div><h3>No habits yet</h3><p>Add habits before tracking this day.</p></div></div>`;

  els.dailyTab.innerHTML = `
    <div class="daily-layout">
      <aside class="day-card">
        <div class="progress-ring" style="--ring:${pct}%"><span>${pct}%</span></div>
        <div>
          <p class="eyebrow">${outOfRange ? "Outside challenge" : `Day ${idx} of ${challenge.duration}`}</p>
          <h3>${formatDate(selectedDate)}</h3>
        </div>
        <div class="day-nav">
          <button class="secondary-button" data-day-nav="-1">Previous</button>
          <button class="secondary-button" data-today>Today</button>
          <button class="secondary-button" data-day-nav="1">Next</button>
        </div>
      </aside>
      <section class="tracker-card">
        <div class="section-heading"><div><p class="eyebrow">Checklist</p><h3>Daily habits</h3></div></div>
        ${habitRows}
        <div>
          <p class="eyebrow">Mood</p>
          <div class="mood-row">${MOODS.map((mood, i) => `<button class="mood-button ${day.mood === i + 1 ? "active" : ""}" data-mood="${i + 1}" ${outOfRange ? "disabled" : ""}>${mood}</button>`).join("")}</div>
        </div>
        <label class="reflection-field">Reflection
          <textarea id="notesInput" rows="5" ${outOfRange ? "disabled" : ""} placeholder="What helped today? What needs gentleness tomorrow?">${escapeHTML(day.notes || "")}</textarea>
        </label>
      </section>
    </div>`;
}

function renderHabits(challenge) {
  els.habitsTab.innerHTML = `
    <div class="habits-toolbar">
      <div><p class="eyebrow">Rituals</p><h3>${challenge.habits.length} habits</h3></div>
      <button class="primary-button" id="addHabitBtn">+ Add Habit</button>
    </div>
    <div class="habits-list">
      ${challenge.habits.length ? challenge.habits.map(habit => `
        <article class="habit-card">
          <span class="habit-icon">${habit.icon}</span>
          <div>
            <h3>${escapeHTML(habit.name)}</h3>
            <p class="muted">${habit.time ? habit.time + " · " : ""}${escapeHTML(habit.description || "No description")}</p>
          </div>
          <button class="danger-button" data-delete-habit="${habit.id}">Delete</button>
        </article>
      `).join("") : `<div class="empty-state"><div><h3>Your habit list is open</h3><p>Add a few clear actions to track every day.</p></div></div>`}
    </div>`;
}

function renderAnalytics(challenge) {
  const pct = overallPct(challenge);
  const streak = streaks(challenge);
  const totalHabitCompletions = Object.values(challenge.days).reduce((sum, day) => sum + ((day.completed && day.completed.length) || 0), 0);
  const score = Math.round((pct * 0.65) + (Math.min(streak.current, 14) / 14 * 35));
  const lastSeven = Array.from({ length: 7 }, (_, i) => toISO(addDays(new Date(), i - 6)));

  els.analyticsTab.innerHTML = `
    <div class="analytics-grid">
      ${statCard(`${pct}%`, "Completion rate")}
      ${statCard(streak.current, "Current streak")}
      ${statCard(streak.longest, "Longest streak")}
      ${statCard(totalHabitCompletions, "Habits completed")}
      ${statCard(contentCount(challenge), "Posts planned")}
      ${statCard(publishedContentCount(challenge), "Posts published")}
    </div>
    <section class="chart-card">
      <div class="section-heading"><div><p class="eyebrow">Last 7 days</p><h3>Weekly progress</h3></div><strong>${score}/100 score</strong></div>
      <div class="bar-chart">
        ${lastSeven.map(iso => `<div class="bar" style="height:${Math.max(12, completionFor(challenge, iso) * 1.55)}%">${completionFor(challenge, iso)}%</div>`).join("")}
      </div>
      <div class="bar-labels">${lastSeven.map(iso => `<span>${fromISO(iso).toLocaleDateString(undefined, { weekday: "short" })}</span>`).join("")}</div>
    </section>
    <section class="heatmap">
      <div><p class="eyebrow">Challenge map</p><h3>Consistency heatmap</h3></div>
      <div class="heatmap-grid">
        ${Array.from({ length: challenge.duration }, (_, i) => {
          const iso = toISO(addDays(fromISO(challenge.startDate), i));
          const val = completionFor(challenge, iso);
          const isFuture = fromISO(iso) > new Date();
          const cls = isFuture ? "future" : val === 100 ? "full" : val > 0 ? "partial" : "missed";
          return `<div class="heat-cell ${cls}" title="${formatDate(iso)} · ${val}%">${val === 100 ? "✓" : i + 1}</div>`;
        }).join("")}
      </div>
    </section>`;
}

function renderCalendar(challenge) {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const today = toISO(new Date());
  els.calendarTab.innerHTML = `
    <section class="calendar">
      <div class="calendar-head">
        <button class="icon-button" data-month-nav="-1" aria-label="Previous month">‹</button>
        <h3>${calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <button class="icon-button" data-month-nav="1" aria-label="Next month">›</button>
      </div>
      <div class="calendar-grid">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => `<div class="weekday">${day}</div>`).join("")}
        ${Array.from({ length: 42 }, (_, i) => {
          const date = addDays(start, i);
          const iso = toISO(date);
          const pct = completionFor(challenge, iso);
          const outside = date.getMonth() !== month ? "outside" : "";
          const status = isInChallenge(challenge, iso) && pct === 100 ? "full" : isInChallenge(challenge, iso) && pct === 0 && date <= new Date() ? "missed" : "";
          return `<button class="calendar-day ${outside} ${status} ${iso === today ? "today" : ""}" data-calendar-day="${iso}">${date.getDate()}</button>`;
        }).join("")}
      </div>
    </section>`;
}

function openWorkspace(id) {
  activeChallengeId = id;
  const challenge = getChallenge();
  selectedDate = isInChallenge(challenge, toISO(new Date())) ? toISO(new Date()) : challenge.startDate;
  calendarCursor = fromISO(selectedDate);
  els.homeView.classList.remove("active");
  els.workspaceView.classList.add("active");
  els.backBtn.classList.remove("hidden");
  updateBottomNav();
  renderWorkspace();
}

function openHome() {
  els.workspaceView.classList.remove("active");
  els.homeView.classList.add("active");
  els.backBtn.classList.add("hidden");
  document.documentElement.style.setProperty("--primary", "#7d9a6d");
  renderHome();
  updateBottomNav();
}

function openChallengeModal(id = null) {
  editingChallengeId = id;
  const challenge = id ? state.challenges.find(c => c.id === id) : null;
  const fields = els.challengeForm.elements;
  els.challengeModalTitle.textContent = challenge ? "Edit challenge" : "Create challenge";
  fields.namedItem("name").value = challenge ? challenge.name : "";
  fields.namedItem("duration").value = challenge ? challenge.duration : 30;
  fields.namedItem("startDate").value = challenge ? challenge.startDate : toISO(new Date());
  fields.namedItem("accent").value = challenge ? challenge.accent : "#7D9A6D";
  fields.namedItem("goal").value = challenge ? challenge.goal : "";
  openModal(els.challengeModal);
}

function openModal(modal) {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function formatDate(iso) {
  return fromISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function notify(message) {
  els.toast.textContent = message;
  els.toast.classList.add("active");
  setTimeout(() => els.toast.classList.remove("active"), 1800);
}

function isHomeActive() {
  return els.homeView.classList.contains("active");
}

function updateBottomNav() {
  document.querySelectorAll("[data-bottom-tab]").forEach(button => {
    button.classList.toggle("active", !isHomeActive() && button.dataset.bottomTab === activeTab);
  });
  document.querySelectorAll("[data-bottom-home]").forEach(button => {
    button.classList.toggle("active", isHomeActive());
  });

  els.navAddLabel.textContent = "Add";
}

function handleMainAdd() {
  if (isHomeActive()) {
    openChallengeModal();
    return;
  }

  if (activeTab === "habits" || activeTab === "daily") {
    openModal(els.habitModal);
    return;
  }

  if (activeTab === "createNote") {
    applyContentTemplate();
    return;
  }

  openChallengeModal();
}

function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {}
}

function celebrate() {
  els.celebration.classList.add("active");
  const canvas = els.confetti;
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const pieces = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    s: 4 + Math.random() * 7,
    vy: 2 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    color: [getComputedStyle(document.body).getPropertyValue("--primary"), "#c39546", "#b56b55"][Math.floor(Math.random() * 3)]
  }));
  let frames = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s * 1.6);
    });
    frames++;
    if (frames < 120) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

function maybeCelebrate(challenge, beforePct) {
  const afterPct = completionFor(challenge, selectedDate);
  if (beforePct < 100 && afterPct === 100 && challenge.habits.length) celebrate();
}

document.addEventListener("click", event => {
  const target = event.target.closest("button, input");
  if (!target) return;
  if (target.dataset.open) openWorkspace(target.dataset.open);
  if (target.dataset.edit) openChallengeModal(target.dataset.edit);
  if (target.dataset.delete) {
    if (confirm("Delete this challenge and all of its tracking data?")) {
      state.challenges = state.challenges.filter(c => c.id !== target.dataset.delete);
      activeChallengeId = state.challenges.length ? state.challenges[0].id : null;
      saveState();
      render();
    }
  }
  if (target.dataset.close) closeModal(document.querySelector(`#${target.dataset.close}`));
  if (target.dataset.dayNav) {
    selectedDate = toISO(addDays(fromISO(selectedDate), Number(target.dataset.dayNav)));
    calendarCursor = fromISO(selectedDate);
    renderWorkspace();
  }
  if (target.dataset.today !== undefined) {
    selectedDate = toISO(new Date());
    calendarCursor = new Date();
    renderWorkspace();
  }
  if (target.dataset.contentDay) {
    selectedDate = target.dataset.contentDay;
    calendarCursor = fromISO(selectedDate);
    renderWorkspace();
  }
  if (target.dataset.contentTemplate !== undefined) {
    applyContentTemplate();
  }
  if (target.dataset.copyContent !== undefined) {
    copyContentDraft();
  }
  if (target.dataset.mood) {
    const challenge = getChallenge();
    getDay(challenge).mood = Number(target.dataset.mood);
    saveState();
    renderWorkspace();
  }
  if (target.dataset.toggleHabit) {
    const challenge = getChallenge();
    const before = completionFor(challenge, selectedDate);
    const day = getDay(challenge);
    const id = target.dataset.toggleHabit;
    if (target.checked && !day.completed.includes(id)) {
      day.completed.push(id);
    }
    if (!target.checked) {
      day.completed = day.completed.filter(item => item !== id);
    }
    saveState();
    playTone();
    maybeCelebrate(challenge, before);
    renderWorkspace();
  }
  if (target.id === "addHabitBtn") openModal(els.habitModal);
  if (target.dataset.deleteHabit) {
    const challenge = getChallenge();
    challenge.habits = challenge.habits.filter(h => h.id !== target.dataset.deleteHabit);
    Object.values(challenge.days).forEach(day => day.completed = (day.completed || []).filter(id => id !== target.dataset.deleteHabit));
    saveState();
    renderWorkspace();
  }
  if (target.dataset.monthNav) {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + Number(target.dataset.monthNav), 1);
    renderCalendar(getChallenge());
  }
  if (target.dataset.calendarDay) {
    selectedDate = target.dataset.calendarDay;
    calendarCursor = fromISO(selectedDate);
    activeTab = "daily";
    switchTab("daily");
  }
  if (target.dataset.bottomHome !== undefined) {
    openHome();
  }
  if (target.dataset.bottomTab) {
    if (isHomeActive() && activeChallengeId) {
      openWorkspace(activeChallengeId);
    }
    switchTab(target.dataset.bottomTab);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "notesInput") {
    const challenge = getChallenge();
    getDay(challenge).notes = event.target.value;
    saveState();
  }
  if (event.target.dataset.contentField) {
    updateContentField(event.target);
  }
});

document.addEventListener("change", event => {
  if (event.target.dataset.contentField) {
    updateContentField(event.target);
    renderWorkspace();
  }
});

function updateContentField(field) {
  const challenge = getChallenge();
  const content = getContent(challenge);
  content[field.dataset.contentField] = field.value;
  saveState();
}

function applyContentTemplate() {
  const challenge = getChallenge();
  const idx = dayIndex(challenge) + 1;
  const content = getContent(challenge);
  if (!content.title) content.title = `Day ${idx}: ${challenge.name}`;
  if (!content.hook) content.hook = `I am on day ${idx} of ${challenge.duration}, and here is the honest lesson from today's consistency work.`;
  if (!content.script) content.script = `1. Start with the challenge: ${challenge.name}\n2. Share the habit or action for day ${idx}\n3. Tell the real lesson, win, or obstacle\n4. Give one practical takeaway\n5. End with a simple question for the audience`;
  if (!content.caption) content.caption = `Day ${idx}/${challenge.duration}. Showing up daily and documenting the process.`;
  if (!content.hashtags) content.hashtags = "#consistency #creator #dailychallenge";
  saveState();
  renderWorkspace();
  notify("CreateNote template added");
}

async function copyContentDraft() {
  const challenge = getChallenge();
  const content = getContent(challenge);
  const draft = [
    content.title,
    content.hook,
    content.script,
    content.caption,
    content.hashtags
  ].filter(Boolean).join("\n\n");

  if (!draft) {
    notify("Nothing to copy yet");
    return;
  }

  try {
    await navigator.clipboard.writeText(draft);
    notify("Draft copied");
  } catch {
    notify("Draft ready to select and copy");
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `${tabName}Tab`));
  renderWorkspace();
  updateBottomNav();
}

els.newChallengeBtn.addEventListener("click", () => openChallengeModal());
els.navAddBtn.addEventListener("click", handleMainAdd);
els.backBtn.addEventListener("click", openHome);
els.themeToggle.addEventListener("click", () => {
  state.darkMode = !state.darkMode;
  saveState();
  render();
});
els.closeCelebration.addEventListener("click", () => els.celebration.classList.remove("active"));
els.celebration.addEventListener("click", event => {
  if (event.target === els.celebration) els.celebration.classList.remove("active");
});

els.challengeForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(els.challengeForm);
  const payload = {
    name: data.get("name").trim(),
    duration: Number(data.get("duration")),
    startDate: data.get("startDate"),
    accent: data.get("accent"),
    goal: data.get("goal").trim()
  };
  if (editingChallengeId) {
    const challenge = state.challenges.find(c => c.id === editingChallengeId);
    Object.assign(challenge, payload);
  } else {
    state.challenges.unshift(Object.assign({ id: createId(), habits: [], days: {} }, payload));
    activeChallengeId = state.challenges[0].id;
  }
  saveState();
  closeModal(els.challengeModal);
  render();
  notify(editingChallengeId ? "Challenge updated" : "Challenge created");
  editingChallengeId = null;
});

els.habitForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(els.habitForm);
  const challenge = getChallenge();
  challenge.habits.push({
    id: createId(),
    icon: data.get("icon"),
    name: data.get("name").trim(),
    time: data.get("time"),
    description: data.get("description").trim()
  });
  saveState();
  els.habitForm.reset();
  els.habitIconInput.value = ICONS[1];
  closeModal(els.habitModal);
  renderWorkspace();
  notify("Habit added");
});

ICONS.forEach((icon, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-choice ${index === 1 ? "active" : ""}`;
  button.textContent = icon;
  button.addEventListener("click", () => {
    els.habitIconInput.value = icon;
    document.querySelectorAll(".icon-choice").forEach(choice => choice.classList.toggle("active", choice === button));
  });
  els.iconPicker.append(button);
});

document.querySelectorAll(".modal-backdrop").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });
});

render();
