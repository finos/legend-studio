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

import type * as CubeDefinitionFlowEntry from '@finos/legend-cube-builder/definition-flow';
import type {
  CubeDefinitionFlowReading,
  CubeDefinitionRefusal,
} from '@finos/legend-cube-builder/definition-flow';
import {
  type DepotServerClient,
  resolveVersion,
} from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';

// An access point's definition as Legend Cube draws it, read-only: its
// function, read into steps in the browser with no engine call. Cube's code
// loads the first time someone opens a definition, so the viewer's own load
// doesn't pay for it.

/** Legend Cube's definition flow: `@finos/legend-cube-builder/definition-flow` */
export type DataProductDefinitionFlowEntry = typeof CubeDefinitionFlowEntry;

export const DATA_PRODUCT_DEFINITION_FLOW_LOADER = {
  /**
   * Loads Cube's definition flow, in a chunk of its own: a host's bundler
   * can keep the chunk's libraries out of its other chunks by its name
   */
  load: (): Promise<DataProductDefinitionFlowEntry> =>
    import(
      /* webpackChunkName: "cube-flow" */ '@finos/legend-cube-builder/definition-flow'
    ),
};

/**
 * The content (protocol JSON) of an ingest definition an access point reads,
 * by its path, which types the columns of its data sets in the flow;
 * `undefined` when the host doesn't have it. Marketplace reads it from Depot,
 * Studio from its graph.
 */
export type DataProductIngestDefinitionLoader = (
  path: string,
) => Promise<PlainObject | undefined>;

/**
 * Ingest definitions from Depot, at the data product's version: they are
 * deployed from the data product's own project
 */
export const createDepotIngestDefinitionLoader =
  (
    depotServerClient: DepotServerClient,
    projectGAV: ProjectGAVCoordinates,
  ): DataProductIngestDefinitionLoader =>
  async (path) =>
    (
      await depotServerClient.getVersionEntity(
        projectGAV.groupId,
        projectGAV.artifactId,
        resolveVersion(projectGAV.versionId),
        path,
      )
    ).content as PlainObject | undefined;

/** Why the flow can't be shown, when Cube didn't refuse the definition */
export enum DataProductDefinitionFlowFailureKind {
  /** Cube's code didn't load: a network error, or a deploy replaced its chunk */
  LOAD = 'load',
  /** Cube failed to read the definition, unexpectedly */
  READ = 'read',
  /** The canvas failed while drawing the flow */
  DRAW = 'draw',
  /** The access point has no function to read */
  MISSING = 'missing',
}

/** An access point's definition, as its flow shows it, once read */
export type DataProductDefinitionFlow =
  /** Cube reads it: the entry draws it */
  | {
      readonly kind: 'flow';
      readonly reading: CubeDefinitionFlowReading;
      readonly entry: DataProductDefinitionFlowEntry;
    }
  /** Cube can't read it yet: the viewer shows its Pure, and says why */
  | { readonly kind: 'refused'; readonly refusal: CubeDefinitionRefusal }
  | {
      readonly kind: 'failed';
      readonly failure: DataProductDefinitionFlowFailureKind;
      readonly error: Error;
    };
