/* =========================================================
   CINEVAULT — ADVANCED MODULE
   Phase 5: Continue Watching + Watch Goals + Release Calendar + Import/Export
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before advanced.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function playSound(name, vol) {
    if (window.CV_SOUNDS && window.CV_SOUNDS.play) {
      window.CV_SOUNDS.play(name, vol);
    }
  }

  function toast(msg, isErr) {
    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(msg, isErr);
    }
  }

  /* =========================================================
     STORAGE KEYS
  ========================================================== */
  const GOALS_KEY = "cv_watch_goals";
  const RELEASES_KEY = "cv_release_calendar";

  /* =========================================================
     STATE
  ========================================================== */
  let goals = [];

  /* =========================================================
     LOAD / SAVE GOALS
  ========================================================== */
  function loadGoals() {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      goals = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(goals)) goals = [];
    } catch (e) {
      goals = [];
    }
  }

  function saveGoals() {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (e) {}
  }

  /* =========================================================
     1. CONTINUE WATCHING SECTION
  ========================================================== */
  function renderContinueWatching() {
    const section = $("continueWatchingSection");
    if (!section) return;

    // Find items: watching status OR series with progress
    const watching = state.vault.filter(function (m) {
      if (m.status === "watching") return true;

      // Series with partial progress
      if (window.CV_EPISODES && window.CV_EPISODES.isSeries && window.CV_EPISODES.isSeries(m)) {
        const percent = window.CV_EPISODES.getProgressPercent(m);
        return percent > 0 && percent < 100;
      }

      return false;
    });

    // Sort by most recently watched
    watching.sort(function (a, b) {
      const aTime = a.lastWatched || a.watchedAt || a.addedAt || 0;
      const bTime = b.lastWatched || b.watchedAt || b.addedAt || 0;
      return bTime - aTime;
    });

    if (watching.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    let html = '';
    html += '<div class="continue-watching-header">';
    html += '<h2>▶️ Continue Watching</h2>';
    html += '<span>Pick up where you left off</span>';
    html += '</div>';
    html += '<div class="continue-watching-scroll">';

    watching.slice(0, 8).forEach(function (m) {
      let percent = 0;
      let progressText = "";

      if (window.CV_EPISODES && window.CV_EPISODES.isSeries && window.CV_EPISODES.isSeries(m)) {
        percent = window.CV_EPISODES.getProgressPercent(m);
        const watched = window.CV_EPISODES.getWatchedCount(m);
        const total = window.CV_EPISODES.getTotalEpisodes(m);
        progressText = "📺 " + watched + "/" + total + " episodes";
      } else {
        percent = 50; // watching status = 50%
        progressText = "▶️ In progress";
      }

      html += '<div class="cw-item" data-id="' + esc(m.id) + '">';
      html +=   '<div class="cw-poster">';
      html +=     '<img src="' + esc(m.poster) + '" alt="' + esc(m.title) + '" ';
      html +=       'onerror="this.src=\'https://placehold.co/200x300/1a1030/ffb800?text=?\'">';
      html +=     '<div class="cw-badge">▶️ Continue</div>';
      html +=     '<div class="cw-progress-overlay">';
      html +=       '<div class="cw-progress-fill" style="width:' + percent + '%"></div>';
      html +=     '</div>';
      html +=   '</div>';
      html +=   '<div class="cw-title">' + esc(m.title) + '</div>';
      html +=   '<div class="cw-meta">' + esc(progressText) + '</div>';
      html += '</div>';
    });

    html += '</div>';

    section.innerHTML = html;

    section.querySelectorAll(".cw-item").forEach(function (item) {
      item.addEventListener("click", function () {
        const id = item.dataset.id;
        playSound("whoosh", 0.2);
        if (window.CV_APP && window.CV_APP.openModal) {
          window.CV_APP.openModal(id);
        }
      });
    });
  }

  /* =========================================================
     2. WATCH GOALS
  ========================================================== */
  function calculateGoalProgress(goal) {
    let done = 0;

    if (goal.type === "count" || !goal.type) {
      // Simple count of watched items
      done = state.vault.filter(function (m) {
        return m.status === "watched";
      }).length;
    } else if (goal.type === "genre" && goal.genre) {
      // Genre-specific count
      done = state.vault.filter(function (m) {
        if (m.status !== "watched") return false;
        if (!m.genre) return false;
        return m.genre.toLowerCase().indexOf(goal.genre.toLowerCase()) !== -1;
      }).length;
    } else if (goal.type === "runtime") {
      // Total minutes watched
      const totalMin = state.vault.filter(function (m) {
        return m.status === "watched";
      }).reduce(function (sum, m) {
        return sum + (m.runtime || 0);
      }, 0);
      done = Math.round(totalMin / 60); // hours
    }

    return Math.min(done, goal.target);
  }

  function renderGoalsSection() {
    const section = $("watchGoalsSection");
    if (!section) return;

    if (goals.length === 0) {
      // Show a "create goal" prompt if vault has items
      if (state.vault.length < 3) {
        section.style.display = "none";
        return;
      }

      section.style.display = "block";
      section.innerHTML =
        '<div class="watch-goals-header">' +
          '<h2>🎯 Watch Goals</h2>' +
          '<button id="createFirstGoalBtn">+ Set Your First Goal</button>' +
        '</div>' +
        '<p style="color:var(--text-dim);font-size:.8rem;text-align:center;padding:16px 0">' +
          'Set targets to stay motivated on your movie journey!' +
        '</p>';

      const btn = $("createFirstGoalBtn");
      if (btn) {
        btn.addEventListener("click", function () {
          playSound("click", 0.25);
          openGoalsModal();
        });
      }
      return;
    }

    section.style.display = "block";

    let html = '';
    html += '<div class="watch-goals-header">';
    html += '<h2>🎯 Watch Goals</h2>';
    html += '<button id="manageGoalsBtn">Manage</button>';
    html += '</div>';
    html += '<div class="watch-goals-grid">';

    goals.forEach(function (goal) {
      const done = calculateGoalProgress(goal);
      const percent = goal.target > 0 ? Math.round((done / goal.target) * 100) : 0;
      const isComplete = done >= goal.target;

      html += '<div class="goal-card ' + (isComplete ? 'complete' : '') + '">';
      html +=   '<div class="goal-name">' + esc(goal.name) + '</div>';
      html +=   '<div class="goal-progress-text">';
      html +=     '<span>' + done + ' / ' + goal.target + ' ' + esc(goal.unit || 'items') + '</span>';
      html +=     '<strong>' + percent + '%</strong>';
      html +=   '</div>';
      html +=   '<div class="goal-progress-track">';
      html +=     '<div class="goal-progress-fill" style="width:' + percent + '%"></div>';
      html +=   '</div>';
      if (isComplete) {
        html += '<div style="margin-top:8px;font-size:.7rem;color:var(--success);font-weight:800;text-align:center">🎉 Complete!</div>';
      }
      html += '</div>';
    });

    html += '</div>';

    section.innerHTML = html;

    const manageBtn = $("manageGoalsBtn");
    if (manageBtn) {
      manageBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        openGoalsModal();
      });
    }
  }

  /* =========================================================
     3. GOALS MODAL
  ========================================================== */
  function openGoalsModal() {
    const modal = $("goalsModal");
    if (!modal) return;

    renderGoalsList();

    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeGoalsModal() {
    const modal = $("goalsModal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  function renderGoalsList() {
    const list = $("goalsList");
    if (!list) return;

    if (goals.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px 16px;color:var(--text-dim);font-size:.8rem">' +
        'No goals yet. Add your first goal below!' +
      '</div>';
      return;
    }

    list.innerHTML = goals.map(function (goal) {
      const done = calculateGoalProgress(goal);
      return '<div class="goal-item">' +
        '<div>' +
          '<strong>' + esc(goal.name) + '</strong>' +
          '<small>' + done + ' / ' + goal.target + ' ' + esc(goal.unit || 'items') + '</small>' +
        '</div>' +
        '<button class="btn btn-sm" data-goal-del="' + esc(goal.id) + '" style="color:var(--danger);border-color:var(--danger)">🗑</button>' +
      '</div>';
    }).join("");

    list.querySelectorAll("[data-goal-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.goalDel;
        if (!confirm("Delete this goal?")) return;
        goals = goals.filter(function (g) { return g.id !== id; });
        saveGoals();
        renderGoalsList();
        renderGoalsSection();
        playSound("click", 0.25);
      });
    });
  }

  function addNewGoal() {
    const nameInput = $("newGoalName");
    const targetInput = $("newGoalTarget");
    if (!nameInput || !targetInput) return;

    const name = nameInput.value.trim();
    const target = parseInt(targetInput.value, 10);

    if (!name || !target || target < 1) {
      toast("Please enter a valid name and target", true);
      return;
    }

    // Auto-detect type from name
    let type = "count";
    let unit = "items";
    let genre = "";

    const lowerName = name.toLowerCase();
    if (lowerName.indexOf("hour") !== -1) {
      type = "runtime";
      unit = "hours";
    }

    goals.push({
      id: "goal-" + Date.now(),
      name: name,
      target: target,
      type: type,
      unit: unit,
      genre: genre,
      createdAt: Date.now()
    });

    saveGoals();
    nameInput.value = "";
    targetInput.value = "";
    renderGoalsList();
    renderGoalsSection();
    playSound("success", 0.3);
    toast("🎯 Goal added!");
  }

  /* =========================================================
     4. RELEASE CALENDAR
  ========================================================== */
  async function fetchUpcomingReleases() {
    if (!CFG.TMDB_READY) return [];

    try {
      const today = new Date().toISOString().slice(0, 10);
      const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const url = "https://api.themoviedb.org/3/discover/movie" +
                  "?api_key=" + encodeURIComponent(CFG.TMDB_KEY) +
                  "&language=en-US" +
                  "&sort_by=popularity.desc" +
                  "&primary_release_date.gte=" + today +
                  "&primary_release_date.lte=" + threeMonthsLater +
                  "&page=1";

      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.results) return [];

      return data.results.slice(0, 20).map(function (m) {
        return {
          id: m.id,
          title: m.title || m.original_title,
          releaseDate: m.release_date || "",
          poster: m.poster_path ? "https://image.tmdb.org/t/p/w200" + m.poster_path : "",
          rating: m.vote_average || 0,
          overview: m.overview || ""
        };
      }).filter(function (m) { return m.releaseDate; });
    } catch (err) {
      console.warn("Release calendar fetch failed:", err);
      return [];
    }
  }

  async function openReleaseCalendar() {
    const modal = $("releaseCalendarModal");
    const list = $("releaseCalendarList");
    if (!modal || !list) return;

    list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--primary)">' +
      '<div class="spinner" style="margin:0 auto 12px"></div>Loading releases...</div>';

    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const releases = await fetchUpcomingReleases();

    if (releases.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:.8rem">' +
        'No upcoming releases found.</div>';
      return;
    }

    const today = new Date();

    list.innerHTML = releases.map(function (r) {
      const date = new Date(r.releaseDate);
      const daysLeft = Math.ceil((date - today) / (24 * 60 * 60 * 1000));

      const dateStr = date.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });

      return '<div class="release-item">' +
        '<img class="release-poster" src="' + esc(r.poster) + '" alt="" ' +
          'onerror="this.src=\'https://placehold.co/60x90/1a1030/ffb800?text=?\'">' +
        '<div class="release-info">' +
          '<div class="release-date">📅 ' + dateStr + '</div>' +
          '<div class="release-title">' + esc(r.title) + '</div>' +
          '<div class="release-meta">' + (r.rating ? '⭐ ' + Number(r.rating).toFixed(1) : '') + '</div>' +
          (daysLeft > 0 ? '<span class="release-days">' + daysLeft + ' days left</span>' : '') +
        '</div>' +
      '</div>';
    }).join("");
  }

  function closeReleaseCalendar() {
    const modal = $("releaseCalendarModal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  /* =========================================================
     5. IMPORT/EXPORT (backup)
  ========================================================== */
  function exportData() {
    const payload = {
      app: "CineVault",
      version: "5.0",
      exportedAt: new Date().toISOString(),
      vault: state.vault,
      collections: state.collections,
      goals: goals,
      achievements: state.achievements,
      watchHistory: state.watchHistory
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cinevault-backup-" + Date.now() + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("✓ Data exported");
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = JSON.parse(e.target.result);

          if (data.vault && Array.isArray(data.vault)) {
            state.vault = data.vault;
            if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
          }

          if (data.collections && Array.isArray(data.collections)) {
            state.collections = data.collections;
            if (window.CV_APP && window.CV_APP.saveCollections) window.CV_APP.saveCollections();
          }

          if (data.goals && Array.isArray(data.goals)) {
            goals = data.goals;
            saveGoals();
          }

          if (data.achievements) {
            state.achievements = data.achievements;
            if (window.CV_APP && window.CV_APP.saveAchievements) window.CV_APP.saveAchievements();
          }

          if (data.watchHistory) {
            state.watchHistory = data.watchHistory;
            if (window.CV_APP && window.CV_APP.saveWatchHistory) window.CV_APP.saveWatchHistory();
          }

          if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();
          if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

          renderAll();

          playSound("success", 0.3);
          toast("✓ Data imported successfully");
        } catch (err) {
          console.error(err);
          toast("❌ Invalid backup file", true);
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  /* =========================================================
     6. BIND UI
  ========================================================== */
  function bindUI() {
    // Goals modal
    const goalsBtn = $("goalsBtn");
    if (goalsBtn) {
      goalsBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        openGoalsModal();
      });
    }

    const goalsClose = $("goalsClose");
    if (goalsClose) goalsClose.addEventListener("click", closeGoalsModal);

    const goalsModal = $("goalsModal");
    if (goalsModal) {
      goalsModal.addEventListener("click", function (e) {
        if (e.target === goalsModal) closeGoalsModal();
      });
    }

    const newGoalBtn = $("newGoalBtn");
    if (newGoalBtn) {
      newGoalBtn.addEventListener("click", addNewGoal);
    }

    // Enter key for goals inputs
    const goalNameInput = $("newGoalName");
    const goalTargetInput = $("newGoalTarget");
    [goalNameInput, goalTargetInput].forEach(function (inp) {
      if (inp) {
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            addNewGoal();
          }
        });
      }
    });

    // Release calendar
    const releaseBtn = $("releaseCalendarBtn");
    if (releaseBtn) {
      releaseBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        openReleaseCalendar();
      });
    }

    const releaseClose = $("releaseCalendarClose");
    if (releaseClose) releaseClose.addEventListener("click", closeReleaseCalendar);

    const releaseModal = $("releaseCalendarModal");
    if (releaseModal) {
      releaseModal.addEventListener("click", function (e) {
        if (e.target === releaseModal) closeReleaseCalendar();
      });
    }

    // Import/Export
    const exportBtn = $("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        exportData();
      });
    }

    const importBtn = $("importBtn");
    if (importBtn) {
      importBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        importData();
      });
    }

    // Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const gm = $("goalsModal");
        const rc = $("releaseCalendarModal");
        if (rc && rc.classList.contains("on")) closeReleaseCalendar();
        else if (gm && gm.classList.contains("on")) closeGoalsModal();
      }
    });
  }

  /* =========================================================
     7. RENDER ALL
  ========================================================== */
  function renderAll() {
    renderContinueWatching();
    renderGoalsSection();
  }

  /* =========================================================
     8. EXPORTS
  ========================================================== */
  window.CV_ADVANCED = {
    renderAll: renderAll,
    renderContinueWatching: renderContinueWatching,
    renderGoalsSection: renderGoalsSection,
    openGoalsModal: openGoalsModal,
    openReleaseCalendar: openReleaseCalendar,
    exportData: exportData,
    importData: importData,
    getGoals: function () { return goals; }
  };

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    loadGoals();
    bindUI();

    setTimeout(function () {
      renderAll();
    }, 700);

    console.log("🎬 CineVault Advanced module loaded");
    console.log("   ▶️ Continue Watching, 🎯 Goals, 📅 Release Calendar");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();