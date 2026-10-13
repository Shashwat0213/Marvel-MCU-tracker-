/* =========================================================
   CINEVAULT — DISCOVERY MODULE (FIXED)
   Phase 4: Genre Explorer + Trending + Recommendations
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before discovery.js");
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

  /* =========================================================
     STATE
  ========================================================== */
  let activeGenre = "";

  /* =========================================================
     1. GENRE EXPLORER
  ========================================================== */
  function extractGenres() {
    const genreMap = {};

    state.vault.forEach(function (m) {
      if (!m.genre) return;
      m.genre.split(",").forEach(function (g) {
        const clean = g.trim();
        if (!clean) return;
        genreMap[clean] = (genreMap[clean] || 0) + 1;
      });
    });

    const genres = Object.keys(genreMap).map(function (name) {
      return { name: name, count: genreMap[name] };
    });

    genres.sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return genres;
  }

  function renderGenreExplorer() {
    const section = $("genreExplorerSection");
    const scroll = $("genreChipsScroll");
    const countEl = $("genreExplorerCount");
    if (!section || !scroll) return;

    const genres = extractGenres();

    if (genres.length < 2) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    if (countEl) {
      countEl.textContent = genres.length + (genres.length === 1 ? " genre" : " genres");
    }

    let html = '<button class="genre-chip' + (activeGenre === "" ? ' active' : '') +
               '" data-genre="">🎬 All<span class="genre-chip-count">' +
               state.vault.length + '</span></button>';

    html += genres.map(function (g) {
      const isActive = activeGenre === g.name;
      return '<button class="genre-chip' + (isActive ? ' active' : '') +
        '" data-genre="' + esc(g.name) + '">' +
        '🎭 ' + esc(g.name) +
        '<span class="genre-chip-count">' + g.count + '</span>' +
      '</button>';
    }).join("");

    scroll.innerHTML = html;

    scroll.querySelectorAll(".genre-chip").forEach(function (chip) {
      chip.addEventListener("click", function (e) {
        e.stopPropagation();
        const genre = chip.dataset.genre || "";
        setActiveGenre(genre);
        playSound("click", 0.25);

        chip.classList.add("just-clicked");
        setTimeout(function () {
          chip.classList.remove("just-clicked");
        }, 400);
      });
    });
  }

  /* =========================================================
     SET ACTIVE GENRE — triggers full re-render
  ========================================================== */
  function setActiveGenre(genre) {
    activeGenre = genre || "";

    console.log("🎭 Setting active genre:", activeGenre || "All");

    renderGenreExplorer();
    updateActiveGenreIndicator();

    // Force re-render — try multiple methods for reliability
    let rendered = false;

    if (window.CV_APP) {
      // Method 1: renderAll (best — refreshes everything)
      if (typeof window.CV_APP.renderAll === "function") {
        try {
          window.CV_APP.renderAll();
          rendered = true;
          console.log("🔄 renderAll() called successfully");
        } catch (err) {
          console.error("renderAll failed:", err);
        }
      }

      // Method 2: renderMovies fallback
      if (!rendered && typeof window.CV_APP.renderMovies === "function") {
        try {
          window.CV_APP.renderMovies();
          rendered = true;
          console.log("🔄 renderMovies() called successfully");
        } catch (err) {
          console.error("renderMovies failed:", err);
        }
      }
    } else {
      console.warn("⚠️ CV_APP not available");
    }

    if (!rendered) {
      console.error("❌ Could not re-render movies — filter may not work");
    }
  }

  function updateActiveGenreIndicator() {
    const indicator = $("activeGenreFilter");
    const nameEl = $("activeGenreName");
    if (!indicator || !nameEl) return;

    if (activeGenre) {
      indicator.style.display = "flex";
      nameEl.textContent = activeGenre;
    } else {
      indicator.style.display = "none";
    }
  }

  function clearGenreFilter() {
    setActiveGenre("");
    playSound("click", 0.25);
  }

  /* =========================================================
     2. TRENDING NOW
  ========================================================== */
  function calculateTrendingScore(movie) {
    let score = 0;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (movie.addedAt && movie.addedAt > thirtyDaysAgo) {
      const daysOld = (Date.now() - movie.addedAt) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 20 - daysOld);
    }

    if (movie.userRating) score += movie.userRating * 3;
    if (movie.tmdbRating) score += movie.tmdbRating * 1.5;

    if (movie.status === "watching") score += 15;
    else if (movie.status === "want") score += 8;

    if (movie.favorite) score += 12;

    if (movie.reviews && movie.reviews.length