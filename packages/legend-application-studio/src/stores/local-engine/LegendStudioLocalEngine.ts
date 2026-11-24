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

import type {
  LocalEngineRequest,
  LocalEngineResponse,
  LocalEngineRoute,
} from '@finos/legend-graph';

/**
 * A local engine answers some engine calls in the browser, instead of the
 * engine server. A plugin provides it (see
 * `LegendStudioApplicationPlugin.getExtraLocalEngines`), and the deployment's
 * configuration (`engine.local`) decides which calls go to it.
 *
 * It receives exactly what the engine server would receive, and must answer
 * exactly what the engine server would answer: the route's own status and
 * body. Studio handles the answer as it handles the server's.
 */
export interface LegendStudioLocalEngine {
  /**
   * Names the engine in the configuration and in telemetry
   */
  key: string;
  /**
   * Names the engine to the user: in notifications and in the Dev Tool panel
   */
  label: string;
  /**
   * The calls the engine answers, by route below `pure/v1/`,
   * e.g. `grammar/grammarToJson/model`
   */
  supportedRoutes: LocalEngineRoute[];
  /**
   * Answers one call as the engine server's route would: the same request in,
   * the same status and body out. A failure is the server's error status and
   * error JSON, not a thrown error.
   */
  answer(
    route: LocalEngineRoute,
    request: LocalEngineRequest,
  ): Promise<LocalEngineResponse>;
  /**
   * Whether the engine can run in this browser, e.g. whether its module loads.
   * Studio checks it once, before the first local call; when it resolves to
   * `false`, every call goes to the engine server.
   */
  isAvailable?(): Promise<boolean>;
  /**
   * Whether an answer means "this call is not supported here", rather than an
   * error in the user's model. Studio then reruns the call on the engine
   * server, and every later call goes there too.
   */
  isRefusal?(response: LocalEngineResponse): boolean;
}
