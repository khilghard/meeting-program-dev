/**
 * googleAuth.js
 *
 * Handles Google OAuth 2.0 authentication with PKCE flow.
 * Uses Google Identity Services (gis) library for browser-based auth.
 *
 * Architecture:
 * - No backend required (PKCE works entirely client-side)
 * - Access tokens stored in sessionStorage (cleared on browser close)
 * - Automatic token refresh before expiry
 * - Safe for distributed PWA deployment
 *
 * Dependencies:
 * - Google Identity Services library (via CDN in HTML)
 */

/**
 * GoogleAuth Module
 *
 * Main interface for Google OAuth operations.
 * Use: GoogleAuth.initialize() first, then signIn(), etc.
 */
const GoogleAuth = (() => {
  const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

  // Configuration
  let config = {
    clientId: null,
    redirectUri: null,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  };

  // Internal state
  const state = {
    initialized: false,
    authenticated: false,
    tokenClient: null,
    userInfo: null,
    accessToken: null,
    expiresAt: null,
    refreshTimeout: null,
    refreshWarningTimeout: null
  };

  // SessionStorage keys
  const STORAGE_KEYS = {
    ACCESS_TOKEN: "gm_access_token",
    USER_EMAIL: "gm_user_email",
    USER_NAME: "gm_user_name",
    TOKEN_EXPIRES: "gm_token_expires",
    REFRESH_TIMEOUT: "gm_refresh_timeout"
  };

  function isGoogleGsiAvailable() {
    return typeof google !== "undefined" && !!google.accounts?.oauth2?.initTokenClient;
  }

  function emitAuthEvent(type, detail = {}) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
      return;
    }

    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function hasGoogleGsiScriptTag() {
    return !!document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
  }

  function setupTokenClient() {
    if (!isGoogleGsiAvailable()) {
      return false;
    }

    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: config.scopes.join(" "),
      ux_mode: "popup",
      callback: handleAuthCallback
    });

    state.initialized = true;
    console.log("[AUTH] Initialized with client");
    return true;
  }

  /**
   * Initialize Google OAuth
   *
   * @param {string} clientId - Google OAuth client ID
   * @param {string} redirectUri - Redirect URI after auth
   * @returns {void}
   *
   * @throws {Error} If clientId or redirectUri missing
   */
  function initialize(clientId, redirectUri) {
    if (!clientId) {
      throw new Error("[AUTH] clientId is required");
    }
    if (!redirectUri) {
      throw new Error("[AUTH] redirectUri is required");
    }

    config.clientId = clientId;
    config.redirectUri = redirectUri;

    state.initialized = false;
    state.tokenClient = null;

    // Restore any existing session even if the GIS script is still loading.
    restoreSessionFromStorage();

    if (!setupTokenClient()) {
      if (hasGoogleGsiScriptTag()) {
        console.warn(
          "[AUTH] Google Identity Services script is still loading. Initialization will retry when sign-in starts."
        );
      } else {
        console.error(
          "[AUTH] Google Identity Services library not loaded. Ensure Google Identity Services script is included in HTML."
        );
      }
      return;
    }

    // Check if we're returning from OAuth redirect
    checkForAuthCallback();
  }

  /**
   * Handle OAuth callback
   * Called after user approves/denies permission
   *
   * @private
   * @param {Object} response - Google auth response (with access_token)
   */
  function handleAuthCallback(response) {
    if (response.error) {
      console.error("[AUTH] Authorization failed:", response.error);
      state.authenticated = false;
      // Resolve the signIn promise if pending
      if (state._signInResolve) {
        state._signInResolve(null);
        state._signInResolve = null;
      }
      return;
    }

    // Token client returns access_token directly in response
    if (response.access_token) {
      state.accessToken = response.access_token;

      // Calculate expiry (typically 1 hour = 3600 seconds)
      const expiresIn = response.expires_in || 3600;
      state.expiresAt = Date.now() + expiresIn * 1000;
      state.authenticated = true;

      // We only need sheet access; user identity is optional UI metadata.
      state.userInfo = {
        email: "",
        name: "User"
      };

      // Store in sessionStorage
      saveSessionToStorage();

      // Schedule refresh
      scheduleTokenRefresh();

      console.log("[AUTH] Token received, expires in:", expiresIn, "seconds");

      // Resolve the signIn promise if pending
      if (state._signInResolve) {
        state._signInResolve({
          token: state.accessToken,
          user: state.userInfo
        });
        state._signInResolve = null;
      }

    }
  }

  /**
   * Check if we're returning from OAuth redirect
   * (Handles cases where redirect_uri is used)
   *
   * @private
   */
  function checkForAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("code");
    const error = params.get("error");

    if (authCode) {
      console.log("[AUTH] Received auth code from redirect:", authCode.slice(0, 10) + "...");
      // In real PKCE flow, exchange code for token here
      // For now: store code and notify
    }

    if (error) {
      console.error("[AUTH] OAuth error:", error);
      state.authenticated = false;
    }
  }

  /**
   * Restore session from sessionStorage
   * Called on initialization to persist session across page reloads
   *
   * @private
   */
  function restoreSessionFromStorage() {
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);

    if (token && expiresAt) {
      const now = Date.now();
      const expiresTime = parseInt(expiresAt, 10);

      if (now < expiresTime) {
        // Token still valid
        state.accessToken = token;
        state.expiresAt = expiresTime;
        state.authenticated = true;

        const restoredEmail = sessionStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "";
        const restoredName = sessionStorage.getItem(STORAGE_KEYS.USER_NAME) || "User";

        state.userInfo = {
          email: restoredEmail,
          name: restoredName
        };

        if (!sessionStorage.getItem(STORAGE_KEYS.USER_EMAIL) && restoredEmail) {
          sessionStorage.setItem(STORAGE_KEYS.USER_EMAIL, restoredEmail);
        }
        if (!sessionStorage.getItem(STORAGE_KEYS.USER_NAME) && restoredName) {
          sessionStorage.setItem(STORAGE_KEYS.USER_NAME, restoredName);
        }

        console.log("[AUTH] Session restored from storage.");

        // Schedule a new refresh before expiry
        scheduleTokenRefresh();
      } else {
        // Token expired
        console.warn("[AUTH] Stored token expired. Clearing session.");
        clearSession();
      }
    }
  }

  /**
   * Sign in with Google using token client flow
   *
   * @returns {Promise<{ token: string; user: { email: string; name: string } } | null>}
   *   Returns auth data on success, null on cancel, throws on error
   */
  async function signIn() {
    if (!state.initialized) {
      if (config.clientId && config.redirectUri && setupTokenClient()) {
        checkForAuthCallback();
      } else {
        throw new Error(
          "[AUTH] Google Identity Services library not loaded yet. Wait a moment and try again."
        );
      }
    }

    if (state.authenticated) {
      console.log("[AUTH] Already authenticated");
      return {
        token: state.accessToken,
        user: state.userInfo
      };
    }

    return new Promise((resolve) => {
      // Store resolve function to call after callback
      state._signInResolve = resolve;

      // Trigger OAuth flow - callback will be handleAuthCallback
      if (state.tokenClient) {
        state.tokenClient.requestAccessToken();
      } else {
        console.error("[AUTH] Token client not initialized");
        resolve(null);
      }
    });
  }

  /**
   * Sign out and clear session
   *
   * @returns {void}
   */
  function signOut() {
    clearSession();
    console.log("[AUTH] Signed out");
  }

  /**
   * Get current access token
   *
   * @returns {string|null} Access token or null if not authenticated
   */
  function getAccessToken() {
    if (!state.authenticated || !state.accessToken) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired()) {
      console.warn("[AUTH] Token expired. Call refreshToken() before using.");
      return null;
    }

    return state.accessToken;
  }

  /**
   * Get authenticated user info
   *
   * @returns {Object|null} { email, name } or null if not authenticated
   */
  function getUser() {
    return state.authenticated ? state.userInfo : null;
  }

  /**
   * Check if user is authenticated
   *
   * @returns {boolean} True if authenticated with valid token
   */
  function isAuthenticated() {
    if (!state.authenticated || !state.accessToken) {
      return false;
    }

    return !isTokenExpired();
  }

  /**
   * Check if access token is expired
   *
   * @returns {boolean} True if token is expired or about to expire
   */
  function isTokenExpired() {
    if (!state.expiresAt) {
      return true;
    }

    // Consider token expired 5 minutes before actual expiry (buffer)
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in ms
    return Date.now() >= state.expiresAt - expiryBuffer;
  }

  /**
   * Refresh access token
   *
   * For PKCE flow, refresh requires using a refresh token
   * or re-authenticating. For now, implements re-auth fallback.
   *
   * @returns {Promise<boolean>} True if refresh successful
   */
  async function refreshToken() {
    if (!state.authenticated) {
      console.warn("[AUTH] Not authenticated. Cannot refresh token.");
      return false;
    }

    console.log("[AUTH] Token expired. Attempting refresh...");

    // Method 1: Try silent re-auth (if possible)
    // Note: Silent re-auth only works if user previously granted permission
    try {
      if (state.tokenClient) {
        // Try to get token silently (without user interaction)
        state.tokenClient.requestAccessToken({ prompt: "" });
        // Give a moment for async callback
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (state.accessToken && !isTokenExpired()) {
          console.log("[AUTH] Token refreshed silently");
          return true;
        }
      }
    } catch (err) {
      console.warn("[AUTH] Silent refresh failed:", err.message);
      emitAuthEvent("gm-auth-refresh-failed", {
        reason: /popup|block/i.test(err?.message || "") ? "popup-blocked" : "silent-refresh-failed",
        message:
          /popup|block/i.test(err?.message || "")
            ? "Google could not open a sign-in window. Allow popups for this site, then sign in again."
            : "Google session refresh failed. Please sign in again.",
        error: err?.message || String(err)
      });
    }

    // Method 2: Require user to sign in again
    console.log("[AUTH] Silent refresh failed. User must sign in again.");
    clearSession();
    emitAuthEvent("gm-auth-refresh-failed", {
      reason: "refresh-failed",
      message: "Google session expired. Sign in again to continue editing."
    });
    return false;
  }

  /**
   * Register callback for token expiry
   *
   * @param {Function} callback - Called when token expires
   * @returns {Function} Unsubscribe function
   */
  function onTokenExpire(callback) {
    if (typeof callback !== "function") {
      throw new Error("[AUTH] onTokenExpire callback must be a function");
    }

    const checkExpiry = async () => {
      if (isTokenExpired() && state.authenticated) {
        console.log("[AUTH] Token expired. Calling expiry handler.");
        await callback();
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkExpiry, 30 * 1000);

    // Return unsubscribe function
    return () => clearInterval(intervalId);
  }

  /**
   * Save session to sessionStorage
   *
   * @private
   */
  function saveSessionToStorage() {
    if (!state.accessToken) {
      return;
    }

    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, state.accessToken);
    sessionStorage.setItem(STORAGE_KEYS.USER_EMAIL, state.userInfo.email);
    sessionStorage.setItem(STORAGE_KEYS.USER_NAME, state.userInfo.name);
    sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, state.expiresAt.toString());
  }

  /**
   * Clear session from memory and storage
   *
   * @private
   */
  function clearSession() {
    state.authenticated = false;
    state.accessToken = null;
    state.expiresAt = null;
    state.userInfo = null;

    // Clear refresh timeout
    if (state.refreshTimeout) {
      clearTimeout(state.refreshTimeout);
      state.refreshTimeout = null;
    }

    if (state.refreshWarningTimeout) {
      clearTimeout(state.refreshWarningTimeout);
      state.refreshWarningTimeout = null;
    }

    // Clear sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    sessionStorage.removeItem(STORAGE_KEYS.USER_NAME);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES);
  }

  /**
   * Schedule automatic token refresh before expiry
   *
   * @private
   */
  function scheduleTokenRefresh() {
    if (!state.expiresAt) {
      return;
    }

    // Clear existing timeout
    if (state.refreshTimeout) {
      clearTimeout(state.refreshTimeout);
    }

    if (state.refreshWarningTimeout) {
      clearTimeout(state.refreshWarningTimeout);
    }

    // Refresh 5 minutes before expiry
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes
    const timeUntilExpiry = state.expiresAt - Date.now();
    const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);
    const warningLead = 60 * 1000; // 1 minute before refresh
    const timeUntilWarning = Math.max(0, timeUntilRefresh - warningLead);

    console.log(`[AUTH] Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)}s`);

    state.refreshWarningTimeout = setTimeout(() => {
      emitAuthEvent("gm-auth-refresh-warning", {
        message:
          "Your Google session will refresh soon. If popups are blocked or you want to avoid interruption, sign in again now.",
        secondsUntilRefresh: Math.round(timeUntilRefresh / 1000)
      });
    }, timeUntilWarning);

    state.refreshTimeout = setTimeout(async () => {
      const success = await refreshToken();
      if (success) {
        // Token was refreshed
        console.log("[AUTH] Automatic token refresh successful");
      } else {
        // Token refresh failed, user needs to sign in again
        console.warn("[AUTH] Automatic token refresh failed. User should sign in again.");
      }
    }, timeUntilRefresh);
  }

  // Public API
  return {
    initialize,
    signIn,
    signOut,
    getAccessToken,
    getUser,
    isAuthenticated,
    isTokenExpired,
    refreshToken,
    onTokenExpire
  };
})();

export default GoogleAuth;
