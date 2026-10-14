/* =========================================================
   CINEVAULT — ADS & RECOMMENDATIONS MODULE
   FilmyFly — Highly Recommended + Disclaimer
   (2nd website slot ready — just add to PARTNERS array)
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before ads.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  /* =========================================================
     📌 PARTNERS ARRAY
     Add 2nd website here when ready — just add a new object
  ========================================================== */
  const PARTNERS = [
    {
      id: "filmyfly",
      name: "FilmyFly",
      emoji: "🎬",
      description: "Watch movies online in HD",
      url: "https://filmyfly.care/",
      // Search on Google for specific movie
      useSearch: true,
      // Search domain hint (adds site:filmyfly.care in query)
      siteHint: "filmyfly.care"
    }
    // ⬇️ 2nd website — add here when ready ⬇️
    /*
    ,
    {
      id: "website2",
      name: "Website 2 Name",
      emoji: "⬇️",
      description: "Download movies and series",
      url: "https://website2.com/",
      useSearch: true,
      siteHint: "website2.com"
    }
    */
  ];

  /* =========================================================
     BUILD GOOGLE SEARCH LINK
     Creates: google.com/search?q=MOVIE TITLE YEAR site:hint
  ========================================================== */
  function buildSearchUrl(partner, movie) {
    const title = (movie && movie.title) ? movie.title : "";
    const year = (movie && movie.year && movie.year !== "—") ? movie.year : "";

    let query = title;
    if (year) query += " " + year;
    if (partner.siteHint) query += " site:" + partner.siteHint;

    return "https://www.google.com/search?q=" + encodeURIComponent(query);
  }

  function getPartnerUrl(partner, movie) {
    if (partner.useSearch && movie) {
      return buildSearchUrl(partner, movie);
    }
    return partner.url;
  }

  /* =========================================================
     1. MODAL SECTION — INJECT INTO MOVIE MODAL
  ========================================================== */
  function injectModalSection(movie) {
    if (!movie) return;

    const modal = $("movieModal");
    if (!modal) return;

    // Find where to inject — before #watchSection
    const watchSection = $("watchSection");
    if (!watchSection || !watchSection.parentNode) return;

    // Remove old section if exists
    const old = $("recSection");
    if (old) old.remove();

    // Build new section
    const section = document.createElement("div");
    section.className = "rec-section";
    section.id = "recSection";

    let html = '';
    html += '<div class="rec-header">';
    html +=   '<span class="rec-header-icon">⭐</span>';
    html +=   '<h3>Highly Recommended</h3>';
    html += '</div>';

    html += '<div class="rec-cards">';

    PARTNERS.forEach(function (p) {
      const url = getPartnerUrl(p, movie);
      html += '<a class="rec-card" href="' + url + '" target="_blank" rel="noopener noreferrer nofollow">';
      html +=   '<div class="rec-card-icon">' + p.emoji + '</div>';
      html +=   '<div class="rec-card-info">';
      html +=     '<strong>' + p.name + '</strong>';
      html +=     '<small>' + p.description + '</small>';
      html +=   '</div>';
      html +=   '<div class="rec-card-arrow">→</div>';
      html += '</a>';
    });

    // Placeholder for 2nd website slot (visible design hint)
    if (PARTNERS.length < 2) {
      html += '<div class="rec-empty">';
      html +=   '📌 2nd recommended site will appear here';
      html += '</div>';
    }

    html += '</div>';

    // Disclaimer
    html += '<div class="rec-disclaimer">';
    html +=   '<div class="rec-disclaimer-title">⚠️ Disclaimer</div>';
    html +=   '<p>CineVault is a personal tracker only. We do NOT host, upload, or distribute any content. External links open in Google search results — you are responsible for how you use them. Please support official platforms like Netflix, Prime Video, and JioCinema.</p>';
    html += '</div>';

    section.innerHTML = html;

    // Insert before watch section
    watchSection.parentNode.insertBefore(section, watchSection);
  }

  /* =========================================================
     2. HOMEPAGE BANNER — INJECT ON PAGE LOAD
  ========================================================== */
  function injectHomepageBanner() {
    const searchArea = $("searchArea");
    if (!searchArea || !searchArea.parentNode) return;

    // Remove old banner
    const old = $("partnersBanner");
    if (old) old.remove();

    // Build banner
    const banner = document.createElement("section");
    banner.className = "partners-banner";
    banner.id = "partnersBanner";

    let html = '';
    html += '<div class="partners-header">';
    html +=   '<span class="partners-header-icon">📢</span>';
    html +=   '<h3>Recommended Partners</h3>';
    html +=   '<small>Trusted sites</small>';
    html += '</div>';

    html += '<div class="partners-list">';

    PARTNERS.forEach(function (p) {
      // For homepage, no specific movie → use main URL
      const url = p.url;
      html += '<a class="partner-item" href="' + url + '" target="_blank" rel="noopener noreferrer nofollow">';
      html +=   '<div class="partner-item-icon">' + p.emoji + '</div>';
      html +=   '<div class="partner-item-info">';
      html +=     '<strong>' + p.name + '</strong>';
      html +=     '<small>' + p.description + '</small>';
      html +=   '</div>';
      html +=   '<div class="partner-item-cta">Visit →</div>';
      html += '</a>';
    });

    // Placeholder for 2nd website
    if (PARTNERS.length < 2) {
      html += '<div class="partner-item" style="opacity:.5;cursor:not-allowed;pointer-events:none">';
      html +=   '<div class="partner-item-icon" style="background:var(--surface-2);color:var(--text-mute)">📌</div>';
      html +=   '<div class="partner-item-info">';
      html +=     '<strong>Coming Soon</strong>';
      html +=     '<small>2nd partner slot</small>';
      html +=   '</div>';
      html += '</div>';
    }

    html += '</div>';

    // Disclaimer below
    html += '<div class="partners-disclaimer">';
    html +=   '<p><strong>⚠️ Note:</strong> CineVault is a personal tracker only. We do not host any content. External links are for reference. Please support official platforms.</p>';
    html += '</div>';

    banner.innerHTML = html;

    // Insert after search area (before stats)
    const statsSection = $("stats");
    if (statsSection && statsSection.parentNode) {
      statsSection.parentNode.insertBefore(banner, statsSection);
    } else {
      searchArea.parentNode.insertBefore(banner, searchArea.nextSibling);
    }
  }

  /* =========================================================
     HOOK INTO MOVIE MODAL
     Watch for modal open, then inject section
  ========================================================== */
  function hookIntoModal() {
    // Observe the movie modal for changes
    const modal = $("movieModal");
    if (!modal) return;

    // Watch when modal opens (class 'on' added)
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class" && modal.classList.contains("on")) {
          // Modal just opened
          const movieId = state.modalId;
          if (movieId) {
            const movie = state.vault.find(function (v) { return v.id === movieId; });
            if (movie) {
              // Small delay to ensure other sections rendered first
              setTimeout(function () {
                injectModalSection(movie);
              }, 100);
            }
          }
        }
      });
    });

    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  /* =========================================================
     INJECT DEFAULT DISCLAIMER (if no banner)
     Safe fallback: place disclaimer in footer
  ========================================================== */
  function injectFooterDisclaimer() {
    const footer = document.querySelector(".footer");
    if (!footer) return;

    // Don't duplicate
    if ($("globalDisclaimer")) return;

    const div = document.createElement("div");
    div.className = "partners-disclaimer";
    div.id = "globalDisclaimer";
    div.style.marginTop = "20px";
    div.innerHTML =
      '<p><strong>⚠️ Legal Notice:</strong> CineVault is a personal movie tracker. ' +
      'We do not host, upload, or distribute any content. All external links are ' +
      'for reference only. Please support official platforms like Netflix, Prime Video, and JioCinema.</p>';

    footer.parentNode.insertBefore(div, footer);
  }

  /* =========================================================
     PUBLIC API — for adding 2nd website dynamically
  ========================================================== */
  function addPartner(partner) {
    if (!partner || !partner.name || !partner.url) {
      console.error("❌ Invalid partner. Required: { name, url }");
      return;
    }

    PARTNERS.push({
      id: partner.id || "partner-" + Date.now(),
      name: partner.name,
      emoji: partner.emoji || "🎬",
      description: partner.description || "Recommended site",
      url: partner.url,
      useSearch: partner.useSearch !== false,
      siteHint: partner.siteHint || new URL(partner.url).hostname.replace("www.", "")
    });

    // Re-render banner
    injectHomepageBanner();

    // Re-render current modal if open
    if (state.modalId) {
      const movie = state.vault.find(function (v) { return v.id === state.modalId; });
      if (movie) injectModalSection(movie);
    }

    console.log("✅ Partner added:", partner.name);
  }

  /* =========================================================
     INIT
  ========================================================== */
  function init() {
    // Inject banner on homepage
    injectHomepageBanner();

    // Hook into modal
    hookIntoModal();

    // Footer disclaimer
    setTimeout(injectFooterDisclaimer, 500);

    console.log("🎬 CineVault Ads module loaded");
    console.log("   ⭐ Partners:", PARTNERS.length);
    console.log("   📌 Add more via window.CV_ADS.addPartner({...})");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_ADS = {
    addPartner: addPartner,
    getPartners: function () { return PARTNERS.slice(); },
    injectModalSection: injectModalSection,
    injectHomepageBanner: injectHomepageBanner
  };

})();