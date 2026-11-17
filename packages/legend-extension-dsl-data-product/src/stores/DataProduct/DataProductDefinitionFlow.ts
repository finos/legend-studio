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
  CubeDefinitionFunctionElement,
  CubeDefinitionFunctionLoader,
  CubeDefinitionRefusal,
} from '@finos/legend-cube-builder/definition-flow';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import {
  type DepotServerClient,
  ProjectVersionEntities,
  resolveVersion,
  StoredEntity,
} from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import {
  type ProjectGAVCoordinates,
  generateGAVCoordinates,
} from '@finos/legend-storage';

// An access point's definition as Legend Cube draws it, read-only: its
// function, read into steps in the browser with no engine call. Cube's code
// loads the first time someone opens a definition, so the viewer's own load
// doesn't pay for it.

/** Legend Cube's definition flow: `@finos/legend-cube-builder/definition-flow` */
export type DataProductDefinitionFlowEntry = typeof CubeDefinitionFlowEntry;

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

/**
 * Functions from Depot, at the data product's version: its project's and its
 * dependencies', in one request (`…/classifiers/<function>/dependencies`,
 * transitive, the project itself included), made the first time a definition
 * calls a function and kept for the page: a released version doesn't change
 */
export const createDepotFunctionLoader = (
  depotServerClient: DepotServerClient,
  projectGAV: ProjectGAVCoordinates,
): CubeDefinitionFunctionLoader => {
  let all: Promise<CubeDefinitionFunctionElement[]> | undefined;
  const loadAll = async (): Promise<CubeDefinitionFunctionElement[]> =>
    (
      await depotServerClient.getDependencyEntities(
        projectGAV.groupId,
        projectGAV.artifactId,
        resolveVersion(projectGAV.versionId),
        true,
        true,
        CORE_PURE_PATH.FUNCTION,
      )
    )
      .map((json) => ProjectVersionEntities.serialization.fromJson(json))
      .flatMap((project) => {
        // the data product's own project goes without saying
        const origin =
          project.groupId === projectGAV.groupId &&
          project.artifactId === projectGAV.artifactId
            ? undefined
            : generateGAVCoordinates(
                project.groupId,
                project.artifactId,
                project.versionId,
              );
        // asked for by classifier, Depot lists each entity as a stored entity
        return project.entities.map((each) => {
          const { entity } = StoredEntity.serialization.fromJson(
            each as unknown as PlainObject<StoredEntity>,
          );
          return { path: entity.path, content: entity.content, origin };
        });
      });
  return async (names) => {
    all ??= loadAll().catch((error: unknown) => {
      // a failure isn't kept: the next definition asks again
      all = undefined;
      throw error;
    });
    // every overload of each name, and maybe a few more (`pkg::name_other`):
    // Cube keeps only the functions of exactly these names
    return (await all).filter((element) =>
      names.some((name) => element.path.startsWith(`${name}_`)),
    );
  };
};

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

/** What an access point's definition is, as its flow shows it, once read */
export enum DataProductDefinitionFlowKind {
  /** Cube reads it: the entry draws it */
  FLOW = 'flow',
  /** Cube can't read it yet: the viewer shows its Pure, and says why */
  REFUSED = 'refused',
  /** The flow can't be shown, though Cube didn't refuse the definition */
  FAILED = 'failed',
}

/** An access point's definition, as its flow shows it, once read */
export type DataProductDefinitionFlow =
  | {
      readonly kind: DataProductDefinitionFlowKind.FLOW;
      readonly reading: CubeDefinitionFlowReading;
      readonly entry: DataProductDefinitionFlowEntry;
    }
  | {
      readonly kind: DataProductDefinitionFlowKind.REFUSED;
      readonly refusal: CubeDefinitionRefusal;
    }
  | {
      readonly kind: DataProductDefinitionFlowKind.FAILED;
      readonly failure: DataProductDefinitionFlowFailureKind;
      readonly error: Error;
    };
