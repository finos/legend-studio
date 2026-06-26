/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  type GeneratorFn,
  type PlainObject,
  HttpStatus,
  NetworkClientError,
  ActionState,
  LogEvent,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type ApplicationStore,
  ActionAlertActionType,
  ActionAlertType,
  LegendApplicationTelemetryHelper,
  APPLICATION_EVENT,
} from '@finos/legend-application';
import { matchRoutes } from '@finos/legend-application/browser';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { User, SDLCServerClient } from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../__lib__/LegendStudioEvent.js';
import { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import type { LegendStudioApplicationConfig } from '../application/LegendStudioApplicationConfig.js';
import { LegendStudioEventHelper } from '../__lib__/LegendStudioEventHelper.js';
import { LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN } from '../__lib__/LegendStudioNavigation.js';
import { ShowcaseManagerState } from './ShowcaseManagerState.js';
import { getCurrentUserIDFromEngineServer } from '@finos/legend-graph';

export type LegendStudioApplicationStore = ApplicationStore<
  LegendStudioApplicationConfig,
  LegendStudioPluginManager
>;

/**
 * Same-origin path of the static page that the SDLC OAuth flow redirects to
 * when re-authenticating in a popup window. Shipped by the Studio deployment
 * (see `assets/popup-callback.html`); deployments enabling the popup
 * re-auth feature must register `<base-url>/popup-callback.html` on the
 * SDLC server's OAuth client allow-list.
 *
 * The leading slash is required because `navigator.generateAddress` is
 * `origin + baseUrl + location` and baseUrl has its trailing slash stripped.
 */
const SDLC_POPUP_REAUTH_CALLBACK_PATH = '/popup-callback.html';

export class LegendStudioBaseStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly sdlcServerClient: SDLCServerClient;
  readonly depotServerClient: DepotServerClient;
  readonly pluginManager: LegendStudioPluginManager;

  readonly initState = ActionState.create();
  readonly popupReAuthState = ActionState.create();

  isSDLCAuthorized: boolean | undefined = false;
  private isSDLCServerInitialized = false;
  SDLCServerTermsOfServicesUrlsToView: string[] = [];

  /**
   * Tracks whether an automatic popup re-auth has already been attempted for
   * the current "failure episode". An episode is the window between two
   * successful SDLC interactions: the flag is set on the first auto-attempt
   * and cleared whenever a re-auth (auto or manual) succeeds. This is what
   * prevents endless 401 → popup → 401 loops.
   */
  private autoPopupReAuthAttempted = false;

  /**
   * Dedupes concurrent auto callers of `handleSDLCUnauthorized`. Wraps the
   * raw popup promise with the auto-flow notification logic (manual-fallback
   * warning on failure) so all concurrent 401-driven callers get the same
   * resolution and only one warning fires per attempt.
   */
  private inFlightAutoReAuth: Promise<boolean> | undefined;

  /**
   * The raw popup promise, set by `reAuthorizeSDLCInPopup` for the duration
   * of an on-screen popup REGARDLESS of who opened it (manual shield click
   * OR auto-trigger). `handleSDLCUnauthorized` consults this before deciding
   * to consume the episode and warn — without it, a 401 raised while the
   * user is in a manually-opened popup would either stack a second popup or
   * pop a "click the shield" warning at them while the shield's popup is in
   * front of them.
   */
  private inFlightReAuth: Promise<boolean> | undefined;

  /**
   * Per-episode dedup flag for the "click the shield to retry" warning.
   * `handleSDLCUnauthorized` can be re-entered many times within a single
   * failure episode (every subsequent failing SDLC request in a burst lands
   * in the loop-guard branch); without this flag, each one would stack an
   * identical toast. Cleared alongside `autoPopupReAuthAttempted` on a
   * successful re-auth so the next episode can warn again.
   */
  private manualReAuthNotifiedForEpisode = false;

  /**
   * Re-entry guard for the network layer's 401 hook. Set to `true` while we
   * are re-bootstrapping the SDLC session inside the popup-success path so
   * that a 401 raised by the re-bootstrap requests themselves (e.g. the
   * `isAuthorized` verification GET coming back 401 because cookies didn't
   * actually land) cannot recurse into `handleSDLCUnauthorized` — that would
   * return the still-in-flight outer promise and deadlock the whole chain.
   */
  private suppressAutoReAuth = false;

  constructor(applicationStore: LegendStudioApplicationStore) {
    makeObservable<
      LegendStudioBaseStore,
      'initializeSDLCServerClient' | 'verifySDLCSessionAfterReAuth'
    >(this, {
      isSDLCAuthorized: observable,
      SDLCServerTermsOfServicesUrlsToView: observable,
      needsToAcceptSDLCServerTermsOfServices: computed,
      isSDLCPopupReAuthEnabled: computed,
      initialize: flow,
      initializeSDLCServerClient: flow,
      verifySDLCSessionAfterReAuth: flow,
      dismissSDLCServerTermsOfServicesAlert: action,
    });

    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;

    // depot
    this.depotServerClient = new DepotServerClient({
      serverUrl: this.applicationStore.config.depotServerUrl,
      getOAuthToken: this.applicationStore.config.options.enableOauthFlow
        ? (): string | undefined => this.applicationStore.getAccessToken()
        : undefined,
    });
    this.depotServerClient.setTracerService(
      this.applicationStore.tracerService,
    );

    // sdlc
    this.sdlcServerClient = new SDLCServerClient({
      env: this.applicationStore.config.env,
      serverUrl: this.applicationStore.config.sdlcServerUrl,
      baseHeaders: this.applicationStore.config.sdlcServerBaseHeaders,
      client: this.applicationStore.config.sdlcServerClient,
      // On a mid-session 401, auto-launch the popup re-auth flow. The
      // handler enforces a one-attempt-per-episode guard to prevent endless
      // retry loops; when it gives up, the StatusBar manual button remains
      // available.
      autoReAuthenticate: () => this.handleSDLCUnauthorized(),
    });
    this.sdlcServerClient.setTracerService(this.applicationStore.tracerService);
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      this.applicationStore.notificationService.notifyIllegalState(
        'Base store is re-initialized',
      );
      return;
    }
    this.initState.inProgress();

    // initialization components asynchronously
    // TODO: this is a nice non-blocking pattern for initialization
    // we should do this for things like documentation, etc.
    Promise.all([
      ShowcaseManagerState.retrieveNullableState(
        this.applicationStore,
      )?.initialize(),
    ]).catch((error) => {
      // do nothing
    });

    // authorize SDLC, unless navigation location match SDLC-bypassed patterns
    if (
      !matchRoutes(
        [
          { path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV },
          {
            path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.VIEW_BY_GAV_ENTITY,
          },
          {
            path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PREVIEW_BY_GAV_ENTITY,
          },
          { path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.SHOWCASE },
          { path: LEGEND_STUDIO_SDLC_BYPASSED_ROUTE_PATTERN.PCT_REPORT },
        ],
        this.applicationStore.navigationService.navigator.getCurrentLocation(),
      )
    ) {
      // setup SDLC server client
      yield flowResult(this.initializeSDLCServerClient());

      // if SDLC server is not properly authorized/initialized, we would need to stop making call
      // to SDLC server, as this could intertwine and mess up OIDC/OAuth authentication on the server
      // See https://github.com/finos/legend-studio/pull/2205
      // See https://github.com/finos/legend-sdlc/pull/628
      if (!this.isSDLCServerInitialized) {
        return;
      }

      try {
        const currentUser = User.serialization.fromJson(
          (yield this.sdlcServerClient.getCurrentUser()) as PlainObject<User>,
        );
        this.sdlcServerClient.setCurrentUser(currentUser);
        this.applicationStore.identityService.setCurrentUser(
          currentUser.userId,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyWarning(error.message);
      }
    } else {
      this.isSDLCAuthorized = undefined;
    }

    // retrieved the user identity is not already configured
    if (this.applicationStore.identityService.isAnonymous) {
      try {
        this.applicationStore.identityService.setCurrentUser(
          (yield getCurrentUserIDFromEngineServer(
            this.applicationStore.config.engineServerUrl,
          )) as string,
        );
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.logService.error(
          LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyWarning(error.message);
      }
    }

    // setup telemetry service
    this.applicationStore.telemetryService.setup();

    LegendApplicationTelemetryHelper.logEvent_ApplicationInitializationSucceeded(
      this.applicationStore.telemetryService,
      this.applicationStore,
    );

    LegendStudioEventHelper.notify_ApplicationLoadSucceeded(
      this.applicationStore.eventService,
    );

    this.initState.complete();
  }

  get needsToAcceptSDLCServerTermsOfServices(): boolean {
    return Boolean(this.SDLCServerTermsOfServicesUrlsToView.length);
  }

  dismissSDLCServerTermsOfServicesAlert(): void {
    this.SDLCServerTermsOfServicesUrlsToView = [];
  }

  /**
   * Whether the popup-based SDLC re-authentication flow is available.
   *
   * The feature is opt-in via the `sdlc.enablePopupReAuth` config flag
   * because the derived callback URL must be explicitly registered as an
   * OAuth `redirect_uri` on the SDLC server. When `false` (or unset), only
   * the legacy top-level redirect flow is available.
   */
  get isSDLCPopupReAuthEnabled(): boolean {
    return this.applicationStore.config.sdlcEnablePopupReAuth;
  }

  /**
   * 401 interception hook wired into the SDLC server client. Triggers the
   * popup re-auth flow automatically — without any user action — but only
   * once per failure episode to guard against retry loops.
   *
   * @returns a promise resolving to `true` if the SDLC server is now
   * authorized (i.e. the underlying network layer should retry the original
   * request), `false` otherwise.
   */
  private handleSDLCUnauthorized(): Promise<boolean> {
    // Feature off → propagate the 401 to the caller as before.
    if (!this.isSDLCPopupReAuthEnabled) {
      return Promise.resolve(false);
    }
    // Re-entry guard: a 401 raised from inside the post-popup re-bootstrap
    // (e.g. the verification `isAuthorized()` call itself coming back 401
    // because cookies didn't actually land) MUST NOT recurse into the popup
    // flow — that would return the in-flight outer promise and deadlock.
    if (this.suppressAutoReAuth) {
      return Promise.resolve(false);
    }
    // Coalesce concurrent auto callers onto the wrapped auto-flow promise so
    // the manual-fallback warning only fires once per attempt.
    if (this.inFlightAutoReAuth) {
      return this.inFlightAutoReAuth;
    }
    // If a popup is already on screen — most commonly because the user just
    // clicked the StatusBar shield, but also possibly because a prior auto-
    // attempt's popup is still finalising — defer to its outcome instead of
    // consuming this episode's one auto-attempt and warning at the user
    // about a manual button that the popup is in the way of.
    if (this.inFlightReAuth) {
      return this.inFlightReAuth;
    }
    // Loop guard: we've already auto-attempted once this episode. Surface
    // the manual fallback (deduped) and stop auto-retrying.
    if (this.autoPopupReAuthAttempted) {
      this.notifyManualReAuthAvailable();
      return Promise.resolve(false);
    }
    this.autoPopupReAuthAttempted = true;
    // NOTE: we deliberately don't fire an upfront "session expired" toast —
    // the popup window itself is the user-visible signal that re-auth is
    // happening. We only notify on completion (success or failure) so the
    // toast stack stays clean.
    this.inFlightAutoReAuth = this.reAuthorizeSDLCInPopup()
      .then((ok) => {
        this.inFlightAutoReAuth = undefined;
        if (!ok) {
          this.notifyManualReAuthAvailable();
        }
        // success path resets `autoPopupReAuthAttempted` inside
        // `reAuthorizeSDLCInPopup` so the next episode can auto-attempt again
        return ok;
      })
      .catch(() => {
        this.inFlightAutoReAuth = undefined;
        this.notifyManualReAuthAvailable();
        return false;
      });
    return this.inFlightAutoReAuth;
  }

  /**
   * Best-effort notification that nudges the user toward the manual
   * re-authentication entry point (the StatusBar shield button) when the
   * automatic flow could not complete (popup blocked, user dismissed, or
   * the retry still 401'd).
   *
   * Deduped per failure episode: subsequent 401s within the same episode
   * (a burst of editor requests after session expiry, for example) all hit
   * the loop-guard branch and would otherwise each stack an identical
   * warning toast. The flag is cleared when a re-auth attempt succeeds.
   */
  private notifyManualReAuthAvailable(): void {
    if (this.manualReAuthNotifiedForEpisode) {
      return;
    }
    this.manualReAuthNotifiedForEpisode = true;
    this.applicationStore.notificationService.notifyWarning(
      `Automatic SDLC re-authentication did not complete. Click the shield icon in the status bar to retry, or reload the page to start a fresh session.`,
    );
  }

  /**
   * Re-initiate the SDLC authorization step in a popup window so that the
   * user can recover from an expired SDLC session without losing in-memory
   * editor state (open tabs, unsaved buffers, etc.).
   *
   * The popup loads the SDLC server's `/auth/authorize?redirect_uri=...`
   * endpoint with a same-origin callback page as the `redirect_uri`. That
   * URL is derived at runtime via the navigator — the same way the
   * boot-time auth flow derives its own `redirect_uri` — so deployments
   * only need to declare intent (`sdlc.enablePopupReAuth: true`) and ship
   * the static `popup-callback.html` page at their base URL.
   *
   * The callback page is expected to `postMessage` back to the opener with
   * payload `{ type: 'SDLC_REAUTH_DONE' }` and then close itself.
   *
   * On success, the SDLC server client is re-checked and re-initialized in
   * place — no top-level navigation, no state loss.
   *
   * @returns a promise that resolves to `true` if the SDLC server is
   * authorized after the popup flow completes, `false` otherwise (popup
   * blocked, user cancelled, authorization check still failing, ...).
   */
  async reAuthorizeSDLCInPopup(): Promise<boolean> {
    if (!this.isSDLCPopupReAuthEnabled) {
      this.applicationStore.notificationService.notifyWarning(
        `Popup re-authentication is not enabled. Set 'sdlc.enablePopupReAuth' to true in the Studio config to enable it.`,
      );
      return false;
    }
    // Coalesce concurrent callers (manual shield click + auto 401 trigger)
    // onto a single popup. Without this, a 401 raised while the user is in
    // a manually-opened popup would either stack a second popup OR fire a
    // confusing "click the shield" warning at the user while the shield's
    // popup is literally on screen.
    if (this.inFlightReAuth) {
      return this.inFlightReAuth;
    }
    this.popupReAuthState.inProgress();

    // Derive the callback URL the same way the boot-time SDLC auth flow
    // derives its `redirect_uri` — via the navigator's same-origin address
    // builder. The callback page is a constant static asset shipped with
    // every Studio deployment.
    const callbackUrl =
      this.applicationStore.navigationService.navigator.generateAddress(
        SDLC_POPUP_REAUTH_CALLBACK_PATH,
      );
    const callbackOrigin = new URL(callbackUrl).origin;

    const authorizeUrl = SDLCServerClient.authorizeCallbackUrl(
      this.applicationStore.config.sdlcServerUrl,
      callbackUrl,
      this.applicationStore.config.sdlcServerClient,
    );

    const popup = window.open(
      authorizeUrl,
      'legend-studio-sdlc-reauth',
      'width=560,height=720,menubar=no,toolbar=no,location=no,status=no',
    );
    if (!popup) {
      this.popupReAuthState.fail();
      this.applicationStore.notificationService.notifyError(
        `Failed to open the re-authentication popup. Please allow popups for this site and try again.`,
      );
      return false;
    }

    const promise = new Promise<boolean>((resolve) => {
      let closedPoll: ReturnType<typeof setInterval> | undefined;
      let settled = false;

      // `finalize` and `onMessage` form a small cycle:
      //   onMessage -> finalize          (call on success postMessage)
      //   finalize  -> onMessage         (removeEventListener on teardown)
      // We declare `finalize` first so only the one forward reference to
      // `onMessage` from inside `finalize`'s body needs to be excused.
      const finalize = (signalled: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        window.removeEventListener('message', onMessage);
        if (closedPoll !== undefined) {
          clearInterval(closedPoll);
          closedPoll = undefined;
        }
        try {
          popup.close();
        } catch {
          // ignored — popup may already be closed or cross-origin
        }
        // Always re-verify the SDLC session in place, whether the callback
        // page managed to `postMessage` (`signalled === true`) or the popup
        // simply closed (`signalled === false`). The popup-closed path used
        // to fail outright, but that silently broke environments where the
        // browser severs `window.opener` somewhere along the auth redirect
        // chain (most commonly an IdP or the SDLC server sending
        // `Cross-Origin-Opener-Policy: same-origin`): the callback page's
        // `postMessage` becomes a no-op, the popup closes itself, and the
        // only way to learn whether auth actually took is to ask the server.
        // The cost is one cheap GET on user-cancel; the upside is robust
        // recovery for COOP-severed deployments.
        //
        // We deliberately do NOT route through `initializeSDLCServerClient`
        // here — that would do a top-level redirect on `!isAuthorized` and
        // lose all the in-memory editor state this whole feature exists to
        // protect. `suppressAutoReAuth` is set for the duration of the
        // verify so that a 401 raised by the verify GET itself can't recurse
        // back into `handleSDLCUnauthorized` (which would return the still-
        // in-flight outer promise and deadlock).
        this.isSDLCServerInitialized = false;
        this.suppressAutoReAuth = true;
        flowResult(this.verifySDLCSessionAfterReAuth())
          .then((ok) => {
            this.suppressAutoReAuth = false;
            if (ok) {
              // reset the per-episode flags so the next failure episode
              // can auto-attempt re-auth and warn the user again
              this.autoPopupReAuthAttempted = false;
              this.manualReAuthNotifiedForEpisode = false;
              this.popupReAuthState.pass();
              this.applicationStore.notificationService.notifySuccess(
                `Successfully re-authenticated with the SDLC server.`,
              );
            } else {
              this.popupReAuthState.fail();
              if (signalled) {
                // The popup explicitly told us it completed, yet the SDLC
                // server still reports the session as unauthorized. That's
                // a real problem the user should know about (wrong identity
                // chosen in the popup, third-party-cookie / SameSite issue,
                // ToS race, etc.). Surface a loud error.
                this.applicationStore.notificationService.notifyError(
                  `Re-authentication popup completed but the SDLC session is still not authorized. Please reload the page to start a fresh session.`,
                );
              }
              // !signalled + verify failed is indistinguishable from a
              // deliberate user-cancel — stay quiet. The auto-trigger
              // caller (`handleSDLCUnauthorized`) will fire a single
              // "click the shield to retry" hint if this was an auto
              // attempt; the manual button caller simply gets `false` back.
            }
            resolve(ok);
          })
          .catch((error: unknown) => {
            this.suppressAutoReAuth = false;
            assertErrorThrown(error);
            this.popupReAuthState.fail();
            this.applicationStore.logService.error(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
              error,
            );
            this.applicationStore.notificationService.notifyError(error);
            resolve(false);
          });
      };

      const onMessage = (event: MessageEvent): void => {
        // strict origin + payload-shape check
        if (event.origin !== callbackOrigin) {
          return;
        }
        const data = event.data as { type?: unknown } | null;
        if (!data || data.type !== 'SDLC_REAUTH_DONE') {
          return;
        }
        finalize(true);
      };

      window.addEventListener('message', onMessage);

      // Fallback: if the user closes the popup without completing auth,
      // we still want to release the in-progress state.
      closedPoll = setInterval(() => {
        if (popup.closed) {
          finalize(false);
        }
      }, 500);
    });
    this.inFlightReAuth = promise;
    try {
      return await promise;
    } finally {
      // Clear the slot AFTER awaiting so all concurrent callers (which got
      // `this.inFlightReAuth` back from the early-return branch) resolve
      // against the same promise instance. Subsequent attempts then start
      // a fresh popup.
      this.inFlightReAuth = undefined;
    }
  }

  /**
   * Shared post-auth bootstrap: ToS gate, platforms, features. Plain
   * generator (not a flow) — delegated to from both `initializeSDLCServerClient`
   * (the boot-time flow) and `verifySDLCSessionAfterReAuth` (the popup-success
   * flow) via `yield*`. Caller is responsible for asserting `isSDLCAuthorized`
   * beforehand.
   */
  private *bootstrapSDLCSessionAfterAuth(): GeneratorFn<void> {
    // check terms of service agreement status
    this.SDLCServerTermsOfServicesUrlsToView =
      (yield this.sdlcServerClient.hasAcceptedTermsOfService()) as string[];
    if (this.SDLCServerTermsOfServicesUrlsToView.length) {
      this.applicationStore.alertService.setActionAlertInfo({
        message: `Please read and accept the SDLC servers' terms of service`,
        prompt: `Click 'Done' when you have accepted all the terms`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'See terms of services',
            default: true,
            handler: (): void =>
              this.SDLCServerTermsOfServicesUrlsToView.forEach((url) =>
                this.applicationStore.navigationService.navigator.visitAddress(
                  url,
                ),
              ),
            type: ActionAlertActionType.PROCEED,
          },
          {
            label: 'Done',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              this.dismissSDLCServerTermsOfServicesAlert();
              this.applicationStore.navigationService.navigator.reload();
            },
          },
        ],
      });
    }

    // fetch server features config and platforms
    yield this.sdlcServerClient.fetchServerPlatforms();
    yield this.sdlcServerClient.fetchServerFeaturesConfiguration();

    // the sdlc server client is authorized and initialized
    this.isSDLCServerInitialized = true;
  }

  /**
   * Verify the SDLC session after a popup re-auth attempt completes, and
   * re-bootstrap the session in place if it took. Returns `true` if the
   * session is now usable, `false` if the SDLC server still reports the
   * session as unauthorized (e.g. cookies didn't actually land, user authed
   * against the wrong identity).
   *
   * Unlike `initializeSDLCServerClient`, this does NOT do a top-level
   * redirect on `!isAuthorized` — preserving in-memory editor state is the
   * entire reason the popup flow exists.
   */
  private *verifySDLCSessionAfterReAuth(): GeneratorFn<boolean> {
    this.isSDLCAuthorized =
      (yield this.sdlcServerClient.isAuthorized()) as boolean;
    if (!this.isSDLCAuthorized) {
      return false;
    }
    yield* this.bootstrapSDLCSessionAfterAuth();
    return true;
  }

  private *initializeSDLCServerClient(): GeneratorFn<void> {
    try {
      this.isSDLCAuthorized =
        (yield this.sdlcServerClient.isAuthorized()) as boolean;
      if (!this.isSDLCAuthorized) {
        this.applicationStore.navigationService.navigator.goToAddress(
          SDLCServerClient.authorizeCallbackUrl(
            this.applicationStore.config.sdlcServerUrl,
            this.applicationStore.navigationService.navigator.getCurrentAddress(),
            this.applicationStore.config.sdlcServerClient,
          ),
        );
      } else {
        // Only proceed initialization after passing authorization check
        yield* this.bootstrapSDLCSessionAfterAuth();
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        // eslint-disable-next-line no-process-env
        process.env.NODE_ENV === 'development' &&
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.UNAUTHORIZED
      ) {
        this.applicationStore.alertService.setActionAlertInfo({
          message:
            'The first time the application starts in development mode, the developer would need to authenticate using SDLC server. Please do so then manually reload the app',
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: 'Authenticate using SDLC',
              type: ActionAlertActionType.PROCEED,
              default: true,
              handler: (): void => {
                this.applicationStore.navigationService.navigator.visitAddress(
                  this.sdlcServerClient.currentUserUrl,
                );
                this.applicationStore.alertService.setBlockingAlert({
                  message:
                    'Waiting for the developer to authenticate using SDLC server',
                  prompt:
                    'Please manually reload the application after authentication',
                });
              },
            },
          ],
        });
      } else {
        this.applicationStore.logService.error(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
          error,
        );
        this.applicationStore.notificationService.notifyError(error);
      }
    }
  }
}
