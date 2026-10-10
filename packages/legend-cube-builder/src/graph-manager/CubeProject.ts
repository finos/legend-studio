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

import type { ModelContext } from '@finos/legend-cube';

// A cube on a published project's Database (PLAN §6.2.2, §6.3) saves the
// project at one released version as its model: the engine's alloy pointer,
// sent to the engine as saved, which fetches the project from its depot. The
// saved runtime is one of the project's own.

/** The engine's model kind of a project pointer */
export const CUBE_PROJECT_MODEL_TYPE = 'pointer';
const ALLOY_SDLC_TYPE = 'alloy';

/** A published project at one version */
export interface CubeProjectCoordinates {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** Whether a version can move: a SNAPSHOT, or the depot's `latest` and `HEAD` aliases */
export const isCubeMovingProjectVersion = (versionId: string): boolean =>
  versionId.endsWith('SNAPSHOT') ||
  versionId === 'latest' ||
  versionId === 'HEAD';

/** The model of a cube on a project's Database */
export const createCubeProjectModel = (
  project: CubeProjectCoordinates,
): ModelContext =>
  ({
    _type: CUBE_PROJECT_MODEL_TYPE,
    sdlcInfo: {
      _type: ALLOY_SDLC_TYPE,
      groupId: project.groupId,
      artifactId: project.artifactId,
      version: project.versionId,
      packageableElementPointers: [],
    },
  }) as unknown as ModelContext;

const sdlcInfoOf = (
  model: ModelContext,
): Record<string, unknown> | undefined => {
  const sdlcInfo = model.sdlcInfo;
  return sdlcInfo && typeof sdlcInfo === 'object' && !Array.isArray(sdlcInfo)
    ? (sdlcInfo as Record<string, unknown>)
    : undefined;
};

/** Whether the model is a project pointer, whether or not Cube can run it */
export const isCubeProjectModel = (model: ModelContext): boolean =>
  model._type === CUBE_PROJECT_MODEL_TYPE &&
  sdlcInfoOf(model)?._type === ALLOY_SDLC_TYPE;

/**
 * Why Cube can't run a project model, in words a user can act on; none when
 * it can. Only released versions are read (user, 2026-10-09): a version that
 * moves would change a saved cube's tables under it
 */
export const checkCubeProjectModel = (
  model: ModelContext,
): readonly string[] => {
  const sdlcInfo = sdlcInfoOf(model);
  if (!sdlcInfo) {
    return [`The cube's project has no coordinates`];
  }
  const problems: string[] = [];
  (['groupId', 'artifactId', 'version'] as const).forEach((key) => {
    if (!isNonEmptyString(sdlcInfo[key])) {
      problems.push(`The cube's project has no ${key}`);
    }
  });
  const version = sdlcInfo.version;
  if (isNonEmptyString(version) && isCubeMovingProjectVersion(version)) {
    problems.push(
      `Cube reads released versions only, not ${version}: pick a released version`,
    );
  }
  return problems;
};

/** The project of a project model Cube can run; undefined for any other model */
export const getCubeProjectCoordinates = (
  model: ModelContext,
): CubeProjectCoordinates | undefined => {
  if (!isCubeProjectModel(model) || checkCubeProjectModel(model).length) {
    return undefined;
  }
  const sdlcInfo = sdlcInfoOf(model) as Record<string, string>;
  return {
    groupId: sdlcInfo.groupId as string,
    artifactId: sdlcInfo.artifactId as string,
    versionId: sdlcInfo.version as string,
  };
};

/** The project as people read it: `group:artifact` at its version */
export const formatCubeProject = (project: CubeProjectCoordinates): string =>
  `${project.groupId}:${project.artifactId} ${project.versionId}`;
