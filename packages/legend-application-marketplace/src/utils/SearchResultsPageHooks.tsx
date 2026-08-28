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

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Keeps a ref to the current OIDC access token in sync, for use inside callbacks
 * (like a search action) that read the token at call time rather than at render
 * time — a plain `auth.user?.access_token` read would close over a stale value.
 *
 * Shared by every search results page that needs to pass a bearer token down into
 * `executeSearch`, instead of each page re-declaring the same ref + sync effect.
 */
export const useAccessTokenRef = (): RefObject<string | undefined> => {
  const auth = useAuth();
  const tokenRef = useRef(auth.user?.access_token);

  useEffect(() => {
    tokenRef.current = auth.user?.access_token;
  }, [auth.user?.access_token]);

  return tokenRef;
};

/**
 * Flips to `true` one commit after mount.
 *
 * Search results pages sync store state (search query, mode, filters) from the URL
 * via effects of their own, declared before this hook is called. Gating the initial
 * search on this flag — rather than on a specific store field being defined — waits
 * for those sync effects to run first, without caring which fields they populate.
 * Without it, a route that carries no query param at all (e.g. arriving from a
 * header tab) would leave the relevant field `undefined` forever and the initial
 * search would never fire.
 */
export const useHasReadSearchParams = (): boolean => {
  const [hasReadSearchParams, setHasReadSearchParams] = useState(false);

  useEffect(() => {
    setHasReadSearchParams(true);
  }, []);

  return hasReadSearchParams;
};
