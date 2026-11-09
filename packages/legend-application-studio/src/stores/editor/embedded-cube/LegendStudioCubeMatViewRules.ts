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
  DataProductAccessPointSource,
  type QueryRule,
} from '@finos/legend-cube';
import {
  LakehouseAccessPoint,
  type IngestDefinition,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';

// Edit MatView's rule over the cube (PLAN §11.29, user, 2026-11-09): a view
// may read a data product built on its own definition, which the platform
// deploys data set by data set, but not an access point that reads the view
// itself, which would make the view read itself

export const LEGEND_STUDIO_CUBE_MATVIEW_MESSAGE = {
  READS_VIEW: (accessPoint: string, view: string): string =>
    `Access point ${accessPoint} reads ${view}, the materialized view being edited, so the view would read itself.`,
};

/** Whether protocol JSON reads a data set, `#I{definition.dataSet}#`, anywhere in it */
const readsDataSet = (
  json: unknown,
  definition: string,
  dataSet: string,
): boolean => {
  if (Array.isArray(json)) {
    return json.some((each) => readsDataSet(each, definition, dataSet));
  }
  if (!json || typeof json !== 'object') {
    return false;
  }
  const node = json as Record<string, unknown>;
  if (node._type === 'classInstance' && node.type === 'I') {
    const path = (node.value as { path?: unknown } | undefined)?.path;
    return Array.isArray(path) && path[0] === definition && path[1] === dataSet;
  }
  return Object.values(node).some((each) =>
    readsDataSet(each, definition, dataSet),
  );
};

/**
 * Edit MatView's refusal of a loop: an access point of the project's that
 * the cube reads, and that itself reads the view being edited, is invalid,
 * saying why, so Save MatView stays disabled until it is removed. Create
 * MatView needs none: no access point can read a view that doesn't exist yet
 */
export const buildLegendStudioCubeMatViewRule =
  (
    editorStore: EditorStore,
    ingest: IngestDefinition,
    matView: string,
  ): QueryRule =>
  (query) => {
    const errors = new Map<string, string[]>();
    query.nodes.forEach((node) => {
      if (!(node instanceof DataProductAccessPointSource)) {
        return;
      }
      const point = editorStore.graphManagerState.graph.ownDataProducts
        .find((each) => each.path === node.dataProduct)
        ?.accessPointGroups.find((group) => group.id === node.accessPointGroup)
        ?.accessPoints.find((each) => each.id === node.accessPoint);
      if (
        point instanceof LakehouseAccessPoint &&
        readsDataSet(point.func.body, ingest.path, matView)
      ) {
        errors.set(node.id, [
          LEGEND_STUDIO_CUBE_MATVIEW_MESSAGE.READS_VIEW(
            node.accessPoint,
            matView,
          ),
        ]);
      }
    });
    return errors;
  };
