/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { useEffect } from 'react';
import { useAuth, type AuthContextProps } from 'react-oidc-context';
import {
  LogEvent,
  isPlainObject,
  isString,
  isNumber,
} from '@finos/legend-shared';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import type { GenericLegendApplicationStore } from '../stores/ApplicationStore.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';

// Coordinates renewal across tabs — see doc comment below.
const OIDC_RENEWAL_LOCK_NAME = 'legend-oidc-silent-renew';

// How long a losing tab waits before reading the winner's result.
const RENEWAL_GRACE_PERIOD_MS = 3_000;

// Checked once at module load — Web Locks support doesn't change at runtime.
// The DOM lib declares `navigator.locks` as always present, even though
// older browsers lack it; go through a partial type to get accurate
// optionality for this runtime feature check.
const supportsWebLocks = (navigator as Partial<Navigator>).locks !== undefined;

/**
 * Runs `action` under the cross-tab renewal lock, passing whether this tab
 * won it. Degrades to always "winning" (uncoordinated renewal) on browsers
 * without the Web Locks API.
 */
async function withRenewalLock<T>(
  action: (wonLock: boolean) => Promise<T>,
): Promise<T> {
  if (!supportsWebLocks) {
    return action(true);
  }
  // navigator.locks.request's DOM typing doesn't model that it resolves with
  // the callback's return value, so capture it via closure instead. With
  // `ifAvailable: true` the callback always runs, so `result` is always set.
  let result!: T;
  await navigator.locks.request(
    OIDC_RENEWAL_LOCK_NAME,
    { ifAvailable: true },
    async (lock) => {
      result = await action(lock !== null);
    },
  );
  return result;
}

/**
 * Must be rendered inside `<AuthProvider>` and `<ApplicationStoreProvider>`.
 * Shared by Studio, Query, DataCube, and Marketplace.
 *
 * Syncs the OIDC token into `ApplicationStore`. Apps with
 * `automaticSilentRenew: false` (currently only Marketplace, which also uses
 * a `localStorage`-backed `userStore`) get cross-tab renewal coordination via
 * the Web Locks API here, so only one tab redeems the refresh token per
 * cycle — this exists because `sessionStorage` isn't shared across tabs, so
 * each tab used to renew independently and race to redeem the same
 * single-use refresh token, causing intermittent `invalid_grant`s. Apps on
 * the library default (`automaticSilentRenew: true`) are unaffected: the
 * library's own `SilentRenewService` still does the one renewal call, and
 * `addSilentRenewError` here just clears the token if that fails.
 */
export const LegendTokenSync = (props: {
  children: React.ReactNode;
}): React.ReactElement => {
  const auth = useAuth();
  const applicationStore = useApplicationStore();
  const token = auth.user?.access_token;
  const expiresAt = auth.user?.expires_at;

  // Sync token + cookie max-age whenever the OIDC user changes.
  useEffect(() => {
    const maxAge =
      expiresAt !== undefined
        ? expiresAt - Math.floor(Date.now() / 1000)
        : undefined;
    applicationStore.setAccessToken(token ?? undefined, maxAge);
  }, [applicationStore, token, expiresAt]);

  // The library's automatic silent renewal (see UserManager's
  // `automaticSilentRenew`) exhausted its own retries and gave up — only now
  // do we clear the token, since sending it further would just 401.
  useEffect(() => {
    // Only take over renewal when automaticSilentRenew is explicitly off
    // (Marketplace) — otherwise this would double up with the library's own
    // SilentRenewService and race for the same refresh token.
    if (auth.settings.automaticSilentRenew !== false) {
      return undefined;
    }

    if (!supportsWebLocks) {
      applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        'navigator.locks unavailable; silent renewal will be uncoordinated across tabs',
      );
    }

    const renewToken = (): Promise<void> =>
      withRenewalLock((wonLock) =>
        wonLock
          ? renewAsLockWinner(auth, applicationStore)
          : adoptRenewalFromWinner(auth, applicationStore),
      );

    const removeAccessTokenExpiring = auth.events.addAccessTokenExpiring(() => {
      renewToken().catch((error: unknown) => {
        applicationStore.logService.warn(
          LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
          `Unexpected error during coordinated OIDC renewal: ${String(error)}`,
        );
      });
    });

    return removeAccessTokenExpiring;
  }, [auth, applicationStore]);

  // For apps still on the library default (automaticSilentRenew: true),
  // the library's own SilentRenewService performs the one-and-only renewal
  // call. If that fails, clear the stored token instead of letting stale
  // credentials linger.
  useEffect(() => {
    const removeSilentRenewError = auth.events.addSilentRenewError(() => {
      applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        'OIDC silent renewal failed — clearing token',
      );
      applicationStore.setAccessToken(undefined);
    });
    return removeSilentRenewError;
  }, [auth.events, applicationStore]);

  return <>{props.children}</>;
};

interface PersistedOidcUser {
  access_token: string;
  expires_at: number | undefined;
}

function isPersistedOidcUser(value: unknown): value is PersistedOidcUser {
  return (
    isPlainObject(value) &&
    isString(value.access_token) &&
    (value.expires_at === undefined || isNumber(value.expires_at))
  );
}

// Reads the persisted OIDC user straight from storage — useAuth() doesn't
// expose a getUser(), so this replicates oidc-client-ts's storage key
// scheme directly to see what another tab may have just written.
async function readPersistedUser(
  auth: AuthContextProps,
): Promise<PersistedOidcUser | undefined> {
  const userStore = auth.settings.userStore;
  if (!userStore) {
    return undefined;
  }
  try {
    const key = `user:${auth.settings.authority}:${auth.settings.client_id}`;
    const raw = await userStore.get(key);
    if (!raw) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPersistedOidcUser(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// This tab won the renewal lock: redeem the refresh token.
async function renewAsLockWinner(
  auth: AuthContextProps,
  applicationStore: GenericLegendApplicationStore,
): Promise<void> {
  const tokenBeforeRenewal = auth.user?.access_token;
  await auth.signinSilent();
  // signinSilent() never throws; detect failure by checking whether a new
  // token actually landed in storage.
  const persisted = await readPersistedUser(auth);
  if (!persisted || persisted.access_token === tokenBeforeRenewal) {
    applicationStore.logService.warn(
      LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
      'OIDC silent renewal did not produce a new token — clearing token',
    );
    applicationStore.setAccessToken(undefined);
  }
}

// This tab lost the renewal lock: wait for the winner to persist a fresh
// token, then adopt it instead of renewing independently.
async function adoptRenewalFromWinner(
  auth: AuthContextProps,
  applicationStore: GenericLegendApplicationStore,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, RENEWAL_GRACE_PERIOD_MS));
  const persisted = await readPersistedUser(auth);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    persisted?.access_token &&
    (persisted.expires_at === undefined || persisted.expires_at > nowSeconds)
  ) {
    const maxAge =
      persisted.expires_at !== undefined
        ? persisted.expires_at - nowSeconds
        : undefined;
    applicationStore.setAccessToken(persisted.access_token, maxAge);
  } else {
    // Winner also failed; nothing fresher available.
    applicationStore.logService.warn(
      LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
      'No fresher token available from another tab after grace period — clearing token',
    );
    applicationStore.setAccessToken(undefined);
  }
}
