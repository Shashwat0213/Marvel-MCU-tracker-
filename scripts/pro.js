/* =========================================================
   CINEVAULT — PRO MODULE
   Phase 6: Multi-Language, Yearly Wrap-Up, Friends, PWA
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before pro.js");
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
     STORAGE
  ========================================================== */
  const LANG_KEY = "cv_language";
  const PWA_DISMISSED_KEY = "cv_pwa_dismissed";

  /* =========================================================
     1. MULTI-LANGUAGE
  ========================================================== */
  const TRANSLATIONS = {
    en: {
      brand_tag: "Your Movie Universe",
      hero_eyebrow: "✨ Smart Movie Tracker",
      hero_title_1: "Track Every",
      hero_title_2: "Movie You",
      hero_title_3: "Love.",
      hero_copy: "Search any movie or web series, build your personal watchlist, write reviews, track episodes, set goals, and discover new favorites.",
      search_movies: "Search Movies & Series",
      hero_search: "🔍 Start Searching",
      hero_vault: "📋 My Vault",
      hero_random: "🎲 Random Pick",
      top_rated: "🌟 Top Rated",
      trending: "🔥 Trending Now",
      for_you: "💡 For You",
      explore_genres: "🎭 Explore Genres",
      continue_watching: "▶️ Continue Watching",
      watch_goals: "🎯 Watch Goals",
      reset: "🔄 Reset",
      manual_add: "➕ Add Manually",
      stats: "Statistics"
    },
    hi: {
      brand_tag: "आपका फ़िल्म जगत",
      hero_eyebrow: "✨ स्मार्ट मूवी ट्रैकर",
      hero_title_1: "हर वो फ़िल्म",
      hero_title_2: "जो आप",
      hero_title_3: "पसंद करते हैं।",
      hero_copy: "कोई भी फ़िल्म या वेब सीरीज़ खोजें, अपनी वॉचलिस्ट बनाएं, समीक्षा लिखें, एपिसोड ट्रैक करें, लक्ष्य सेट करें और नई पसंदीदा खोजें।",
      search_movies: "फ़िल्में और सीरीज़ खोजें",
      hero_search: "🔍 खोज शुरू करें",
      hero_vault: "📋 मेरा वॉल्ट",
      hero_random: "🎲 रैंडम चुनें",
      top_rated: "🌟 टॉप रेटेड",
      trending: "🔥 ट्रेंडिंग",
      for_you: "💡 आपके लिए",
      explore_genres: "🎭 शैलियाँ देखें",
      continue_watching: "▶️ देखना जारी रखें",
      watch_goals: "🎯 देखने के लक्ष्य",
      reset: "🔄 रीसेट",
      manual_add: "➕ मैन्युअली जोड़ें",
      stats: "आंकड़े"
    }
  };

  let currentLang = "en";

  function loadLanguage() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && TRANSLATIONS[saved]) {
        currentLang = saved;
      }
    } catch (e) {}
  }

  function saveLanguage() {
    try {
      localStorage.setItem(LANG_KEY, currentLang);
    } catch (e) {}
  }

  function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
  }

  function applyLanguage() {
    // Apply to data-i18n elements
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const key = el.dataset.i18n;
      const translated = t(key);
      if (translated) el.textContent = translated;
    });

    // Also update body attribute
    document.body.dataset.lang = currentLang;

    // Update HTML lang
    document.documentElement.lang = currentLang;
  }

  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    saveLanguage();
    applyLanguage();
    playSound("click", 0.25);
    toast(lang === "hi" ? "भाषा: हिंदी" : "Language: English");
  }

  /* =========================================================
     2. YEARLY WRAP-UP
  ========================================================== */
  function calculateWrapUpStats() {
    const year = new Date().getFullYear();
    const vault = state.vault;

    const watched = vault.filter(function (m) {
      return m.status === "watched";
    });

    const totalHours = Math.round(
      watched.reduce(function (sum, m) { return sum + (m.runtime || 0); }, 0) / 60
    );

    const favorites = vault.filter(function (m) { return m.favorite; }).length;

    // Top genres
    const genreCount = {};
    watched.forEach(function (m) {
      if (!m.genre) return;
      m.genre.split(",").forEach(function (g) {
        const clean = g.trim();
        if (!clean) return;
        genreCount[clean] = (genreCount[clean] || 0) + 1;
      });
    });

    const topGenres = Object.keys(genreCount)
      .map(function (name) { return { name: name, count: genreCount[name] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 5);

    // Top movie (highest rated)
    const rated = watched.filter(function (m) { return m.userRating > 0; });
    rated.sort(function (a, b) { return b.userRating - a.userRating; });
    const topMovie = rated[0] || null;

    // Most active month
    const monthCount = {};
    watched.forEach(function (m) {
      if (!m.watchedAt) return;
      const month = new Date(m.watchedAt).toLocaleDateString("en-IN", { month: "long" });
      monthCount[month] = (monthCount[month] || 0) + 1;
    });

    let topMonth = "—";
    let topMonthCount = 0;
    Object.keys(monthCount).forEach(function (m) {
      if (monthCount[m] > topMonthCount) {
        topMonth = m;
        topMonthCount = monthCount[m];
      }
    });

    return {
      year: year,
      totalWatched: watched.length,
      totalHours: totalHours,
      favorites: favorites,
      totalItems: vault.length,
      topGenres: topGenres,
      topMovie: topMovie,
      topMonth: topMonth,
      topMonthCount: topMonthCount
    };
  }

  function openWrapUp() {
    const modal = $("wrapUpModal");
    const container = $("wrapUpContainer");
    if (!modal || !container) return;

    const stats = calculateWrapUpStats();

    let html = '<div class="wrapup-content">';

    // Year
    html += '<div class="wrapup-year">' + stats.year + '</div>';
    html += '<div class="wrapup-subtitle">Your Year in Movies</div>';

    // Stats grid
    html += '<div class="wrapup-stats">';
    html += '<div class="wrapup-stat">';
    html +=   '<span class="wrapup-stat-icon">🎬</span>';
    html +=   '<span class="wrapup-stat-num">' + stats.totalWatched + '</span>';
    html +=   '<span class="wrapup-stat-label">Movies Watched</span>';
    html += '</div>';
    html += '<div class="wrapup-stat">';
    html +=   '<span class="wrapup-stat-icon">⏱️</span>';
    html +=   '<span class="wrapup-stat-num">' + stats.totalHours + '</span>';
    html +=   '<span class="wrapup-stat-label">Hours Spent</span>';
    html += '</div>';
    html += '<div class="wrapup-stat">';
    html +=   '<span class="wrapup-stat-icon">❤️</span>';
    html +=   '<span class="wrapup-stat-num">' + stats.favorites + '</span>';
    html +=   '<span class="wrapup-stat-label">Favorites</span>';
    html += '</div>';
    html += '<div class="wrapup-stat">';
    html +=   '<span class="wrapup-stat-icon">📚</span>';
    html +=   '<span class="wrapup-stat-num">' + stats.totalItems + '</span>';
    html +=   '<span class="wrapup-stat-label">In Vault</span>';
    html += '</div>';
    html += '</div>';

    // Top movie highlight
    if (stats.topMovie) {
      html += '<div class="wrapup-highlight">';
      html +=   '<span class="wrapup-highlight-icon">👑</span>';
      html +=   '<div class="wrapup-highlight-title">Your Top Pick</div>';
      html +=   '<div class="wrapup-highlight-text">' + esc(stats.topMovie.title) + ' — ' + (stats.topMovie.userRating || 0) + ' ⭐</div>';
      html += '</div>';
    }

    // Most active month
    if (stats.topMonth !== "—") {
      html += '<div class="wrapup-highlight" style="background:linear-gradient(135deg, rgba(168,85,247,.15), rgba(236,72,153,.15));border-color:var(--accent)">';
      html +=   '<span class="wrapup-highlight-icon">📅</span>';
      html +=   '<div class="wrapup-highlight-title">Most Active Month</div>';
      html +=   '<div class="wrapup-highlight-text">' + esc(stats.topMonth) + ' — ' + stats.topMonthCount + ' movies</div>';
      html += '</div>';
    }

    // Top genres
    if (stats.topGenres.length > 0) {
      html += '<div style="text-align:center;margin-bottom:12px">';
      html +=   '<div style="font-size:.7rem;letter-spacing:2px;color:var(--text-mute);font-weight:800;text-transform:uppercase;margin-bottom:12px">Your Top Genres</div>';
      html +=   '<div class="wrapup-genres">';
      stats.topGenres.forEach(function (g, i) {
        html += '<span class="wrapup-genre-chip ' + (i === 0 ? 'top' : '') + '">' + esc(g.name) + ' (' + g.count + ')</span>';
      });
      html +=   '</div>';
      html += '</div>';
    }

    // Share buttons
    html += '<div class="wrapup-share">';
    html +=   '<button id="wrapupCopyBtn" class="primary">📋 Copy Summary</button>';
    html +=   '<button id="wrapupShareBtn">🔗 Share</button>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;

    // Bind share buttons
    const copyBtn = $("wrapupCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const text = "🎬 My " + stats.year + " in Movies\n" +
                     "━━━━━━━━━━━━━━━\n" +
                     "🎬 Watched: " + stats.totalWatched + " movies\n" +
                     "⏱️ Hours: " + stats.totalHours + "\n" +
                     "❤️ Favorites: " + stats.favorites + "\n" +
                     (stats.topMovie ? "👑 Top: " + stats.topMovie.title + "\n" : "") +
                     (stats.topGenres[0] ? "🎭 Top genre: " + stats.topGenres[0].name + "\n" : "") +
                     "\nPowered by CineVault 🎬";

        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function () {
            toast("✓ Copied to clipboard");
            playSound("success", 0.3);
          });
        }
      });
    }

    const shareBtn = $("wrapupShareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        const text = "🎬 My " + stats.year + " in Movies — " +
                     stats.totalWatched + " watched, " +
                     stats.totalHours + " hours spent!";

        if (navigator.share) {
          navigator.share({ title: "My Movie Year", text: text }).catch(function () {});
        } else {
          toast("Sharing not supported", true);
        }
      });
    }

    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeWrapUp() {
    const modal = $("wrapUpModal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  /* =========================================================
     3. FRIENDS - SHARE INDIVIDUAL REVIEW
  ========================================================== */
  function shareMovieAsFriend(movieId) {
    const m = state.vault.find(function (v) { return v.id === movieId; });
    if (!m) return;

    const text = "🎬 " + m.title + " (" + m.year + ")\n" +
                 (m.userRating ? "⭐ My Rating: " + m.userRating + "/5\n" : "") +
                 (m.genre ? "🎭 " + m.genre + "\n" : "") +
                 (m.overview ? "\n" + m.overview.slice(0, 200) + "...\n" : "") +
                 "\nShared from CineVault 🎬";

    if (navigator.share) {
      navigator.share({ title: m.title, text: text }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        toast("✓ Copied for sharing");
      });
    } else {
      toast("Sharing not supported", true);
    }
  }

  /* =========================================================
     4. PWA INSTALL
  ========================================================== */
  let deferredPrompt = null;

  function setupPWAPrompt() {
    // Listen for install prompt
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showPWAButton();
    });

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if user dismissed
    try {
      if (localStorage.getItem(PWA_DISMISSED_KEY) === "1") return;
    } catch (e) {}

    // Show button after 5 seconds if installable
    setTimeout(function () {
      if (deferredPrompt) showPWAButton();
    }, 5000);
  }

  function showPWAButton() {
    const btn = $("pwaInstallBtn");
    if (!btn) return;
    btn.classList.add("show");
  }

  function hidePWAButton() {
    const btn = $("pwaInstallBtn");
    if (btn) btn.classList.remove("show");
  }

  async function installPWA() {
    if (!deferredPrompt) {
      toast("Install prompt not available", true);
      return;
    }

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === "accepted") {
      toast("🎉 CineVault installed!");
      playSound("success", 0.4);
    }

    deferredPrompt = null;
    hidePWAButton();
  }

  function dismissPWA() {
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, "1");
    } catch (e) {}
    hidePWAButton();
  }

  /* =========================================================
     5. OFFLINE INDICATOR
  ========================================================== */
  function setupOfflineIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "offline-indicator";
    indicator.id = "offlineIndicator";
    indicator.textContent = "📡 You are offline — changes will sync when online";
    document.body.appendChild(indicator);

    function update() {
      if (!navigator.onLine) {
        indicator.classList.add("on");
      } else {
        indicator.classList.remove("on");
      }
    }

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  /* =========================================================
     6. BIND UI
  ========================================================== */
  function bindUI() {
    // Wrap-up button (need to add to header)
    // For now, we'll listen for a keyboard shortcut and click via existing button

    // Wrap-up modal close
    const wrapClose = $("wrapUpClose");
    if (wrapClose) wrapClose.addEventListener("click", closeWrapUp);

    const wrapModal = $("wrapUpModal");
    if (wrapModal) {
      wrapModal.addEventListener("click", function (e) {
        if (e.target === wrapModal) closeWrapUp();
      });
    }

    // PWA button
    const pwaBtn = $("pwaInstallBtn");
    if (pwaBtn) {
      pwaBtn.addEventListener("click", installPWA);
    }

    // Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const wu = $("wrapUpModal");
        if (wu && wu.classList.contains("on")) closeWrapUp();
      }
    });
  }

  /* =========================================================
     7. CREATE FLOATING BUTTONS (Wrap-Up + Language)
  ========================================================== */
  function createFloatingButtons() {
    // PWA Install button
    if (!$("pwaInstallBtn")) {
      const pwaBtn = document.createElement("button");
      pwaBtn.id = "pwaInstallBtn";
      pwaBtn.className = "pwa-install-btn";
      pwaBtn.innerHTML = '📱 Install App';
      pwaBtn.addEventListener("click", installPWA);
      document.body.appendChild(pwaBtn);
    }

    // Wrap-Up button (in header actions)
    const actions = document.querySelector(".actions");
    if (actions && !$("wrapUpBtn")) {
      const wrapBtn = document.createElement("button");
      wrapBtn.className = "btn btn-icon";
      wrapBtn.id = "wrapUpBtn";
      wrapBtn.title = "Yearly Wrap-Up";
      wrapBtn.textContent = "🎊";
      wrapBtn.addEventListener("click", function () {
        playSound("click", 0.25);
        openWrapUp();
      });
      // Insert before theme toggle
      const themeToggle = $("themeToggle");
      if (themeToggle) {
        actions.insertBefore(wrapBtn, themeToggle);
      } else {
        actions.appendChild(wrapBtn);
      }
    }
  }

  /* =========================================================
     8. EXPORTS
  ========================================================== */
  window.CV_PRO = {
    openWrapUp: openWrapUp,
    closeWrapUp: closeWrapUp,
    shareMovieAsFriend: shareMovieAsFriend,
    setLanguage: setLanguage,
    getLanguage: function () { return currentLang; },
    installPWA: installPWA
  };

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    loadLanguage();
    applyLanguage();
    bindUI();
    setupPWAPrompt();
    setupOfflineIndicator();
    createFloatingButtons();

    console.log("🎬 CineVault Pro module loaded");
    console.log("   🌐 Language:", currentLang);
    console.log("   📱 PWA ready");
    console.log("   🎊 Yearly Wrap-Up ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();