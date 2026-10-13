/* =========================================================
   CINEVAULT — REVIEWS MODULE
   Multiple reviews per movie/series with spoiler toggle
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  const state = window.CV;

  if (!CFG || !state) {
    console.error("❌ config.js not loaded before reviews.js");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg, isError) {
    if (window.CV_APP && window.CV_APP.toast) {
      window.CV_APP.toast(msg, isError);
    }
  }

  /* =========================================================
     STATE
  ========================================================== */
  let currentReviewMovieId = null;
  let editingReviewId = null;
  let reviewRating = 0;

  /* =========================================================
     RENDER REVIEWS LIST (in movie modal)
  ========================================================== */
  function renderReviews(movie) {
    const section = $("reviewsSection");
    const list = $("reviewsList");
    const countEl = $("reviewsCount");
    if (!section || !list) return;

    if (!movie) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    const reviews = Array.isArray(movie.reviews) ? movie.reviews : [];

    // Update count
    if (countEl) {
      countEl.textContent = reviews.length + (reviews.length === 1 ? " review" : " reviews");
    }

    // Empty state
    if (reviews.length === 0) {
      list.innerHTML =
        '<div class="reviews-empty">' +
          '<span class="reviews-empty-icon">✍️</span>' +
          '<strong>No reviews yet</strong>' +
          'Share your thoughts about this ' + (movie.type === "series" ? "series" : "movie") +
        '</div>';
      return;
    }

    // Sort by newest first
    const sorted = reviews.slice().sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    list.innerHTML = sorted.map(function (r) {
      const date = new Date(r.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });
      const time = new Date(r.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit"
      });

      // Stars
      let starsHTML = "";
      for (let i = 1; i <= 5; i++) {
        starsHTML += '<span class="rs' + (i <= (r.rating || 0) ? ' on' : '') + '">★</span>';
      }

      const spoilerClass = r.spoiler ? " spoiler-hidden" : "";
      const spoilerTag = r.spoiler ? '<span class="review-spoiler-tag">⚠️ SPOILER</span>' : "";

      return '<div class="review-card" data-review-id="' + r.id + '">' +
        '<div class="review-card-header">' +
          '<div class="review-card-stars">' + starsHTML + '</div>' +
          '<div class="review-card-date">📅 ' + date + ' • ' + time + '</div>' +
        '</div>' +
        '<div class="review-card-text' + spoilerClass + '" data-review-text="' + r.id + '">' +
          esc(r.text) +
        '</div>' +
        '<div class="review-card-footer">' +
          spoilerTag +
          '<div class="review-card-actions">' +
            '<button class="review-action-btn" data-review-edit="' + r.id + '">✏️ Edit</button>' +
            '<button class="review-action-btn danger" data-review-delete="' + r.id + '">🗑 Delete</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    // Bind spoiler reveal (click to show)
    list.querySelectorAll("[data-review-text]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (el.classList.contains("spoiler-hidden")) {
          el.classList.remove("spoiler-hidden");
        }
      });
    });

    // Bind edit buttons
    list.querySelectorAll("[data-review-edit]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const reviewId = btn.dataset.reviewEdit;
        openReviewModal(movie.id, reviewId);
      });
    });

    // Bind delete buttons
    list.querySelectorAll("[data-review-delete]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const reviewId = btn.dataset.reviewDelete;
        deleteReview(movie.id, reviewId);
      });
    });
  }

  /* =========================================================
     OPEN REVIEW MODAL
  ========================================================== */
  function openReviewModal(movieId, reviewId) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie) return;

    currentReviewMovieId = movieId;
    editingReviewId = reviewId || null;
    reviewRating = 0;

    // Set modal header
    const titleEl = $("reviewModalTitle");
    const subEl = $("reviewModalSubtitle");

    if (reviewId) {
      if (titleEl) titleEl.textContent = "Edit Review";
      if (subEl) subEl.textContent = movie.title;
    } else {
      if (titleEl) titleEl.textContent = "Write Review";
      if (subEl) subEl.textContent = movie.title;
    }

    // Pre-fill if editing
    if (reviewId) {
      const reviews = movie.reviews || [];
      const r = reviews.find(function (rv) { return rv.id === reviewId; });
      if (r) {
        reviewRating = r.rating || 0;
        const textEl = $("reviewText");
        const spoilerEl = $("reviewSpoiler");
        if (textEl) textEl.value = r.text || "";
        if (spoilerEl) spoilerEl.checked = !!r.spoiler;
      }
    } else {
      // Clear form
      const textEl = $("reviewText");
      const spoilerEl = $("reviewSpoiler");
      if (textEl) textEl.value = "";
      if (spoilerEl) spoilerEl.checked = false;
    }

    // Update star picker
    updateStarPicker(reviewRating);

    // Update char count
    updateCharCount();

    // Show modal
    const modal = $("reviewModal");
    if (modal) {
      modal.classList.add("on");
      modal.setAttribute("aria-hidden", "false");
    }
    document.body.style.overflow = "hidden";

    // Focus text area
    setTimeout(function () {
      const textEl = $("reviewText");
      if (textEl) textEl.focus();
    }, 400);
  }

  /* =========================================================
     CLOSE REVIEW MODAL
  ========================================================== */
  function closeReviewModal() {
    const modal = $("reviewModal");
    if (modal) {
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
    currentReviewMovieId = null;
    editingReviewId = null;
    reviewRating = 0;
  }

  /* =========================================================
     UPDATE STAR PICKER
  ========================================================== */
  function updateStarPicker(rating) {
    const picker = $("reviewStarPicker");
    const label = $("reviewRatingLabel");
    if (!picker) return;

    picker.dataset.rating = rating;
    picker.querySelectorAll(".rstar").forEach(function (star, i) {
      star.classList.toggle("on", i < rating);
    });

    if (label) {
      if (rating === 0) {
        label.textContent = "Not rated";
        label.style.color = "var(--text-dim)";
      } else {
        const labels = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];
        label.textContent = rating + " / 5 — " + labels[rating];
        label.style.color = "#ffd700";
      }
    }
  }

  /* =========================================================
     UPDATE CHAR COUNT
  ========================================================== */
  function updateCharCount() {
    const textEl = $("reviewText");
    const countEl = $("reviewCharCount");
    if (!textEl || !countEl) return;

    const len = textEl.value.length;
    const max = 2000;
    countEl.textContent = len + " / " + max;

    if (len > max * 0.9) {
      countEl.classList.add("warning");
    } else {
      countEl.classList.remove("warning");
    }
  }

  /* =========================================================
     SUBMIT REVIEW
  ========================================================== */
  function submitReview(event) {
    event.preventDefault();

    if (!currentReviewMovieId) return;

    const movie = state.vault.find(function (m) { return m.id === currentReviewMovieId; });
    if (!movie) return;

    const textEl = $("reviewText");
    const spoilerEl = $("reviewSpoiler");
    const text = textEl ? textEl.value.trim() : "";
    const spoiler = spoilerEl ? spoilerEl.checked : false;

    // Validation
    if (reviewRating === 0) {
      toast("Please select a star rating", true);
      return;
    }

    if (text.length < 3) {
      toast("Review must be at least 3 characters", true);
      if (textEl) {
        textEl.classList.add("shake");
        setTimeout(function () { textEl.classList.remove("shake"); }, 500);
        textEl.focus();
      }
      return;
    }

    // Ensure reviews array
    if (!Array.isArray(movie.reviews)) {
      movie.reviews = [];
    }

    if (editingReviewId) {
      // Update existing
      const r = movie.reviews.find(function (rv) { return rv.id === editingReviewId; });
      if (r) {
        r.rating = reviewRating;
        r.text = text;
        r.spoiler = spoiler;
        r.updatedAt = Date.now();
      }
      toast("✓ Review updated");
    } else {
      // Add new
      const newReview = {
        id: "rev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        rating: reviewRating,
        text: text,
        spoiler: spoiler,
        createdAt: Date.now(),
        updatedAt: null
      };
      movie.reviews.push(newReview);

      // Also update movie's userRating to match latest review
      movie.userRating = reviewRating;

      toast("✓ Review added");
    }

    // Save
    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    // Update movie modal star rating to reflect new rating
    if (window.CV_FEATURES && window.CV_FEATURES.setStars) {
      window.CV_FEATURES.setStars(movie.userRating || 0);
    }

    // Re-render
    renderReviews(movie);

    // Close modal
    closeReviewModal();
  }

  /* =========================================================
     DELETE REVIEW
  ========================================================== */
  function deleteReview(movieId, reviewId) {
    const movie = state.vault.find(function (m) { return m.id === movieId; });
    if (!movie || !Array.isArray(movie.reviews)) return;

    if (!confirm("Delete this review?")) return;

    movie.reviews = movie.reviews.filter(function (r) { return r.id !== reviewId; });

    if (window.CV_APP && window.CV_APP.saveVault) window.CV_APP.saveVault();
    if (window.CV_AUTH && window.CV_AUTH.scheduleCloudSave) window.CV_AUTH.scheduleCloudSave();

    renderReviews(movie);
    toast("Review deleted");
  }

  /* =========================================================
     BIND UI EVENTS
  ========================================================== */
  function bindUI() {
    // Add review button
    const addBtn = $("addReviewBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        if (!state.modalId) return;
        openReviewModal(state.modalId, null);
      });
    }

    // Close button
    const closeBtn = $("reviewClose");
    if (closeBtn) closeBtn.addEventListener("click", closeReviewModal);

    // Cancel button
    const cancelBtn = $("reviewCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeReviewModal);

    // Click outside
    const modal = $("reviewModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeReviewModal();
      });
    }

    // Star picker clicks
    const picker = $("reviewStarPicker");
    if (picker) {
      picker.querySelectorAll(".rstar").forEach(function (star) {
        star.addEventListener("click", function () {
          const val = parseInt(star.dataset.value, 10);
          reviewRating = val;
          updateStarPicker(val);
          star.classList.add("pop");
          setTimeout(function () { star.classList.remove("pop"); }, 500);
        });

        // Hover effect
        star.addEventListener("mouseenter", function () {
          const val = parseInt(star.dataset.value, 10);
          picker.querySelectorAll(".rstar").forEach(function (s, i) {
            s.style.color = i < val ? "#ffd700" : "";
            s.style.webkitTextStroke = i < val ? "1.5px #ffd700" : "";
          });
        });
      });

      // Mouse leave - reset to current rating
      picker.addEventListener("mouseleave", function () {
        picker.querySelectorAll(".rstar").forEach(function (s, i) {
          s.style.color = "";
          s.style.webkitTextStroke = "";
        });
      });
    }

    // Char count
    const textEl = $("reviewText");
    if (textEl) {
      textEl.addEventListener("input", updateCharCount);
    }

    // Form submit
    const form = $("reviewForm");
    if (form) form.addEventListener("submit", submitReview);

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        const modal = $("reviewModal");
        if (modal && modal.classList.contains("on")) {
          closeReviewModal();
        }
      }
    });
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_REVIEWS = {
    renderReviews: renderReviews,
    openReviewModal: openReviewModal,
    closeReviewModal: closeReviewModal,
    deleteReview: deleteReview
  };

  // Auto-bind UI
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUI);
  } else {
    bindUI();
  }

  console.log("🎬 CineVault Reviews module loaded");

})();