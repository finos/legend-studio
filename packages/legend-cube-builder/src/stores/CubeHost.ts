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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type { ModelContext } from '@finos/legend-cube';
import type { CubeConnectionExplorer } from '../graph-manager/CubeConnectionExplorer.js';
import type { CubeDataProductCatalog } from '../graph-manager/CubeDataProductCatalog.js';
import type { CubeIngestCatalog } from '../graph-manager/CubeIngestCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeEngine,
  type CubeModelOutline,
} from '../graph-manager/CubeEngine.js';
import {
  checkCubeProjectModel,
  getCubeProjectCoordinates,
  isCubeProjectModel,
} from '../graph-manager/CubeProject.js';
import type { CubeProjectCatalog } from '../graph-manager/CubeProjectCatalog.js';
import type { LocalModelCatalog } from './LocalModelCatalog.js';

/**
 * What the application hosting the Cube page gives it (PLAN §3.5, Settled
 * before M1.8). The host chooses the engine and the models; Cube keeps no
 * auth, config or telemetry of its own and uses the host's application store
 * for commands, user data, the clipboard, the theme, notifications, alerts and
 * telemetry.
 */
export interface CubeHost {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly engine: CubeEngine;
  readonly modelCatalog: LocalModelCatalog;
  /**
   * Reads the databases behind direct connections (PLAN §6.8); without one,
   * the source picker offers no database connection
   */
  readonly connectionExplorer?: CubeConnectionExplorer | undefined;
  /**
   * The deployed data products (PLAN §6.8); without one, the source dialog
   * offers no data products
   */
  readonly dataProductCatalog?: CubeDataProductCatalog | undefined;
  /**
   * The deployed ingest definitions (PLAN §6.7); without one, the source
   * dialog offers no ingest data sets
   */
  readonly ingestCatalog?: CubeIngestCatalog | undefined;
  /**
   * The published projects in the host's depot (PLAN §6.3); without one, the
   * source dialog offers no projects
   */
  readonly projectCatalog?: CubeProjectCatalog | undefined;
}

/** Why the host can't list a project model's Databases */
const NO_PROJECT_CATALOG =
  "This page can't read published projects: its host has no depot";

/**
 * A model's databases and runtimes, wherever its kind keeps them: a
 * project's in the host's depot (PLAN §6.3), any other through the model
 * catalog's engine
 */
export const loadCubeModelOutline = (
  host: CubeHost,
  model: ModelContext,
): Promise<CubeModelOutline> => {
  if (!isCubeProjectModel(model)) {
    return host.modelCatalog.loadOutline(model);
  }
  const project = getCubeProjectCoordinates(model);
  if (!project) {
    return Promise.reject(
      new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        checkCubeProjectModel(model).join('\n'),
      ),
    );
  }
  return host.projectCatalog
    ? host.projectCatalog.loadOutline(project)
    : Promise.reject(
        new CubeEngineError(
          CubeEngineErrorKind.UNSUPPORTED_MODEL,
          NO_PROJECT_CATALOG,
        ),
      );
};
