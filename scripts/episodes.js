/* =========================================================
   CINEVAULT — EPISODE TRACKER (Full Module)
   Full-screen modal, progress display, animations
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before episodes.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isSeries(movie) {
    return movie && (movie.type === "series" || movie.type === "tv");
  }

  function getWatchedCount(movie) {
    if (!movie || !movie.episodes) return 0;
    return movie.episodes.filter(function (ep) { return ep.watched; }).length;
  }

  function getTotalEpisodes(movie) {
    if (!movie) return 0;
    if (movie.episodes && movie.episodes.length > 0) return movie.episodes.length;
    return movie.totalEpisodes || 0;
  }

  function getProgressPercent(movie) {
    const total = getTotalEpisodes(movie);
    if (total === 0) return 0;
    return Math.round((getWatchedCount(movie) / total) * 100);
  }

  /* =========================================================
     ENSURE EPISODES ARRAY EXISTS
  ========================================================== */
  function ensureEpisodes(movie) {
    if (!isSeries(movie)) return;
    if (!movie.episodes || movie.episodes.length === 0) {
      const total = movie.totalEpisodes || 6;
      movie.episodes = [];
      for (let i = 1; i <= total; i++) {
        movie.episodes.push({
          number: i,
          title: "",
          watched: false,
          watchedAt: null,
          rating: 0
        });
      }
    }
  }

  /* =========================================================
     RENDER SERIES INFO BOX (in movie modal)
  ========================================================== */
  function renderSeriesInfoBox(movie) {
    const box = $("seriesInfoBox");
    if (!box) return;

    if (!isSeries(movie)) {
      box.style.display = "none";
      return;
    }

    ensureEpisodes(movie);

    const watched = getWatchedCount(movie);
    const total = getTotalEpisodes(movie);
    const pending = total - watched;
    const percent = getProgressPercent(movie);

    box.style.display = "block";

    const titleEl = $("seriesInfoTitle");
    const metaEl = $("seriesInfoMeta");
    const progressEl = $("seriesInfoProgress");

    if (titleEl) titleEl.textContent = "Web Series";
    if (metaEl) {
      if (total === 0) {
        metaEl.textContent = "No episodes added";
      } else if (watched === total) {
        metaEl.textContent = "🎉 All " + total + " episodes watched!";
      } else {
        metaEl.textContent = watched + " / " + total + " watched • " + pending + " pending";
      }
    }
    if (progressEl) progressEl.style.width = percent + "%";

    // Add click handler to open episodes modal
    const openBtn = $("openEpisodesModal");
    if (openBtn) {
      // Remove old listeners by cloning
      const newBtn = openBtn.cloneNode(true);
      openBtn.parentNode.replaceChild(newBtn, openBtn);
      newBtn.addEventListener("click", function () {
        openEpisodesModal(movie.id);
      });
    }
  }

  /* =========================================================
     OPEN FULL EPISODES MODAL
  ========================================================== */
  let currentSeriesId = null;

  function openEpisodesModal(movieId) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !isSeries(movie)) return;

    currentSeriesId = movieId;
    ensureEpisodes(movie);

    renderEpisodesModal(movie);

    const modal = $("episodesModal");
    if (modal) {
      modal.classList.add("on");
      modal.setAttribute("aria-hidden", "false");
    }
    document.body.style.overflow = "hidden";
  }

  function closeEpisodesModal() {
    const modal = $("episodesModal");
    if (modal) {
      modal.classList.remove("on");
      modal.classList.remove("completed");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
    currentSeriesId = null;
  }

  /* =========================================================
     RENDER EPISODES MODAL CONTENT
  ========================================================== */
  function renderEpisodesModal(movie) {
    if (!movie) return;

    ensureEpisodes(movie);

    const watched = getWatchedCount(movie);
    const total = getTotalEpisodes(movie);
    const pending = total - watched;
    const percent = getProgressPercent(movie);

    // Header
    const titleEl = $("episodesTitle");
    if (titleEl) titleEl.textContent = movie.title || "Series";

    const subtitleEl = $("episodesSubtitle");
    if (subtitleEl) {
      const year = movie.year && movie.year !== "—" ? movie.year + " • " : "";
      subtitleEl.textContent = year + "Web Series • " + total + " episodes";
    }

    // Stats
    const watchedEl = $("epWatchedCount");
    const pendingEl = $("epPendingCount");
    const totalEl = $("epTotalCount");
    if (watchedEl) watchedEl.textContent = watched;
    if (pendingEl) pendingEl.textContent = pending;
    if (totalEl) totalEl.textContent = total;

    // Progress
    const percentEl = $("epProgressPercent");
    const fillEl = $("epProgressFill");
    if (percentEl) percentEl.textContent = percent + "%";
    if (fillEl) fillEl.style.width = percent + "%";

    // Completed state
    const modal = $("episodesModal");
    if (modal) {
      modal.classList.toggle("completed", total > 0 && watched === total);
    }

    // Episodes list
    const list = $("episodesModalList");
    if (!list) return;

    if (movie.episodes.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-dim);font-size:.85rem">No episodes added yet. Click "Add Episodes" to get started.</div>';
      return;
    }

    list.innerHTML = movie.episodes.map(function (ep, idx) {
      const dateStr = ep.watchedAt
        ? new Date(ep.watchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : "";
      const ratingStars = ep.rating > 0 ? "⭐".repeat(ep.rating) : "☆";

      return '<div class="ep-item ' + (ep.watched ? 'watched' : '') + '" data-ep-idx="' + idx + '">' +
        '<div class="ep-checkbox" data-ep-toggle="' + idx + '"></div>' +
        '<div class="ep-number">EP ' + String(ep.number).padStart(2, "0") + '</div>' +
        '<div class="ep-info">' +
          '<strong>' + (ep.title ? esc(ep.title) : "Episode " + ep.number) + '</strong>' +
          '<small>' + (ep.watched ? "Watched" : "Not watched yet") + '</small>' +
          (dateStr ? '<span class="ep-watched-date">✅ ' + dateStr + '</span>' : '') +
        '</div>' +
        '<button class="ep-rate-btn ' + (ep.rating > 0 ? 'has-rating' : '') + '" data-ep-rate="' + idx + '" title="Rate this episode">' +
          ratingStars +
        '</button>' +
      '</div>';
    }).join("");

    // Bind episode click (entire row toggles watched)
    list.querySelectorAll(".ep-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        // Don't toggle if rating button clicked
        if (e.target.closest("[data-ep-rate]")) return;

        const idx = parseInt(item.dataset.epIdx, 10);
        toggleEpisode(movie.id, idx);
      });
    });

    // Bind rate buttons
    list.querySelectorAll("[data-ep-rate]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.epRate, 10);
        promptEpisodeRating(movie.id, idx);
      });
    });

    // Footer text
    const footerText = $("episodesFooterText");
    if (footerText) {
      if (total > 0 && watched === total) {
        footerText.textContent = "🎉 Series complete! Great job.";
      } else {
        footerText.textContent = "Click any episode to toggle watched status";
      }
    }
  }

  /* =========================================================
     TOGGLE EPISODE WATCHED
  ========================================================== */
  function toggleEpisode(movieId, epIndex) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !movie.episodes || !movie.episodes[epIndex]) return;

    const ep = movie.episodes[epIndex];
    const wasWatched = ep.watched;

    ep.watched = !wasWatched;
    ep.watchedAt = ep.watched ? Date.now() : null;

    // Save
    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    // Animation: pop the checkbox
    const checkbox = document.querySelector('[data-ep-toggle="' + epIndex + '"]');
    if (checkbox) {
      checkbox.classList.add("pop");
      setTimeout(function () {
        checkbox.classList.remove("pop");
      }, 500);
    }

    // Update series progress on card
    updateSeriesCardProgress(movie);

    // Toast
    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(
        ep.watched
          ? "✅ Episode " + ep.number + " watched"
          : "⏸️ Episode " + ep.number + " unmarked"
      );
    }

    // Re-render modal
    setTimeout(function () {
      renderEpisodesModal(movie);
    }, 250);

    // Check if all watched
    const allWatched = movie.episodes.every(function (e) { return e.watched; });
    if (allWatched && movie.status !== "watched") {
      movie.status = "watched";
      movie.watchedAt = Date.now();
      if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
      if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();
      triggerConfetti();
      if (window.CV_APP && window.CV_APP.toast) {
        window.CV_APP.toast("🎉 Series completed!");
      }
    }
  }

  /* =========================================================
     PROMPT EPISODE RATING
  ========================================================== */
  function promptEpisodeRating(movieId, epIndex) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !movie.episodes || !movie.episodes[epIndex]) return;

    const ep = movie.episodes[epIndex];
    const current = ep.rating || 0;

    const input = prompt(
      "Rate Episode " + ep.number + " (0-5 stars):\n\n0 = No rating\n1-5 = Stars",
      current
    );
    if (input === null) return;

    const rating = Math.max(0, Math.min(5, parseInt(input, 10) || 0));
    ep.rating = rating;

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    renderEpisodesModal(movie);

    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(rating > 0 ? "⭐ Episode rated " + rating + " stars" : "Rating cleared");
    }
  }

  /* =========================================================
     MARK ALL WATCHED
  ========================================================== */
  function markAllWatched() {
    if (!currentSeriesId) return;
    const movie = state.vault.find(function (m) { return m.id === currentSeriesId; });
    if (!movie || !movie.episodes) return;

    if (!confirm("Mark all " + movie.episodes.length + " episodes as watched?")) return;

    const now = Date.now();
    movie.episodes.forEach(function (ep, i) {
      if (!ep.watched) {
        ep.watched = true;
        ep.watchedAt = now + i; // Slight offset for ordering
      }
    });

    // Mark movie as watched
    if (movie.status !== "watched") {
      movie.status = "watched";
      movie.watchedAt = now;
    }

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();
    if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();

    renderEpisodesModal(movie);
    updateSeriesCardProgress(movie);
    triggerConfetti();

    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast("🎉 All episodes marked watched!");
    }
  }

  /* =========================================================
     RESET ALL EPISODES
  ========================================================== */
  function resetAllEpisodes() {
    if (!currentSeriesId) return;
    const movie = state.vault.find(function (m) { return m.id === currentSeriesId; });
    if (!movie || !movie.episodes) return;

    if (!confirm("Reset all episodes to unwatched?")) return;

    movie.episodes.forEach(function (ep) {
      ep.watched = false;
      ep.watchedAt = null;
    });

    if (movie.status === "watched") {
      movie.status = "watching";
    }

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();
    if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();

    renderEpisodesModal(movie);
    updateSeriesCardProgress(movie);

    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast("🔄 All episodes reset");
    }
  }

  /* =========================================================
     ADD MORE EPISODES
  ========================================================== */
  function addEpisodes() {
    if (!currentSeriesId) return;
    const movie = state.vault.find(function (m) { return m.id === currentSeriesId; });
    if (!movie || !movie.episodes) return;

    const input = prompt("How many episodes to add?", "1");
    if (input === null) return;

    const count = Math.max(1, Math.min(50, parseInt(input, 10) || 1));
    const startNum = movie.episodes.length + 1;

    for (let i = 0; i < count; i++) {
      movie.episodes.push({
        number: startNum + i,
        title: "",
        watched: false,
        watchedAt: null,
        rating: 0
      });
    }

    movie.totalEpisodes = movie.episodes.length;

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();
    if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();

    renderEpisodesModal(movie);

    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast("➕ Added " + count + " episode(s)");
    }
  }

  /* =========================================================
     UPDATE SERIES CARD PROGRESS (in movie grid)
  ========================================================== */
  function updateSeriesCardProgress(movie) {
    if (!movie) return;

    const card = document.querySelector('.movie[data-id="' + movie.id + '"]');
    if (!card) return;

    const progressBox = card.querySelector(".card-series-progress");
    if (!progressBox) return;

    const watched = getWatchedCount(movie);
    const total = getTotalEpisodes(movie);
    const percent = total > 0 ? Math.round((watched / total) * 100) : 0;

    const fill = progressBox.querySelector(".cs-progress-fill");
    const text = progressBox.querySelector(".cs-progress-text");

    if (fill) {
      fill.style.setProperty("--target-width", percent + "%");
      fill.style.width = percent + "%";
    }

    if (text) {
      text.innerHTML = '<span>📺 ' + watched + '/' + total + '</span><strong>' + percent + '%</strong>';
    }

    progressBox.classList.toggle("complete", total > 0 && watched === total);
  }

  /* =========================================================
     CONFETTI EFFECT
  ========================================================== */
  function triggerConfetti() {
    const colors = ["#ffb800", "#a855f7", "#ec4899", "#22c55e", "#3b82f6"];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.5) + "s";
      piece.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      document.body.appendChild(piece);

      setTimeout(function () {
        if (piece.parentNode) piece.parentNode.removeChild(piece);
      }, 3000);
    }
  }

  /* =========================================================
     BIND MODAL UI
  ========================================================== */
  function bindModalUI() {
    const closeBtn = $("episodesClose");
    if (closeBtn) closeBtn.addEventListener("click", closeEpisodesModal);

    const modal = $("episodesModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeEpisodesModal();
      });
    }

    const markAllBtn = $("markAllWatchedBtn");
    if (markAllBtn) markAllBtn.addEventListener("click", markAllWatched);

    const resetBtn = $("resetAllEpisodesBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetAllEpisodes);

    const addBtn = $("addEpisodesBtn");
    if (addBtn) addBtn.addEventListener("click", addEpisodes);

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const epModal = $("episodesModal");
        if (epModal && epModal.classList.contains("on")) {
          closeEpisodesModal();
        }
      }
    });
  }

  /* =========================================================
     PUBLIC API
  ========================================================== */
  function renderEpisodes(movie) {
    renderSeriesInfoBox(movie);
  }

  window.CV_EPISODES = {
    renderEpisodes: renderEpisodes,
    renderSeriesInfoBox: renderSeriesInfoBox,
    openEpisodesModal: openEpisodesModal,
    closeEpisodesModal: closeEpisodesModal,
    toggleEpisode: toggleEpisode,
    updateSeriesCardProgress: updateSeriesCardProgress,
    getWatchedCount: getWatchedCount,
    getTotalEpisodes: getTotalEpisodes,
    getProgressPercent: getProgressPercent,
    isSeries: isSeries
  };

  // Bind UI when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindModalUI);
  } else {
    bindModalUI();
  }

  console.log("🎬 CineVault Episodes module loaded (full version)");

})();