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
import { useAuth } from 'react-oidc-context';
import { LogEvent } from '@finos/legend-shared';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';

/**
 * Must be rendered inside an `<AuthProvider>` and an
 * `<ApplicationStoreProvider>`.
 *
 * Keeps the in-memory token and cookie in sync with the OIDC provider.
 *
 * `react-oidc-context`'s `UserManager` already renews the access token
 * automatically before it expires (`automaticSilentRenew`, on by default),
 * and internally listens to its own `accessTokenExpiring`/`accessTokenExpired`
 * events to do so. This component must NOT also call `auth.signinSilent()`
 * on those same events — doing so previously caused two concurrent
 * `signinSilent()` calls per renewal, racing to redeem the same (single-use)
 * refresh token against the IdP, which surfaced as an intermittent `400` from
 * the token endpoint and — because the losing call's failure handler cleared
 * the token outright — as `401`s on API calls right around every token
 * expiry, even when the other, winning renewal had actually succeeded.
 *
 * Instead, we only react passively to the outcome of the library's own
 * renewal: sync the token when it changes, and clear it if the library
 * reports the renewal ultimately failed (`SilentRenewError`).
 */
export const LegendTokenSync = (props: {
  children: React.ReactNode;
}): React.ReactElement => {
  const auth = useAuth();
  const applicationStore = useApplicationStore();
  const token = auth.user?.access_token;
  const expiresAt = auth.user?.expires_at;

  // Sync token into ApplicationStore whenever it changes (including
  // after a successful automatic silent renewal).  When the auth object
  // contains an `expires_at` timestamp we derive `max-age` so the
  // browser cookie expires at the same time as the token.
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
    const removeSilentRenewError = auth.events.addSilentRenewError((err) => {
      applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        `OIDC silent renewal failed: ${err.message} — clearing token`,
      );
      applicationStore.setAccessToken(undefined);
    });
    return removeSilentRenewError;
  }, [auth.events, applicationStore]);

  return <>{props.children}</>;
};
