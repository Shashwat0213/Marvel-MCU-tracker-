/* =========================================================
   CINEVAULT — VISUALS MODULE
   Phase 3: Top Rated, Backdrop, Trailer Embed, Wall View
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before visuals.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* =========================================================
     1. BACKDROP IMAGE IN MOVIE MODAL
  ========================================================== */
  function renderBackdrop(movie) {
    const backdropEl = $("modalBackdrop");
    if (!backdropEl) return;

    if (movie && movie.backdrop) {
      backdropEl.style.backgroundImage = 'url("' + movie.backdrop + '")';
      backdropEl.style.display = "block";
    } else if (movie && movie.poster) {
      // Fallback to poster if no backdrop
      backdropEl.style.backgroundImage = 'url("' + movie.poster + '")';
      backdropEl.style.display = "block";
    } else {
      backdropEl.style.backgroundImage = "none";
      backdropEl.style.display = "none";
    }
  }

  /* =========================================================
     2. TOP RATED SECTION (Homepage)
  ========================================================== */
  function renderTopRated() {
    const section = $("topRatedSection");
    const scroll = $("topRatedScroll");
    if (!section || !scroll) return;

    // Filter: only rated items (userRating > 0)
    const rated = state.vault.filter(function (m) {
      return m.userRating && m.userRating > 0;
    });

    // Need at least 3 rated items to show section
    if (rated.length < 3) {
      section.style.display = "none";
      return;
    }

    // Sort by userRating desc, then addedAt desc
    const sorted = rated.slice().sort(function (a, b) {
      if (b.userRating !== a.userRating) return b.userRating - a.userRating;
      return (b.addedAt || 0) - (a.addedAt || 0);
    });

    // Take top 10
    const top = sorted.slice(0, 10);

    section.style.display = "block";

    scroll.innerHTML = top.map(function (m, i) {
      const rank = i + 1;
      let rankClass = "";
      if (rank === 1) rankClass = "gold";
      else if (rank === 2) rankClass = "silver";
      else if (rank === 3) rankClass = "bronze";

      // Stars display
      let starsHTML = "";
      const rating = m.userRating || 0;
      for (let s = 1; s <= 5; s++) {
        starsHTML += (s <= rating) ? "★" : "☆";
      }

      return '<div class="top-rated-item" data-id="' + esc(m.id) + '">' +
        '<div class="top-rated-poster">' +
          '<img src="' + esc(m.poster) + '" alt="' + esc(m.title) + '" ' +
            'onerror="this.src=\'https://placehold.co/200x300/1a1030/ffb800?text=?\'">' +
          '<div class="top-rated-rank ' + rankClass + '">' + rank + '</div>' +
          '<div class="top-rated-stars">' + starsHTML + ' ' + rating + '</div>' +
        '</div>' +
        '<div class="top-rated-title">' + esc(m.title) + '</div>' +
      '</div>';
    }).join("");

    // Bind click → open modal
    scroll.querySelectorAll(".top-rated-item").forEach(function (item) {
      item.addEventListener("click", function () {
        const id = item.dataset.id;
        if (window.CV_APP && window.CV_APP.openModal) {
          window.CV_APP.openModal(id);
        }
      });
    });
  }

  /* =========================================================
     3. TRAILER EMBED (YouTube in modal)
  ========================================================== */
  let currentTrailerUrl = "";

  function extractYouTubeId(url) {
    if (!url) return null;
    url = String(url).trim();

    // Patterns:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    // https://m.youtube.com/watch?v=VIDEO_ID

    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];

    for (let i = 0; i < patterns.length; i++) {
      const match = url.match(patterns[i]);
      if (match && match[1]) return match[1];
    }

    // If it's just an 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    return null;
  }

  function openTrailerModal(movie) {
    if (!movie) return;

    const modal = $("trailerModal");
    const iframe = $("trailerIframe");
    const placeholder = $("trailerPlaceholder");
    const titleEl = $("trailerTitle");
    const subtitleEl = $("trailerSubtitle");

    if (!modal || !iframe) return;

    // Set title
    if (titleEl) titleEl.textContent = movie.title || "Trailer";
    if (subtitleEl) subtitleEl.textContent = "Official Trailer • " + (movie.year || "");

    // Get YouTube ID
    const videoId = extractYouTubeId(movie.trailerUrl);

    if (!videoId) {
      // No valid YouTube URL → open in new tab directly
      if (movie.trailerUrl) {
        window.open(movie.trailerUrl, "_blank", "noopener,noreferrer");
      } else {
        if (window.CV_APP && window.CV_APP.toast) {
          window.CV_APP.toast("No trailer available", true);
        }
      }
      return;
    }

    currentTrailerUrl = movie.trailerUrl;

    // Show placeholder first
    if (placeholder) placeholder.style.display = "flex";
    iframe.style.display = "none";

    // Set iframe source with autoplay
    iframe.src = "https://www.youtube.com/embed/" + videoId +
                 "?autoplay=1&rel=0&modestbranding=1&playsinline=1";

    // Show iframe on load
    iframe.onload = function () {
      if (placeholder) placeholder.style.display = "none";
      iframe.style.display = "block";
    };

    // Show modal
    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeTrailerModal() {
    const modal = $("trailerModal");
    const iframe = $("trailerIframe");
    const placeholder = $("trailerPlaceholder");

    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    if (iframe) {
      iframe.src = ""; // Stop video
      iframe.style.display = "none";
    }
    if (placeholder) placeholder.style.display = "flex";

    document.body.style.overflow = "";
    currentTrailerUrl = "";
  }

  function bindTrailerUI() {
    const closeBtn = $("trailerClose");
    if (closeBtn) closeBtn.addEventListener("click", closeTrailerModal);

    const modal = $("trailerModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeTrailerModal();
      });
    }

    // Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const tm = $("trailerModal");
        if (tm && tm.classList.contains("on")) {
          closeTrailerModal();
        }
      }
    });
  }

  /* =========================================================
     4. POSTER WALL VIEW TOGGLE
  ========================================================== */
  const WALL_VIEW_KEY = "cv_wall_view";

  function toggleWallView() {
    const list = $("moviesList");
    const btn = $("wallViewBtn");
    if (!list) return;

    const isWall = list.classList.toggle("wall-view");

    // Save preference
    try {
      localStorage.setItem(WALL_VIEW_KEY, isWall ? "1" : "0");
    } catch (e) {}

    // Update button state
    if (btn) {
      btn.classList.toggle("active", isWall);
      btn.textContent = isWall ? "📋" : "🌌";
      btn.title = isWall ? "Grid View" : "Wall View";
    }

    // Toast
    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(isWall ? "🌌 Wall View" : "📋 Grid View");
    }
  }

  function restoreWallView() {
    try {
      if (localStorage.getItem(WALL_VIEW_KEY) === "1") {
        const list = $("moviesList");
        const btn = $("wallViewBtn");
        if (list) list.classList.add("wall-view");
        if (btn) {
          btn.classList.add("active");
          btn.textContent = "📋";
          btn.title = "Grid View";
        }
      }
    } catch (e) {}
  }

  function bindWallViewUI() {
    const btn = $("wallViewBtn");
    if (btn) btn.addEventListener("click", toggleWallView);
  }

  /* =========================================================
     5. GENRE CLASS (for gradient borders)
  ========================================================== */
  function getGenreClass(genre) {
    if (!genre) return "";
    const g = String(genre).toLowerCase();

    if (g.indexOf("action") !== -1) return "genre-action";
    if (g.indexOf("comedy") !== -1) return "genre-comedy";
    if (g.indexOf("horror") !== -1) return "genre-horror";
    if (g.indexOf("romance") !== -1) return "genre-romance";
    if (g.indexOf("sci-fi") !== -1 || g.indexOf("science fiction") !== -1) return "genre-scifi";
    if (g.indexOf("drama") !== -1) return "genre-drama";
    if (g.indexOf("thriller") !== -1) return "genre-thriller";
    if (g.indexOf("animation") !== -1 || g.indexOf("animated") !== -1) return "genre-animation";
    if (g.indexOf("fantasy") !== -1) return "genre-fantasy";
    if (g.indexOf("mystery") !== -1) return "genre-mystery";
    if (g.indexOf("crime") !== -1) return "genre-crime";
    if (g.indexOf("adventure") !== -1) return "genre-adventure";

    return "";
  }

  /* =========================================================
     6. RENDER TOP RATED & BACKDROP TOGETHER
  ========================================================== */
  function renderVisuals() {
    renderTopRated();
  }

  /* =========================================================
     PUBLIC API
  ========================================================== */
  function onModalOpen(movie) {
    renderBackdrop(movie);
  }

  function onRenderAll() {
    renderTopRated();
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_VISUALS = {
    renderBackdrop: renderBackdrop,
    renderTopRated: renderTopRated,
    renderVisuals: renderVisuals,
    onModalOpen: onModalOpen,
    onRenderAll: onRenderAll,
    openTrailerModal: openTrailerModal,
    closeTrailerModal: closeTrailerModal,
    toggleWallView: toggleWallView,
    restoreWallView: restoreWallView,
    getGenreClass: getGenreClass,
    extractYouTubeId: extractYouTubeId
  };

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    bindTrailerUI();
    bindWallViewUI();
    restoreWallView();

    // Initial render
    setTimeout(function () {
      renderTopRated();
    }, 500);

    console.log("🎬 CineVault Visuals module loaded");
    console.log("   🌟 Top Rated, 🖼️ Backdrop, ▶️ Trailer Embed, 🌌 Wall View");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();