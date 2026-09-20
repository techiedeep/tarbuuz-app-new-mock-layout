import { ErrorHandler, Injectable } from '@angular/core';

// Only reload once per page load - if the reload itself lands on a page
// that still throws this error (a genuinely broken deployment, not a
// stale cache), retrying forever would just hard-lock the tab in an
// invisible reload loop, which is worse for the person than the
// original error ever was. Exported so App's root component can clear
// it once the app has actually run stably for a bit - otherwise this
// flag would never reset, and a second, later, genuinely different
// deployment landing during the same tab session would silently fail to
// recover the next time this error happens.
export const CHUNK_LOAD_RELOAD_GUARD_KEY = 'tarbuuz.chunkLoadReloadAttempted';

// Text varies by browser/bundler, so this checks for the distinguishing
// substring each one actually uses, rather than matching one exact
// message and missing the rest:
//  - Chrome/Edge (esbuild/Vite-style):  "Failed to fetch dynamically imported module"
//  - Firefox:                           "error loading dynamically imported module"
//  - Safari:                            "Importing a module script failed"
//  - Webpack-style builds elsewhere in the ecosystem: "Loading chunk ... failed"
const CHUNK_LOAD_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'loading chunk',
] as const;

function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Angular's own default ErrorHandler does nothing but console.error() -
 * for most bugs that's the right call (a developer needs to see it, not
 * have it silently papered over), but a chunk-load failure is a
 * different category of problem entirely: it almost never means the
 * code is broken. It means the browser has an older index.html (and its
 * old, content-hashed chunk filenames) cached from before a newer
 * version was deployed, and one of those old filenames no longer exists
 * on the server. Clicking a lazy-loaded route link then fails to fetch
 * a chunk that's genuinely gone - which is exactly what was happening
 * with the Host Dashboard link investigated earlier: the route, guard,
 * and component were all confirmed correct in a fresh build, so a stale
 * cached chunk reference from a prior deployment is the far more likely
 * explanation than a code defect that a fresh build wouldn't reproduce.
 *
 * The fix a person actually needs in that moment is simply "reload the
 * page" - which fetches the current index.html and its correct, current
 * chunk references - not a console message they'll never see. Every
 * other error still goes to console.error exactly as before; only this
 * specific, well-understood failure mode gets the reload treatment.
 */
@Injectable()
export class ChunkLoadErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (isChunkLoadError(error)) {
      this.recoverFromChunkLoadError(error);
      return;
    }
    console.error('ERROR', error);
  }

  private recoverFromChunkLoadError(error: unknown): void {
    let alreadyAttempted = false;
    try {
      alreadyAttempted = sessionStorage.getItem(CHUNK_LOAD_RELOAD_GUARD_KEY) === 'true';
    } catch {
      // sessionStorage can throw in some privacy modes - treat as "not
      // attempted yet" rather than let this throw block the recovery
      // attempt entirely.
    }

    if (alreadyAttempted) {
      // Reloading once already didn't fix it - this isn't a stale cache
      // anymore, it's a real problem. Log it properly instead of
      // silently reloading forever.
      console.error('ERROR', error);
      return;
    }

    try {
      sessionStorage.setItem(CHUNK_LOAD_RELOAD_GUARD_KEY, 'true');
    } catch {
      // Best-effort - if this can't be set, the reload below still
      // happens once; it just can't guard against a second attempt.
    }

    console.warn('A newer version of this app is available - reloading to fetch it.');
    window.location.reload();
  }
}
