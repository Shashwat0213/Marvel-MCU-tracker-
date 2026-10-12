/* =========================================================
   CINEVAULT — API MODULE
   TMDB multi-search (movies + TV) + iTunes fallback
========================================================= */

(function () {
  "use strict";

  const CFG = window.CV_CONFIG;
  if (!CFG) {
    console.error("❌ config.js not loaded before api.js");
    return;
  }

  /* ============ UTIL ============ */
  function sanitize(q) { return String(q || "").trim(); }
  function posterUrl(path, size) {
    if (!path) return "";
    return "https://image.tmdb.org/t/p/" + (size || "w500") + path;
  }

  /* =========================================================
     TMDB — MULTI-SEARCH (Movies + TV Series)
  ========================================================== */
  async function searchTMDB(query) {
    if (!CFG.TMDB_READY) return null;
    const q = sanitize(query);
    if (!q || q.length < 2) return null;

    const url =
      "https://api.themoviedb.org/3/search/multi" +
      "?api_key=" + encodeURIComponent(CFG.TMDB_KEY) +
      "&query=" + encodeURIComponent(q) +
      "&include_adult=false" +
      "&language=en-US" +
      "&page=1";

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("TMDB search HTTP", res.status);
        return null;
      }
      const data = await res.json();
      if (!data.results || !data.results.length) return [];

      // Filter out "person" results (multi-search returns movies, TV, AND people)
      const filtered = data.results.filter(function (m) {
        return m.media_type === "movie" || m.media_type === "tv";
      });

      return filtered.slice(0, CFG.APP_CONFIG.maxResults).map(function (m) {
        const isTV = m.media_type === "tv";
        const title = isTV
          ? (m.name || m.original_name || "Untitled")
          : (m.title || m.original_title || "Untitled");
        const dateStr = isTV ? m.first_air_date : m.release_date;

        return {
          source: "tmdb",
          sourceId: "tmdb-" + m.id,
          tmdbId: m.id,
          type: isTV ? "series" : "movie",
          title: title,
          year: (dateStr || "").slice(0, 4) || "—",
          releaseDate: dateStr || "",
          poster: posterUrl(m.poster_path, "w500"),
          backdrop: posterUrl(m.backdrop_path, "w780"),
          overview: m.overview || "",
          rating: m.vote_average || 0,
          genre: "",
          runtime: 0,
          trailerUrl: ""
        };
      });
    } catch (err) {
      console.warn("TMDB search failed:", err);
      return null;
    }
  }

  /* =========================================================
     iTunes — FALLBACK SEARCH
  ========================================================== */
  async function searchiTunes(query) {
    const q = sanitize(query);
    if (!q || q.length < 2) return [];

    const url =
      "https://itunes.apple.com/search" +
      "?term=" + encodeURIComponent(q) +
      "&media=movie" +
      "&entity=movie" +
      "&limit=" + CFG.APP_CONFIG.maxResults;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("iTunes HTTP " + res.status);
      const data = await res.json();

      return (data.results || []).map(function (m) {
        const poster = m.artworkUrl100
          ? m.artworkUrl100.replace("100x100bb", "600x900bb")
          : "";
        const releaseDate = m.releaseDate ? m.releaseDate.slice(0, 10) : "";

        return {
          source: "itunes",
          sourceId: "itunes-" + m.trackId,
          tmdbId: null,
          type: "movie",
          title: m.trackName || "Untitled",
          year: releaseDate ? releaseDate.slice(0, 4) : "—",
          releaseDate: releaseDate,
          poster: poster,
          backdrop: "",
          overview: m.longDescription || m.shortDescription || "",
          rating: 0,
          genre: m.primaryGenreName || "",
          runtime: m.trackTimeMillis ? Math.round(m.trackTimeMillis / 60000) : 0,
          trailerUrl: m.previewUrl || ""
        };
      });
    } catch (err) {
      console.warn("iTunes search failed:", err);
      return [];
    }
  }

  /* =========================================================
     UNIFIED SEARCH
  ========================================================== */
  async function searchMovies(query) {
    const tmdb = await searchTMDB(query);
    if (tmdb !== null && tmdb.length > 0) return tmdb;
    return searchiTunes(query);
  }

  /* =========================================================
     TMDB — FULL DETAILS (Movies + TV)
  ========================================================== */
  async function fetchTMDBDetails(tmdbId, isTV) {
    if (!CFG.TMDB_READY || !tmdbId) return null;

    const key = encodeURIComponent(CFG.TMDB_KEY);
    const id = encodeURIComponent(tmdbId);
    const mediaType = isTV ? "tv" : "movie";
    const base = "https://api.themoviedb.org/3/" + mediaType + "/" + id;

    try {
      const [dR, cR, vR] = await Promise.all([
        fetch(base + "?api_key=" + key),
        fetch(base + "/credits?api_key=" + key),
        fetch(base + "/videos?api_key=" + key)
      ]);

      const details = dR.ok ? await dR.json() : null;
      const credits = cR.ok ? await cR.json() : null;
      const videos = vR.ok ? await vR.json() : null;

      // Trailer
      let trailerUrl = "";
      if (videos && Array.isArray(videos.results)) {
        const yt =
          videos.results.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
          videos.results.find(v => v.site === "YouTube" && v.type === "Trailer") ||
          videos.results.find(v => v.site === "YouTube");
        if (yt) trailerUrl = "https://www.youtube.com/watch?v=" + yt.key;
      }

      // Cast
      let cast = [];
      if (credits && Array.isArray(credits.cast)) {
        cast = credits.cast.slice(0, 8).map(c => c.name);
      }

      // Director / Creator
      let director = "";
      if (credits && Array.isArray(credits.crew)) {
        const d = credits.crew.find(c => c.job === "Director");
        if (d) director = d.name;
      }
      if (!director && details && Array.isArray(details.created_by)) {
        director = details.created_by.map(c => c.name).join(", ");
      }

      // Genres
      const genre = details && Array.isArray(details.genres)
        ? details.genres.map(g => g.name).join(", ")
        : "";

      // Runtime (movies) or episode runtime (TV)
      let runtime = 0;
      if (details && details.runtime) runtime = details.runtime;
      else if (details && details.episode_run_time && details.episode_run_time[0]) {
        runtime = details.episode_run_time[0];
      }

      // Total episodes/seasons for TV
      const totalEpisodes = details && details.number_of_episodes ? details.number_of_episodes : 0;
      const totalSeasons = details && details.number_of_seasons ? details.number_of_seasons : 0;

      return {
        runtime: runtime,
        genre: genre,
        overview: (details && details.overview) || "",
        tmdbRating: (details && details.vote_average) || 0,
        trailerUrl: trailerUrl,
        cast: cast,
        director: director,
        releaseDate: (details && (details.release_date || details.first_air_date)) || "",
        totalEpisodes: totalEpisodes,
        totalSeasons: totalSeasons
      };
    } catch (err) {
      console.warn("TMDB details fetch failed:", err);
      return null;
    }
  }

  /* =========================================================
     TMDB — SIMILAR MOVIES (Movies only)
  ========================================================== */
  async function fetchSimilarMovies(tmdbId) {
    if (!CFG.TMDB_READY || !tmdbId) return [];

    const url =
      "https://api.themoviedb.org/3/movie/" +
      encodeURIComponent(tmdbId) +
      "/similar?api_key=" + encodeURIComponent(CFG.TMDB_KEY) +
      "&language=en-US&page=1";

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();

      return (data.results || []).slice(0, 6).map(function (m) {
        return {
          tmdbId: m.id,
          sourceId: "tmdb-" + m.id,
          type: "movie",
          title: m.title || m.original_title || "Untitled",
          year: (m.release_date || "").slice(0, 4) || "—",
          releaseDate: m.release_date || "",
          poster: posterUrl(m.poster_path, "w342"),
          overview: m.overview || "",
          rating: m.vote_average || 0
        };
      });
    } catch (err) {
      console.warn("Similar fetch failed:", err);
      return [];
    }
  }

  /* =========================================================
     BUILD MOVIE OBJECT
  ========================================================== */
  function buildMovieObject(result, extra, status) {
    extra = extra || {};
    const isSeries = result.type === "series" || result.type === "tv";

    const movie = {
      id: "cv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      sourceId: result.sourceId || ("manual-" + Date.now()),
      tmdbId: result.tmdbId || null,
      type: isSeries ? "series" : "movie",
      title: result.title || "Untitled",
      year: result.year || "—",
      releaseDate: extra.releaseDate || result.releaseDate || "",
      poster: result.poster || "",
      backdrop: result.backdrop || "",
      overview: extra.overview || result.overview || "",
      tmdbRating: extra.tmdbRating || Number(result.rating) || 0,
      genre: extra.genre || result.genre || "",
      runtime: extra.runtime || result.runtime || 0,
      cast: extra.cast || [],
      director: extra.director || "",
      trailerUrl: extra.trailerUrl || result.trailerUrl || "",
      watchUrl: "",
      downloadUrl: "",
      userRating: 0,
      notes: "",
      status: status || "want",
      favorite: false,
      addedAt: Date.now(),
      watchedAt: null
    };

    // Auto-initialize episodes for series
    if (isSeries) {
      const total = extra.totalEpisodes || 6;
      movie.totalEpisodes = total;
      movie.totalSeasons = extra.totalSeasons || 0;
      movie.episodes = [];
      for (let i = 1; i <= total; i++) {
        movie.episodes.push({ number: i, watched: false, watchedAt: null, rating: 0 });
      }
    }

    return movie;
  }

  /* =========================================================
     EXPORTS
  ========================================================== */
  window.CV_API = {
    searchMovies,
    searchTMDB,
    searchiTunes,
    fetchTMDBDetails,
    fetchSimilarMovies,
    buildMovieObject,
    posterUrl
  };

  console.log("🎬 CineVault API module loaded");
  console.log("   🔍 Provider:", CFG.TMDB_READY ? "TMDB multi-search (Movies + TV)" : "iTunes (fallback)");

})();