const state = {
  session: null,
  dashboard: null,
  network: null,
  loading: false,
  refreshPromise: null,
  cy: null,
  theme: "dark",
  accentColor: null,
  backgroundColor: null,
  selectedMedia: null,
  editingPostId: null,
  editMedia: null,
  editRemoveMedia: false,
  selectedProfile: null,
  openingProfileId: null,
  profileHistory: [],
  registerProfileImage: null,
  profileEditImage: null,
  profileEditRemoveImage: false,
  activeCategory: "home",
  peopleSearch: "",
  demoPassword: "demo12345",
  demoAccounts: [],
  demoGroups: [],
  notifications: [],
  authMode: null
};

const elements = {
  themeButtons: document.querySelectorAll(".theme-option"),
  uiColorInput: document.querySelector("#uiColorInput"),
  resetUiColorButton: document.querySelector("#resetUiColorButton"),
  backgroundColorInput: document.querySelector("#backgroundColorInput"),
  resetBackgroundColorButton: document.querySelector("#resetBackgroundColorButton"),
  openingSlideshow: document.querySelector("#openingSlideshow"),
  navTabs: document.querySelectorAll(".nav-tab"),
  categoryPanels: document.querySelectorAll("[data-category-panel]"),
  dashboard: document.querySelector(".dashboard"),
  authGate: document.querySelector("#authGate"),
  appContent: document.querySelector("#appContent"),
  authModeButtons: document.querySelectorAll("[data-auth-mode]"),
  authModePanels: document.querySelectorAll("[data-auth-panel]"),
  authPanelBackdrop: document.querySelector("#authPanelBackdrop"),
  systemCheckPanel: document.querySelector("#systemCheckPanel"),
  systemCheckText: document.querySelector("#systemCheckText"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  registerProfileImageInput: document.querySelector("#registerProfileImageInput"),
  registerProfileImagePreview: document.querySelector("#registerProfileImagePreview"),
  demoAccounts: document.querySelector("#demoAccounts"),
  demoPassword: document.querySelector("#demoPassword"),
  authMessage: document.querySelector("#authMessage"),
  currentUserCard: document.querySelector("#currentUserCard"),
  targetSelect: document.querySelector("#targetSelect"),
  refreshButton: document.querySelector("#refreshButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  logoutButton: document.querySelector("#logoutButton"),
  postForm: document.querySelector("#postForm"),
  postMediaInput: document.querySelector("#postMediaInput"),
  postMediaPreview: document.querySelector("#postMediaPreview"),
  statsGrid: document.querySelector("#statsGrid"),
  peopleSearchInput: document.querySelector("#peopleSearchInput"),
  profileDetail: document.querySelector("#profileDetail"),
  usersList: document.querySelector("#usersList"),
  postsList: document.querySelector("#postsList"),
  notificationsSummary: document.querySelector("#notificationsSummary"),
  notificationsList: document.querySelector("#notificationsList"),
  secondDegreeList: document.querySelector("#secondDegreeList"),
  mutualList: document.querySelector("#mutualList"),
  recommendationList: document.querySelector("#recommendationList"),
  communityList: document.querySelector("#communityList"),
  pagerankList: document.querySelector("#pagerankList"),
  embeddingList: document.querySelector("#embeddingList"),
  pluginStatus: document.querySelector("#pluginStatus"),
  pathView: document.querySelector("#pathView"),
  pathMeta: document.querySelector("#pathMeta"),
  cypherExamples: document.querySelector("#cypherExamples"),
  graphCanvas: document.querySelector("#graphCanvas"),
  statusMessage: document.querySelector("#statusMessage")
};

function formatDate(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function normalizeSearch(value) {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function isSupportedMediaType(type) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"].includes(type);
}

function isSupportedProfileImageType(type) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("Medya dosyasi okunamadi.")));
    reader.readAsDataURL(file);
  });
}

function avatarHtml(user, sizeClass = "") {
  const initial = user?.name?.slice(0, 1)?.toUpperCase() ?? "?";
  const classes = ["avatar", sizeClass].filter(Boolean).join(" ");

  if (user?.profileImageUrl) {
    return `<div class="${classes} avatar-photo"><img src="${escapeHtml(user.profileImageUrl)}" alt="${escapeHtml(user.name ?? "Profil")}" /></div>`;
  }

  return `<div class="${classes}" style="background:${escapeHtml(user?.color ?? "#0f766e")}">${escapeHtml(initial)}</div>`;
}

function renderImagePreview(container, image, clearButtonId) {
  if (!image) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="media-preview-frame">
      <img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name)}" />
    </div>
    <div class="media-preview-meta">
      <span>${escapeHtml(image.name)}</span>
      <button class="button button-ghost button-small" id="${clearButtonId}" type="button">Kaldir</button>
    </div>
  `;
}

function renderPostMediaPreview() {
  const media = state.selectedMedia;

  if (!media) {
    elements.postMediaPreview.classList.add("hidden");
    elements.postMediaPreview.innerHTML = "";
    return;
  }

  const preview =
    media.type.startsWith("image/")
      ? `<img src="${escapeHtml(media.dataUrl)}" alt="${escapeHtml(media.name)}" />`
      : `<video src="${escapeHtml(media.dataUrl)}" controls muted playsinline></video>`;

  elements.postMediaPreview.classList.remove("hidden");
  elements.postMediaPreview.innerHTML = `
    <div class="media-preview-frame">${preview}</div>
    <div class="media-preview-meta">
      <span>${escapeHtml(media.name)}</span>
      <button class="button button-ghost button-small" id="clearPostMediaButton" type="button">Kaldir</button>
    </div>
  `;
}

function renderPostMediaElement(post, className = "post-media") {
  if (!post?.mediaUrl) {
    return "";
  }

  return post.mediaType === "video"
    ? `<video class="${className}" src="${escapeHtml(post.mediaUrl)}" controls playsinline></video>`
    : `<img class="${className}" src="${escapeHtml(post.mediaUrl)}" alt="${escapeHtml(post.mediaName || "Post medyasi")}" loading="lazy" />`;
}

function clearPostMedia() {
  state.selectedMedia = null;
  elements.postMediaInput.value = "";
  renderPostMediaPreview();
}

function clearEditState() {
  state.editingPostId = null;
  state.editMedia = null;
  state.editRemoveMedia = false;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? getCssVar("--error") : "";
}

function setAuthMessage(message, isError = false) {
  elements.authMessage.textContent = message;
  elements.authMessage.style.color = isError ? getCssVar("--error") : "";
}

function setSystemCheck(status, message) {
  if (!elements.systemCheckPanel || !elements.systemCheckText) {
    return;
  }

  elements.systemCheckPanel.dataset.status = status;
  elements.systemCheckText.textContent = message;
}

async function verifySystemStatus() {
  const startedAt = performance.now();

  try {
    const response = await rawRequest("/api/monitoring/status", {
      method: "GET"
    });
    const payload = await response.json();
    const frontendLatency = Math.round(performance.now() - startedAt);

    if (!response.ok || !payload.ok) {
      setSystemCheck("error", "API veya veritabanı kontrolü başarısız. Lütfen logları kontrol edin.");
      return false;
    }

    setSystemCheck(
      "ok",
      `API, Neo4j ve frontend bağlantısı hazır. Round trip: ${frontendLatency} ms, DB: ${payload.checks.database.latencyMs} ms.`
    );
    return true;
  } catch (error) {
    setSystemCheck("error", `Backend ile iletişim kurulamadı: ${error.message}`);
    return false;
  }
}

function setAuthMode(mode) {
  const nextMode = ["register", "login", "demo"].includes(mode) ? mode : null;
  state.authMode = nextMode;
  const isOpen = Boolean(nextMode);

  elements.authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === nextMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.authModePanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.authPanel !== nextMode);
    panel.setAttribute("aria-hidden", String(panel.dataset.authPanel !== nextMode));
  });

  elements.authGate.classList.toggle("is-auth-modal-open", isOpen);
  elements.authPanelBackdrop?.classList.toggle("hidden", !isOpen);
}

function validateLoginPayload(payload) {
  if (!String(payload.email ?? "").trim()) {
    return "E-posta zorunludur.";
  }

  if (!String(payload.password ?? "").trim()) {
    return "Sifre zorunludur.";
  }

  return "";
}

function validateRegisterPayload(payload) {
  if (String(payload.name ?? "").trim().length < 2) {
    return "Ad soyad en az 2 karakter olmalidir.";
  }

  if (!String(payload.email ?? "").includes("@")) {
    return "Gecerli bir e-posta giriniz.";
  }

  if (String(payload.password ?? "").length < 8) {
    return "Sifre en az 8 karakter olmalidir.";
  }

  if (String(payload.headline ?? "").trim().length < 2) {
    return "Baslik en az 2 karakter olmalidir.";
  }

  return "";
}

function initOpeningSlideshow() {
  if (!elements.openingSlideshow) {
    return;
  }

  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    elements.openingSlideshow.classList.add("is-hiding");
    window.setTimeout(() => {
      elements.openingSlideshow.remove();
    }, 650);
  };

  window.setTimeout(close, 4500);
}

async function rawRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(
      "Backend'e ulaşılamadı. Uygulamayı http://localhost:3000 üzerinden açın ve önce `npm start` ile server'ı çalıştırın."
    );
  }
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? ""));
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function mixColor(hex, target, amount) {
  const sourceRgb = hexToRgb(hex);
  const targetRgb = hexToRgb(target);
  const next = ["r", "g", "b"].map((key) =>
    Math.round(sourceRgb[key] + (targetRgb[key] - sourceRgb[key]) * amount)
      .toString(16)
      .padStart(2, "0")
  );

  return `#${next.join("")}`;
}

function applyAccentVariables(hex) {
  const { r, g, b } = hexToRgb(hex);
  const chipText = state.theme === "light" ? mixColor(hex, "#000000", 0.24) : mixColor(hex, "#ffffff", 0.68);
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty("--teal", hex);
  rootStyle.setProperty("--accent-rgb", `${r} ${g} ${b}`);
  rootStyle.setProperty("--accent-gradient", mixColor(hex, state.theme === "light" ? "#ffffff" : "#000000", 0.14));
  rootStyle.setProperty("--chip-bg", `rgba(${r}, ${g}, ${b}, 0.12)`);
  rootStyle.setProperty("--chip-border", `rgba(${r}, ${g}, ${b}, 0.28)`);
  rootStyle.setProperty("--chip-text", chipText);
  rootStyle.setProperty("--meta-bg", `rgba(${r}, ${g}, ${b}, 0.11)`);
}

function clearAccentVariables() {
  ["--teal", "--accent-rgb", "--accent-gradient", "--chip-bg", "--chip-border", "--chip-text", "--meta-bg"].forEach((name) => {
    document.documentElement.style.removeProperty(name);
  });
}

function syncUiColorInput() {
  if (elements.uiColorInput) {
    elements.uiColorInput.value = state.accentColor || getCssVar("--teal") || "#2dd4bf";
  }
}

function setAccentColor(color, persist = true) {
  if (!isHexColor(color)) {
    return;
  }

  state.accentColor = color.toLowerCase();
  applyAccentVariables(state.accentColor);
  syncUiColorInput();

  if (persist) {
    try {
      localStorage.setItem("graphlink-accent", state.accentColor);
    } catch (_error) {
      // Accent still applies for the current page when storage is unavailable.
    }
  }
}

function resetAccentColor() {
  state.accentColor = null;
  clearAccentVariables();
  syncUiColorInput();

  try {
    localStorage.removeItem("graphlink-accent");
  } catch (_error) {
    // Ignore storage errors; resetting the current page is enough.
  }

  if (state.network?.nodes?.length) {
    renderGraph();
  }
}

function backgroundGradient(hex) {
  const topColor = mixColor(hex, state.theme === "light" ? "#ffffff" : "#000000", 0.16);
  const bottomColor = mixColor(hex, state.theme === "light" ? "#ffffff" : "#000000", 0.32);
  const glowColor = state.accentColor || getCssVar("--teal") || "#2dd4bf";
  const glowRgb = hexToRgb(glowColor);

  return [
    `radial-gradient(circle at top left, rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.16), transparent 34%)`,
    `linear-gradient(145deg, ${topColor} 0%, ${hex} 46%, ${bottomColor} 100%)`
  ].join(", ");
}

function applyBackgroundVariables(hex) {
  document.documentElement.style.setProperty("--bg", hex);
  document.documentElement.style.setProperty("--body-bg", backgroundGradient(hex));
}

function clearBackgroundVariables() {
  document.documentElement.style.removeProperty("--bg");
  document.documentElement.style.removeProperty("--body-bg");
}

function syncBackgroundColorInput() {
  if (elements.backgroundColorInput) {
    elements.backgroundColorInput.value = state.backgroundColor || getCssVar("--bg") || "#08141f";
  }
}

function setBackgroundColor(color, persist = true) {
  if (!isHexColor(color)) {
    return;
  }

  state.backgroundColor = color.toLowerCase();
  applyBackgroundVariables(state.backgroundColor);
  syncBackgroundColorInput();

  if (persist) {
    try {
      localStorage.setItem("graphlink-background", state.backgroundColor);
    } catch (_error) {
      // Background still applies for the current page when storage is unavailable.
    }
  }
}

function resetBackgroundColor() {
  state.backgroundColor = null;
  clearBackgroundVariables();
  syncBackgroundColorInput();

  try {
    localStorage.removeItem("graphlink-background");
  } catch (_error) {
    // Ignore storage errors; resetting the current page is enough.
  }
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  state.theme = nextTheme;
  document.documentElement.dataset.theme = nextTheme;

  try {
    localStorage.setItem("graphlink-theme", nextTheme);
  } catch (_error) {
    // Theme still applies for the current page when storage is unavailable.
  }

  elements.themeButtons.forEach((button) => {
    const isActive = button.dataset.themeValue === nextTheme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (state.accentColor) {
    applyAccentVariables(state.accentColor);
  }

  if (state.backgroundColor) {
    applyBackgroundVariables(state.backgroundColor);
  }

  syncUiColorInput();
  syncBackgroundColorInput();

  if (state.network?.nodes?.length) {
    renderGraph();
  }
}

function initTheme() {
  let savedTheme = null;
  let savedAccent = null;
  let savedBackground = null;

  try {
    savedTheme = localStorage.getItem("graphlink-theme");
    savedAccent = localStorage.getItem("graphlink-accent");
    savedBackground = localStorage.getItem("graphlink-background");
  } catch (_error) {
    savedTheme = null;
    savedAccent = null;
    savedBackground = null;
  }

  setTheme(savedTheme || document.documentElement.dataset.theme || "dark");

  if (isHexColor(savedAccent)) {
    setAccentColor(savedAccent, false);
  } else {
    syncUiColorInput();
  }

  if (isHexColor(savedBackground)) {
    setBackgroundColor(savedBackground, false);
  } else {
    syncBackgroundColorInput();
  }
}

async function refreshSession() {
  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  state.refreshPromise = (async () => {
    const response = await rawRequest("/api/auth/refresh", {
      method: "POST"
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    state.session = payload.user;
    return true;
  })();

  try {
    return await state.refreshPromise;
  } finally {
    state.refreshPromise = null;
  }
}

async function request(url, options = {}, retryOn401 = true) {
  const response = await rawRequest(url, options);

  if (response.status === 401 && retryOn401) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return request(url, options, false);
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Istek basarisiz oldu.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function toggleApp(isAuthenticated) {
  elements.authGate.classList.toggle("hidden", isAuthenticated);
  elements.appContent.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated) {
    setActiveCategory("home");
  } else {
    setAuthMode(null);
  }
}

function setActiveCategory(category) {
  state.activeCategory = category;
  elements.dashboard.dataset.activeCategory = category;

  elements.navTabs.forEach((tab) => {
    const isActive = tab.dataset.category === category;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  elements.categoryPanels.forEach((panel) => {
    const panelCategory = panel.dataset.categoryPanel;
    const isVisible = category === "overview" || panelCategory === category;
    panel.classList.toggle("hidden", !isVisible);
  });

  if (category === "graph" || category === "overview") {
    requestAnimationFrame(() => {
      if (state.network?.nodes?.length) {
        renderGraph();
      }
    });
  }
}

function renderDemoAccounts() {
  elements.demoPassword.textContent = state.demoPassword;

  if (!state.demoAccounts.length) {
    elements.demoAccounts.innerHTML = `<div class="empty-state">Demo hesaplari yuklenemedi.</div>`;
    return;
  }

  let html = "";

  if (state.demoGroups.length > 0) {
    state.demoGroups.forEach((group) => {
      html += `
        <div class="demo-group-section">
          <div class="demo-group-header">
            <h3>${escapeHtml(group.name)}</h3>
            <p class="mini-copy">${escapeHtml(group.description || "")}</p>
          </div>
          <p class="mini-copy" style="color: var(--text-secondary); margin-bottom: 0.5rem;">Kategoriye ait: ${group.memberCount || 0} hesap</p>
        </div>
      `;
    });
  }

  html += state.demoAccounts
    .map(
      (account) => `
        <article class="demo-account">
          <strong>${escapeHtml(account.name)}</strong>
          <p class="mini-copy">${escapeHtml(account.email)}</p>
          <p class="mini-copy">Rol: ${escapeHtml(account.role)}</p>
          <button class="button button-secondary" type="button" data-demo-email="${escapeHtml(account.email)}">Bu hesapla gir</button>
        </article>
      `
    )
    .join("");

  elements.demoAccounts.innerHTML = html;
}

function renderSessionCard() {
  if (!state.session) {
    elements.currentUserCard.innerHTML = "";
    return;
  }

  elements.currentUserCard.innerHTML = `
    <div class="session-head">
      <div class="session-profile">
        ${avatarHtml(state.session)}
        <div>
          <p class="person-title">${escapeHtml(state.session.name)}</p>
          <p class="person-subtitle">${escapeHtml(state.session.headline)}</p>
        </div>
      </div>
      <span class="meta-chip">${escapeHtml(state.session.role)}</span>
    </div>
    <p class="mini-copy">${escapeHtml(state.session.email)}${state.session.city ? ` | ${escapeHtml(state.session.city)}` : ""}</p>
    <div class="person-actions">
      <button class="button button-secondary" data-action="open-my-profile" type="button">Profilimi ac</button>
    </div>
  `;

  elements.resetDemoButton.classList.toggle("hidden", state.session.role !== "admin");
}

function renderStats() {
  const stats = state.dashboard?.stats;

  if (!stats) {
    elements.statsGrid.innerHTML = "";
    return;
  }

  const items = [
    ["Kullanici", stats.users],
    ["Takip iliskisi", stats.follows],
    ["Gonderi", stats.posts],
    ["Begeni", stats.likes],
    ["Yorum", stats.comments ?? 0]
  ];

  elements.statsGrid.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="stat-card">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderTargetSelector() {
  const users = state.dashboard?.users ?? [];
  const targetId = state.dashboard?.targetId ?? "";
  const currentUserId = state.session?.id;

  const options = users
    .filter((user) => user.id !== currentUserId)
    .map(
      (user) => `
        <option value="${escapeHtml(user.id)}" ${user.id === targetId ? "selected" : ""}>${escapeHtml(user.name)}</option>
      `
    )
    .join("");

  elements.targetSelect.innerHTML = options;
}

function renderUsers() {
  const users = state.dashboard?.users ?? [];
  const search = normalizeSearch(state.peopleSearch);
  const visibleUsers = search
    ? users.filter((user) =>
        [user.name, user.headline, user.city, user.bio, user.role]
          .map(normalizeSearch)
          .some((value) => value.includes(search))
      )
    : users;

  if (!users.length) {
    elements.usersList.innerHTML = `<div class="empty-state">Henuz kullanici yok.</div>`;
    return;
  }

  if (!visibleUsers.length) {
    elements.usersList.innerHTML = `<div class="empty-state">Aramanizla eslesen kisi bulunamadi.</div>`;
    return;
  }

  elements.usersList.innerHTML = visibleUsers
    .map((user) => {
      const isOpenProfile = state.selectedProfile?.user?.id === user.id;
      const isOpeningProfile = state.openingProfileId === user.id;
      const followButton = user.isViewer
        ? `<button class="button button-secondary" type="button" disabled>Aktif profil</button>`
        : user.followedByViewer
          ? `<button class="button button-secondary" data-action="unfollow" data-target-id="${escapeHtml(user.id)}" type="button">Takipten cik</button>`
          : `<button class="button button-primary" data-action="follow" data-target-id="${escapeHtml(user.id)}" type="button">Takip et</button>`;

      return `
        <article class="person-card${isOpenProfile ? " person-card-open" : ""}${isOpeningProfile ? " person-card-opening" : ""}">
          <button class="person-top person-profile-link" data-action="open-profile" data-target-id="${escapeHtml(user.id)}" type="button" aria-current="${isOpenProfile ? "true" : "false"}" ${isOpeningProfile ? "disabled" : ""}>
            ${avatarHtml(user)}
            <div>
              <p class="person-title">${escapeHtml(user.name)}${isOpenProfile ? `<span class="open-profile-badge">Acik</span>` : ""}</p>
              <p class="person-subtitle">${escapeHtml(user.headline)}</p>
            </div>
          </button>
          <p class="person-bio">${escapeHtml(user.bio)}</p>
          <div class="person-meta">
            <span>${escapeHtml(user.city)}</span>
            <span>${user.followingCount} takip</span>
            <span>${user.followerCount} takipci</span>
            <span>${user.postCount} gonderi</span>
          </div>
          <div class="person-actions">
            ${followButton}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProfileDetail() {
  const profile = state.selectedProfile;

  if (!profile?.user) {
    elements.profileDetail.classList.add("hidden");
    elements.profileDetail.innerHTML = "";
    return;
  }

  const user = profile.user;
  const isOwnProfile = user.id === state.session?.id;
  const followButton = isOwnProfile
    ? `<button class="button button-secondary" type="button" disabled>Aktif profil</button>`
    : user.followedByViewer
      ? `<button class="button button-secondary" data-action="profile-unfollow" data-target-id="${escapeHtml(user.id)}" type="button">Takipten cik</button>`
      : `<button class="button button-primary" data-action="profile-follow" data-target-id="${escapeHtml(user.id)}" type="button">Takip et</button>`;
  const connectionList = (items, emptyText) =>
    items.length
      ? items
          .map(
            (person) => `
              <button class="profile-person-chip" data-action="open-profile" data-target-id="${escapeHtml(person.id)}" type="button">
                ${avatarHtml(person, "avatar-small")}
                <span>
                  <strong>${escapeHtml(person.name)}</strong>
                  <small>${escapeHtml(person.headline)}</small>
                </span>
              </button>
            `
          )
          .join("")
      : `<div class="empty-state compact-empty">${emptyText}</div>`;
  const profileMutual = Array.isArray(profile.mutualConnections) ? profile.mutualConnections : [];
  const profileSuggestions = Array.isArray(profile.friendSuggestions) ? profile.friendSuggestions : [];
  const suggestionList = profileSuggestions.length
    ? profileSuggestions
        .map(
          (person) => `
            <article class="profile-suggestion">
              <div class="profile-suggestion-main">
                <button class="profile-person-chip" data-action="open-profile" data-target-id="${escapeHtml(person.id)}" type="button">
                  ${avatarHtml(person, "avatar-small")}
                  <span>
                    <strong>${escapeHtml(person.name)}</strong>
                    <small>${escapeHtml(person.headline)}</small>
                  </span>
                </button>
                <button class="button button-primary button-small" data-action="suggestion-follow" data-target-id="${escapeHtml(person.id)}" type="button">Takip et</button>
              </div>
              <p class="profile-suggestion-reason">${escapeHtml(person.reason ?? "Graph baglantilarina gore onerildi.")}</p>
              ${
                person.bridgeNames?.length
                  ? `<p class="profile-suggestion-bridge">Ortak gecis: ${escapeHtml(person.bridgeNames.join(", "))}</p>`
                  : ""
              }
            </article>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty">Bu profil icin yeni arkadas onerisi yok.</div>`;
  const profilePosts = Array.isArray(profile.posts) ? profile.posts : [];
  const postList = profilePosts.length
    ? profilePosts
        .map(
          (post) => {
            const media = renderPostMediaElement(post, "profile-post-media");
            const content = post.content
              ? `<p>${escapeHtml(post.content)}</p>`
              : media
                ? ""
                : `<p>Medya gonderisi</p>`;

            return `
              <article class="profile-post">
                <div class="profile-post-head">
                  <strong>${formatDate(post.createdAt)}</strong>
                  <span>${post.likeCount} begeni | ${post.commentCount ?? 0} yorum</span>
                </div>
                ${content}
                ${media}
              </article>
            `;
          }
        )
        .join("")
    : `<div class="empty-state compact-empty">Bu profilde henuz gonderi yok.</div>`;
  const editImagePreview = state.profileEditImage
    ? `
      <div class="media-preview">
        <div class="media-preview-frame">
          <img src="${escapeHtml(state.profileEditImage.dataUrl)}" alt="${escapeHtml(state.profileEditImage.name)}" />
        </div>
        <div class="media-preview-meta">
          <span>${escapeHtml(state.profileEditImage.name)}</span>
          <button class="button button-ghost button-small" data-action="clear-profile-image-edit" type="button">Kaldir</button>
        </div>
      </div>
    `
    : "";
  const editForm = isOwnProfile
    ? `
      <form id="profileEditForm" class="profile-edit-form">
        <div class="profile-edit-grid">
          <label>Ad soyad<input name="name" value="${escapeHtml(user.name)}" required /></label>
          <label>Baslik<input name="headline" value="${escapeHtml(user.headline)}" required /></label>
          <label>Sehir<input name="city" value="${escapeHtml(user.city)}" /></label>
          <label>Profil rengi<input name="color" type="color" value="${escapeHtml(user.color || "#0f766e")}" /></label>
        </div>
        <label>Bio<textarea name="bio" rows="3">${escapeHtml(user.bio ?? "")}</textarea></label>
        <label class="media-picker">Profil fotografi degistir<input id="profileImageEditInput" name="profileImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        ${
          user.profileImageUrl && !state.profileEditRemoveImage && !state.profileEditImage
            ? `<button class="button button-ghost button-small" data-action="remove-profile-image-edit" type="button">Mevcut fotografi kaldir</button>`
            : ""
        }
        ${
          state.profileEditRemoveImage && !state.profileEditImage
            ? `<div class="empty-state compact-empty">Mevcut profil fotografi kaldirilacak.</div>`
            : ""
        }
        ${editImagePreview}
        <button class="button button-primary" type="submit">Profilimi kaydet</button>
      </form>
    `
    : "";

  elements.profileDetail.classList.remove("hidden");
  elements.profileDetail.innerHTML = `
    <article class="profile-card">
      <div class="profile-hero">
        ${avatarHtml(user, "avatar-large")}
        <div class="profile-main">
          <div class="profile-title-row">
            <div>
              <h3>${escapeHtml(user.name)}</h3>
              <p>${escapeHtml(user.headline)}</p>
            </div>
            <span class="meta-chip">${isOwnProfile ? "Benim profilim" : user.followedByViewer ? "Takip ediliyor" : "Profil"}</span>
          </div>
          <p class="person-bio">${escapeHtml(user.bio)}</p>
          <div class="person-meta">
            <span>${escapeHtml(user.city)}</span>
            <span>${user.followingCount} takip</span>
            <span>${user.followerCount} takipci</span>
            <span>${user.postCount} gonderi</span>
          </div>
          <div class="person-actions">
            ${followButton}
            <button class="button button-ghost" data-action="back-profile" type="button">Geri</button>
          </div>
        </div>
      </div>
      ${editForm}
      <div class="profile-grid">
        <section>
          <h4>Takip ettikleri</h4>
          <div class="profile-chip-list">${connectionList(profile.following, "Bu kullanici henuz kimseyi takip etmiyor.")}</div>
        </section>
        <section>
          <h4>Takipciler</h4>
          <div class="profile-chip-list">${connectionList(profile.followers, "Bu kullanicinin henuz takipcisi yok.")}</div>
        </section>
        <section>
          <h4>Ortak arkadaslar</h4>
          <div class="profile-chip-list">${connectionList(
            profileMutual,
            isOwnProfile ? "Kendi profilinizde ortak arkadas bulunmaz." : "Bu kisiyle ortak arkadasiniz yok."
          )}</div>
        </section>
        <section class="profile-suggestion-section">
          <h4>Arkadas onerileri</h4>
          <div class="profile-suggestion-list">${suggestionList}</div>
        </section>
        <section class="profile-post-section">
          <h4>Son gönderiler</h4>
          <div class="profile-post-list">${postList}</div>
        </section>
      </div>
    </article>
  `;
}

function renderPosts() {
  const posts = state.dashboard?.posts ?? [];

  if (!posts.length) {
    elements.postsList.innerHTML = `<div class="empty-state">Henuz gonderi yok.</div>`;
    return;
  }

  elements.postsList.innerHTML = posts
    .map((post) => {
      const likeLabel = post.likedByViewer ? "Begeniyi kaldir" : "Begeni";
      const likeAction = post.likedByViewer ? "unlike" : "like";
      const comments = post.comments ?? [];
      const deleteAllowed = (comment) => comment.authoredByViewer || state.session?.role === "admin";
      const postMedia = renderPostMediaElement(post);
      const canManagePost = post.authoredByViewer || state.session?.role === "admin";
      const isEditing = state.editingPostId === post.id;
      const editMediaPreview = state.editMedia
        ? state.editMedia.type.startsWith("image/")
          ? `<img src="${escapeHtml(state.editMedia.dataUrl)}" alt="${escapeHtml(state.editMedia.name)}" />`
          : `<video src="${escapeHtml(state.editMedia.dataUrl)}" controls muted playsinline></video>`
        : "";
      const currentEditMedia =
        post.mediaUrl && !state.editRemoveMedia && !state.editMedia
          ? `
            <div class="edit-media-current">
              ${postMedia}
              <button class="button button-ghost button-small" data-action="remove-edit-media" data-post-id="${escapeHtml(post.id)}" type="button">Medyayi kaldir</button>
            </div>
          `
          : "";
      const editForm = isEditing
        ? `
          <form class="edit-post-form" data-post-id="${escapeHtml(post.id)}">
            <label>
              Gonderi metni
              <textarea name="content" rows="4" maxlength="500">${escapeHtml(post.content ?? "")}</textarea>
            </label>
            <label class="media-picker">
              Fotograf veya video degistir
              <input class="edit-media-input" name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg" />
            </label>
            ${currentEditMedia}
            ${
              state.editRemoveMedia && !state.editMedia
                ? `<div class="empty-state compact-empty">Mevcut medya kaldirilacak.</div>`
                : ""
            }
            ${
              editMediaPreview
                ? `
                  <div class="media-preview">
                    <div class="media-preview-frame">${editMediaPreview}</div>
                    <div class="media-preview-meta">
                      <span>${escapeHtml(state.editMedia.name)}</span>
                      <button class="button button-ghost button-small" data-action="clear-edit-media" data-post-id="${escapeHtml(post.id)}" type="button">Kaldir</button>
                    </div>
                  </div>
                `
                : ""
            }
            <div class="post-actions">
              <button class="button button-primary" type="submit">Kaydet</button>
              <button class="button button-ghost" data-action="cancel-edit-post" data-post-id="${escapeHtml(post.id)}" type="button">Vazgec</button>
            </div>
          </form>
        `
        : "";
      const managementActions = canManagePost
        ? `
          <button class="button button-secondary" data-action="edit-post" data-post-id="${escapeHtml(post.id)}" type="button">Duzenle</button>
          <button class="button button-ghost" data-action="delete-post" data-post-id="${escapeHtml(post.id)}" type="button">Sil</button>
        `
        : "";
      const commentsMarkup = comments.length
        ? comments
            .map(
              (comment) => `
                <article class="comment-item">
                  <div class="comment-head">
                    <button class="comment-author person-profile-link" data-action="open-profile" data-target-id="${escapeHtml(comment.author.id)}" type="button">
                      ${avatarHtml(comment.author, "avatar-small")}
                      <div>
                        <p class="person-title">${escapeHtml(comment.author.name)}</p>
                        <p class="person-subtitle">${formatDate(comment.createdAt)}</p>
                      </div>
                    </button>
                    ${
                      deleteAllowed(comment)
                        ? `<button class="button button-ghost button-small" data-action="delete-comment" data-post-id="${escapeHtml(
                            post.id
                          )}" data-comment-id="${escapeHtml(comment.id)}" type="button">Sil</button>`
                        : ""
                    }
                  </div>
                  <p class="comment-content">${escapeHtml(comment.content)}</p>
                </article>
              `
            )
            .join("")
        : `<div class="empty-state compact-empty">Ilk yorumu siz yazin.</div>`;

      return `
        <article class="post-card">
          <div class="post-head">
            <button class="post-author person-profile-link" data-action="open-profile" data-target-id="${escapeHtml(post.author.id)}" type="button">
              ${avatarHtml(post.author)}
              <div>
                <p class="person-title">${escapeHtml(post.author.name)}</p>
                <p class="person-subtitle">${escapeHtml(post.author.headline)}</p>
              </div>
            </button>
            <p class="post-time">${formatDate(post.createdAt)}</p>
          </div>
          ${post.content ? `<p class="post-content">${escapeHtml(post.content)}</p>` : ""}
          ${postMedia}
          <div class="post-actions">
            <button class="button ${post.likedByViewer ? "button-secondary" : "button-primary"}" data-action="${likeAction}" data-post-id="${escapeHtml(post.id)}" type="button">${likeLabel}</button>
            <button class="button button-ghost" type="button" disabled>${post.likeCount} begeni</button>
            <button class="button button-ghost" type="button" disabled>${post.commentCount ?? 0} yorum</button>
            ${managementActions}
          </div>
          ${editForm}
          <div class="comment-section">
            <div class="comment-list">${commentsMarkup}</div>
            <form class="comment-form" data-post-id="${escapeHtml(post.id)}">
              <input name="content" type="text" maxlength="280" placeholder="Yorum yazin" required />
              <button class="button button-secondary" type="submit">Yorumla</button>
            </form>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderNotifications() {
  const notifications = state.notifications ?? [];
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const markAllDisabled = unreadCount === 0 ? "disabled" : "";

  elements.notificationsSummary.innerHTML = `
    <article class="notification-summary-card">
      <strong>${notifications.length}</strong>
      <span>Toplam bildirim</span>
    </article>
    <article class="notification-summary-card">
      <strong>${unreadCount}</strong>
      <span>Yeni aktivite</span>
    </article>
    <button class="button button-secondary notification-mark-all" type="button" data-action="mark-all-notifications-read" ${markAllDisabled}>
      Mark All as Read
    </button>
  `;

  if (!notifications.length) {
    elements.notificationsList.innerHTML = `<div class="empty-state">Henuz bildiriminiz yok.</div>`;
    return;
  }

  elements.notificationsList.innerHTML = notifications
    .map((notification) => {
      const actor = notification.actor;
      const actorMarkup = actor
        ? `
          <button class="notification-actor person-profile-link" data-action="open-profile" data-target-id="${escapeHtml(actor.id)}" type="button">
            ${avatarHtml(actor, "avatar-small")}
            <span>${escapeHtml(actor.name)}</span>
          </button>
        `
        : `<span class="meta-chip">System</span>`;

      return `
        <article class="notification-card${notification.unread ? " notification-unread" : " notification-read"}" data-notification-id="${escapeHtml(notification.id)}">
          <div class="notification-icon" aria-hidden="true">${escapeHtml(notification.type?.slice(0, 1)?.toUpperCase() || "N")}</div>
          <div class="notification-body">
            <div class="notification-head">
              <div>
                <strong>${escapeHtml(notification.title)}</strong>
                <span class="notification-status">${notification.unread ? "New" : "Read"}</span>
              </div>
              <span>${formatDate(notification.createdAt)}</span>
            </div>
            <p>${escapeHtml(notification.body)}</p>
            <div class="notification-actions">
              ${actorMarkup}
              ${
                notification.unread
                  ? `<button class="button button-small button-secondary" type="button" data-action="mark-notification-read" data-notification-id="${escapeHtml(notification.id)}">Mark as Read</button>`
                  : `<span class="meta-chip">Read</span>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function markNotificationRead(notificationId) {
  const index = state.notifications.findIndex((notification) => notification.id === notificationId);

  if (index === -1 || !state.notifications[index].unread) {
    return;
  }

  const previous = state.notifications[index];
  state.notifications[index] = {
    ...previous,
    unread: false
  };
  renderNotifications();

  try {
    const payload = await request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "PATCH"
    });

    state.notifications[index] = payload.notification ?? state.notifications[index];
    renderNotifications();
  } catch (error) {
    state.notifications[index] = previous;
    renderNotifications();
    setStatus(error.message, true);
  }
}

async function markAllNotificationsRead() {
  const previousNotifications = state.notifications.map((notification) => ({ ...notification }));

  if (!previousNotifications.some((notification) => notification.unread)) {
    return;
  }

  state.notifications = state.notifications.map((notification) => ({
    ...notification,
    unread: false
  }));
  renderNotifications();

  try {
    const payload = await request("/api/notifications/read-all", {
      method: "PATCH"
    });

    state.notifications = payload.notifications ?? state.notifications;
    renderNotifications();
  } catch (error) {
    state.notifications = previousNotifications;
    renderNotifications();
    setStatus(error.message, true);
  }
}

function renderMiniList(container, items, renderer, emptyText = "Sonuc bulunamadi.") {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items.map(renderer).join("");
}

function renderPath() {
  const path = state.dashboard?.insights?.shortestPath ?? { nodes: [], hops: null };
  elements.pathMeta.textContent =
    path.hops === null ? "Baglanti yok" : path.hops === 0 ? "Ayni kullanici" : `${path.hops} adim`;

  if (!path.nodes.length) {
    elements.pathView.innerHTML = `<div class="empty-state">Secilen kisiler arasinda baglanti bulunamadi.</div>`;
    return;
  }

  elements.pathView.innerHTML = path.nodes
    .map(
      (node, index) => `
        ${index > 0 ? `<span class="path-separator">-&gt;</span>` : ""}
        <span class="path-node">${node.name}</span>
      `
    )
    .join("");
}

function renderRuntime() {
  const runtime = state.dashboard?.graph?.runtime;

  if (!runtime) {
    elements.pluginStatus.innerHTML = `<div class="empty-state">Plugin durumu okunamadi.</div>`;
    return;
  }

  const items = [
    `GDS: ${runtime.gdsAvailable ? runtime.gdsVersion || "aktif" : "yok"}`,
    `APOC: ${runtime.apocAvailable ? runtime.apocVersion || "aktif" : "yok"}`
  ];

  elements.pluginStatus.innerHTML = items
    .map(
      (item) => `
        <div class="mini-list-item">
          <strong>${item}</strong>
        </div>
      `
    )
    .join("");
}

function renderInsights() {
  const insights = state.dashboard?.insights;
  const graph = state.dashboard?.graph;

  if (!insights || !graph) {
    return;
  }

  renderPath();
  renderRuntime();

  renderMiniList(
    elements.secondDegreeList,
    insights.secondDegree,
    (user) => `
      <div class="mini-list-item">
        <strong>${user.name}</strong>
        <p class="mini-copy">${user.headline}</p>
        <p class="mini-copy">${user.viaCount} ortak gecis | ${user.viaNames.join(", ")}</p>
      </div>
    `
  );

  renderMiniList(
    elements.mutualList,
    insights.mutualConnections,
    (user) => `
      <div class="mini-list-item">
        <strong>${user.name}</strong>
        <p class="mini-copy">${user.headline}</p>
      </div>
    `
  );

  renderMiniList(
    elements.recommendationList,
    insights.recommendations,
    (user) => `
      <div class="mini-list-item">
        <strong>${user.name}</strong>
        <p class="mini-copy">${user.reason}</p>
        <p class="mini-copy">Skor ${user.score}</p>
      </div>
    `
  );

  renderMiniList(
    elements.communityList,
    graph.communities ?? [],
    (community) => `
      <div class="mini-list-item">
        <strong>Community ${community.communityId}</strong>
        <p class="mini-copy">${community.size} uye</p>
        <p class="mini-copy">${community.members.map((member) => member.name).join(", ")}</p>
      </div>
    `,
    "GDS Louvain sonucu bulunamadi."
  );

  renderMiniList(
    elements.pagerankList,
    graph.pageRank ?? [],
    (item) => `
      <div class="mini-list-item">
        <strong>${item.user.name}</strong>
        <p class="mini-copy">${item.user.headline}</p>
        <p class="mini-copy">Skor ${item.score}</p>
      </div>
    `,
    "PageRank sonucu bulunamadi."
  );

  renderMiniList(
    elements.embeddingList,
    graph.embeddings ?? [],
    (item) => `
      <div class="mini-list-item">
        <strong>${item.user.name}</strong>
        <p class="mini-copy">${item.user.headline}</p>
        <p class="mini-copy">[${item.embedding.map((value) => Number(value).toFixed(2)).join(", ")}]</p>
      </div>
    `,
    "Embedding sonucu bulunamadi."
  );

  elements.cypherExamples.innerHTML = insights.cypherExamples
    .map(
      (example) => `
        <article class="cypher-card">
          <p><strong>${example.title}</strong></p>
          <pre>${example.query}</pre>
        </article>
      `
    )
    .join("");
}

function renderGraph() {
  if (state.cy) {
    state.cy.destroy();
    state.cy = null;
  }

  if (!state.network?.nodes?.length || !window.cytoscape) {
    elements.graphCanvas.innerHTML = `<div class="empty-state">Graph cizimi icin veri bulunamadi.</div>`;
    return;
  }

  elements.graphCanvas.innerHTML = "";

  state.cy = window.cytoscape({
    container: elements.graphCanvas,
    elements: [...state.network.nodes, ...state.network.edges],
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          color: getCssVar("--graph-node-label"),
          "font-size": 10,
          "text-valign": "center",
          "text-wrap": "wrap",
          "text-max-width": 90
        }
      },
      {
        selector: 'node[type = "User"]',
        style: {
          width: 54,
          height: 54,
          "background-color": "data(color)",
          "border-width": 2,
          "border-color": getCssVar("--graph-user-border")
        }
      },
      {
        selector: 'node[type = "Post"]',
        style: {
          shape: "round-rectangle",
          width: 92,
          height: 62,
          padding: "10px",
          "background-color": "#f59e0b",
          color: getCssVar("--graph-post-label"),
          "font-size": 9
        }
      },
      {
        selector: "edge",
        style: {
          width: 2,
          label: "data(label)",
          "font-size": 7,
          color: getCssVar("--graph-edge-label"),
          "curve-style": "bezier",
          "target-arrow-shape": "triangle",
          "target-arrow-color": getCssVar("--graph-edge"),
          "line-color": getCssVar("--graph-edge"),
          "text-background-color": getCssVar("--graph-label-bg"),
          "text-background-opacity": 0.8,
          "text-background-padding": 2
        }
      },
      {
        selector: 'edge[type = "AUTHORED"]',
        style: {
          "line-color": "#2dd4bf",
          "target-arrow-color": "#2dd4bf"
        }
      },
      {
        selector: 'edge[type = "LIKED"]',
        style: {
          "line-color": "#f59e0b",
          "target-arrow-color": "#f59e0b",
          "line-style": "dashed"
        }
      }
    ],
    layout: {
      name: "cose",
      animate: false,
      fit: true,
      padding: 30
    }
  });

  state.cy.on("tap", "node", (event) => {
    const data = event.target.data();

    if (data.type !== "User" || data.id === state.session?.id) {
      return;
    }

    const option = elements.targetSelect.querySelector(`option[value="${data.id}"]`);

    if (option) {
      elements.targetSelect.value = data.id;
      loadAppData();
    }
  });
}

function renderAll() {
  renderSessionCard();
  renderStats();
  renderTargetSelector();
  renderUsers();
  renderProfileDetail();
  renderPosts();
  renderNotifications();
  renderInsights();
  renderGraph();
}

async function loadAppData() {
  if (!state.session || state.loading) {
    return;
  }

  state.loading = true;
  elements.refreshButton.disabled = true;
  setStatus("Veri yenileniyor...");

  try {
    const params = new URLSearchParams();

    if (elements.targetSelect.value) {
      params.set("targetId", elements.targetSelect.value);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const [dashboard, network, notificationPayload] = await Promise.all([
      request(`/api/dashboard${suffix}`),
      request("/api/graph/network"),
      request("/api/notifications")
    ]);
    state.dashboard = dashboard;
    state.network = network;
    state.notifications = notificationPayload.notifications ?? [];
    renderAll();
    setStatus("Arayuz, auth ve graph verisi senkron.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.loading = false;
    elements.refreshButton.disabled = false;
  }
}

async function mutate(action) {
  try {
    await action();
    await loadAppData();
    return true;
  } catch (error) {
    setStatus(error.message, true);
    return false;
  }
}

async function loadProfile(userId, options = {}) {
  try {
    state.openingProfileId = userId;
    renderUsers();
    setStatus("Profil aciliyor...");

    if (options.pushHistory && state.selectedProfile?.user?.id && state.selectedProfile.user.id !== userId) {
      state.profileHistory.push(state.selectedProfile.user.id);
    }

    const payload = await request(`/api/users/${encodeURIComponent(userId)}`);
    state.selectedProfile = payload.profile;
    state.profileEditImage = null;
    state.profileEditRemoveImage = false;
    state.openingProfileId = null;
    renderProfileDetail();
    setActiveCategory("people");
    renderUsers();
    elements.profileDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(`${payload.profile.user.name} profili acildi.`);
  } catch (error) {
    state.openingProfileId = null;
    renderUsers();
    setStatus(error.message, true);
  }
}

async function readProfileImageFromInput(input) {
  const file = input.files?.[0];

  if (!file) {
    return null;
  }

  if (!isSupportedProfileImageType(file.type)) {
    input.value = "";
    throw new Error("Profil fotografi icin sadece JPG, PNG, WEBP veya GIF yukleyebilirsiniz.");
  }

  if (file.size > 5 * 1024 * 1024) {
    input.value = "";
    throw new Error("Profil fotografi en fazla 5 MB olabilir.");
  }

  return {
    dataUrl: await readFileAsDataUrl(file),
    name: file.name,
    type: file.type
  };
}

async function loadSession() {
  const payload = await request("/api/auth/me", {}, false);
  state.session = payload.user;
}

async function loadDemoData() {
  try {
    const payload = await request("/api/auth/demo-accounts", {}, false);
    state.demoPassword = payload.password;
    state.demoAccounts = payload.accounts;
  } catch (_error) {
    // Demo accounts failed to load
  }
  
  try {
    const groupsPayload = await request("/api/social/groups", {}, false);
    state.demoGroups = groupsPayload.groups || [];
  } catch (_error) {
    // Groups failed to load
  }
  
  renderDemoAccounts();
}

async function bootstrap() {
  await verifySystemStatus();
  await loadDemoData();

  try {
    await loadSession();
    toggleApp(true);
    await loadAppData();
  } catch (_error) {
    toggleApp(false);
    setAuthMessage("Demo hesaplarindan biriyle giris yapabilir veya yeni hesap olusturabilirsiniz.");
  }
}

elements.themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTheme(button.dataset.themeValue);
  });
});

elements.uiColorInput.addEventListener("input", (event) => {
  setAccentColor(event.currentTarget.value);
});

elements.resetUiColorButton.addEventListener("click", () => {
  resetAccentColor();
});

elements.backgroundColorInput.addEventListener("input", (event) => {
  setBackgroundColor(event.currentTarget.value);
});

elements.resetBackgroundColorButton.addEventListener("click", () => {
  resetBackgroundColor();
});

elements.navTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveCategory(button.dataset.category);
  });
});

elements.authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode);
    setAuthMessage("");
  });
});

elements.authPanelBackdrop?.addEventListener("click", () => {
  setAuthMode(null);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.authMode) {
    setAuthMode(null);
  }
});

elements.peopleSearchInput.addEventListener("input", (event) => {
  state.peopleSearch = event.currentTarget.value;
  renderUsers();
});

elements.currentUserCard.addEventListener("click", async (event) => {
  if (event.target.closest("[data-action='open-my-profile']")) {
    await loadProfile(state.session.id, { pushHistory: true });
  }
});

elements.profileDetail.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const targetId = button.dataset.targetId;

  if (action === "back-profile") {
    const previousProfileId = state.profileHistory.pop();

    if (previousProfileId) {
      await loadProfile(previousProfileId);
      return;
    }

    state.selectedProfile = null;
    state.profileHistory = [];
    state.profileEditImage = null;
    state.profileEditRemoveImage = false;
    renderProfileDetail();
    renderUsers();
    return;
  }

  if (action === "open-profile") {
    await loadProfile(targetId, { pushHistory: true });
    return;
  }

  if (action === "profile-follow") {
    const changed = await mutate(() =>
      request("/api/follows", {
        method: "POST",
        body: JSON.stringify({ targetId })
      })
    );

    if (changed) {
      await loadProfile(targetId);
    }
    return;
  }

  if (action === "profile-unfollow") {
    const changed = await mutate(() =>
      request(`/api/follows?targetId=${encodeURIComponent(targetId)}`, {
        method: "DELETE"
      })
    );

    if (changed) {
      await loadProfile(targetId);
    }
    return;
  }

  if (action === "suggestion-follow") {
    const profileId = state.selectedProfile?.user?.id;
    const changed = await mutate(() =>
      request("/api/follows", {
        method: "POST",
        body: JSON.stringify({ targetId })
      })
    );

    if (changed && profileId) {
      await loadProfile(profileId);
    }
    return;
  }

  if (action === "remove-profile-image-edit") {
    state.profileEditImage = null;
    state.profileEditRemoveImage = true;
    renderProfileDetail();
    return;
  }

  if (action === "clear-profile-image-edit") {
    state.profileEditImage = null;
    state.profileEditRemoveImage = false;
    renderProfileDetail();
  }
});

elements.profileDetail.addEventListener("change", async (event) => {
  const input = event.target.closest("#profileImageEditInput");

  if (!input) {
    return;
  }

  try {
    state.profileEditImage = await readProfileImageFromInput(input);
    state.profileEditRemoveImage = false;
    renderProfileDetail();
  } catch (error) {
    state.profileEditImage = null;
    setStatus(error.message, true);
  }
});

elements.profileDetail.addEventListener("submit", async (event) => {
  const form = event.target.closest("#profileEditForm");

  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const changed = await mutate(() =>
    request("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: formData.get("name"),
        headline: formData.get("headline"),
        city: formData.get("city"),
        bio: formData.get("bio"),
        color: formData.get("color"),
        profileImage: state.profileEditImage,
        removeProfileImage: state.profileEditRemoveImage
      })
    })
  );

  if (changed) {
    await loadSession();
    renderSessionCard();
    await loadProfile(state.session.id);
  }
});

elements.demoAccounts.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-demo-email]");

  if (!button) {
    return;
  }

  setAuthMode("login");
  elements.loginForm.email.value = button.dataset.demoEmail;
  elements.loginForm.password.value = state.demoPassword;
  setAuthMessage("Demo kullanici bilgileri giris formuna yerlestirildi.");
});

elements.registerProfileImageInput.addEventListener("change", async (event) => {
  try {
    state.registerProfileImage = await readProfileImageFromInput(event.currentTarget);
    renderImagePreview(elements.registerProfileImagePreview, state.registerProfileImage, "clearRegisterProfileImageButton");
  } catch (error) {
    state.registerProfileImage = null;
    renderImagePreview(elements.registerProfileImagePreview, null, "clearRegisterProfileImageButton");
    setAuthMessage(error.message, true);
  }
});

elements.registerProfileImagePreview.addEventListener("click", (event) => {
  if (!event.target.closest("#clearRegisterProfileImageButton")) {
    return;
  }

  state.registerProfileImage = null;
  elements.registerProfileImageInput.value = "";
  renderImagePreview(elements.registerProfileImagePreview, null, "clearRegisterProfileImageButton");
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  const validationMessage = validateLoginPayload(payload);

  if (validationMessage) {
    setAuthMessage(validationMessage, true);
    return;
  }

  try {
    setAuthMessage("Giris kontrol ediliyor...");
    const responsePayload = await request(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      false
    );

    state.session = responsePayload.user;
    toggleApp(true);
    setAuthMessage("Giris basarili.");
    await loadAppData();
    setStatus("Giris basarili. Bildirimleriniz senkronize edildi.");
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const requestPayload = Object.fromEntries(formData.entries());
  delete requestPayload.profileImage;
  requestPayload.profileImage = state.registerProfileImage;
  const validationMessage = validateRegisterPayload(requestPayload);

  if (validationMessage) {
    setAuthMessage(validationMessage, true);
    return;
  }

  try {
    setAuthMessage("Hesap olusturuluyor...");
    const responsePayload = await request(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(requestPayload)
      },
      false
    );

    state.session = responsePayload.user;
    state.registerProfileImage = null;
    elements.registerProfileImageInput.value = "";
    renderImagePreview(elements.registerProfileImagePreview, null, "clearRegisterProfileImageButton");
    toggleApp(true);
    setAuthMessage("Kayit basarili.");
    await loadAppData();
    setStatus("Kayit basarili. Bildirim merkeziniz hazir.");
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

elements.logoutButton.addEventListener("click", async () => {
  try {
    await request(
      "/api/auth/logout",
      {
        method: "POST"
      },
      false
    );
  } catch (_error) {
    // Even if logout fails, clear the local UI state.
  }

  state.session = null;
  state.dashboard = null;
  state.network = null;
  state.notifications = [];
  state.selectedProfile = null;
  state.profileHistory = [];

  if (state.cy) {
    state.cy.destroy();
    state.cy = null;
  }

  toggleApp(false);
  setAuthMessage("Oturum kapatildi.");
});

elements.targetSelect.addEventListener("change", () => {
  loadAppData();
});

elements.refreshButton.addEventListener("click", () => {
  verifySystemStatus();
  loadAppData();
});

elements.resetDemoButton.addEventListener("click", () => {
  mutate(() =>
    request("/api/demo/reset", {
      method: "POST"
    })
  );
});

elements.postMediaInput.addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];

  if (!file) {
    clearPostMedia();
    return;
  }

  if (!isSupportedMediaType(file.type)) {
    clearPostMedia();
    setStatus("Sadece JPG, PNG, WEBP, GIF, MP4, WEBM veya OGG yukleyebilirsiniz.", true);
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    clearPostMedia();
    setStatus("Medya dosyasi en fazla 20 MB olabilir.", true);
    return;
  }

  try {
    state.selectedMedia = {
      dataUrl: await readFileAsDataUrl(file),
      name: file.name,
      type: file.type
    };
    renderPostMediaPreview();
    setStatus("Medya gonderiye eklendi.");
  } catch (error) {
    clearPostMedia();
    setStatus(error.message, true);
  }
});

elements.postMediaPreview.addEventListener("click", (event) => {
  if (event.target.closest("#clearPostMediaButton")) {
    clearPostMedia();
  }
});

elements.postForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const content = String(formData.get("content") ?? "").trim();

  if (!content && !state.selectedMedia) {
    setStatus("Paylasim icin metin, fotograf veya video ekleyin.", true);
    return;
  }

  const posted = await mutate(() =>
    request("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        content,
        media: state.selectedMedia
      })
    })
  );

  if (posted) {
    event.currentTarget.reset();
    clearPostMedia();
  }
});

elements.usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const targetId = button.dataset.targetId;
  const action = button.dataset.action;

  if (action === "open-profile") {
    await loadProfile(targetId, { pushHistory: true });
    return;
  }

  if (action === "follow") {
    await mutate(() =>
      request("/api/follows", {
        method: "POST",
        body: JSON.stringify({ targetId })
      })
    );
    if (state.selectedProfile?.user?.id === targetId) {
      await loadProfile(targetId);
    }
  }

  if (action === "unfollow") {
    await mutate(() =>
      request(`/api/follows?targetId=${encodeURIComponent(targetId)}`, {
        method: "DELETE"
      })
    );
    if (state.selectedProfile?.user?.id === targetId) {
      await loadProfile(targetId);
    }
  }
});

elements.notificationsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  if (button.dataset.action === "open-profile") {
    await loadProfile(button.dataset.targetId, { pushHistory: true });
    return;
  }

  if (button.dataset.action === "mark-notification-read") {
    await markNotificationRead(button.dataset.notificationId);
  }
});

elements.notificationsSummary.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='mark-all-notifications-read']");

  if (!button) {
    return;
  }

  await markAllNotificationsRead();
});

elements.postsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const postId = button.dataset.postId;
  const action = button.dataset.action;
  const targetId = button.dataset.targetId;

  if (action === "open-profile") {
    await loadProfile(targetId, { pushHistory: true });
    return;
  }

  if (action === "edit-post") {
    state.editingPostId = postId;
    state.editMedia = null;
    state.editRemoveMedia = false;
    renderPosts();
    return;
  }

  if (action === "cancel-edit-post") {
    clearEditState();
    renderPosts();
    return;
  }

  if (action === "clear-edit-media") {
    state.editMedia = null;
    renderPosts();
    return;
  }

  if (action === "remove-edit-media") {
    state.editMedia = null;
    state.editRemoveMedia = true;
    renderPosts();
    return;
  }

  if (action === "delete-post") {
    if (!window.confirm("Bu gonderi silinsin mi?")) {
      return;
    }

    await mutate(() =>
      request(`/api/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE"
      })
    );
    return;
  }

  if (action === "like") {
    await mutate(() =>
      request(`/api/posts/${postId}/like`, {
        method: "POST"
      })
    );
  }

  if (action === "unlike") {
    await mutate(() =>
      request(`/api/posts/${postId}/like`, {
        method: "DELETE"
      })
    );
  }

  if (action === "delete-comment") {
    const commentId = button.dataset.commentId;

    await mutate(() =>
      request(`/api/posts/${postId}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE"
      })
    );
  }
});

elements.postsList.addEventListener("change", async (event) => {
  const input = event.target.closest(".edit-media-input");

  if (!input) {
    return;
  }

  const file = input.files?.[0];

  if (!file) {
    state.editMedia = null;
    return;
  }

  if (!isSupportedMediaType(file.type)) {
    input.value = "";
    setStatus("Sadece JPG, PNG, WEBP, GIF, MP4, WEBM veya OGG yukleyebilirsiniz.", true);
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    input.value = "";
    setStatus("Medya dosyasi en fazla 20 MB olabilir.", true);
    return;
  }

  try {
    state.editMedia = {
      dataUrl: await readFileAsDataUrl(file),
      name: file.name,
      type: file.type
    };
    state.editRemoveMedia = false;
    renderPosts();
  } catch (error) {
    state.editMedia = null;
    setStatus(error.message, true);
  }
});

elements.postsList.addEventListener("submit", async (event) => {
  const editForm = event.target.closest(".edit-post-form");

  if (editForm) {
    event.preventDefault();
    const formData = new FormData(editForm);
    const content = String(formData.get("content") ?? "").trim();

    const updated = await mutate(() =>
      request(`/api/posts/${encodeURIComponent(editForm.dataset.postId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          content,
          media: state.editMedia,
          removeMedia: state.editRemoveMedia
        })
      })
    );

    if (updated) {
      clearEditState();
      renderPosts();
    }

    return;
  }

  const form = event.target.closest(".comment-form");

  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const content = formData.get("content");

  await mutate(() =>
    request(`/api/posts/${encodeURIComponent(form.dataset.postId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ content })
    })
  );

  form.reset();
});

setAuthMode(state.authMode);
initOpeningSlideshow();
initTheme();
bootstrap();
