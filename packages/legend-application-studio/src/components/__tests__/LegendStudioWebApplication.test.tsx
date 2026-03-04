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

const MOCK__useAuth = jest.fn<
  () => {
    user?: { access_token?: string; expires_at?: number };
    events: {
      addAccessTokenExpired: (cb: () => void) => () => void;
    };
  }
>();

const createMockAuthEvents = (): {
  events: {
    addAccessTokenExpired: (cb: () => void) => () => void;
    _fireExpired: () => void;
  };
} => {
  const expiredCallbacks: (() => void)[] = [];
  return {
    events: {
      addAccessTokenExpired: (cb: () => void) => {
        expiredCallbacks.push(cb);
        return () => {
          const idx = expiredCallbacks.indexOf(cb);
          if (idx >= 0) {
            expiredCallbacks.splice(idx, 1);
          }
        };
      },
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
    integrationTest('clears token when accessTokenExpired event fires'),
    async () => {
      const mockEvents = createMockAuthEvents();
      MOCK__useAuth.mockReturnValue({
        user: { access_token: 'expired-token' },
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

      // Fire the expired event
      act(() => {
        mockEvents.events._fireExpired();
      });

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
