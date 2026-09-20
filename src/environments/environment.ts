export const environment = {
  production: false,
  /**
   * Placeholder — replace with the real API origin before this touches a
   * real backend. Left as a relative path so the app still runs (auth
   * calls will 404 against the dev server rather than throwing a CORS
   * error against some other placeholder host) until this is set.
   */
  apiBaseUrl: '/api',
};
