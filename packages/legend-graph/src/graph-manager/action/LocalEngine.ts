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

/**
 * An engine call, named by its route below the engine's `pure/v1/` path,
 * e.g. `grammar/grammarToJson/model`
 */
export type LocalEngineRoute = string;

/**
 * An engine call as the engine server would receive it: its query parameters
 * and its body, before any compression
 */
export interface LocalEngineRequest {
  query: Record<string, string>;
  body: string;
}

/**
 * The route's own HTTP answer: the status and the body the engine server
 * would send back
 */
export interface LocalEngineResponse {
  status: number;
  body: string;
}

/**
 * Decides which engine calls a local engine answers, instead of the engine
 * server. The engine client asks it about every call; an application
 * implements it.
 */
export interface LocalEngineRouter {
  /**
   * Whether this call should be offered to the local engine
   */
  isLocalRoute(route: LocalEngineRoute): boolean;
  /**
   * Answers the call locally. Resolves to `undefined` when the call must go to
   * the engine server after all, e.g. when the local engine is not available
   * in this browser or refused the call.
   */
  answer(
    route: LocalEngineRoute,
    request: LocalEngineRequest,
  ): Promise<LocalEngineResponse | undefined>;
}
