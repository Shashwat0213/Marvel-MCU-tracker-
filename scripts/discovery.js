/* =========================================================
   CINEVAULT — DISCOVERY MODULE
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
  let activeGenreFilter = null;

  /* =========================================================
     1. GENRE EXPLORER
     Extract all genres from vault with counts
  ========================================================== */
  function extractGenres() {
    const genreMap = {};

    state.vault.forEach(function (m) {
      if (!m.genre) return;
      // Split by comma and trim
      m.genre.split(",").forEach(function (g) {
        const clean = g.trim();
        if (!clean) return;
        genreMap[clean] = (genreMap[clean] || 0) + 1;
      });
    });

    // Convert to array and sort by count desc
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

    // Need at least 2 genres to show section
    if (genres.length < 2) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    if (countEl) {
      countEl.textContent = genres.length + (genres.length === 1 ? " genre" : " genres");
    }

    // Add "All" chip at start
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

    // Bind clicks
    scroll.querySelectorAll(".genre-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        const genre = chip.dataset.genre || "";
        setActiveGenre(genre);
        playSound("click", 0.25);

        // Visual pulse
        chip.classList.add("just-clicked");
        setTimeout(function () {
          chip.classList.remove("just-clicked");
        }, 400);
      });
    });
  }

  function setActiveGenre(genre) {
    activeGenre = genre;

    // Update UI
    renderGenreExplorer();
    updateActiveGenreIndicator();

    // Filter movies list
    if (window.CV_APP && window.CV_APP.renderMovies) {
      window.CV_APP.renderMovies();
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
    activeGenre = "";
    renderGenreExplorer();
    updateActiveGenreIndicator();
    playSound("click", 0.25);

    if (window.CV_APP && window.CV_APP.renderMovies) {
      window.CV_APP.renderMovies();
    }
  }

  /* =========================================================
     2. TRENDING NOW
     Calculate score based on recent activity
  ========================================================== */
  function calculateTrendingScore(movie) {
    let score = 0;

    // Recent activity bonus (addedAt within last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (movie.addedAt && movie.addedAt > thirtyDaysAgo) {
      const daysOld = (Date.now() - movie.addedAt) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 20 - daysOld);
    }

    // Rating bonus
    if (movie.userRating) score += movie.userRating * 3;
    if (movie.tmdbRating) score += movie.tmdbRating * 1.5;

    // Status bonus
    if (movie.status === "watching") score += 15;
    else if (movie.status === "want") score += 8;

    // Favorite bonus
    if (movie.favorite) score += 12;

    // Review bonus
    if (movie.reviews && movie.reviews.length > 0) {
      score += movie.reviews.length * 5;
    }

    // Episode progress bonus (series)
    if (window.CV_EPISODES && window.CV_EPISODES.isSeries && window.CV_EPISODES.isSeries(movie)) {
      const percent = window.CV_EPISODES.getProgressPercent(movie);
      score += percent * 0.15;
    }

    return score;
  }

  function renderTrending() {
    const section = $("trendingSection");
    const scroll = $("trendingScroll");
    if (!section || !scroll) return;

    // Need at least 5 items to make trending meaningful
    if (state.vault.length < 5) {
      section.style.display = "none";
      return;
    }

    // Score all movies
    const scored = state.vault.map(function (m) {
      return { movie: m, score: calculateTrendingScore(m) };
    });

    // Sort by score desc
    scored.sort(function (a, b) { return b.score - a.score; });

    // Take top 8
    const trending = scored.slice(0, 8);

    // Only show if there's some variation in scores
    if (trending.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    scroll.innerHTML = trending.map(function (item, i) {
      const m = item.movie;
      const rank = i + 1;

      return '<div class="trending-item" data-id="' + esc(m.id) + '">' +
        '<div class="trending-poster">' +
          '<img src="' + esc(m.poster) + '" alt="' + esc(m.title) + '" ' +
            'onerror="this.src=\'https://placehold.co/200x300/1a1030/ffb800?text=?\'">' +
          '<div class="trending-fire">🔥</div>' +
          '<div class="trending-rank">#' + rank + '</div>' +
        '</div>' +
        '<div class="trending-title">' + esc(m.title) + '</div>' +
      '</div>';
    }).join("");

    // Bind clicks
    scroll.querySelectorAll(".trending-item").forEach(function (item) {
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
     3. RECOMMENDATIONS
     Based on user's top genres, suggest "want to watch" items
  ========================================================== */
  function getUserTopGenres() {
    const genreCount = {};

    state.vault.forEach(function (m) {
      // Only consider watched or favorites for preference
      if (m.status !== "watched" && !m.favorite) return;
      if (!m.genre) return;

      const weight = m.favorite ? 2 : 1;

      m.genre.split(",").forEach(function (g) {
        const clean = g.trim();
        if (!clean) return;
        genreCount[clean] = (genreCount[clean] || 0) + weight;
      });
    });

    const sorted = Object.keys(genreCount).map(function (name) {
      return { name: name, count: genreCount[name] };
    }).sort(function (a, b) { return b.count - a.count; });

    return sorted.slice(0, 5).map(function (g) { return g.name; });
  }

  function renderRecommendations() {
    const section = $("recommendationsSection");
    const scroll = $("recommendationsScroll");
    if (!section || !scroll) return;

    // Need at least 5 items watched/favorited to make recommendations
    const watchedCount = state.vault.filter(function (m) {
      return m.status === "watched" || m.favorite;
    }).length;

    if (watchedCount < 3) {
      section.style.display = "none";
      return;
    }

    const topGenres = getUserTopGenres();
    if (topGenres.length === 0) {
      section.style.display = "none";
      return;
    }

    // Find items in "want" status that match top genres
    const candidates = state.vault.filter(function (m) {
      if (m.status !== "want") return false;
      if (!m.genre) return false;

      const lowerGenre = m.genre.toLowerCase();
      return topGenres.some(function (g) {
        return lowerGenre.indexOf(g.toLowerCase()) !== -1;
      });
    });

    // If no candidates, show recently added
    let recommendations;
    if (candidates.length > 0) {
      // Sort by added date desc
      candidates.sort(function (a, b) {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      recommendations = candidates.slice(0, 6).map(function (m) {
        // Find which genre matched
        const lowerGenre = (m.genre || "").toLowerCase();
        const matched = topGenres.find(function (g) {
          return lowerGenre.indexOf(g.toLowerCase()) !== -1;
        });
        return {
          movie: m,
          reason: matched ? "Matches your " + matched : "Recommended"
        };
      });
    } else {
      // Fallback: recently added
      const recent = state.vault.slice().sort(function (a, b) {
        return (b.addedAt || 0) - (a.addedAt || 0);
      }).slice(0, 6);

      recommendations = recent.map(function (m) {
        return { movie: m, reason: "Recently added" };
      });
    }

    if (recommendations.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    scroll.innerHTML = recommendations.map(function (rec) {
      const m = rec.movie;
      return '<div class="recommendation-item" data-id="' + esc(m.id) + '">' +
        '<div class="recommendation-poster">' +
          '<img src="' + esc(m.poster) + '" alt="' + esc(m.title) + '" ' +
            'onerror="this.src=\'https://placehold.co/200x300/1a1030/ffb800?text=?\'">' +
          '<div class="recommendation-tag">💡 For You</div>' +
        '</div>' +
        '<div class="recommendation-title">' + esc(m.title) + '</div>' +
        '<div class="recommendation-reason">' + esc(rec.reason) + '</div>' +
      '</div>';
    }).join("");

    // Bind clicks
    scroll.querySelectorAll(".recommendation-item").forEach(function (item) {
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
     4. FILTER INTEGRATION
     This function is called by CV_APP.getFiltered() to apply
     genre filter based on active genre from explorer
  ========================================================== */
  function applyGenreFilter(list) {
    if (!activeGenre) return list;

    return list.filter(function (m) {
      if (!m.genre) return false;
      return m.genre.toLowerCase().indexOf(activeGenre.toLowerCase()) !== -1;
    });
  }

  function getActiveGenre() {
    return activeGenre;
  }

  /* =========================================================
     5. RENDER ALL
  ========================================================== */
  function renderAll() {
    renderGenreExplorer();
    renderTrending();
    renderRecommendations();
    updateActiveGenreIndicator();
  }

  /* =========================================================
     BIND UI
  ========================================================== */
  function bindUI() {
    const clearBtn = $("clearGenreFilter");
    if (clearBtn) {
      clearBtn.addEventListener("click", clearGenreFilter);
    }
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_DISCOVERY = {
    renderAll: renderAll,
    renderGenreExplorer: renderGenreExplorer,
    renderTrending: renderTrending,
    renderRecommendations: renderRecommendations,
    applyGenreFilter: applyGenreFilter,
    getActiveGenre: getActiveGenre,
    setActiveGenre: setActiveGenre,
    clearGenreFilter: clearGenreFilter
  };

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    bindUI();

    // Initial render after data loaded
    setTimeout(function () {
      renderAll();
    }, 600);

    console.log("🎬 CineVault Discovery module loaded");
    console.log("   🎭 Genre Explorer, 🔥 Trending, 💡 Recommendations");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();