import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthApi } from './shared/services/auth-api';
import { MockAuthService } from './shared/services/mock-auth.service';
import { ChunkLoadErrorHandler } from './shared/error-handling/chunk-load-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })),

    // AuthApi is the abstraction every component actually depends on (see
    // Login, UserMenu, authGuard) — MockAuthService is today's
    // implementation, backed by localStorage rather than a real server.
    // Swapping to a real backend later is exactly this one line:
    //   { provide: AuthApi, useClass: AuthService }
    // — no component, guard, or template needs to change.
    { provide: AuthApi, useClass: MockAuthService },

    // Angular's default ErrorHandler only ever console.error()s - fine
    // for genuine bugs, but a "failed to fetch dynamically imported
    // module" error (a lazy-loaded route's chunk gone stale after a new
    // deployment) needs an actual recovery action, not a log line nobody
    // watching the app will see. See chunk-load-error-handler.ts for the
    // full reasoning.
    { provide: ErrorHandler, useClass: ChunkLoadErrorHandler },
  ],
};
