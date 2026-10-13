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

// The deployed services a cube can pick (PLAN §6.4): the port the source
// dialog's Service tab reads, over the engine's service registry

/** A deployed service, as the registry lists it */
export interface CubeServiceSummary {
  /** The service's name, its element path */
  readonly name: string;
  readonly title?: string | undefined;
  /** Its URL pattern, e.g. `/trades/byDesk`, which the engine's SQL reads it by */
  readonly pattern: string;
  readonly documentation: string;
  /** Who owns it: its owners, or its deployment as `Deployment <id>`; none when the registry doesn't say */
  readonly owners: readonly string[];
}

export interface CubeServiceCatalog {
  /** Every deployed service, by title, then name */
  listServices(): Promise<readonly CubeServiceSummary[]>;
}
