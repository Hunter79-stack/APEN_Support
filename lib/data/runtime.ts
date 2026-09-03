export const API_ENDPOINTS = {
  acknowledgedAlerts: '/api/acknowledged-alerts',
  // Shared "remove from view" dismissals (server-persisted, attributed to the
  // dismissing admin). Lives under /api/admin/ so nginx injects the admin token
  // and authorizeAdmin passes; the dismisser's name is resolved server-side.
  dismissedAlerts: '/api/admin/dismissed-alerts',
  liveAnnouncements: '/api/live-announcements',
  // Package-mirror "last updated" stamps shown on the /docs/repos pages.
  repoFreshness: '/api/repo-freshness',
  notificationSettings: '/api/notification-settings',
  siteFeedback: '/api/site-feedback',
  siteStats: '/api/site-stats',
  voltronChat: '/api/voltron-chat',
  /** Customer-facing pages POST diagnostic events here so admins see them
   *  in the System Events & Feedback panel rather than dumping them on
   *  the page in front of users. */
  systemEvent: '/api/system-event',
  // Public read endpoint — every page hits this once on mount to layer overrides on top of static data.
  contentOverrides: '/api/content-overrides',
  // Admin-only endpoints. Auth is either a session cookie (HttpOnly, set by
  // /api/auth/login) plus an x-csrf-token header on writes, OR the legacy
  // x-admin-token header injected by nginx during the transition window.
  adminContentOverrides: '/api/admin/content-overrides',
  // Authenticated raw-image upload used by route-image management. The request
  // body is the file bytes and x-file-name supplies a display-friendly stem.
  adminLogoUpload: '/api/admin/logo-upload',
  // Download library: the ISO/EXE/installer directories under the download
  // webroot. GET lists targets and one target's files; the upload endpoint is
  // resumable — GET returns the stored offset, POST appends from it, DELETE
  // discards a partial. Bodies are raw file bytes streamed to disk (never
  // buffered), so this is the only admin endpoint without a size cap.
  adminFileLibrary: '/api/admin/file-library',
  adminFileUpload: '/api/admin/file-upload',
  adminFileRename: '/api/admin/file-rename',
  // Removing a finished file. Separate from the upload endpoint's DELETE, which
  // only discards a partial. Refuses while any card or built page still links
  // the file unless the caller passes force.
  adminFileDelete: '/api/admin/file-delete',
  // Publish: bakes draft overrides into the committed build snapshot and
  // triggers a rebuild. GET returns build status; POST starts a publish.
  adminPublish: '/api/admin/publish',
  adminCustomPages: '/api/admin/custom-pages',
  adminInfrastructureNodes: '/api/admin/infrastructure-nodes',
  adminInfrastructureNodesProbe: '/api/admin/infrastructure-nodes/probe',
  // Live nginx server status (VTS module / stub_status), normalized
  // by site-stats.mjs. Under /api/admin/ so nginx injects the admin token and
  // authorizeAdmin gates it. Returns { available:false } until a status module
  // is installed — see proxy/NGINX_VTS_RUNBOOK.md.
  adminNginxStats: '/api/admin/nginx-stats',
  // Admin-managed nginx zones/upstreams: GET/POST the registry, POST .../publish
  // writes the nginx config fragments and reloads nginx (like content Publish).
  adminNginxManaged: '/api/admin/nginx-managed',
  adminNginxManagedPublish: '/api/admin/nginx-managed/publish',
  // Manage the APEN-chat-assistant suggested-prompt chips (live; no rebuild).
  adminAssistantPrompts: '/api/admin/assistant-prompts',
  // Edit the persona + "what the APEN offers" half of the Voltron system
  // prompt (live; voltron-proxy re-reads it on the next question).
  adminAssistantSystemPrompt: '/api/admin/assistant-system-prompt',
  // Multi-realm LDAP-bound session login. All four are same-origin only;
  // realms/login/whoami are public (no session required to reach them).
  adminAuthRealms: '/api/auth/realms',
  adminAuthLogin: '/api/auth/login',
  adminAuthLogout: '/api/auth/logout',
  adminAuthWhoami: '/api/auth/whoami',
  // Refused sign-ins (spoofed domain claims, malformed names). Admin-gated,
  // so it sits under /api/admin/ where nginx's IP allowlist already applies.
  adminAuthEvents: '/api/admin/auth-events',
  // Chat transcript sync — GET/PUT the calling session's own transcript.
  chatHistory: '/api/chat-history',
  // Admin-wide transcript audit: GET lists all, DELETE removes one by id.
  adminChatHistory: '/api/admin/chat-history',
} as const

export const RUNTIME_INTERVALS = {
  activityStatsRefreshMs: 30_000,
  adminClockMs: 1_000,
  adminStatsRefreshMs: 15_000,
  liveAnnouncementsRefreshMs: 30_000,
  contentOverridesRefreshMs: 60_000,
  // Live nginx status poll (admin only). The backend caches for ~4s, so a 5s
  // client poll stays fresh without hammering the status endpoint.
  nginxStatsRefreshMs: 5_000,
} as const

/** sessionStorage key for the admin-token (legacy fallback for non-LDAP installs). */
export const ADMIN_TOKEN_STORAGE_KEY = 'apen.admin.token'

/** sessionStorage key for the CSRF token returned by /api/auth/login. The
 *  session id itself lives in an HttpOnly cookie that JS cannot read. */
export const ADMIN_CSRF_STORAGE_KEY = 'apen.admin.csrf'
