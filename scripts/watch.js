/* =========================================================
   CINEVAULT — WATCH PROVIDERS MODULE
   "Where to Watch" — Legal streaming + free options
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  if (!CFG) {
    console.error("❌ config.js not loaded before watch.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* =========================================================
     PLATFORMS — Official streaming + free platforms
  ========================================================= */
  const WATCH_PLATFORMS = [
    // Streaming (subscription)
    { id: "netflix",   name: "Netflix",         emoji: "🎬", type: "stream", search: "https://www.netflix.com/search?q=" },
    { id: "prime",     name: "Prime Video",     emoji: "🎬", type: "stream", search: "https://www.primevideo.com/search?phrase=" },
    { id: "hotstar",   name: "Disney+ Hotstar", emoji: "🎬", type: "stream", search: "https://www.hotstar.com/in/search?q=" },
    { id: "zee5",      name: "ZEE5",            emoji: "🎬", type: "stream", search: "https://www.zee5.com/search?q=" },
    { id: "sonyliv",   name: "Sony LIV",        emoji: "🎬", type: "stream", search: "https://www.sonyliv.com/search?q=" },
    { id: "apple",     name: "Apple TV",        emoji: "🍎", type: "stream", search: "https://tv.apple.com/search?term=" },
    { id: "jiocinema", name: "JioCinema",       emoji: "🎬", type: "stream", search: "https://www.jiocinema.com/search/" },

    // Free (with ads)
    { id: "mxplayer",  name: "MX Player",       emoji: "🆓", type: "free",   search: "https://www.mxplayer.in/search?q=" },
    { id: "youtube",   name: "YouTube Movies",  emoji: "🆓", type: "free",   search: "https://www.youtube.com/results?search_query=" },

    // Rent / Buy
    { id: "amazon-rent", name: "Amazon (Rent)", emoji: "💳", type: "rent",   search: "https://www.amazon.in/s?k=" },

    // Free archive
    { id: "archive",   name: "Internet Archive",emoji: "📚", type: "archive", search: "https://archive.org/search?query=" }
  ];

  /* =========================================================
     FETCH TMDB WATCH PROVIDERS (India region)
  ========================================================= */
  async function fetchWatchProviders(tmdbId) {
    if (!CFG.TMDB_READY || !tmdbId) return null;
    try {
      const url = "https://api.themoviedb.org/3/movie/" + tmdbId +
                  "/watch/providers?api_key=" + CFG.TMDB_KEY;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.results && data.results.IN) ? data.results.IN : null;
    } catch (err) {
      console.warn("Watch providers fetch failed:", err);
      return null;
    }
  }

  /* =========================================================
     BUILD WATCH SECTION HTML
  ========================================================= */
  function buildWatchSection(movie, tmdbWatchData) {
    const title = movie.title || "";
    const year = movie.year || "";
    const q = encodeURIComponent(title + (year && year !== "—" ? " " + year : ""));

    let html = '<div class="watch-providers-section">';
    html += '<label>📺 Where to Watch</label>';

    let hasAnyProvider = false;

    // 1. Streaming (from TMDB data)
    if (tmdbWatchData && tmdbWatchData.flatrate && tmdbWatchData.flatrate.length > 0) {
      hasAnyProvider = true;
      html += '<div class="provider-group">';
      html += '<span class="group-label">✅ Streaming Now:</span>';
      html += '<div class="provider-chips">';
      tmdbWatchData.flatrate.forEach(function (p) {
        const platform = WATCH_PLATFORMS.find(function (pl) {
          return pl.name.toLowerCase().includes(p.provider_name.toLowerCase()) ||
                 p.provider_name.toLowerCase().includes(pl.name.toLowerCase());
        });
        const searchUrl = platform
          ? platform.search + q
          : "https://www.google.com/search?q=" + q + "+" + encodeURIComponent(p.provider_name);
        html += '<a class="provider-chip stream" href="' + searchUrl + '" target="_blank" rel="noopener">' +
                '🎬 ' + esc(p.provider_name) + '</a>';
      });
      html += '</div></div>';
    }

    // 2. Free providers (from TMDB data)
    if (tmdbWatchData && (tmdbWatchData.free || tmdbWatchData.ads)) {
      const freeList = (tmdbWatchData.free || []).concat(tmdbWatchData.ads || []);
      if (freeList.length > 0) {
        hasAnyProvider = true;
        html += '<div class="provider-group">';
        html += '<span class="group-label">🆓 Free (with ads):</span>';
        html += '<div class="provider-chips">';
        freeList.forEach(function (p) {
          const searchUrl = "https://www.google.com/search?q=" + q + "+" + encodeURIComponent(p.provider_name);
          html += '<a class="provider-chip free" href="' + searchUrl + '" target="_blank" rel="noopener">' +
                  '✅ ' + esc(p.provider_name) + '</a>';
        });
        html += '</div></div>';
      }
    }

    // 3. Rent / Buy (from TMDB data)
    if (tmdbWatchData && (tmdbWatchData.rent || tmdbWatchData.buy)) {
      const paidList = (tmdbWatchData.rent || []).concat(tmdbWatchData.buy || []);
      if (paidList.length > 0) {
        hasAnyProvider = true;
        html += '<div class="provider-group">';
        html += '<span class="group-label">💳 Rent / Buy:</span>';
        html += '<div class="provider-chips">';
        paidList.forEach(function (p) {
          const searchUrl = "https://www.google.com/search?q=" + q + "+" + encodeURIComponent(p.provider_name);
          html += '<a class="provider-chip rent" href="' + searchUrl + '" target="_blank" rel="noopener">' +
                  '💳 ' + esc(p.provider_name) + '</a>';
        });
        html += '</div></div>';
      }
    }

    // 4. Search on official sites (always show)
    html += '<div class="provider-group">';
    html += '<span class="group-label">🔍 Search on:</span>';
    html += '<div class="provider-chips">';

    const searchPlatforms = WATCH_PLATFORMS.filter(function (p) {
      return ["netflix", "prime", "hotstar", "zee5", "sonyliv", "jiocinema", "youtube", "mxplayer", "archive"].indexOf(p.id) !== -1;
    });

    searchPlatforms.forEach(function (p) {
      const url = p.search + q;
      html += '<a class="provider-chip search" href="' + url + '" target="_blank" rel="noopener" title="Search on ' + p.name + '">' +
              p.emoji + ' ' + p.name + '</a>';
    });

    html += '</div></div>';

    // Note
    html += '<p class="watch-note">💡 All links are to official platforms. We do not promote any pirated content.</p>';

    html += '</div>';
    return html;
  }

  /* =========================================================
     RENDER WATCH SECTION
  ========================================================= */
  async function renderWatchSection(movie) {
    const container = $("watchSection");
    if (!container) return;

    // Show loading
    container.innerHTML = '<label>📺 Where to Watch</label>' +
                          '<div class="watch-loading"><span class="spinner"></span>Loading providers...</div>';

    // Fetch TMDB watch providers
    let watchData = null;
    if (movie.tmdbId) {
      watchData = await fetchWatchProviders(movie.tmdbId);
    }

    // Render
    container.innerHTML = buildWatchSection(movie, watchData);
  }

  /* =========================================================
     EXPORTS
  ========================================================= */
  window.CV_WATCH = {
    renderWatchSection,
    fetchWatchProviders,
    buildWatchSection,
    platforms: WATCH_PLATFORMS
  };

  console.log("🎬 CineVault Watch module loaded");
  console.log("   📺 Platforms:", WATCH_PLATFORMS.length);

})();