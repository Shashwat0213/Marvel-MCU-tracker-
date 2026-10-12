/* =========================================================
   CINEVAULT — EPISODE TRACKER
   Episode-wise progress for web series
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

  /* =========================================================
     RENDER EPISODE LIST
  ========================================================== */
  function renderEpisodes(movie) {
    const section = $("episodesSection");
    const list = $("episodesList");
    const progress = $("episodesProgress");
    if (!section || !list) return;

    // Only show for web series
    if (!movie || (movie.type !== "series" && movie.type !== "tv")) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    const episodes = movie.episodes || [];
    const totalEpisodes = movie.totalEpisodes || episodes.length || 6;

    // If no episodes defined, generate default 6
    if (episodes.length === 0) {
      for (let i = 1; i <= totalEpisodes; i++) {
        episodes.push({ number: i, watched: false, watchedAt: null, rating: 0 });
      }
      movie.episodes = episodes;
    }

    // Count watched
    const watchedCount = episodes.filter(function (ep) { return ep.watched; }).length;
    const percent = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    // Update progress text
    if (progress) {
      progress.textContent = watchedCount + " / " + totalEpisodes + " (" + percent + "%)";
    }

    // Render list
    list.innerHTML = episodes.map(function (ep, i) {
      return '<div class="episode-item ' + (ep.watched ? 'watched' : '') + '" data-ep-index="' + i + '">' +
        '<div class="episode-check">' +
          '<input type="checkbox" ' + (ep.watched ? 'checked' : '') + ' data-ep-toggle="' + i + '">' +
        '</div>' +
        '<div class="episode-info">' +
          '<strong>Episode ' + ep.number + '</strong>' +
          (ep.title ? '<small>' + esc(ep.title) + '</small>' : '') +
          (ep.watchedAt ? '<span class="ep-watched-date">✅ ' + new Date(ep.watchedAt).toLocaleDateString() + '</span>' : '') +
        '</div>' +
        '<div class="episode-actions">' +
          '<button class="ep-rating-btn" data-ep-rate="' + i + '" title="Rate episode">' +
            (ep.rating > 0 ? '⭐'.repeat(ep.rating) : '☆') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join("");

    // Bind toggle events
    list.querySelectorAll("[data-ep-toggle]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function (e) {
        const idx = parseInt(checkbox.dataset.epToggle, 10);
        toggleEpisode(movie.id, idx, checkbox.checked);
      });
    });

    // Bind rating events
    list.querySelectorAll("[data-ep-rate]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.dataset.epRate, 10);
        promptRating(movie.id, idx);
      });
    });
  }

  /* =========================================================
     TOGGLE EPISODE WATCHED
  ========================================================== */
  function toggleEpisode(movieId, epIndex, watched) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !movie.episodes || !movie.episodes[epIndex]) return;

    const ep = movie.episodes[epIndex];
    ep.watched = watched;
    ep.watchedAt = watched ? Date.now() : null;

    // Save
    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    // Toast
    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(watched ? "✅ Episode " + ep.number + " watched" : "Episode " + ep.number + " unwatched");
    }

    // Re-render
    renderEpisodes(movie);

    // Check if all episodes watched
    const allWatched = movie.episodes.every(function (e) { return e.watched; });
    if (allWatched && movie.status !== "watched") {
      movie.status = "watched";
      movie.watchedAt = Date.now();
      if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
      if (window.CV_APP && window.CV_APP.renderAll) window.CV_APP.renderAll();
      if (window.CV_APP && window.CV_APP.toast) {
        window.CV_APP.toast("🎉 Series completed!");
      }
    }
  }

  /* =========================================================
     PROMPT RATING (simple)
  ========================================================== */
  function promptRating(movieId, epIndex) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !movie.episodes || !movie.episodes[epIndex]) return;

    const ep = movie.episodes[epIndex];
    const current = ep.rating || 0;
    const input = prompt("Rate Episode " + ep.number + " (0-5 stars):", current);
    if (input === null) return;

    const rating = Math.max(0, Math.min(5, parseInt(input, 10) || 0));
    ep.rating = rating;

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    renderEpisodes(movie);
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_EPISODES = {
    renderEpisodes: renderEpisodes,
    toggleEpisode: toggleEpisode
  };

  console.log("🎬 CineVault Episodes module loaded");

})();