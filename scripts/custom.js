/* =========================================================
   CINEVAULT — CUSTOM MODULE
   Phase 7: Extra Themes, Custom Cursor, Particles, Smart Collections
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before custom.js");
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
     EXTRA THEMES
  ========================================================== */
  const EXTRA_THEMES = [
    { id: "gold",     label: "Cinema Gold",    color: "linear-gradient(135deg,#ffb800,#ff8c42)" },
    { id: "cyan",     label: "Midnight Blue",  color: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
    { id: "purple",   label: "Royal Purple",   color: "linear-gradient(135deg,#a855f7,#ec4899)" },
    { id: "green",    label: "Emerald",        color: "linear-gradient(135deg,#22c55e,#84cc16)" },
    { id: "red",      label: "Classic Red",    color: "linear-gradient(135deg,#ef4444,#f97316)" },
    { id: "pink",     label: "Rose Pink",      color: "linear-gradient(135deg,#ec4899,#f472b6)" },
    { id: "tokyo",    label: "Neo Tokyo",      color: "linear-gradient(135deg,#00f0ff,#ff00e5)" },
    { id: "paper",    label: "Editorial Paper",color: "linear-gradient(135deg,#f5f1e8,#c9452c)" },
    { id: "vhs",      label: "Retro VHS",      color: "linear-gradient(135deg,#ff006e,#8338ec)" },
    { id: "emerald",  label: "Deep Emerald",   color: "linear-gradient(135deg,#d4af37,#0e7c5a)" }
  ];

  function renderCustomThemePicker() {
    const picker = $("customThemePicker");
    if (!picker) return;

    picker.style.display = "flex";
    picker.innerHTML = '<span class="theme-picker-label" style="font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--text-mute);font-weight:800;margin-right:6px">All Themes</span>';

    EXTRA_THEMES.forEach(function (theme) {
      const btn = document.createElement("button");
      btn.className = "theme-btn-pro" + (document.body.dataset.accent === theme.id ? " active" : "");
      btn.dataset.accent = theme.id;
      btn.innerHTML = '<span class="theme-dot-pro" style="background:' + theme.color + '"></span>' + theme.label;
      btn.addEventListener("click", function () {
        applyThemePro(theme.id);
        playSound("click", 0.25);
      });
      picker.appendChild(btn);
    });
  }

  function applyThemePro(themeId) {
    document.body.dataset.accent = themeId;
    document.querySelectorAll("#customThemePicker .theme-btn-pro").forEach(function (b) {
      b.classList.toggle("active", b.dataset.accent === themeId);
    });
    // Also sync old swatch picker
    document.querySelectorAll(".swatch").forEach(function (s) {
      s.classList.toggle("active", s.dataset.accent === themeId);
    });
    try {
      localStorage.setItem("cv_theme_v4", themeId);
    } catch (e) {}
  }

  /* =========================================================
     CUSTOM CURSOR
  ========================================================== */
  function setupCustomCursor() {
    // Only on desktop (pointer fine)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.body.classList.add("custom-cursor");

    const cursor = document.createElement("div");
    cursor.className = "cv-cursor";
    document.body.appendChild(cursor);

    const dot = document.createElement("div");
    dot.className = "cv-cursor-dot";
    document.body.appendChild(dot);

    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
    });

    // Smooth follow animation
    function animate() {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cursor.style.left = cursorX + "px";
      cursor.style.top = cursorY + "px";
      requestAnimationFrame(animate);
    }
    animate();

    // Hover detection
    document.addEventListener("mouseover", function (e) {
      const target = e.target.closest("a, button, .movie, .chip, input, select, textarea, .stat");
      if (target) cursor.classList.add("hover");
    });
    document.addEventListener("mouseout", function (e) {
      const target = e.target.closest("a, button, .movie, .chip, input, select, textarea, .stat");
      if (target) cursor.classList.remove("hover");
    });
  }

  /* =========================================================
     FLOATING PARTICLES
  ========================================================== */
  function setupParticles() {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    const container = document.createElement("div");
    container.className = "cv-particles";
    document.body.appendChild(container);

    const colors = ["var(--primary)", "var(--accent)", "var(--accent-2)"];

    // Create 15 particles
    for (let i = 0; i < 15; i++) {
      const p = document.createElement("div");
      p.className = "cv-particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.bottom = "-10px";
      p.style.animationDuration = (10 + Math.random() * 15) + "s";
      p.style.animationDelay = (Math.random() * 10) + "s";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.boxShadow = "0 0 8px " + p.style.background;
      container.appendChild(p);
    }
  }

  /* =========================================================
     SMART COLLECTIONS
  ========================================================== */
  function buildSmartCollections() {
    const collections = [];

    // Marvel MCU
    const mcu = state.vault.filter(function (m) {
      const t = (m.title || "").toLowerCase();
      return t.indexOf("avengers") !== -1 ||
             t.indexOf("iron man") !== -1 ||
             t.indexOf("thor") !== -1 ||
             t.indexOf("captain america") !== -1 ||
             t.indexOf("black panther") !== -1 ||
             t.indexOf("spider-man") !== -1 ||
             t.indexOf("guardians of the galaxy") !== -1 ||
             t.indexOf("doctor strange") !== -1 ||
             t.indexOf("ant-man") !== -1 ||
             t.indexOf("captain marvel") !== -1 ||
             t.indexOf("black widow") !== -1 ||
             t.indexOf("eternals") !== -1 ||
             t.indexOf("shang-chi") !== -1 ||
             t.indexOf("loki") !== -1 ||
             t.indexOf("wandavision") !== -1 ||
             t.indexOf("deadpool") !== -1 ||
             t.indexOf("fantastic four") !== -1 ||
             t.indexOf("thunderbolts") !== -1;
    });
    if (mcu.length >= 2) {
      collections.push({ id: "mcu", name: "Marvel Movies", icon: "🦸", movies: mcu });
    }

    // Harry Potter
    const hp = state.vault.filter(function (m) {
      return (m.title || "").toLowerCase().indexOf("harry potter") !== -1 ||
             (m.title || "").toLowerCase().indexOf("fantastic beasts") !== -1;
    });
    if (hp.length >= 2) {
      collections.push({ id: "hp", name: "Harry Potter", icon: "⚡", movies: hp });
    }

    // Star Wars
    const sw = state.vault.filter(function (m) {
      return (m.title || "").toLowerCase().indexOf("star wars") !== -1;
    });
    if (sw.length >= 2) {
      collections.push({ id: "sw", name: "Star Wars", icon: "🌌", movies: sw });
    }

    // Oscars Winners (high rating)
    const oscar = state.vault.filter(function (m) {
      return (m.userRating || 0) >= 4 || (m.tmdbRating || 0) >= 8;
    });
    if (oscar.length >= 3) {
      collections.push({ id: "oscar", name: "Top Rated", icon: "🏆", movies: oscar });
    }

    // Recent Additions (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = state.vault.filter(function (m) {
      return (m.addedAt || 0) > thirtyDaysAgo;
    });
    if (recent.length >= 3) {
      collections.push({ id: "recent", name: "Recently Added", icon: "🆕", movies: recent });
    }

    // Favorites
    const favs = state.vault.filter(function (m) { return m.favorite; });
    if (favs.length >= 3) {
      collections.push({ id: "favs", name: "My Favorites", icon: "❤️", movies: favs });
    }

    // Web Series
    const series = state.vault.filter(function (m) {
      return m.type === "series" || m.type === "tv";
    });
    if (series.length >= 2) {
      collections.push({ id: "series", name: "Web Series", icon: "📺", movies: series });
    }

    // Movies
    const movies = state.vault.filter(function (m) {
      return m.type !== "series" && m.type !== "tv";
    });
    if (movies.length >= 3) {
      collections.push({ id: "movies", name: "All Movies", icon: "🎬", movies: movies });
    }

    // By top genre
    const genreCount = {};
    state.vault.forEach(function (m) {
      if (!m.genre) return;
      m.genre.split(",").forEach(function (g) {
        const clean = g.trim();
        if (!clean) return;
        if (!genreCount[clean]) genreCount[clean] = [];
        genreCount[clean].push(m);
      });
    });

    const topGenres = Object.keys(genreCount)
      .filter(function (g) { return genreCount[g].length >= 3; })
      .sort(function (a, b) { return genreCount[b].length - genreCount[a].length; })
      .slice(0, 3);

    topGenres.forEach(function (g, i) {
      collections.push({
        id: "genre-" + g.toLowerCase(),
        name: g + " Collection",
        icon: "🎭",
        movies: genreCount[g]
      });
    });

    return collections;
  }

  function openSmartCollections() {
    const modal = $("smartCollectionsModal");
    const list = $("smartCollectionsList");
    if (!modal || !list) return;

    const collections = buildSmartCollections();

    if (collections.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:.85rem">' +
        'Add more movies to your vault to see smart collections!</div>';
    } else {
      list.innerHTML = collections.map(function (c) {
        return '<div class="smart-collection-item" data-col-id="' + esc(c.id) + '">' +
          '<div class="smart-collection-icon">' + c.icon + '</div>' +
          '<div class="smart-collection-info">' +
            '<strong>' + esc(c.name) + '</strong>' +
            '<small>Auto-generated playlist</small>' +
          '</div>' +
          '<div class="smart-collection-count">' + c.movies.length + '</div>' +
        '</div>';
      }).join("");

      list.querySelectorAll(".smart-collection-item").forEach(function (item) {
        item.addEventListener("click", function () {
          const colId = item.dataset.colId;
          const col = collections.find(function (c) { return c.id === colId; });
          if (!col) return;

          playSound("whoosh", 0.2);

          // Show collection as alert with titles
          const titles = col.movies.map(function (m) { return "• " + m.title; }).join("\n");
          alert("📚 " + col.name + "\n\n" + titles);
        });
      });
    }

    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeSmartCollections() {
    const modal = $("smartCollectionsModal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }

  /* =========================================================
     KEYBOARD SHORTCUTS
  ========================================================== */
  function setupShortcuts() {
    document.addEventListener("keydown", function (e) {
      // Don't trigger in input fields
      if (e.target.closest("input, textarea, select")) return;

      // "t" = theme cycle
      if (e.key === "t" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const currentIdx = EXTRA_THEMES.findIndex(function (t) {
          return t.id === document.body.dataset.accent;
        });
        const nextIdx = (currentIdx + 1) % EXTRA_THEMES.length;
        applyThemePro(EXTRA_THEMES[nextIdx].id);
        toast("🎨 " + EXTRA_THEMES[nextIdx].label);
      }
    });
  }

  /* =========================================================
     BIND UI
  ========================================================== */
  function bindUI() {
    // Smart Collections - create button in header
    const actions = document.querySelector(".actions");
    if (actions && !$("smartCollectionsBtn")) {
      const btn = document.createElement("button");
      btn.className = "btn btn-icon";
      btn.id = "smartCollectionsBtn";
      btn.title = "Smart Collections";
      btn.textContent = "📚";
      btn.addEventListener("click", function () {
        playSound("click", 0.25);
        openSmartCollections();
      });
      const themeToggle = $("themeToggle");
      if (themeToggle) {
        actions.insertBefore(btn, themeToggle);
      } else {
        actions.appendChild(btn);
      }
    }

    // Smart collections close
    const closeBtn = $("smartCollectionsClose");
    if (closeBtn) closeBtn.addEventListener("click", closeSmartCollections);

    const modal = $("smartCollectionsModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeSmartCollections();
      });
    }

    // Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const sc = $("smartCollectionsModal");
        if (sc && sc.classList.contains("on")) closeSmartCollections();
      }
    });

    // Old swatch picker → sync with new theme picker
    document.querySelectorAll(".swatch").forEach(function (sw) {
      sw.addEventListener("click", function () {
        applyThemePro(sw.dataset.accent);
      });
    });
  }

  /* =========================================================
     RENDER ALL
  ========================================================== */
  function renderAll() {
    renderCustomThemePicker();
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_CUSTOM = {
    renderAll: renderAll,
    applyTheme: applyThemePro,
    openSmartCollections: openSmartCollections,
    closeSmartCollections: closeSmartCollections,
    buildSmartCollections: buildSmartCollections
  };

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    // Apply saved theme
    try {
      const saved = localStorage.getItem("cv_theme_v4") || "gold";
      applyThemePro(saved);
    } catch (e) {}

    renderCustomThemePicker();
    bindUI();
    setupShortcuts();

    // Cursor + particles (only on desktop)
    setTimeout(function () {
      setupCustomCursor();
      setupParticles();
    }, 800);

    console.log("🎬 CineVault Custom module loaded");
    console.log("   🎨 Extra themes, ✨ Cursor, 💫 Particles, 📚 Smart Collections");
    console.log("   ⌨️ Shortcut: press 'T' to cycle themes");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();