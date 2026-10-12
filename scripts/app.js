/* =========================================================
   CINEVAULT — APP (Main Logic)
   Part 1/5: Setup, utilities, storage, filters
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;
  const API = window.CV_API;
  const AUTH = window.CV_AUTH;

  if (!CFG || !state || !API) {
    console.error("❌ config.js / api.js not loaded before app.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };
  const KEYS = CFG.STORAGE_KEYS;

  /* ============ UTILITY ============ */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg, isError) {
    const el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("err", !!isError);
    el.classList.add("on");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.classList.remove("on");
    }, CFG.APP_CONFIG.toastDuration);
  }

  function imgFallback(img, title) {
    img.onerror = function () {
      this.onerror = null;
      const t = encodeURIComponent(title || "Movie");
      this.src = "https://placehold.co/300x450/1a1030/ffb800?text=" + t;
    };
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function isSeries(m) {
    return m && (m.type === "series" || m.type === "tv");
  }

  /* ============ STORAGE ============ */
  function saveVault() {
    try { localStorage.setItem(KEYS.VAULT, JSON.stringify(state.vault)); } catch (e) {}
  }
  function loadVault() {
    try {
      const raw = localStorage.getItem(KEYS.VAULT);
      state.vault = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.vault)) state.vault = [];
    } catch (e) { state.vault = []; }
  }
  function saveCollections() {
    try { localStorage.setItem(KEYS.COLLECTIONS, JSON.stringify(state.collections)); } catch (e) {}
  }
  function loadCollections() {
    try {
      const raw = localStorage.getItem(KEYS.COLLECTIONS);
      state.collections = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.collections)) state.collections = [];
    } catch (e) { state.collections = []; }
  }
  function saveAchievements() {
    try { localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(state.achievements)); } catch (e) {}
  }
  function loadAchievements() {
    try {
      const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
      state.achievements = raw ? JSON.parse(raw) : {};
    } catch (e) { state.achievements = {}; }
  }
  function saveWatchHistory() {
    try { localStorage.setItem(KEYS.WATCH_HISTORY, JSON.stringify(state.watchHistory)); } catch (e) {}
  }
  function loadWatchHistory() {
    try {
      const raw = localStorage.getItem(KEYS.WATCH_HISTORY);
      state.watchHistory = raw ? JSON.parse(raw) : {};
    } catch (e) { state.watchHistory = {}; }
  }

  /* ============ FILTERS ============ */
  function getFiltered() {
    let list = state.vault.slice();

    // Status / favorites filter
    if (state.currentFilter === "favorites") {
      list = list.filter(function (m) { return m.favorite; });
    } else if (state.currentFilter === "movie") {
      list = list.filter(function (m) { return !isSeries(m); });
    } else if (state.currentFilter === "series") {
      list = list.filter(function (m) { return isSeries(m); });
    } else if (state.currentFilter !== "all") {
      list = list.filter(function (m) { return m.status === state.currentFilter; });
    }

    // Search query
    if (state.currentQuery && state.currentQuery.length >= 2) {
      const q = state.currentQuery.toLowerCase();
      list = list.filter(function (m) {
        return (m.title || "").toLowerCase().indexOf(q) !== -1 ||
               (m.year || "").indexOf(q) !== -1 ||
               (m.genre || "").toLowerCase().indexOf(q) !== -1;
      });
    }

    // Advanced filters
    const af = state.advancedFilters;
    if (af.genre) {
      const g = af.genre.toLowerCase();
      list = list.filter(function (m) {
        return (m.genre || "").toLowerCase().indexOf(g) !== -1;
      });
    }
    if (af.minYear) list = list.filter(function (m) { return parseInt(m.year) >= af.minYear; });
    if (af.maxYear) list = list.filter(function (m) { return parseInt(m.year) <= af.maxYear; });
    if (af.minRating) list = list.filter(function (m) { return (m.userRating || 0) >= af.minRating; });
    if (af.runtime) {
      list = list.filter(function (m) {
        const r = m.runtime || 0;
        if (af.runtime === "short") return r > 0 && r < 100;
        if (af.runtime === "medium") return r >= 100 && r <= 150;
        if (af.runtime === "long") return r > 150;
        return true;
      });
    }

    // Sort
    const s = state.currentSort;
    if (s === "recent") list.sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); });
    else if (s === "title") list.sort(function (a, b) { return a.title.localeCompare(b.title); });
    else if (s === "year") list.sort(function (a, b) { return (parseInt(b.year) || 0) - (parseInt(a.year) || 0); });
    else if (s === "rating") list.sort(function (a, b) { return (b.userRating || 0) - (a.userRating || 0); });
    else if (s === "tmdb") list.sort(function (a, b) { return (b.tmdbRating || 0) - (a.tmdbRating || 0); });
    else if (s === "runtime") list.sort(function (a, b) { return (b.runtime || 0) - (a.runtime || 0); });
    else if (s === "progress") {
      list.sort(function (a, b) {
        const aProg = isSeries(a) ? (window.CV_EPISODES ? window.CV_EPISODES.getProgressPercent(a) : 0) : (a.status === "watched" ? 100 : 0);
        const bProg = isSeries(b) ? (window.CV_EPISODES ? window.CV_EPISODES.getProgressPercent(b) : 0) : (b.status === "watched" ? 100 : 0);
        return bProg - aProg;
      });
    }

    return list;
  }

  // ⬇️ Part 2 जारी रहेगा
/* ============ RENDER MOVIES ============ */
function renderMovies() {
  const list = $("moviesList");
  if (!list) return;

  const filtered = getFiltered();

  if (filtered.length === 0) {
    list.innerHTML =
      '<li class="empty">' +
        '<div class="empty-icon">🎬</div>' +
        '<h3>' + (state.vault.length === 0 ? "Your vault is empty" : "No matches found") + '</h3>' +
        '<p>' +
          (state.vault.length === 0
            ? "Search any movie or series above and click '+ Add' to start building your collection."
            : "Try changing filters or search term.") +
        '</p>' +
      '</li>';
    return;
  }

  list.innerHTML = "";

  filtered.forEach(function (m, i) {
    const li = document.createElement("li");
    li.className = "movie";
    li.dataset.id = m.id;
    li.style.animationDelay = (i * 0.03) + "s";

    const statusMeta = CFG.STATUS_OPTIONS[m.status] || CFG.STATUS_OPTIONS.want;
    const series = isSeries(m);

    // Card HTML
    let html = '';
    html += '<div class="movie-poster loading">';
    html +=   '<img src="' + esc(m.poster) + '" alt="' + esc(m.title) + '" loading="lazy">';
    html +=   '<div class="badge-status">' + statusMeta.label + '</div>';
    if (series) html += '<div class="badge-type">📺 Series</div>';
    html +=   '<button class="btn-fav ' + (m.favorite ? 'on' : '') + '" data-fav="' + m.id + '">' + (m.favorite ? '❤️' : '♡') + '</button>';
    html += '</div>';
    html += '<div class="movie-body">';
    html +=   '<h3 class="movie-title">' + esc(m.title) + '</h3>';
    html +=   '<div class="movie-meta">';
    html +=     '<span class="tag">📅 ' + esc(m.year || "—") + '</span>';
    if (m.tmdbRating) html += '<span class="tag rating">⭐ ' + Number(m.tmdbRating).toFixed(1) + '</span>';
    if (m.userRating) html += '<span class="tag rating">🌟 ' + m.userRating + '</span>';
    html +=   '</div>';

    // Series progress bar
    if (series) {
      const watched = window.CV_EPISODES ? window.CV_EPISODES.getWatchedCount(m) : 0;
      const total = window.CV_EPISODES ? window.CV_EPISODES.getTotalEpisodes(m) : (m.totalEpisodes || 0);
      const percent = total > 0 ? Math.round((watched / total) * 100) : 0;
      const isComplete = total > 0 && watched === total;

      html += '<div class="card-series-progress ' + (isComplete ? 'complete' : '') + '">';
      html +=   '<div class="cs-progress-bar"><div class="cs-progress-fill" style="width:' + percent + '%; --target-width:' + percent + '%"></div></div>';
      html +=   '<div class="cs-progress-text">';
      html +=     '<span>📺 ' + watched + '/' + total + '</span>';
      html +=     '<strong>' + percent + '%</strong>';
      html +=   '</div>';
      html += '</div>';
    }

    html += '</div>';

    li.innerHTML = html;

    // Poster fallback + loaded class
    const img = li.querySelector("img");
    if (img) {
      imgFallback(img, m.title);
      const posterWrap = li.querySelector(".movie-poster");
      if (img.complete && img.naturalWidth > 0) {
        posterWrap.classList.remove("loading");
        posterWrap.classList.add("loaded");
      } else {
        img.addEventListener("load", function () {
          posterWrap.classList.remove("loading");
          posterWrap.classList.add("loaded");
        });
      }
    }

    // Click → open modal
    li.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      openModal(m.id);
    });

    // Favorite button
    const favBtn = li.querySelector("[data-fav]");
    if (favBtn) {
      favBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleFav(m.id, e);
      });
    }

    list.appendChild(li);
  });
}

/* ============ STATS ============ */
function animateCount(el, target, duration) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;

  const startTime = performance.now();
  const diff = target - start;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateStats() {
  const total = state.vault.length;
  const want = state.vault.filter(function (m) { return m.status === "want"; }).length;
  const watching = state.vault.filter(function (m) { return m.status === "watching"; }).length;
  const watched = state.vault.filter(function (m) { return m.status === "watched"; }).length;
  const favs = state.vault.filter(function (m) { return m.favorite; }).length;

  animateCount($("statTotal"), total, 500);
  animateCount($("statWant"), want, 500);
  animateCount($("statWatching"), watching, 500);
  animateCount($("statWatched"), watched, 500);
  animateCount($("statFav"), favs, 500);

  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
  const fill = $("progressFill");
  const val = $("progressValue");
  if (fill) fill.style.width = pct + "%";
  if (val) val.textContent = watched + " / " + total + " (" + pct + "%)";
}

function renderAll() {
  renderMovies();
  updateStats();
  if (window.CV_FEATURES && window.CV_FEATURES.checkAchievements) {
    window.CV_FEATURES.checkAchievements();
  }
}

/* ============ FAVORITE / STATUS ============ */
function heartBurst(originEl) {
  if (!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  for (let i = 0; i < 6; i++) {
    const p = document.createElement("div");
    p.className = "heart-particle";
    p.textContent = "❤️";
    p.style.left = x + "px";
    p.style.top = y + "px";
    const angle = (Math.PI * 2 * i) / 6;
    const dist = 40 + Math.random() * 30;
    p.style.setProperty("--tx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--ty", Math.sin(angle) * dist + "px");
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }
}

function toggleFav(id, event) {
  const m = state.vault.find(function (v) { return v.id === id; });
  if (!m) return;
  m.favorite = !m.favorite;
  saveVault();
  renderAll();
  if (m.favorite && event && event.currentTarget) heartBurst(event.currentTarget);
  toast(m.favorite ? "❤️ Added to favorites" : "Removed from favorites");
  if (state.modalId === id) syncModalFav(id);
  if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
}

function syncModalFav(id) {
  const m = state.vault.find(function (v) { return v.id === id; });
  if (!m) return;
  const btn = $("btnFav");
  if (btn) btn.textContent = m.favorite ? "❤️ Favorited" : "♡ Favorite";
  const quick = $("btnFavQuick");
  if (quick) quick.textContent = m.favorite ? "❤️" : "♡";
}

function setStatus(id, status) {
  const m = state.vault.find(function (v) { return v.id === id; });
  if (!m) return;
  m.status = status;
  if (status === "watched" && !m.watchedAt) {
    m.watchedAt = Date.now();
    const d = new Date(m.watchedAt);
    const key = d.getFullYear() + "-" +
                String(d.getMonth() + 1).padStart(2, "0") + "-" +
                String(d.getDate()).padStart(2, "0");
    state.watchHistory[key] = (state.watchHistory[key] || 0) + 1;
    saveWatchHistory();
  }
  saveVault();
  renderAll();
  if (state.modalId === id) syncModalStatus();
  if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
}

function syncModalStatus() {
  const m = state.vault.find(function (v) { return v.id === state.modalId; });
  if (!m) return;
  document.querySelectorAll(".status-pick").forEach(function (b) {
    b.classList.toggle("on", b.dataset.status === m.status);
  });
}

/* ============ ADD MOVIE / SERIES ============ */
async function addMovieFromResult(result) {
  if (!result) return;

  const exists = state.vault.find(function (v) {
    return v.sourceId === result.sourceId ||
           (v.title.toLowerCase() === result.title.toLowerCase() && v.year === result.year);
  });
  if (exists) {
    toast("Already in your vault", true);
    return;
  }

  const isTV = result.type === "series" || result.type === "tv";

  let extra = {};
  if (result.source === "tmdb" && result.tmdbId) {
    toast("⏳ Fetching full details...");
    const details = await API.fetchTMDBDetails(result.tmdbId, isTV);
    if (details) extra = details;
  }

  const movie = API.buildMovieObject(result, extra, "want");
  state.vault.unshift(movie);
  saveVault();
  renderAll();
  toast("✓ " + movie.title + " added" + (isTV ? " (Series)" : ""));
  if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
}

// ⬇️ Part 3 जारी रहेगा
/* ============ SEARCH DROPDOWN ============ */
async function renderDropdown(query) {
  const dd = $("resultsDrop");
  const sp = $("searchSpinner");
  if (!dd || !sp) return;

  if (!query || query.trim().length < 2) {
    dd.classList.remove("open");
    dd.innerHTML = "";
    sp.classList.remove("on");
    return;
  }

  dd.classList.add("open");
  dd.innerHTML = '<div class="drop-loading">🔍 Searching "' + esc(query) + '"...</div>';
  sp.classList.add("on");

  try {
    const results = await API.searchMovies(query);
    sp.classList.remove("on");
    state.searchResults = results;
    state.highlightIdx = -1;

    if (!results || results.length === 0) {
      dd.innerHTML =
        '<div class="drop-empty">' +
          '<div style="font-size:38px;margin-bottom:10px;opacity:.4">🎬</div>' +
          '<div>No results found for "<b>' + esc(query) + '</b>"</div>' +
          '<div style="margin-top:8px;font-size:.72rem;color:var(--text-mute)">Try a different spelling or add manually.</div>' +
        '</div>';
      return;
    }

    const inVault = {};
    state.vault.forEach(function (v) { inVault[v.sourceId] = true; });

    let html = '<div class="drop-header">Found ' + results.length + ' results</div>';
    results.forEach(function (m, i) {
      const added = inVault[m.sourceId];
      const isTV = m.type === "series" || m.type === "tv";
      const typeLabel = isTV ? "📺" : "🎬";

      html +=
        '<div class="result-item" data-idx="' + i + '">' +
          '<img src="' + esc(m.poster) + '" alt="" onerror="this.src=\'https://placehold.co/60x90/1a1030/ffb800?text=?\'">' +
          '<div class="result-info">' +
            '<strong>' + typeLabel + ' ' + esc(m.title) + '</strong>' +
            '<small>' + esc(m.year) +
              (isTV ? ' • Series' : '') +
              (m.genre ? ' • ' + esc(m.genre) : '') +
              (m.rating ? ' • ⭐ ' + Number(m.rating).toFixed(1) : '') +
            '</small>' +
          '</div>' +
          '<button class="result-add" data-add="' + i + '"' +
            (added ? ' disabled' : '') + '>' +
            (added ? '✓ Added' : '+ Add') +
          '</button>' +
        '</div>';
    });
    dd.innerHTML = html;
  } catch (err) {
    sp.classList.remove("on");
    console.error(err);
    dd.innerHTML = '<div class="drop-empty" style="color:#ff7b7b">Search failed. Check your internet connection.</div>';
  }
}

function updateHighlight(items) {
  items.forEach(function (el, i) {
    el.classList.toggle("highlight", i === state.highlightIdx);
  });
  if (items[state.highlightIdx]) {
    items[state.highlightIdx].scrollIntoView({ block: "nearest" });
  }
}

function closeDropdown() {
  const dd = $("resultsDrop");
  if (!dd) return;
  dd.classList.remove("open");
  dd.innerHTML = "";
  state.searchResults = [];
  state.highlightIdx = -1;
}

/* ============ MOVIE MODAL ============ */
function openModal(id) {
  const m = state.vault.find(function (v) { return v.id === id; });
  if (!m) return;
  state.modalId = id;

  const series = isSeries(m);

  const poster = $("mPoster");
  if (poster) {
    poster.src = m.poster || "";
    poster.onerror = function () {
      this.onerror = null;
      this.src = "https://placehold.co/300x450/1a1030/ffb800?text=" + encodeURIComponent(m.title);
    };
  }

  const titleEl = $("mTitle");
  if (titleEl) titleEl.textContent = m.title;

  let tags = '<span class="tag">📅 ' + esc(m.year || "—") + '</span>';
  if (series) tags += '<span class="tag">📺 Series</span>';
  if (m.tmdbRating) tags += '<span class="tag rating">⭐ TMDB ' + Number(m.tmdbRating).toFixed(1) + '</span>';
  if (m.genre) tags += '<span class="tag">🎭 ' + esc(m.genre) + '</span>';
  if (m.runtime) tags += '<span class="tag">⏱️ ' + m.runtime + ' min</span>';
  if (m.director) tags += '<span class="tag">🎬 ' + esc(m.director) + '</span>';
  if (m.cast && m.cast.length) tags += '<span class="tag">👥 ' + esc(m.cast.slice(0, 3).join(", ")) + '</span>';
  const tagsEl = $("mTags");
  if (tagsEl) tagsEl.innerHTML = tags;

  const descEl = $("mDesc");
  if (descEl) descEl.textContent = m.overview || "No description available.";

  document.querySelectorAll(".status-pick").forEach(function (b) {
    b.classList.toggle("on", b.dataset.status === m.status);
  });

  const favBtn = $("btnFav");
  if (favBtn) favBtn.textContent = m.favorite ? "❤️ Favorited" : "♡ Favorite";

  const trailerBtn = $("btnTrailer");
  const watchBtn = $("btnWatch");
  const downloadBtn = $("btnDownload");
  if (trailerBtn) trailerBtn.style.display = m.trailerUrl ? "" : "none";
  if (watchBtn) watchBtn.style.display = m.watchUrl ? "" : "none";
  if (downloadBtn) downloadBtn.style.display = m.downloadUrl ? "" : "none";

  const noteEl = $("mNote");
  if (noteEl) noteEl.value = m.notes || "";

  // Star rating
  if (window.CV_FEATURES && window.CV_FEATURES.setStars) {
    window.CV_FEATURES.setStars(m.userRating || 0);
  }

  // Similar movies
  if (window.CV_FEATURES && window.CV_FEATURES.loadSimilar) {
    window.CV_FEATURES.loadSimilar(m.tmdbId);
  }

  // Watch providers
  if (window.CV_WATCH && window.CV_WATCH.renderWatchSection) {
    window.CV_WATCH.renderWatchSection(m);
  }

  // SERIES INFO BOX (new episode system)
  if (window.CV_EPISODES && window.CV_EPISODES.renderSeriesInfoBox) {
    window.CV_EPISODES.renderSeriesInfoBox(m);
  }

  const modal = $("movieModal");
  if (modal) {
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
  }
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = $("movieModal");
  if (modal) {
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
  state.modalId = null;
}

/* ============ EDIT MODAL ============ */
function openEdit(id) {
  state.editingId = id || null;
  const titleEl = $("editTitle");
  if (titleEl) titleEl.textContent = id ? "Edit" : "Add Manually";

  let data = {
    title: "", year: "", type: "movie", genre: "", poster: "",
    overview: "", trailerUrl: "", watchUrl: "", downloadUrl: "",
    userRating: "", runtime: "", totalEpisodes: ""
  };

  if (id) {
    const m = state.vault.find(function (v) { return v.id === id; });
    if (m) {
      data = {
        title: m.title || "",
        year: m.year === "—" ? "" : (m.year || ""),
        type: m.type || "movie",
        genre: m.genre || "",
        poster: m.poster || "",
        overview: m.overview || "",
        trailerUrl: m.trailerUrl || "",
        watchUrl: m.watchUrl || "",
        downloadUrl: m.downloadUrl || "",
        userRating: m.userRating || "",
        runtime: m.runtime || "",
        totalEpisodes: m.totalEpisodes || ""
      };
    }
  }

  setValue("fTitle", data.title);
  setValue("fYear", data.year);
  setValue("fType", data.type);
  setValue("fGenre", data.genre);
  setValue("fPoster", data.poster);
  setValue("fOverview", data.overview);
  setValue("fTrailer", data.trailerUrl);
  setValue("fWatch", data.watchUrl);
  setValue("fDownload", data.downloadUrl);
  setValue("fRating", data.userRating);
  setValue("fRuntime", data.runtime);
  setValue("fTotalEpisodes", data.totalEpisodes);

  const modal = $("editModal");
  if (modal) {
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
  }
  document.body.style.overflow = "hidden";
}

function setValue(id, val) {
  const el = $(id);
  if (el) el.value = val;
}

function closeEdit() {
  const modal = $("editModal");
  if (modal) {
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
  state.editingId = null;
}

function handleEditSubmit(event) {
  event.preventDefault();

  const payload = {
    title: getVal("fTitle").trim(),
    year: getVal("fYear").trim(),
    type: getVal("fType") || "movie",
    genre: getVal("fGenre").trim(),
    poster: getVal("fPoster").trim(),
    overview: getVal("fOverview").trim(),
    trailerUrl: getVal("fTrailer").trim(),
    watchUrl: getVal("fWatch").trim(),
    downloadUrl: getVal("fDownload").trim(),
    userRating: parseFloat(getVal("fRating")) || 0,
    runtime: parseInt(getVal("fRuntime")) || 0,
    totalEpisodes: parseInt(getVal("fTotalEpisodes")) || 0
  };

  if (!payload.title) {
    toast("Title is required", true);
    return;
  }

  if (state.editingId) {
    const m = state.vault.find(function (v) { return v.id === state.editingId; });
    if (m) {
      m.title = payload.title;
      m.year = payload.year || m.year || "—";
      m.type = payload.type;
      m.genre = payload.genre || m.genre;
      m.poster = payload.poster || m.poster;
      m.overview = payload.overview || m.overview;
      m.trailerUrl = payload.trailerUrl;
      m.watchUrl = payload.watchUrl;
      m.downloadUrl = payload.downloadUrl;
      m.userRating = payload.userRating;
      m.runtime = payload.runtime || m.runtime;
      if (payload.totalEpisodes) m.totalEpisodes = payload.totalEpisodes;

      // Initialize episodes if series & none exist
      if (m.type === "series" && (!m.episodes || m.episodes.length === 0)) {
        const total = m.totalEpisodes || 6;
        m.episodes = [];
        for (let i = 1; i <= total; i++) {
          m.episodes.push({ number: i, title: "", watched: false, watchedAt: null, rating: 0 });
        }
      }
    }
    toast("✓ Updated");
  } else {
    const newMovie = {
      id: "cv-manual-" + Date.now(),
      sourceId: "manual-" + Date.now(),
      tmdbId: null,
      title: payload.title,
      year: payload.year || "—",
      type: payload.type,
      releaseDate: "",
      poster: payload.poster,
      backdrop: "",
      overview: payload.overview,
      tmdbRating: 0,
      genre: payload.genre,
      runtime: payload.runtime || 0,
      cast: [],
      director: "",
      trailerUrl: payload.trailerUrl,
      watchUrl: payload.watchUrl,
      downloadUrl: payload.downloadUrl,
      userRating: payload.userRating,
      notes: "",
      status: "want",
      favorite: false,
      addedAt: Date.now(),
      watchedAt: null,
      episodes: []
    };

    if (payload.type === "series") {
      const total = payload.totalEpisodes || 6;
      newMovie.totalEpisodes = total;
      for (let i = 1; i <= total; i++) {
        newMovie.episodes.push({ number: i, title: "", watched: false, watchedAt: null, rating: 0 });
      }
    }

    state.vault.unshift(newMovie);
    toast("✓ Added");
  }

  saveVault();
  renderAll();
  closeEdit();
  if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
}

function getVal(id) {
  const el = $(id);
  return el ? (el.value || "") : "";
}

// ⬇️ Part 4 जारी रहेगा
/* ============ BIND EVENTS ============ */
function bindEvents() {
  // Search input
  const searchInput = $("searchInput");
  if (searchInput) {
    const debouncedSearch = debounce(function (q) { renderDropdown(q); }, CFG.APP_CONFIG.searchDebounce);
    searchInput.addEventListener("input", function (e) {
      const q = e.target.value;
      state.currentQuery = q;
      debouncedSearch(q);
      renderMovies();
    });
    searchInput.addEventListener("keydown", handleSearchKeydown);
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#searchArea")) closeDropdown();
  });

  // Dropdown clicks
  const dd = $("resultsDrop");
  if (dd) {
    dd.addEventListener("click", function (e) {
      const addBtn = e.target.closest("[data-add]");
      if (addBtn) {
        e.stopPropagation();
        const idx = parseInt(addBtn.dataset.add, 10);
        addMovieFromResult(state.searchResults[idx]);
        addBtn.textContent = "✓ Added";
        addBtn.disabled = true;
        return;
      }
      const item = e.target.closest("[data-idx]");
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        addMovieFromResult(state.searchResults[idx]);
        closeDropdown();
      }
    });
  }

  // Chips (filters)
  document.querySelectorAll(".chip[data-chip]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".chip[data-chip]").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      state.currentFilter = chip.dataset.chip;
      document.querySelectorAll(".stat").forEach(function (s) {
        s.classList.toggle("active", s.dataset.filter === state.currentFilter);
      });
      renderMovies();
    });
  });

  // Stats
  document.querySelectorAll(".stat").forEach(function (stat) {
    stat.addEventListener("click", function () {
      const f = stat.dataset.filter;
      document.querySelectorAll(".stat").forEach(function (s) { s.classList.remove("active"); });
      stat.classList.add("active");
      document.querySelectorAll(".chip[data-chip]").forEach(function (c) {
        c.classList.toggle("active", c.dataset.chip === f);
      });
      state.currentFilter = f;
      renderMovies();
    });
  });

  // Sort
  const sortSel = $("sortSelect");
  if (sortSel) {
    sortSel.addEventListener("change", function (e) {
      state.currentSort = e.target.value;
      renderMovies();
    });
  }

  // Movie modal
  bindClick("modalClose", closeModal);
  const mm = $("movieModal");
  if (mm) {
    mm.addEventListener("click", function (e) { if (e.target === mm) closeModal(); });
  }

  // Status buttons
  document.querySelectorAll(".status-pick").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (state.modalId) setStatus(state.modalId, btn.dataset.status);
    });
  });

  // Modal action buttons
  bindClick("btnFav", function () { if (state.modalId) toggleFav(state.modalId); });
  bindClick("btnFavQuick", function (e) { if (state.modalId) toggleFav(state.modalId, e); });
  bindClick("btnTrailer", function () { openMovieLink("trailerUrl"); });
  bindClick("btnTrailerQuick", function () { openMovieLink("trailerUrl"); });
  bindClick("btnWatch", function () { openMovieLink("watchUrl"); });
  bindClick("btnDownload", function () { openMovieLink("downloadUrl"); });
  bindClick("btnEdit", function () {
    if (!state.modalId) return;
    const id = state.modalId;
    closeModal();
    openEdit(id);
  });
  bindClick("btnDelete", handleDelete);

  // Notes
  const noteEl = $("mNote");
  if (noteEl) {
    noteEl.addEventListener("input", debounce(function () {
      const m = state.vault.find(function (v) { return v.id === state.modalId; });
      if (!m) return;
      m.notes = noteEl.value;
      saveVault();
      if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
    }, 600));
  }

  // Edit modal
  bindClick("editClose", closeEdit);
  bindClick("editCancel", closeEdit);
  const em = $("editModal");
  if (em) {
    em.addEventListener("click", function (e) { if (e.target === em) closeEdit(); });
  }
  const editForm = $("editForm");
  if (editForm) editForm.addEventListener("submit", handleEditSubmit);

  // Manual add
  bindClick("manualBtn", function () { openEdit(null); });

  // Hero buttons
  bindClick("heroSearchBtn", function () {
    const sa = $("searchArea");
    if (sa) sa.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () { const si = $("searchInput"); if (si) si.focus(); }, 400);
  });
  bindClick("heroVaultBtn", function () {
    const ml = $("moviesList");
    if (ml) ml.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  bindClick("heroRandomBtn", function () {
    const want = state.vault.filter(function (m) { return m.status === "want" || m.status === "watching"; });
    if (want.length === 0) { toast("No unwatched items in vault", true); return; }
    const pick = want[Math.floor(Math.random() * want.length)];
    openModal(pick.id);
    toast("🎲 Random pick: " + pick.title);
  });

  // Swatches (accent themes)
  document.querySelectorAll(".swatch").forEach(function (sw) {
    sw.addEventListener("click", function () {
      const accent = sw.dataset.accent;
      document.body.dataset.accent = accent;
      document.querySelectorAll(".swatch").forEach(function (s) { s.classList.remove("active"); });
      sw.classList.add("active");
      try { localStorage.setItem(KEYS.THEME, accent); } catch (e) {}
    });
  });

  // Light/dark toggle
  bindClick("themeToggle", function () {
    document.body.classList.toggle("light");
    const light = document.body.classList.contains("light");
    const btn = $("themeToggle");
    if (btn) btn.textContent = light ? "☀️" : "🌙";
    try { localStorage.setItem(KEYS.MODE, light ? "1" : "0"); } catch (e) {}
  });

  // Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const movieModal = $("movieModal");
      const editModal = $("editModal");
      const episodesModal = $("episodesModal");
      const authOverlay = $("authOverlay");

      if (episodesModal && episodesModal.classList.contains("on")) {
        if (window.CV_EPISODES && window.CV_EPISODES.closeEpisodesModal) {
          window.CV_EPISODES.closeEpisodesModal();
        }
      } else if (movieModal && movieModal.classList.contains("on")) {
        closeModal();
      } else if (editModal && editModal.classList.contains("on")) {
        closeEdit();
      } else if (authOverlay && authOverlay.classList.contains("open")) {
        if (AUTH && AUTH.closeAuth) AUTH.closeAuth();
      } else {
        closeDropdown();
      }
    }
    if (e.key === "/" && document.activeElement !== $("searchInput") && !e.target.closest("input, textarea, select")) {
      e.preventDefault();
      const si = $("searchInput");
      if (si) si.focus();
    }
  });

  // Scroll progress
  window.addEventListener("scroll", updateScrollProgress, { passive: true });

  // Scroll reveal
  setupScrollReveal();

  // Hero parallax
  setupHeroParallax();
}

function bindClick(id, handler) {
  const el = $(id);
  if (el) el.addEventListener("click", handler);
}

function openMovieLink(field) {
  const m = state.vault.find(function (v) { return v.id === state.modalId; });
  if (m && m[field]) window.open(m[field], "_blank", "noopener,noreferrer");
}

function handleDelete() {
  if (!state.modalId) return;
  if (!confirm("Delete this from your vault?")) return;
  state.vault = state.vault.filter(function (v) { return v.id !== state.modalId; });
  saveVault();
  renderAll();
  closeModal();
  toast("Deleted");
  if (AUTH && AUTH.scheduleCloudSave) AUTH.scheduleCloudSave();
}

function handleSearchKeydown(e) {
  const items = document.querySelectorAll("#resultsDrop .result-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.highlightIdx = Math.min(state.highlightIdx + 1, items.length - 1);
    updateHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    state.highlightIdx = Math.max(state.highlightIdx - 1, 0);
    updateHighlight(items);
  } else if (e.key === "Enter" && state.highlightIdx >= 0 && state.searchResults[state.highlightIdx]) {
    e.preventDefault();
    addMovieFromResult(state.searchResults[state.highlightIdx]);
    closeDropdown();
  } else if (e.key === "Escape") {
    closeDropdown();
  }
}

function updateScrollProgress() {
  const el = $("scrollProgress");
  if (!el) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
  el.style.width = pct + "%";
}

function setupScrollReveal() {
  const els = document.querySelectorAll(".stat, .progress-bar-wrap, .filters, .hero, .theme-picker");
  els.forEach(function (el) { el.classList.add("reveal"); });
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });
}

function setupHeroParallax() {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.addEventListener("mousemove", function (e) {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--mouse-x", (x * 20) + "px");
    hero.style.setProperty("--mouse-y", (y * 20) + "px");
  });
  hero.addEventListener("mouseleave", function () {
    hero.style.setProperty("--mouse-x", "0px");
    hero.style.setProperty("--mouse-y", "0px");
  });
}

// ⬇️ Part 5 जारी रहेगा (आखिरी भाग)
  /* ============ HIDE LOADER ============ */
  function hideLoader() {
    const loader = $("appLoader");
    if (loader) {
      loader.classList.add("hidden");
      setTimeout(function () {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }
  }

  /* ============ INIT ============ */
  function init() {
    try {
      loadVault();
      loadCollections();
      loadAchievements();
      loadWatchHistory();

      // Restore accent theme
      try {
        const accent = localStorage.getItem(KEYS.THEME) || "gold";
        document.body.dataset.accent = accent;
        document.querySelectorAll(".swatch").forEach(function (s) {
          s.classList.toggle("active", s.dataset.accent === accent);
        });
      } catch (e) {}

      // Restore light mode
      try {
        if (localStorage.getItem(KEYS.MODE) === "1") {
          document.body.classList.add("light");
          const btn = $("themeToggle");
          if (btn) btn.textContent = "☀️";
        }
      } catch (e) {}

      // Search source label
      const srcEl = $("searchSource");
      if (srcEl) {
        srcEl.textContent = CFG.TMDB_READY ? "✓ TMDB (Movies + TV)" : "iTunes Free Search";
      }

      renderAll();
      bindEvents();
      hideLoader();

      // Initialize Firebase auth
      if (AUTH && AUTH.bindUI) AUTH.bindUI();
      if (AUTH && AUTH.init) AUTH.init();

      // Initialize features (star rating, collections, stats, etc.)
      if (window.CV_FEATURES && window.CV_FEATURES.init) {
        window.CV_FEATURES.init();
      }

      console.log("🎬 CineVault ready — " + state.vault.length + " items in vault");
      console.log("   📺 Series support:", state.vault.filter(isSeries).length, "series");
      console.log("   🎬 Movies:", state.vault.filter(function (m) { return !isSeries(m); }).length, "movies");
    } catch (err) {
      console.error("❌ Init failed:", err);
      hideLoader();
    }
  }

  /* ============ EXPORTS ============ */
  window.CV_APP = {
    // Utilities
    esc: esc,
    toast: toast,
    isSeries: isSeries,

    // Render
    renderAll: renderAll,
    renderMovies: renderMovies,
    updateStats: updateStats,

    // Storage
    saveVault: saveVault,
    loadVault: loadVault,
    saveCollections: saveCollections,
    loadCollections: loadCollections,
    saveAchievements: saveAchievements,
    saveWatchHistory: saveWatchHistory,

    // Actions
    addMovieFromResult: addMovieFromResult,
    openModal: openModal,
    closeModal: closeModal,
    openEdit: openEdit,
    closeEdit: closeEdit,
    toggleFav: toggleFav,
    setStatus: setStatus,

    // Data
    getFiltered: getFiltered,

    // Lifecycle
    init: init
  };

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();