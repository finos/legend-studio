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

import type { CubeModelOutline } from './CubeEngine.js';
import type { CubeProjectCoordinates } from './CubeProject.js';

// The published projects a cube can read Databases from (PLAN §6.3): the
// port the source dialog's Project tab reads, over the host's depot

/** A published project, without a version */
export interface CubeProjectSummary {
  readonly groupId: string;
  readonly artifactId: string;
}

export interface CubeProjectCatalog {
  /** Every published project, by group and artifact */
  listProjects(): Promise<readonly CubeProjectSummary[]>;
  /** The project's released versions, newest first: never a SNAPSHOT or an alias */
  listVersions(project: CubeProjectSummary): Promise<readonly string[]>;
  /**
   * The project's own Databases at the version, and the runtimes of the
   * project and its dependencies; a dependency's Databases are not offered
   * (user, 2026-10-09)
   */
  loadOutline(project: CubeProjectCoordinates): Promise<CubeModelOutline>;
}
