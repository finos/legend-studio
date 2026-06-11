---
'@finos/legend-application-studio': patch
'@finos/legend-server-sdlc': patch
'@finos/legend-shared': patch
---

Add a popup-based SDLC re-authentication flow that preserves in-memory editor state.

When Studio's SDLC server returns a `401`, Studio now automatically launches a re-authentication popup (instead of breaking the session or doing a top-level redirect that would lose unsaved local changes). The popup loads the SDLC `/auth/authorize` endpoint with a same-origin callback page, completes the OAuth dance, and the original request is retried in place.

Loop-prevention: only **one** automatic re-authentication attempt is made per failure episode. If the popup is blocked, dismissed, or the retry still 401s, Studio falls back to a manual "Re-authenticate with SDLC" shield button shown in the editor status bar (and stops auto-retrying until the next successful re-auth).

The feature is opt-in via a new optional config flag `sdlc.enablePopupReAuth: boolean`. When `false` or unset (the default), behavior is unchanged — neither the automatic flow nor the status-bar button is active. When `true`, Studio derives the OAuth `redirect_uri` at runtime from its own origin and base URL (the same way the boot-time `/auth/authorize` flow constructs its redirect URI) and points it at the `popup-callback.html` page shipped with every Studio deployment.

The callback page is expected to `postMessage({ type: 'SDLC_REAUTH_DONE' }, window.location.origin)` to its opener on load and then close itself. The Studio deployment ships a reference implementation at `<base-url>/popup-callback.html`; deployments that enable this flag must register that derived URL on the SDLC server's OAuth client allow-list.

`legend-shared`'s `AbstractServerClient` gains a new optional `autoReAuthenticate` callback alongside the existing `autoReAuthenticateUrl` (iframe) hook. When provided, it is invoked on `401` and its boolean result controls whether the original request is retried.
