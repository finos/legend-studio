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

import { useEffect, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { LogEvent } from '@finos/legend-shared';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { APPLICATION_EVENT } from '../__lib__/LegendApplicationEvent.js';

/**
 * Must be rendered inside an `<AuthProvider>` and an
 * `<ApplicationStoreProvider>`.
 *
 * Keeps the in-memory token and cookie in sync with the OIDC provider
 * and proactively renews the access token before it expires so that
 * long-running sessions (e.g. Legend marketplace AI chat, query execution) never send
 * stale credentials.
 */
export const LegendTokenSync = (props: {
  children: React.ReactNode;
}): React.ReactElement => {
  const auth = useAuth();
  const applicationStore = useApplicationStore();
  const token = auth.user?.access_token;
  const expiresAt = auth.user?.expires_at;

  const attemptSilentRenew = useCallback(async () => {
    try {
      await auth.signinSilent();
    } catch {
      applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        'OIDC silent renewal failed — clearing token',
      );
      applicationStore.setAccessToken(undefined);
    }
  }, [auth, applicationStore]);

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

  useEffect(() => {
    const removeExpiring = auth.events.addAccessTokenExpiring(() => {
      applicationStore.logService.info(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        'OIDC access token expiring soon — attempting silent renewal',
      );
      attemptSilentRenew().catch(() => {
        /* handled inside attemptSilentRenew */
      });
    });
    return removeExpiring;
  }, [auth.events, applicationStore, attemptSilentRenew]);

  // If the token fully expires (automatic renewal failed or was never
  // attempted) make one last renewal attempt before giving up.
  useEffect(() => {
    const removeExpired = auth.events.addAccessTokenExpired(() => {
      applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.TOKEN_EXPIRED),
        'OIDC access token expired — attempting silent renewal',
      );
      attemptSilentRenew().catch(() => {
        /* handled inside attemptSilentRenew */
      });
    });
    return removeExpired;
  }, [auth.events, applicationStore, attemptSilentRenew]);

  return <>{props.children}</>;
};
