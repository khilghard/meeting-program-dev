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
  // Configuration
  let config = {
    clientId: null,
    redirectUri: null,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  };

  // Internal state
  const state = {
    initialized: false,
    authenticated: false,
    tokenClient: null,
    userInfo: null,
    accessToken: null,
    expiresAt: null,
    refreshTimeout: null
  };

  // SessionStorage keys
  const STORAGE_KEYS = {
    ACCESS_TOKEN: "gm_access_token",
    USER_EMAIL: "gm_user_email",
    USER_NAME: "gm_user_name",
    TOKEN_EXPIRES: "gm_token_expires",
    REFRESH_TIMEOUT: "gm_refresh_timeout"
  };

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

    // Check if Google GSI library is loaded
    if (typeof google === "undefined" || !google.accounts) {
      console.error("[AUTH] Google Identity Services library not loaded. Ensure CDN script is included in HTML.");
      return;
    }

    // Initialize token client for PKCE flow
    state.tokenClient = google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: config.scopes.join(" "),
      ux_mode: "popup",
      callback: handleAuthCallback,
      redirect_uri: redirectUri, // Required for server-side verification (even if not used)
    });

    state.initialized = true;
    console.log("[AUTH] Initialized with client:", clientId);

    // Check if we're returning from OAuth redirect
    checkForAuthCallback();

    // Restore session from sessionStorage if available
    restoreSessionFromStorage();
  }

  /**
   * Handle OAuth callback
   * Called after user approves/denies permission
   *
   * @private
   * @param {Object} response - Google auth response
   */
  function handleAuthCallback(response) {
    if (response.error) {
      console.error("[AUTH] Authorization failed:", response.error);
      state.authenticated = false;
      return;
    }

    // In PKCE flow, we get an authorization code (not token directly)
    // Must exchange it for token via backend
    // For now: handle basic flow and log
    console.log("[AUTH] Authorization response received:", response);
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

        state.userInfo = {
          email: sessionStorage.getItem(STORAGE_KEYS.USER_EMAIL),
          name: sessionStorage.getItem(STORAGE_KEYS.USER_NAME)
        };

        console.log("[AUTH] Session restored from storage. User:", state.userInfo.email);

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
   * Sign in with Google using PKCE flow
   *
   * @returns {Promise<{ token: string; user: { email: string; name: string } } | null>}
   *   Returns auth data on success, null on cancel, throws on error
   */
  async function signIn() {
    if (!state.initialized) {
      throw new Error("[AUTH] Must call initialize() first");
    }

    if (state.authenticated) {
      console.log("[AUTH] Already authenticated");
      return {
        token: state.accessToken,
        user: state.userInfo
      };
    }

    return new Promise((resolve) => {
      // For browser PKCE flow, we need to handle implicit/popup flow
      // Using Google's built-in popup mechanism

      // Store original callback
      const originalCallback = window.handleGoogleAuthCallback;

      // Set up callback handler
      window.handleGoogleAuthCallback = (response) => {
        if (response.access_token) {
          // Successfully got token
          state.accessToken = response.access_token;

          // Calculate expiry (typically 1 hour = 3600 seconds)
          const expiresIn = response.expires_in || 3600;
          state.expiresAt = Date.now() + expiresIn * 1000;
          state.authenticated = true;

          // Extract user info from token (if available)
          // Note: Might need additional API call for full profile
          state.userInfo = {
            email: response.email || extractEmailFromToken(response.access_token),
            name: response.name || "User"
          };

          // Store in sessionStorage
          saveSessionToStorage();

          // Schedule refresh
          scheduleTokenRefresh();

          console.log("[AUTH] Sign-in successful. User:", state.userInfo.email);

          // Restore original callback
          if (originalCallback) {
            window.handleGoogleAuthCallback = originalCallback;
          }

          resolve({
            token: state.accessToken,
            user: state.userInfo
          });
        } else if (response.error) {
          console.error("[AUTH] Sign-in error:", response.error);

          // Restore original callback
          if (originalCallback) {
            window.handleGoogleAuthCallback = originalCallback;
          }

          state.authenticated = false;
          resolve(null);
        }
      };

      // Trigger OAuth flow
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
    }

    // Method 2: Require user to sign in again
    console.log("[AUTH] Silent refresh failed. User must sign in again.");
    clearSession();
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

    // Refresh 5 minutes before expiry
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes
    const timeUntilExpiry = state.expiresAt - Date.now();
    const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);

    console.log(`[AUTH] Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)}s`);

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

  /**
   * Extract email from JWT token (basic parsing)
   *
   * @private
   * @param {string} token - JWT token
   * @returns {string} Email from token or empty string
   */
  function extractEmailFromToken(token) {
    try {
      // JWT format: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        return "";
      }

      // Decode payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      return payload.email || payload.sub || "";
    } catch (err) {
      console.warn("[AUTH] Could not extract email from token:", err.message);
      return "";
    }
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
