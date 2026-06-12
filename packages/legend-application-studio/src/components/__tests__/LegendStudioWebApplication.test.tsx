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
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
  describe,
} from '@jest/globals';
import { noop } from '@finos/legend-shared';
import {
  type TEMPORARY__JestMatcher,
  integrationTest,
  createSpy,
} from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
  LegendTokenSync,
} from '@finos/legend-application';
import {
  TEST__BrowserEnvironmentProvider,
  TEST__provideMockedBrowserPlatform,
} from '@finos/legend-application/test';
import { act, render, waitFor } from '@testing-library/react';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { TEST__provideMockedLegendStudioBaseStore } from '../__test-utils__/LegendStudioFrameworkTestUtils.js';
import { LegendStudioFrameworkProvider } from '../LegendStudioFrameworkProvider.js';
import { LegendStudioWebApplicationRouter } from '../LegendStudioWebApplication.js';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';
import type { LegendStudioBaseStore } from '../../stores/LegendStudioBaseStore.js';

test(
  integrationTest('Failed to accept SDLC Terms of Service will show alert'),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();

    createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(
      true,
    );
    createSpy(
      baseStore.sdlcServerClient,
      'getCurrentUser',
    ).mockResolvedValueOnce({
      name: 'testUser',
      userId: 'testUserId',
    });
    createSpy(
      baseStore.sdlcServerClient,
      'hasAcceptedTermsOfService',
    ).mockResolvedValueOnce(['stubUrl']);
    createSpy(baseStore.sdlcServerClient, 'getProjects').mockResolvedValue([]);
    createSpy(
      baseStore.sdlcServerClient,
      'fetchServerFeaturesConfiguration',
    ).mockResolvedValue();

    const { queryByText } = render(
      <ApplicationStoreProvider store={baseStore.applicationStore}>
        <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
          <LegendStudioFrameworkProvider>
            <LegendStudioWebApplicationRouter />
          </LegendStudioFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );

    await waitFor(() =>
      expect(queryByText('See terms of services')).not.toBeNull(),
    );
  },
);

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    LegendStudioPluginManager.create(),
  );
  const MOCK__browserPlatform =
    TEST__provideMockedBrowserPlatform(applicationStore);
  const baseStore = TEST__provideMockedLegendStudioBaseStore({
    applicationStore,
  });

  const stubURL = 'stubUrl';

  createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(
    false,
  );
  createSpy(baseStore.sdlcServerClient, 'getCurrentUser').mockResolvedValueOnce(
    {
      name: 'testUser',
      userId: 'testUserId',
    },
  );

  const navigator = MOCK__browserPlatform.getNavigator();
  createSpy(MOCK__browserPlatform, 'getNavigator').mockReturnValue(navigator);
  createSpy(navigator, 'getCurrentAddress').mockImplementation(() => stubURL);
  const navigationActionSpy = createSpy(
    navigator,
    'goToAddress',
  ).mockImplementation(noop);

  render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <LegendStudioFrameworkProvider>
          <LegendStudioWebApplicationRouter />
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    expect(navigationActionSpy as TEMPORARY__JestMatcher).toHaveBeenCalledWith(
      SDLCServerClient.authorizeCallbackUrl(
        baseStore.applicationStore.config.sdlcServerUrl,
        stubURL,
      ),
    ),
  );
});

describe('SDLC popup re-authentication', () => {
  const POPUP_CALLBACK_URL = 'http://localhost/studio/popup-callback.html';
  const POPUP_CALLBACK_ORIGIN = new URL(POPUP_CALLBACK_URL).origin;

  const buildBaseStoreWithPopup = (
    overrides: { enabled?: boolean } = {},
  ): LegendStudioBaseStore => {
    const enabled = overrides.enabled ?? true;
    const applicationStore = new ApplicationStore(
      TEST__getLegendStudioApplicationConfig({
        sdlc: {
          url: 'https://testSdlcUrl',
          enablePopupReAuth: enabled,
        },
      }),
      LegendStudioPluginManager.create(),
    );
    // The ApplicationStore boots with a DefaultNavigator whose
    // `generateAddress` throws (the real platform-bound navigator is wired
    // in via React tree initialization, which our non-rendered tests skip).
    // Spy a deterministic URL so the popup re-auth flow has something to use.
    createSpy(
      applicationStore.navigationService.navigator,
      'generateAddress',
    ).mockReturnValue(POPUP_CALLBACK_URL);
    return TEST__provideMockedLegendStudioBaseStore({ applicationStore });
  };

  /**
   * Build a minimal mock Window proxy with the surface our code touches:
   * `close()` and `closed`. Cast through `unknown` to match the `Window` type
   * expected by `window.open`'s return.
   */
  const buildMockPopup = (): { close: jest.Mock; closed: boolean } => ({
    close: jest.fn(),
    closed: false,
  });

  let openSpy: jest.SpiedFunction<typeof window.open> | undefined;

  afterEach(() => {
    openSpy?.mockRestore();
    openSpy = undefined;
  });

  test(
    integrationTest(
      'reAuthorizeSDLCInPopup short-circuits with a warning when the feature is disabled',
    ),
    async () => {
      const baseStore = buildBaseStoreWithPopup({ enabled: false });
      openSpy = jest.spyOn(window, 'open');

      const warnSpy = createSpy(
        baseStore.applicationStore.notificationService,
        'notifyWarning',
      ).mockImplementation(noop);

      const result = await baseStore.reAuthorizeSDLCInPopup();

      expect(result).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
      expect(warnSpy as TEMPORARY__JestMatcher).toHaveBeenCalled();
      expect(baseStore.isSDLCPopupReAuthEnabled).toBe(false);
    },
  );

  test(
    integrationTest(
      'reAuthorizeSDLCInPopup surfaces an error when the popup is blocked',
    ),
    async () => {
      const baseStore = buildBaseStoreWithPopup();
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);

      const errorSpy = createSpy(
        baseStore.applicationStore.notificationService,
        'notifyError',
      ).mockImplementation(noop);

      const result = await baseStore.reAuthorizeSDLCInPopup();

      expect(result).toBe(false);
      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy as TEMPORARY__JestMatcher).toHaveBeenCalled();
      expect(baseStore.popupReAuthState.hasFailed).toBe(true);
    },
  );

  test(
    integrationTest(
      'reAuthorizeSDLCInPopup resolves true after the callback signals SDLC_REAUTH_DONE',
    ),
    async () => {
      const baseStore = buildBaseStoreWithPopup();
      const popup = buildMockPopup();
      openSpy = jest
        .spyOn(window, 'open')
        .mockReturnValue(popup as unknown as Window);

      // re-initialisation path: SDLC now reports authorized + clean ToS + features
      createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValue(
        true,
      );
      createSpy(
        baseStore.sdlcServerClient,
        'hasAcceptedTermsOfService',
      ).mockResolvedValue([]);
      createSpy(
        baseStore.sdlcServerClient,
        'fetchServerPlatforms',
      ).mockResolvedValue();
      createSpy(
        baseStore.sdlcServerClient,
        'fetchServerFeaturesConfiguration',
      ).mockResolvedValue();

      const reAuthPromise = baseStore.reAuthorizeSDLCInPopup();

      // Simulate the popup callback page signalling completion.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SDLC_REAUTH_DONE' },
          origin: POPUP_CALLBACK_ORIGIN,
        }),
      );

      const result = await reAuthPromise;

      expect(result).toBe(true);
      expect(openSpy).toHaveBeenCalledTimes(1);
      // verify the popup was navigated to the SDLC authorize endpoint with the
      // navigator-derived same-origin callback URL as the redirect_uri
      const firstCall = openSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const [authorizeUrl] = firstCall as Parameters<typeof window.open>;
      expect(authorizeUrl).toBe(
        SDLCServerClient.authorizeCallbackUrl(
          baseStore.applicationStore.config.sdlcServerUrl,
          POPUP_CALLBACK_URL,
        ),
      );
      expect(popup.close).toHaveBeenCalled();
      expect(baseStore.popupReAuthState.hasSucceeded).toBe(true);
    },
  );

  test(
    integrationTest(
      'reAuthorizeSDLCInPopup ignores postMessage from a different origin',
    ),
    async () => {
      jest.useFakeTimers();
      try {
        const baseStore = buildBaseStoreWithPopup();
        const popup = buildMockPopup();
        openSpy = jest
          .spyOn(window, 'open')
          .mockReturnValue(popup as unknown as Window);

        // No session (user cancelled / rogue message ignored). The verify-on-
        // close path will call `isAuthorized` once and resolve `false`.
        const isAuthorizedSpy = createSpy(
          baseStore.sdlcServerClient,
          'isAuthorized',
        ).mockResolvedValue(false);
        // Bootstrap calls must NOT happen on an unauthorized verify.
        const tosSpy = createSpy(
          baseStore.sdlcServerClient,
          'hasAcceptedTermsOfService',
        ).mockResolvedValue([]);
        // The loud "popup completed but unauth" error is gated on
        // `signalled === true`. If the rogue message slipped past the origin
        // filter, finalize(true) would fire and this error WOULD be raised.
        const errorSpy = createSpy(
          baseStore.applicationStore.notificationService,
          'notifyError',
        ).mockImplementation(noop);

        const reAuthPromise = baseStore.reAuthorizeSDLCInPopup();

        // Wrong origin → must be ignored; the polled-closed fallback then
        // detects popup closure and finalises with `signalled === false`.
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: 'SDLC_REAUTH_DONE' },
            origin: 'https://evil.example.com',
          }),
        );
        // mark the popup as closed so the next `closedPoll` tick finalises
        popup.closed = true;
        await jest.advanceTimersByTimeAsync(500);

        const result = await reAuthPromise;
        expect(result).toBe(false);
        // Verify ran exactly once (from closedPoll → finalize(false)), NOT
        // twice (which would mean the rogue message also drove finalize(true)
        // ahead of the close).
        expect(isAuthorizedSpy as TEMPORARY__JestMatcher).toHaveBeenCalledTimes(
          1,
        );
        // !isAuthorized → bootstrap short-circuits, nothing else runs.
        expect(tosSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();
        // Critically: the loud "popup completed but unauth" error must NOT
        // have fired. If the rogue message had promoted close to a signalled
        // finalize, it would have.
        expect(errorSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    },
  );

  test(
    integrationTest(
      'handleSDLCUnauthorized loop guard: only one auto-popup per failure episode',
    ),
    async () => {
      jest.useFakeTimers();
      try {
        const baseStore = buildBaseStoreWithPopup();
        const popup = buildMockPopup();
        openSpy = jest
          .spyOn(window, 'open')
          .mockReturnValue(popup as unknown as Window);

        createSpy(
          baseStore.applicationStore.notificationService,
          'notifyWarning',
        ).mockImplementation(noop);
        // The verify-on-close path runs unconditionally now; mock the SDLC
        // calls it makes so the test doesn't punch through to a real fetch.
        createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValue(
          false,
        );

        // Reach the private handler via a typed cast — the loop-guard behavior
        // is what we want to lock down, even though the method itself isn't
        // part of the public API.
        const handle = (
          baseStore as unknown as {
            handleSDLCUnauthorized(): Promise<boolean>;
          }
        ).handleSDLCUnauthorized.bind(baseStore);

        // First call → opens a popup (we don't resolve it, simulating either an
        // in-flight user interaction or a still-failing IdP).
        const first = handle();
        expect(openSpy).toHaveBeenCalledTimes(1);

        // Concurrent call while the first is still in flight → deduped: the
        // same in-flight promise instance is returned, no additional popup.
        const second = handle();
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);

        // Close the popup without success so the closed-polling fallback
        // finalises the first attempt as a failure.
        popup.closed = true;
        await jest.advanceTimersByTimeAsync(500);
        expect(await first).toBe(false);

        // Subsequent attempt after the failed episode → loop guard kicks in,
        // returns false WITHOUT opening another popup.
        const third = await handle();
        expect(third).toBe(false);
        expect(openSpy).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  test(
    integrationTest(
      'handleSDLCUnauthorized is a no-op when the popup re-auth feature is disabled',
    ),
    async () => {
      const baseStore = buildBaseStoreWithPopup({ enabled: false });
      openSpy = jest.spyOn(window, 'open');

      const handle = (
        baseStore as unknown as {
          handleSDLCUnauthorized(): Promise<boolean>;
        }
      ).handleSDLCUnauthorized.bind(baseStore);

      const result = await handle();
      expect(result).toBe(false);
      expect(openSpy).not.toHaveBeenCalled();
    },
  );

  test(
    integrationTest(
      'post-popup verify returning unauthorized resolves false WITHOUT a top-level redirect',
    ),
    async () => {
      // Regression: if the popup completes but the verification `isAuthorized()`
      // still reports the session as unauthorized (e.g. user authed against a
      // different identity, cookies blocked by SameSite, etc.), Studio must NOT
      // fall through to the boot-time `navigator.goToAddress(...)` redirect —
      // that would wipe the in-memory editor state the popup flow exists to
      // protect. The popup-success path must use the no-redirect verify flow.
      const baseStore = buildBaseStoreWithPopup();
      const popup = buildMockPopup();
      openSpy = jest
        .spyOn(window, 'open')
        .mockReturnValue(popup as unknown as Window);

      createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValue(
        false,
      );
      // ToS / platforms / features must NOT be called when isAuthorized is false
      const tosSpy = createSpy(
        baseStore.sdlcServerClient,
        'hasAcceptedTermsOfService',
      ).mockResolvedValue([]);
      const goToAddressSpy = createSpy(
        baseStore.applicationStore.navigationService.navigator,
        'goToAddress',
      ).mockImplementation(noop);
      const errorSpy = createSpy(
        baseStore.applicationStore.notificationService,
        'notifyError',
      ).mockImplementation(noop);

      const reAuthPromise = baseStore.reAuthorizeSDLCInPopup();
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SDLC_REAUTH_DONE' },
          origin: POPUP_CALLBACK_ORIGIN,
        }),
      );

      const result = await reAuthPromise;
      expect(result).toBe(false);
      expect(goToAddressSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();
      expect(tosSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();
      expect(errorSpy as TEMPORARY__JestMatcher).toHaveBeenCalled();
      expect(baseStore.popupReAuthState.hasFailed).toBe(true);
    },
  );

  test(
    integrationTest(
      'suppress guard prevents deadlock when verify isAuthorized re-enters the 401 hook',
    ),
    async () => {
      // Regression: the post-popup verify GET (`isAuthorized()`) can itself
      // 401, which causes the network layer to invoke the `autoReAuthenticate`
      // callback again. Without the `suppressAutoReAuth` re-entry guard, that
      // re-entry would see the still-in-flight outer promise and return it —
      // creating a circular await (the inner call awaits the outer, the outer
      // awaits the inner) and hanging the whole chain forever.
      const baseStore = buildBaseStoreWithPopup();
      const popup = buildMockPopup();
      openSpy = jest
        .spyOn(window, 'open')
        .mockReturnValue(popup as unknown as Window);

      createSpy(
        baseStore.applicationStore.notificationService,
        'notifyWarning',
      ).mockImplementation(noop);
      createSpy(
        baseStore.applicationStore.notificationService,
        'notifyError',
      ).mockImplementation(noop);

      const handle = (
        baseStore as unknown as {
          handleSDLCUnauthorized(): Promise<boolean>;
        }
      ).handleSDLCUnauthorized.bind(baseStore);

      // Simulate the network layer's 401 hook firing from inside the verify
      // call: each `isAuthorized()` invocation re-enters `handleSDLCUnauthorized`
      // before "responding". With the suppress guard, the re-entry resolves
      // `false` immediately and `isAuthorized()` is free to return.
      let reentrantResult: boolean | 'not-called' = 'not-called';
      createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockImplementation(
        async () => {
          reentrantResult = await handle();
          return false;
        },
      );

      // Trigger via the auto path so `inFlightAutoReAuth` is set — that's the
      // condition under which the inner re-entry would otherwise hit the
      // "return inFlightAutoReAuth" branch and deadlock.
      const autoPromise = handle();

      // Popup signals success → verify runs → isAuthorized triggers re-entry.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SDLC_REAUTH_DONE' },
          origin: POPUP_CALLBACK_ORIGIN,
        }),
      );

      // If the suppress guard regresses, this `await` hangs forever and the
      // test times out.
      const result = await autoPromise;
      expect(result).toBe(false);
      expect(reentrantResult).toBe(false);
    },
  );

  test(
    integrationTest(
      'auto 401 raised while a manual popup is on screen defers to it instead of consuming the episode or warning',
    ),
    async () => {
      // Regression: previously, the manual click would set
      // `popupReAuthState.inProgress`, then a concurrent auto 401 would
      // (1) consume `autoPopupReAuthAttempted`, (2) call
      // reAuthorizeSDLCInPopup which would immediately short-circuit on
      // `popupReAuthState.isInProgress` and return false, and (3) fire the
      // "click the shield" warning at the user while the shield's popup is
      // literally on screen. The fix is to coalesce on `inFlightReAuth`.
      const baseStore = buildBaseStoreWithPopup();
      const popup = buildMockPopup();
      openSpy = jest
        .spyOn(window, 'open')
        .mockReturnValue(popup as unknown as Window);

      createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValue(
        true,
      );
      createSpy(
        baseStore.sdlcServerClient,
        'hasAcceptedTermsOfService',
      ).mockResolvedValue([]);
      createSpy(
        baseStore.sdlcServerClient,
        'fetchServerPlatforms',
      ).mockResolvedValue();
      createSpy(
        baseStore.sdlcServerClient,
        'fetchServerFeaturesConfiguration',
      ).mockResolvedValue();
      const warnSpy = createSpy(
        baseStore.applicationStore.notificationService,
        'notifyWarning',
      ).mockImplementation(noop);

      // User clicks the StatusBar shield first.
      const manualPromise = baseStore.reAuthorizeSDLCInPopup();
      expect(openSpy).toHaveBeenCalledTimes(1);

      // While the manual popup is still on screen, a 401 from an in-flight
      // editor request fires the network layer's auto-reauth hook. It MUST
      // coalesce onto the manual popup — same in-flight promise, no second
      // window.open, no episode consumed.
      const handle = (
        baseStore as unknown as {
          handleSDLCUnauthorized(): Promise<boolean>;
        }
      ).handleSDLCUnauthorized.bind(baseStore);
      const autoPromise = handle();
      expect(openSpy).toHaveBeenCalledTimes(1);

      // Popup completes successfully → both callers see the same outcome.
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SDLC_REAUTH_DONE' },
          origin: POPUP_CALLBACK_ORIGIN,
        }),
      );

      const [manualResult, autoResult] = await Promise.all([
        manualPromise,
        autoPromise,
      ]);
      expect(manualResult).toBe(true);
      expect(autoResult).toBe(true);
      // Critically: the "click the shield" warning must NOT have fired while
      // the user was literally engaging with the shield's popup.
      expect(warnSpy as TEMPORARY__JestMatcher).not.toHaveBeenCalled();
      // The auto-attempt counter must NOT have been consumed by the
      // deferred 401 — the next failure episode still gets its one auto
      // attempt.
      expect(
        (baseStore as unknown as { autoPopupReAuthAttempted: boolean })
          .autoPopupReAuthAttempted,
      ).toBe(false);
    },
  );

  test(
    integrationTest(
      'a burst of 401s after a popup-blocked auto attempt only fires the manual-reauth warning once',
    ),
    async () => {
      // Regression: when window.open is blocked (the common case — calls
      // from a 401 response handler typically lack transient user
      // activation), the first auto-attempt fails immediately, the loop
      // guard latches, and every subsequent 401 in the burst lands in the
      // `if (autoPopupReAuthAttempted)` branch and used to fire an
      // identical warning toast each time. The dedup flag must collapse
      // them down to one.
      const baseStore = buildBaseStoreWithPopup();
      // simulate popup-blocked: window.open returns null
      openSpy = jest.spyOn(window, 'open').mockReturnValue(null);

      const warnSpy = createSpy(
        baseStore.applicationStore.notificationService,
        'notifyWarning',
      ).mockImplementation(noop);
      // The popup-blocked path also fires notifyError once on the FIRST
      // attempt; we silence it so it doesn't pollute the warn count
      // and so we can focus the assertion on the dedup we care about.
      createSpy(
        baseStore.applicationStore.notificationService,
        'notifyError',
      ).mockImplementation(noop);

      const handle = (
        baseStore as unknown as {
          handleSDLCUnauthorized(): Promise<boolean>;
        }
      ).handleSDLCUnauthorized.bind(baseStore);

      // First call: opens (blocked) popup, fails immediately, fires the
      // manual-reauth warning ONCE.
      const first = await handle();
      expect(first).toBe(false);
      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy as TEMPORARY__JestMatcher).toHaveBeenCalledTimes(1);

      // Subsequent 401s in the burst all hit the loop-guard branch. Without
      // the dedup flag, each would stack another identical toast.
      const second = await handle();
      const third = await handle();
      const fourth = await handle();
      expect([second, third, fourth]).toEqual([false, false, false]);
      // No additional popups attempted (loop guard).
      expect(openSpy).toHaveBeenCalledTimes(1);
      // And critically: still only ONE warning toast across the entire
      // burst.
      expect(warnSpy as TEMPORARY__JestMatcher).toHaveBeenCalledTimes(1);
    },
  );

  test(
    integrationTest(
      'boot-time top-level redirect is unaffected when popup re-auth is enabled',
    ),
    async () => {
      const applicationStore = new ApplicationStore(
        TEST__getLegendStudioApplicationConfig({
          sdlc: {
            url: 'https://testSdlcUrl',
            enablePopupReAuth: true,
          },
        }),
        LegendStudioPluginManager.create(),
      );
      const MOCK__browserPlatform =
        TEST__provideMockedBrowserPlatform(applicationStore);
      const baseStore = TEST__provideMockedLegendStudioBaseStore({
        applicationStore,
      });

      const stubURL = 'stubUrl';
      createSpy(
        baseStore.sdlcServerClient,
        'isAuthorized',
      ).mockResolvedValueOnce(false);
      createSpy(
        baseStore.sdlcServerClient,
        'getCurrentUser',
      ).mockResolvedValueOnce({
        name: 'testUser',
        userId: 'testUserId',
      });

      const navigator = MOCK__browserPlatform.getNavigator();
      createSpy(MOCK__browserPlatform, 'getNavigator').mockReturnValue(
        navigator,
      );
      createSpy(navigator, 'getCurrentAddress').mockImplementation(
        () => stubURL,
      );
      const navigationActionSpy = createSpy(
        navigator,
        'goToAddress',
      ).mockImplementation(noop);
      openSpy = jest.spyOn(window, 'open');

      render(
        <ApplicationStoreProvider store={baseStore.applicationStore}>
          <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
            <LegendStudioFrameworkProvider>
              <LegendStudioWebApplicationRouter />
            </LegendStudioFrameworkProvider>
          </TEST__BrowserEnvironmentProvider>
        </ApplicationStoreProvider>,
      );

      await waitFor(() =>
        expect(
          navigationActionSpy as TEMPORARY__JestMatcher,
        ).toHaveBeenCalledWith(
          SDLCServerClient.authorizeCallbackUrl(
            baseStore.applicationStore.config.sdlcServerUrl,
            stubURL,
          ),
        ),
      );
      // The popup must NOT have been opened on boot — popup re-auth is for
      // mid-session 401s only.
      expect(openSpy).not.toHaveBeenCalled();
    },
  );
});

const MOCK__useAuth = jest.fn<
  () => {
    user?: { access_token?: string; expires_at?: number };
    signinSilent: () => Promise<unknown>;
    events: {
      addAccessTokenExpiring: (cb: () => void) => () => void;
      addAccessTokenExpired: (cb: () => void) => () => void;
    };
  }
>();

const createMockAuthEvents = (options?: {
  signinSilent?: () => Promise<unknown>;
}): {
  events: {
    addAccessTokenExpiring: (cb: () => void) => () => void;
    addAccessTokenExpired: (cb: () => void) => () => void;
    _fireExpiring: () => void;
    _fireExpired: () => void;
  };
  signinSilent: () => Promise<unknown>;
} => {
  const expiringCallbacks: (() => void)[] = [];
  const expiredCallbacks: (() => void)[] = [];
  return {
    signinSilent: options?.signinSilent ?? (() => Promise.resolve()),
    events: {
      addAccessTokenExpiring: (cb: () => void) => {
        expiringCallbacks.push(cb);
        return () => {
          const idx = expiringCallbacks.indexOf(cb);
          if (idx >= 0) {
            expiringCallbacks.splice(idx, 1);
          }
        };
      },
      addAccessTokenExpired: (cb: () => void) => {
        expiredCallbacks.push(cb);
        return () => {
          const idx = expiredCallbacks.indexOf(cb);
          if (idx >= 0) {
            expiredCallbacks.splice(idx, 1);
          }
        };
      },
      _fireExpiring: () => expiringCallbacks.forEach((cb) => cb()),
      _fireExpired: () => expiredCallbacks.forEach((cb) => cb()),
    },
  };
};

jest.mock('react-oidc-context', () => ({
  __esModule: true,
  useAuth: (...args: unknown[]) => MOCK__useAuth(...(args as [])),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  withAuthenticationRequired: (component: React.ComponentType) => component,
  hasAuthParams: () => false,
}));

let cookieWrites: string[] = [];
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype,
  'cookie',
) as PropertyDescriptor;

beforeEach(() => {
  cookieWrites = [];
  const descriptor: PropertyDescriptor = {
    configurable: true,
    set(value: string) {
      cookieWrites.push(value);
      originalCookieDescriptor.set?.call(this, value);
    },
  };
  if (originalCookieDescriptor.get) {
    const boundGet = originalCookieDescriptor.get.bind(document);
    descriptor.get = boundGet;
  }
  Object.defineProperty(document, 'cookie', descriptor);
});

afterEach(() => {
  Object.defineProperty(document, 'cookie', originalCookieDescriptor);
});

describe('ApplicationStore.accessToken', () => {
  let appStore: ApplicationStore<
    ReturnType<typeof TEST__getLegendStudioApplicationConfig>,
    LegendStudioPluginManager
  >;

  beforeEach(() => {
    appStore = new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      LegendStudioPluginManager.create(),
    );
    cookieWrites = [];
  });

  test(integrationTest('setAccessToken stores the token'), async () => {
    expect(appStore.getAccessToken()).toBeUndefined();

    appStore.setAccessToken('tok-123');
    expect(appStore.getAccessToken()).toBe('tok-123');
  });

  test(
    integrationTest('setAccessToken writes the browser cookie'),
    async () => {
      appStore.setAccessToken('cookie-val');
      expect(
        cookieWrites.some((c) => c.includes('legend-access-token=cookie-val')),
      ).toBe(true);
    },
  );

  test(integrationTest('clearing the token expires the cookie'), async () => {
    appStore.setAccessToken('to-be-cleared');
    expect(
      cookieWrites.some((c) => c.includes('legend-access-token=to-be-cleared')),
    ).toBe(true);

    cookieWrites = [];
    appStore.setAccessToken(undefined);
    expect(cookieWrites.some((c) => c.includes('max-age=0'))).toBe(true);
    expect(appStore.getAccessToken()).toBeUndefined();
  });

  test(
    integrationTest('setAccessToken writes max-age into cookie when provided'),
    async () => {
      appStore.setAccessToken('with-max-age', 3600);
      expect(
        cookieWrites.some(
          (c) =>
            c.includes('legend-access-token=with-max-age') &&
            c.includes('max-age=3600'),
        ),
      ).toBe(true);
    },
  );

  test(
    integrationTest('cookie has no max-age when maxAge is omitted'),
    async () => {
      cookieWrites = [];
      appStore.setAccessToken('without-maxage');
      const written = cookieWrites.find((c) =>
        c.includes('legend-access-token=without-maxage'),
      );
      expect(written).toBeDefined();
      expect(written).not.toContain('; max-age=');
    },
  );

  test(
    integrationTest(
      'token with special characters is URL-encoded in the cookie',
    ),
    async () => {
      const specialToken = 'eyJhbGciOiJSUzI1NiJ9.abc=';
      appStore.setAccessToken(specialToken);
      expect(
        cookieWrites.some((c) =>
          c.includes(`legend-access-token=${encodeURIComponent(specialToken)}`),
        ),
      ).toBe(true);
      expect(appStore.getAccessToken()).toBe(specialToken);
    },
  );

  test(
    integrationTest(
      'cookie includes Domain attribute when cookieDomain is configured',
    ),
    async () => {
      const storeWithDomain = new ApplicationStore(
        TEST__getLegendStudioApplicationConfig({
          legendCookieDomain: '.example.com',
        }),
        LegendStudioPluginManager.create(),
      );
      cookieWrites = [];
      storeWithDomain.setAccessToken('domain-token');
      const written = cookieWrites.find((c) =>
        c.includes('legend-access-token=domain-token'),
      );
      expect(written).toBeDefined();
      expect(written).toContain('Domain=.example.com');
    },
  );

  test(
    integrationTest(
      'cookie omits Domain attribute when cookieDomain is not configured',
    ),
    async () => {
      cookieWrites = [];
      appStore.setAccessToken('no-domain-token');
      const written = cookieWrites.find((c) =>
        c.includes('legend-access-token=no-domain-token'),
      );
      expect(written).toBeDefined();
      expect(written).not.toContain('Domain=');
    },
  );
});

describe('LegendTokenSync', () => {
  let appStore: ApplicationStore<
    ReturnType<typeof TEST__getLegendStudioApplicationConfig>,
    LegendStudioPluginManager
  >;

  beforeEach(() => {
    appStore = new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      LegendStudioPluginManager.create(),
    );
    cookieWrites = [];
    MOCK__useAuth.mockReset();
  });

  test(
    integrationTest(
      'syncs access token from useAuth into applicationStore on mount',
    ),
    async () => {
      const mockEvents = createMockAuthEvents();
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'first-token' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBe('first-token');
      expect(
        cookieWrites.some((c) => c.includes('legend-access-token=first-token')),
      ).toBe(true);
    },
  );

  test(
    integrationTest(
      'sets token to undefined when auth user has no access_token',
    ),
    async () => {
      const mockEvents = createMockAuthEvents();
      MOCK__useAuth.mockReturnValue({
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBeUndefined();
    },
  );

  test(
    integrationTest(
      'updates applicationStore when token changes via re-render',
    ),
    async () => {
      const mockEvents = createMockAuthEvents();
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'token-v1' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      const { rerender } = render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );
      expect(appStore.getAccessToken()).toBe('token-v1');

      // Simulate a token refresh
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'token-v2' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      rerender(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );
      expect(appStore.getAccessToken()).toBe('token-v2');
      expect(
        cookieWrites.some((c) => c.includes('legend-access-token=token-v2')),
      ).toBe(true);
    },
  );

  test(integrationTest('renders children correctly'), async () => {
    const mockEvents = createMockAuthEvents();
    MOCK__useAuth.mockReturnValue({
      user: { access_token: 'irrelevant' },
      signinSilent: mockEvents.signinSilent,
      events: mockEvents.events,
    });

    const { getByText } = render(
      <ApplicationStoreProvider store={appStore}>
        <LegendTokenSync>
          <span>child-content</span>
        </LegendTokenSync>
      </ApplicationStoreProvider>,
    );

    expect(getByText('child-content')).toBeTruthy();
  });

  test(
    integrationTest(
      'attempts signinSilent when accessTokenExpiring event fires',
    ),
    async () => {
      const signinSilent = jest.fn(() => Promise.resolve());
      const mockEvents = createMockAuthEvents({ signinSilent });
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'about-to-expire' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBe('about-to-expire');

      await act(async () => {
        mockEvents.events._fireExpiring();
      });

      expect(signinSilent).toHaveBeenCalledTimes(1);
    },
  );

  test(
    integrationTest(
      'clears token when accessTokenExpired fires and signinSilent fails',
    ),
    async () => {
      const signinSilent = jest.fn(() =>
        Promise.reject(new Error('renewal failed')),
      );
      const mockEvents = createMockAuthEvents({ signinSilent });
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'expired-token' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBe('expired-token');

      await act(async () => {
        mockEvents.events._fireExpired();
      });

      expect(signinSilent).toHaveBeenCalledTimes(1);
      expect(appStore.getAccessToken()).toBeUndefined();
    },
  );

  test(
    integrationTest('sets max-age on cookie when auth user has expires_at'),
    async () => {
      const mockEvents = createMockAuthEvents();
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiresAt = nowSeconds + 1800; // 30 minutes from now
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'token-with-expiry', expires_at: expiresAt },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBe('token-with-expiry');
      const cookieWithMaxAge = cookieWrites.find(
        (c) =>
          c.includes('legend-access-token=token-with-expiry') &&
          c.includes('max-age='),
      );
      expect(cookieWithMaxAge).toBeDefined();
      // The max-age should be close to 1800 (within a small tolerance for
      // the time elapsed between Date.now() calls).
      const match = cookieWithMaxAge?.match(/max-age=(?<maxAge>\d+)/);
      expect(match).not.toBeNull();
      const writtenMaxAge = Number(match?.groups?.maxAge);
      expect(writtenMaxAge).toBeGreaterThanOrEqual(1798);
      expect(writtenMaxAge).toBeLessThanOrEqual(1800);
    },
  );

  test(
    integrationTest('cookie has no max-age when auth user lacks expires_at'),
    async () => {
      const mockEvents = createMockAuthEvents();
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'no-expiry-token' },
        signinSilent: mockEvents.signinSilent,
        events: mockEvents.events,
      });

      render(
        <ApplicationStoreProvider store={appStore}>
          <LegendTokenSync>
            <div />
          </LegendTokenSync>
        </ApplicationStoreProvider>,
      );

      expect(appStore.getAccessToken()).toBe('no-expiry-token');
      const written = cookieWrites.find((c) =>
        c.includes('legend-access-token=no-expiry-token'),
      );
      expect(written).toBeDefined();
      expect(written).not.toContain('max-age');
    },
  );
});
