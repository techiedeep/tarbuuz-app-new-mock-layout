import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CHUNK_LOAD_RELOAD_GUARD_KEY } from './shared/error-handling/chunk-load-error-handler';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Reaching this constructor at all means the app just bootstrapped
    // successfully - if ChunkLoadErrorHandler had just forced a reload
    // to recover from a stale chunk, that reload evidently worked.
    // Clearing the guard here (rather than never clearing it, or
    // clearing it immediately inside the handler itself) means it still
    // blocks a tight, immediate reload-error-reload loop within the same
    // failed attempt, but doesn't permanently disable recovery for the
    // rest of this browser tab's session if a second, later deployment
    // happens to land while someone's still browsing.
    setTimeout(() => {
      try {
        sessionStorage.removeItem(CHUNK_LOAD_RELOAD_GUARD_KEY);
      } catch {
        // Best-effort - sessionStorage can throw in some privacy modes;
        // nothing meaningful to recover here if it does.
      }
    }, 5000);
  }
}
