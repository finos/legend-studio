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

import type { ModelContext, Schema, ServiceSource } from '@finos/legend-cube';
import { CUBE_SERVICE_MESSAGE } from '../__lib__/LegendCubeServiceLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';
import type { CubeServiceCatalog } from '../graph-manager/CubeServiceCatalog.js';

/**
 * Types a cube's services (PLAN §6.4), when they are added and whenever
 * they are read again. One answer per source, failures included; never
 * rejects.
 *
 * TODO: type each service, e.g. through the engine with the lambda its
 * emitter will write (`#SQL{select * from service('/pattern')}#`). Until
 * then every service fails, with why, so it is invalid and nothing runs.
 */
export const recheckCubeServiceSources = (
  catalog: CubeServiceCatalog | undefined,
  model: ModelContext,
  sources: readonly ServiceSource[],
): Promise<Map<NodeId, Schema | CubeEngineError>> =>
  Promise.resolve(
    new Map(
      sources.map((source) => [
        source.id,
        new CubeEngineError(
          CubeEngineErrorKind.UNSUPPORTED_MODEL,
          catalog
            ? CUBE_SERVICE_MESSAGE.NOT_READABLE
            : CUBE_SERVICE_MESSAGE.NO_CATALOG,
          source.id,
        ),
      ]),
    ),
  );
