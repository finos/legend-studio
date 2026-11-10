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

import {
  type CubeDocument,
  DataProductAccessPointSource,
  IngestDatasetSource,
  RelationalTableSource,
} from '@finos/legend-cube';
import { getCubeDirectConnection } from './CubeDirectConnection.js';
import { getCubeProjectCoordinates } from './CubeProject.js';
import { CubeSourceRef } from './CubeStore.js';

export enum CUBE_SOURCE_REF_TYPE {
  TABLE = 'table',
  DATA_PRODUCT_ACCESS_POINT = 'dataProductAccessPoint',
  INGEST_DATA_SET = 'ingestDataSet',
}

/**
 * The sources a cube reads, saved beside its spec so the store can find the
 * cubes that read a table, a data product or an ingest data set (PLAN
 * §11.13): one per source node, each once, in the query's order. A table
 * names its Depot project when the cube's model is one; a direct
 * connection's tables, a session's own database, have none.
 */
export const getCubeSourceRefs = (document: CubeDocument): CubeSourceRef[] => {
  const model = document.context?.model;
  const isDirect =
    model !== undefined && Boolean(getCubeDirectConnection(model));
  const project = model ? getCubeProjectCoordinates(model) : undefined;
  const seen = new Set<string>();
  const refs: CubeSourceRef[] = [];
  const add = (ref: CubeSourceRef): void => {
    const key = JSON.stringify([ref.type, ref.path, ref.element, ref.project]);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  };
  document.query.nodes.forEach((node) => {
    if (node instanceof RelationalTableSource) {
      if (!isDirect) {
        add(
          new CubeSourceRef(
            CUBE_SOURCE_REF_TYPE.TABLE,
            node.database,
            `${node.schema}.${node.table}`,
            project ? `${project.groupId}:${project.artifactId}` : undefined,
          ),
        );
      }
    } else if (node instanceof DataProductAccessPointSource) {
      add(
        new CubeSourceRef(
          CUBE_SOURCE_REF_TYPE.DATA_PRODUCT_ACCESS_POINT,
          node.dataProduct,
          node.accessPoint,
        ),
      );
    } else if (node instanceof IngestDatasetSource) {
      add(
        new CubeSourceRef(
          CUBE_SOURCE_REF_TYPE.INGEST_DATA_SET,
          node.ingestDefinition,
          node.dataSet,
        ),
      );
    }
  });
  return refs;
};
