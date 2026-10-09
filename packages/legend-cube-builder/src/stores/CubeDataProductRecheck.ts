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
  DataProductAccessPointSource,
  ModelContext,
  Schema,
} from '@finos/legend-cube';
import { CUBE_DATA_PRODUCT_RECHECK_MESSAGE } from '../__lib__/LegendCubeDataProductLabels.js';
import {
  checkCubeDataProductModel,
  getCubeDataProductProject,
} from '../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCatalog } from '../graph-manager/CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';

/**
 * Reads a data product cube's access points again (PLAN §6.8, §10.3): their
 * columns as the product's deployed artifact gives them, at the cube's saved
 * version, through the catalog, with no engine call. One answer per source,
 * failures included; never rejects.
 */
export const recheckCubeDataProductSources = async (
  catalog: CubeDataProductCatalog | undefined,
  model: ModelContext,
  sources: readonly DataProductAccessPointSource[],
): Promise<Map<NodeId, Schema | CubeEngineError>> => {
  const failAll = (
    kind: CubeEngineErrorKind,
    detail: string,
  ): Map<NodeId, Schema | CubeEngineError> =>
    new Map(
      sources.map((source) => [
        source.id,
        new CubeEngineError(kind, detail, source.id),
      ]),
    );
  if (!catalog) {
    return failAll(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
      CUBE_DATA_PRODUCT_RECHECK_MESSAGE.NO_CATALOG,
    );
  }
  const project = getCubeDataProductProject(model);
  if (!project) {
    return failAll(
      CubeEngineErrorKind.UNSUPPORTED_MODEL,
      checkCubeDataProductModel(model).join('\n'),
    );
  }
  try {
    return await catalog.resolveSchemas(
      project,
      new Map(
        sources.map((source) => [
          source.id,
          {
            dataProduct: source.dataProduct,
            accessPointGroup: source.accessPointGroup,
            accessPoint: source.accessPoint,
          },
        ]),
      ),
    );
  } catch (error) {
    return error instanceof CubeEngineError
      ? failAll(error.kind, error.detail)
      : failAll(
          CubeEngineErrorKind.NETWORK,
          error instanceof Error ? error.message : String(error),
        );
  }
};
