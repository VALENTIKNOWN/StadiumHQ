(function () {
  const API_BASE = window.STADIUM_API_BASE || "http://127.0.0.1:5000";
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const readParam = (name) => new URLSearchParams(location.search).get(name) || "";
  const toFormData = (form) => Object.fromEntries(new FormData(form).entries());
  const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const tplCache = new Map();
  let auth = { user: null, ready: false };
  let pendingAfterAuth = null;
  let CSRF_TOKEN = null;

  const esc = (v = "") => String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const escAttr = (v = "") => esc(v).replace(/"/g,"&quot;");
  const safeSrc = (u = "") => String(u).replace(/"/g,"%22").replace(/</g,"%3C").replace(/>/g,"%3E");

  async function loadTemplate(url) {
    if (!url) return "";
    if (tplCache.has(url)) return tplCache.get(url);
    const p = fetch(url, { credentials: "include", cache: "no-store" }).then(r => r.ok ? r.text() : "");
    tplCache.set(url, p);
    return p;
  }

  const stars5 = (n=0) => {
    const v = Math.max(0, Math.min(5, Math.floor(Number(n)||0)));
    return "★★★★★".slice(0, v) + "☆☆☆☆☆".slice(0, 5 - v);
  };

  function buildURL(path, params = {}) {
    const url = new URL(API_BASE + path, location.origin);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, v); });
    return url.toString();
  }

  async function getCsrf() {
    if (CSRF_TOKEN) return CSRF_TOKEN;
    const res = await fetch(buildURL("/api/csrf"), { credentials: "include", cache: "no-store" });
    const j = await res.json();
    CSRF_TOKEN = j.token;
    return CSRF_TOKEN;
  }

  async function apiGet(path, params = {}) {
    const res = await fetch(buildURL(path, params), { headers: { Accept: "application/json" }, credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  }

  async function apiWrite(method, path, body = null, extraHeaders = {}) {
    const token = await getCsrf();
    const headers = { Accept: "application/json", "X-CSRF-Token": token, ...extraHeaders };
    const opts = { method, headers, credentials: "include", cache: "no-store" };
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      opts.body = body;
    }
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) throw new Error(`${method} ${path} ${res.status}`);
    return res.json();
  }

  function apiPost(path, body = {}) { return apiWrite("POST", path, body); }
  function apiPut(path, body = {}) { return apiWrite("PUT", path, body); }
  function apiDelete(path) { return apiWrite("DELETE", path, null); }
  function apiUpload(path, formData, method = "POST") { return apiWrite(method, path, formData); }

  function isAuthed() {
    return !!auth.user;
  }

  function isAdmin() {
    return !!auth.user && auth.user.role === "admin";
  }

  function pathName() {
    return location.pathname.split("/").pop() || "Homepage.html";
  }

  function ensureAdminLinks() {
    const need = isAdmin();
    const desktopNav = q("#nav-menu");
    const mobileNav = q("#nav-menu-mobile");
    const desktopExisting = q('#nav-menu [data-admin-link]');
    const mobileExisting = q('#nav-menu-mobile [data-admin-link]');
    if (need) {
      if (desktopNav && !desktopExisting) {
        const a = document.createElement("a");
        a.setAttribute("href", "Admin.html");
        a.setAttribute("data-nav", "Admin.html");
        a.setAttribute("data-admin-link", "");
        a.className = "px-3 py-2 rounded-lg text-sm font-medium text-[#0e1a13] hover:bg-[#e8f2ec]";
        a.textContent = "Admin";
        const before = desktopNav.querySelector("[data-open-auth],[data-signout]");
        if (before) desktopNav.insertBefore(a, before); else desktopNav.appendChild(a);
        if (a.getAttribute("data-nav") === pathName()) a.classList.add("bg-[#e8f2ec]", "text-[#0e1a13]");
      }
      if (mobileNav && !mobileExisting) {
        const inner = mobileNav.querySelector("div") || mobileNav;
        const a = document.createElement("a");
        a.setAttribute("href", "Admin.html");
        a.setAttribute("data-nav", "Admin.html");
        a.setAttribute("data-admin-link", "");
        a.className = "px-3 py-2 rounded-lg text-sm font-medium text-[#0e1a13] hover:bg-[#e8f2ec]";
        a.textContent = "Admin";
        const before = inner.querySelector("[data-open-auth],[data-signout]");
        if (before) inner.insertBefore(a, before); else inner.appendChild(a);
        if (a.getAttribute("data-nav") === pathName()) a.classList.add("bg-[#e8f2ec]", "text-[#0e1a13]");
      }
    } else {
      if (desktopExisting) desktopExisting.remove();
      if (mobileExisting) mobileExisting.remove();
    }
  }

  async function initAuthState() {
    try {
      const me = await apiGet("/api/me");
      auth.user = me.data || null;
    } catch (e) {
      auth.user = null;
    } finally {
      auth.ready = true;
      reflectAuthUI();
    }
  }

  function reflectAuthUI() {
    qa('[data-auth-show="guest"]').forEach(el => el.classList.toggle("hidden", isAuthed()));
    qa('[data-auth-show="authed"]').forEach(el => el.classList.toggle("hidden", !isAuthed()));
    ensureAdminLinks();
  }

  function openAuth(mode) {
    const overlay = q("#auth-overlay");
    const title = q("[data-auth-title]");
    const sIn = q('form[data-auth="signin"]');
    const sUp = q('form[data-auth="signup"]');
    if (!overlay || !title || !sIn || !sUp) return;
    title.textContent = mode === "signup" ? "Create Account" : "Sign In";
    sIn.classList.toggle("hidden", mode !== "signin");
    sUp.classList.toggle("hidden", mode !== "signup");
    overlay.classList.remove("hidden");
  }

  function closeAuth() {
    const overlay = q("#auth-overlay");
    const err = q("[data-auth-error]");
    if (overlay) overlay.classList.add("hidden");
    if (err) err.textContent = "";
  }

  function initAuthUI() {
    qa("[data-open-auth]").forEach(btn => {
      btn.addEventListener("click", () => openAuth(btn.getAttribute("data-auth-mode") || "signin"));
    });
    qa("[data-auth-switch]").forEach(btn => {
      btn.addEventListener("click", () => openAuth(btn.getAttribute("data-auth-switch")));
    });
    const closeBtn = q("[data-auth-close]");
    if (closeBtn) closeBtn.addEventListener("click", closeAuth);

    const formIn = q('form[data-auth="signin"]');
    const formUp = q('form[data-auth="signup"]');
    const err = q("[data-auth-error]");

    if (formIn) {
      formIn.addEventListener("submit", async (e) => {
        e.preventDefault();
        err.textContent = "";
        const payload = toFormData(formIn);
        try {
          await apiPost("/api/auth/sign-in", payload);
          CSRF_TOKEN = null;
          await initAuthState();
          closeAuth();
          if (pendingAfterAuth) { const fn = pendingAfterAuth; pendingAfterAuth = null; await fn(); return; }
          if (location.pathname.endsWith("Profiles.html")) { location.reload(); return; }
          reflectAuthUI();
        } catch (ex) {
          err.textContent = "Sign in failed.";
        }
      });
    }

    if (formUp) {
      formUp.addEventListener("submit", async (e) => {
        e.preventDefault();
        err.textContent = "";
        const payload = toFormData(formUp);
        try {
          await apiPost("/api/auth/sign-up", payload);
          await apiPost("/api/auth/sign-in", { email: payload.email, password: payload.password });
          CSRF_TOKEN = null;
          await initAuthState();
          closeAuth();
          if (pendingAfterAuth) { const fn = pendingAfterAuth; pendingAfterAuth = null; await fn(); return; }
          reflectAuthUI();
        } catch (ex) {
          err.textContent = "Sign up failed.";
        }
      });
    }

    qa("[data-signout]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await apiPost("/api/auth/sign-out", {}); } catch (e) {}
        auth.user = null;
        CSRF_TOKEN = null;
        reflectAuthUI();
        if (location.pathname.endsWith("Profiles.html")) location.href = "Homepage.html";
      });
    });
  }

  function initNav() {
    const toggle = q("#nav-toggle");
    const menuMobile = q("#nav-menu-mobile");
    if (toggle && menuMobile) {
      toggle.addEventListener("click", () => {
        const isOpen = menuMobile.classList.toggle("hidden") === false;
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }
    const path = pathName();
    qa("[data-nav]").forEach((a) => {
      const isActive = a.getAttribute("data-nav") === path;
      if (isActive) a.classList.add("bg-[#e8f2ec]", "text-[#0e1a13]");
    });
    qa("[data-back]").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (history.length > 1) history.back(); else location.href = "Homepage.html";
      })
    );
    qa("[data-requires-auth]").forEach(link => {
      link.addEventListener("click", (e) => {
        if (!isAuthed()) {
          e.preventDefault();
          const href = link.getAttribute("href");
          pendingAfterAuth = () => { location.href = href || "Profiles.html"; };
          openAuth("signin");
        }
      });
    });
  }

  function enableCardNavigation() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-stadium-id]");
      if (!el) return;
      const id = el.getAttribute("data-stadium-id");
      if (!id) return;
      location.href = `Details.html?stadium=${encodeURIComponent(id)}`;
    });
  }

  function renderStadiumCard(s) {
    const id = escAttr(s.id || "");
    const name = esc(s.name || "");
    const city = esc(s.city || "");
    const country = esc(s.country || "");
    const cap = s.capacity?.toLocaleString?.() ?? s.capacity ?? "";
    const src = safeSrc(s.image || "");
    const alt = escAttr(s.name || "Stadium");
    return `
      <div class="rounded-xl overflow-hidden bg-white border border-[#d1e6d9] hover:shadow-sm transition cursor-pointer" data-stadium-id="${id}">
        <img src="${src}" alt="${alt}" loading="lazy" class="w-full h-40 object-cover">
        <div class="p-3">
          <div class="text-sm font-semibold text-[#0e1a13]">${name}</div>
          <div class="text-xs text-[#395a4c]">${city}${city && country ? ", " : ""}${country}</div>
          <div class="mt-1 text-xs text-[#395a4c]">Capacity: ${cap}</div>
        </div>
      </div>
    `;
  }

  function renderStadiumListItem(s) {
    const id = escAttr(s.id || "");
    const name = esc(s.name || "");
    const city = esc(s.city || "");
    const country = esc(s.country || "");
    const cap = s.capacity?.toLocaleString?.() ?? s.capacity ?? "";
    const thumb = safeSrc(s.thumb || s.image || "");
    const alt = escAttr(s.name || "Stadium");
    return `
      <div class="flex items-center gap-4 bg-[#f8fbfa] px-4 min-h-[72px] py-3 rounded-lg hover:bg-[#e8f2ec] transition cursor-pointer" data-stadium-id="${id}">
        <img src="${thumb}" alt="${alt}" loading="lazy" class="w-12 h-12 rounded-md object-cover">
        <div class="flex-1">
          <div class="text-sm font-semibold text-[#0e1a13]">${name}</div>
          <div class="text-xs text-[#395a4c]">${city}${city && country ? ", " : ""}${country}</div>
        </div>
        <div class="text-xs text-[#395a4c]">Capacity: ${cap}</div>
      </div>
    `;
  }

  async function loadHomepage() {
    const grid = q("[data-popular-grid]");
    if (!grid) return;
    try {
      const { data } = await apiGet("/api/stadiums", { sort: "popular", per_page: 8 });
      grid.innerHTML = (data || []).map(renderStadiumCard).join("");
    } catch (e) {
      grid.innerHTML = `<div class="text-sm text-red-600">Failed to load popular stadiums.</div>`;
    }
  }

  async function loadSearch() {
    const form = q("[data-search-form]");
    const input = q("[data-search-input]");
    const out = q("[data-search-results]");
    if (!form || !input || !out) return;

    async function performSearch(qs) {
      if (!qs || !qs.trim()) {
        out.innerHTML = "";
        return;
      }
      try {
        const { data } = await apiGet("/api/stadiums/search", { q: qs, per_page: 20 });
        out.innerHTML = (data || []).map(renderStadiumListItem).join("");
      } catch (e) {
        out.innerHTML = `<div class="text-sm text-red-600">Search failed.</div>`;
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      performSearch(input.value);
    });

    input.addEventListener("input", debounce(() => performSearch(input.value), 400));
  }

  function renderRating(avg, count) {
    const a = Number.isFinite(avg) ? avg : 0;
    const c = Number.isFinite(count) ? count : 0;
    return `<div class="flex items-center gap-2"><span class="text-sm font-semibold text-[#0e1a13]">${a.toFixed(1)}</span><span class="text-xs text-[#395a4c]">(${c})</span></div>`;
  }

  async function loadDetails() {
    if (!/Details\.html$/i.test(location.pathname)) return;
    const id = readParam("stadium");
    if (!id) return;

    const titleEl = q("[data-stadium-title]");
    const heroEl = q("[data-stadium-hero]");
    const factsEl = q("[data-stadium-facts]");
    const reviewsEl = q("[data-reviews-list]");

    try {
      const { data } = await apiGet(`/api/stadiums/${encodeURIComponent(id)}`);
      if (titleEl) titleEl.textContent = data.name || "";
      if (heroEl && data.image) heroEl.src = data.image;
      if (factsEl) {
        const city = esc(data.city || "");
        const country = esc(data.country || "");
        const capacity = data.capacity?.toLocaleString?.() ?? data.capacity ?? "";
        const built = esc(data.built || "—");
        const teams = (data.homeTeams || []).map(esc).join(", ");
        const desc = esc(data.description || "");
        factsEl.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 rounded-lg bg-[#f8fbfa]">
              <div class="text-xs text-[#395a4c]">Location</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${city}${city && country ? ", " : ""}${country}</div>
            </div>
            <div class="p-3 rounded-lg bg-[#f8fbfa]">
              <div class="text-xs text-[#395a4c]">Capacity</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${capacity}</div>
            </div>
            <div class="p-3 rounded-lg bg-[#f8fbfa]">
              <div class="text-xs text-[#395a4c]">Built</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${built}</div>
            </div>
            <div class="p-3 rounded-lg bg-[#f8fbfa]">
              <div class="text-xs text-[#395a4c]">Home Teams</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${teams || "—"}</div>
            </div>
          </div>
          <div class="mt-3">${renderRating(data.ratingAvg ?? 0, data.ratingCount ?? 0)}</div>
          <div class="mt-3 text-sm text-[#0e1a13]">${desc}</div>
        `;
      }
      if (reviewsEl) {
        const r = await apiGet(`/api/stadiums/${encodeURIComponent(id)}/reviews`, { per_page: 10, page: 1, order: "new" });
        reviewsEl.innerHTML = (r.data || [])
          .map((rv) => {
            const author = esc(rv.author || "Anonymous");
            const text = esc(rv.text || "");
            const when = rv.createdAt ? new Date(rv.createdAt).toLocaleDateString() : "";
            const rating = Number.isFinite(rv.rating) ? rv.rating : null;
            const stars = rating ? stars5(rating) : "";
            const ratingHtml = rating ? `<div class="text-xs text-[#395a4c]">${stars} <span class="ml-1">${rating}/5</span></div>` : "";
            return `
              <div class="border border-[#d1e6d9] rounded-lg p-3 bg-white">
                <div class="flex items-center justify-between">
                  <div class="text-sm font-semibold text-[#0e1a13]">${author}</div>
                  <div class="text-xs text-[#395a4c]">${when}</div>
                </div>
                ${ratingHtml}
                <div class="mt-2 text-sm text-[#0e1a13]">${text}</div>
              </div>
            `;
          })
          .join("");
      }
    } catch (e) {
      const titleEl2 = q("[data-stadium-title]");
      if (titleEl2) titleEl2.textContent = "Stadium not found";
    }

    const reviewForm = q("[data-review-form]");
    if (reviewForm) {
      reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = toFormData(reviewForm);
        if (payload.rating) payload.rating = Number(payload.rating);
        const idSafe = encodeURIComponent(id);
        const submit = async () => {
          try {
            await apiPost(`/api/stadiums/${idSafe}/reviews`, payload);
            await loadDetails();
          } catch (err) {}
        };
        if (!isAuthed()) {
          pendingAfterAuth = submit;
          openAuth("signin");
          return;
        }
        await submit();
      });
    }
  }

  function formatWhen(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
  }

  async function loadReviewsPage() {
    if (!/Reviews\.html$/i.test(location.pathname)) return;
    const feed = q("[data-reviews-feed]") || q("[data-reviews-list]");
    const moreBtn = q("[data-reviews-more]");
    if (!feed) return;

    let page = 1;
    const per = 20;
    let loading = false;
    let pages = 1;

    async function fetchPage() {
      if (loading) return;
      loading = true;
      try {
        const { data, meta } = await apiGet("/api/reviews", { page, per_page: per, order: "new" });
        const html = (data || []).map(rv => {
          const author = esc(rv.author || "Anonymous");
          const text = esc(rv.text || "");
          const when = formatWhen(rv.createdAt);
          const rating = rv.rating ? `<span class="ml-2 text-xs text-[#395a4c]">★ ${rv.rating}/5</span>` : "";
          const sid = escAttr(rv.stadium?.id || "");
          const sname = esc(rv.stadium?.name || "");
          return `
            <div class="border border-[#d1e6d9] rounded-lg p-3 bg-white">
              <div class="flex items-center justify-between">
                <a href="Details.html?stadium=${encodeURIComponent(rv.stadium?.id || "")}" class="text-sm font-semibold text-[#0e1a13] hover:underline">${sname}</a>
                <div class="text-xs text-[#395a4c]">${when}</div>
              </div>
              <div class="text-xs text-[#395a4c] mt-1">${author}${rating}</div>
              <div class="mt-2 text-sm text-[#0e1a13]">${text}</div>
            </div>
          `;
        }).join("");
        if (page === 1) feed.innerHTML = html; else feed.insertAdjacentHTML("beforeend", html);
        pages = meta?.pages || 1;
        if (moreBtn) moreBtn.classList.toggle("hidden", page >= pages);
      } catch (e) {
        if (page === 1) feed.innerHTML = `<div class="text-sm text-red-600">Failed to load reviews.</div>`;
        if (moreBtn) moreBtn.classList.add("hidden");
      } finally {
        loading = false;
      }
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", async () => {
        if (page >= pages) return;
        page += 1;
        await fetchPage();
      });
    }

    await fetchPage();
  }

  async function loadMap() {
    const list = q("[data-map-list]");
    if (!list) return;
    try {
      const { data } = await apiGet("/api/stadiums/map");
      list.innerHTML = (data || [])
        .map((s) => {
          const id = escAttr(s.id || "");
          const name = esc(s.name || "");
          const city = esc(s.city || "");
          return `
            <div class="flex items-center gap-3 py-2 cursor-pointer hover:bg-[#e8f2ec] px-2 rounded" data-stadium-id="${id}">
              <div class="w-2 h-2 rounded-full bg-[#0e1a13]"></div>
              <div class="text-sm text-[#0e1a13]">${name}</div>
              <div class="ml-auto text-xs text-[#395a4c]">${city}</div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      list.innerHTML = `<div class="text-sm text-red-600">Failed to load map data.</div>`;
    }
  }

  async function loadProfile() {
    const nameEl = q("[data-profile-name]");
    const statsEl = q("[data-profile-stats]");
    if (!nameEl && !statsEl) return;
    try {
      const { data } = await apiGet("/api/me");
      if (nameEl) nameEl.textContent = data.name || "";
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="p-3 bg-[#f8fbfa] rounded-lg">
              <div class="text-xs text-[#395a4c]">Reviews</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${data.reviewsCount ?? 0}</div>
            </div>
            <div class="p-3 bg-[#f8fbfa] rounded-lg">
              <div class="text-xs text-[#395a4c]">Favorites</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${data.favoritesCount ?? 0}</div>
            </div>
            <div class="p-3 bg-[#f8fbfa] rounded-lg">
              <div class="text-xs text-[#395a4c]">Visited</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${data.visitedCount ?? 0}</div>
            </div>
            <div class="p-3 bg-[#f8fbfa] rounded-lg">
              <div class="text-xs text-[#395a4c]">Lists</div>
              <div class="text-sm font-semibold text-[#0e1a13]">${data.listsCount ?? 0}</div>
            </div>
          </div>
        `;
      }
    } catch (e) {
      pendingAfterAuth = async () => { location.reload(); };
      openAuth("signin");
    }
  }

  function initUploads() {
    // Avatar upload (static element on Profile page)
    const avatarInput = q("[data-avatar-input]");
    if (avatarInput) {
      avatarInput.addEventListener("change", async () => {
        const file = avatarInput.files && avatarInput.files[0];
        if (!file) return;
        if (!isAuthed()) { pendingAfterAuth = () => avatarInput.dispatchEvent(new Event("change")); openAuth("signin"); return; }
        const fd = new FormData();
        fd.append("image", file);
        try {
          const r = await apiUpload("/api/uploads/avatar", fd, "POST");
          const preview = q("[data-avatar-preview]");
          if (preview && r.url) preview.src = r.url;
        } catch (e) {}
      });
    }
  
    // ===== Admin page: DELEGATED handlers for dynamically-rendered controls =====
  
    // 1) Create stadium from Wikipedia query
    document.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-admin-wiki-create]");
      if (!form) return;
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn && (btn.disabled = true);
      try {
        const query = new FormData(form).get("query");
        if (!query) return;
        await apiPost(`/api/admin/stadiums?name=${encodeURIComponent(query)}`);
        location.reload();
      } catch (_) {
      } finally {
        btn && (btn.disabled = false);
      }
    });
  
    // 2) Update stadium (multiple forms)
    document.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-admin-stadium-update]");
      if (!form) return;
      e.preventDefault();
      const sid = form.getAttribute("data-id") || "";
      if (!sid) return;
      const btn = form.querySelector('button[type="submit"]');
      btn && (btn.disabled = true);
      try {
        if ((form.enctype || "").toLowerCase().includes("multipart/form-data")) {
          const fd = new FormData(form);
          await apiUpload(`/api/admin/stadiums/${encodeURIComponent(sid)}`, fd, "PUT");
        } else {
          const body = Object.fromEntries(new FormData(form).entries());
          await apiPut(`/api/admin/stadiums/${encodeURIComponent(sid)}`, body);
        }
        location.reload();
      } catch (_) {
      } finally {
        btn && (btn.disabled = false);
      }
    });
  
    // 3) Upload gallery images (multiple forms)
    document.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-admin-stadium-gallery]");
      if (!form) return;
      e.preventDefault();
      const sid = form.getAttribute("data-id") || "";
      if (!sid) return;
      const btn = form.querySelector('button[type="submit"]');
      btn && (btn.disabled = true);
      try {
        const fd = new FormData(form);
        await apiUpload(`/api/admin/stadiums/${encodeURIComponent(sid)}/images`, fd, "POST");
        location.reload();
      } catch (_) {
      } finally {
        btn && (btn.disabled = false);
      }
    });
  
    // 4) Delete stadium (multiple buttons)
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-admin-stadium-delete]");
      if (!btn) return;
      e.preventDefault();
      const sid = btn.getAttribute("data-id") || "";
      if (!sid) return;
      btn.disabled = true;
      try {
        await apiDelete(`/api/admin/stadiums/${encodeURIComponent(sid)}`);
        // Remove the card instantly; no need to reload if you prefer
        const card = btn.closest(".rounded-xl.border");
        if (card) card.remove();
        // Or call location.reload() to refresh everything
        // location.reload();
      } catch (_) {
        btn.disabled = false;
      }
    });
  }

  function initStarRatings() {
    const widgets = qa("[data-star-rating]");
    widgets.forEach(box => {
      if (box.__starsInit) return;
      box.__starsInit = true;
      const name = box.getAttribute("data-name") || "rating";
      const initial = parseInt(box.getAttribute("data-initial") || "0", 10) || 0;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = initial || "";
      box.classList.add("flex","items-center","gap-1","select-none");
      box.setAttribute("role","radiogroup");
      box.setAttribute("tabindex","0");
      box.appendChild(input);

      const stars = [];
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-value", String(i));
        b.setAttribute("aria-label", `${i} star${i>1?"s":""}`);
        b.className = "p-1 text-2xl leading-none transition-transform duration-150 active:scale-95";
        b.textContent = "★";
        box.appendChild(b);
        stars.push(b);
      }

      function paint(v, animate) {
        for (let i = 0; i < 5; i++) {
          const filled = i < v;
          const btn = stars[i];
          btn.classList.toggle("text-amber-500", filled);
          btn.classList.toggle("text-slate-300", !filled);
          if (animate && filled) {
            btn.classList.add("scale-110");
            setTimeout(() => btn.classList.remove("scale-110"), 120);
          }
        }
      }

      paint(initial);

      box.addEventListener("mousemove", e => {
        const b = e.target.closest("button[data-value]");
        if (!b) return;
        paint(parseInt(b.getAttribute("data-value") || "0", 10));
      });

      box.addEventListener("mouseleave", () => {
        paint(parseInt(input.value || "0", 10));
      });

      box.addEventListener("click", e => {
        const b = e.target.closest("button[data-value]");
        if (!b) return;
        const v = parseInt(b.getAttribute("data-value") || "0", 10);
        input.value = String(v);
        paint(v, true);
      });

      box.addEventListener("keydown", e => {
        let v = parseInt(input.value || "0", 10) || 0;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          v = Math.min(5, v + 1);
          input.value = String(v);
          paint(v, true);
          e.preventDefault();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          v = Math.max(1, v - 1);
          input.value = String(v);
          paint(v, true);
          e.preventDefault();
        } else if (e.key === "Home") {
          input.value = "1"; paint(1, true); e.preventDefault();
        } else if (e.key === "End") {
          input.value = "5"; paint(5, true); e.preventDefault();
        }
      });
    });
  }

  class AppHeader extends HTMLElement {
    async connectedCallback() {
      const headerSrc = this.getAttribute("data-src") || "/partials/header.html";
      const authSrc = this.getAttribute("data-auth-src") || "/partials/auth.html";
      const [headerHTML, authHTML] = await Promise.all([loadTemplate(headerSrc), loadTemplate(authSrc)]);
      this.innerHTML = headerHTML + authHTML;
      initNav();
      initAuthUI();
      reflectAuthUI();
    }
  }
  customElements.define("app-header", AppHeader);

  async function boot() {
    await getCsrf();
    await initAuthState();
    enableCardNavigation();
    loadHomepage();
    loadSearch();
    loadDetails();
    loadReviewsPage();
    loadMap();
    loadProfile();
    initUploads();
    initStarRatings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
