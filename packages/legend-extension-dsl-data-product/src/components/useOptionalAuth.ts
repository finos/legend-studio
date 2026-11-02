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

import { type AuthContextProps, useAuth } from 'react-oidc-context';

/**
 * Why an action that needs the signed-in user's token is disabled when there
 * is no `AuthProvider`, see {@link useOptionalAuth}
 */
export const NO_AUTH_PROVIDER_REASON = 'no OIDC sign-in is configured';

/**
 * NOTE: `useAuth()` is typed as always returning `AuthContextProps`, but its
 * implementation just reads `useContext(AuthContext)` and only warns (does
 * not throw) when there is no ancestor `AuthProvider`, so it can genuinely
 * be `undefined` at runtime: e.g. Legend Studio only mounts one when its
 * ingest deployment has an OIDC config, but shows the data product Preview
 * either way. Without one, there is no token: calls go without it, and the
 * actions that need the signed-in user are disabled.
 */
export const useOptionalAuth = (): AuthContextProps | undefined =>
  useAuth() as AuthContextProps | undefined;
