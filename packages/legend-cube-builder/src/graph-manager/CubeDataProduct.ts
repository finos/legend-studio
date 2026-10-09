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

// A data product cube (PLAN §6.8, DP-1) saves its project once, as its
// model: the project and the version its data products were deployed from,
// the environment type and, once picked, the warehouse. The engine's
// implementation builds, for each run, the project at that version and a
// lakehouse runtime at a fixed path, which the saved runtime names

/** The kind of a data product cube's model: Cube's own, never an engine model kind */
export const CUBE_DATA_PRODUCT_MODEL_TYPE = 'cubeDataProduct';

/** The runtime a data product cube runs with, in a package of Cube's own */
export const CUBE_DATA_PRODUCT_RUNTIME_PATH = 'cube::dataProduct::Runtime';

/** The warehouse a run uses when neither the cube nor the viewer has one (PLAN §6.8) */
export const CUBE_DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';

/**
 * The deployment classes Cube reads data products from: production and
 * production-parallel, as Data Cube's selection offers. Development
 * deployments are not supported in this phase (user, 2026-10-09)
 */
export enum CubeDataProductEnvironmentType {
  PRODUCTION = 'PRODUCTION',
  PRODUCTION_PARALLEL = 'PRODUCTION_PARALLEL',
}

/** The wire name of the development class, which Cube refuses by name */
const DEVELOPMENT_ENVIRONMENT_TYPE = 'DEVELOPMENT';

/** What a data product cube's model holds */
export interface CubeDataProductProject {
  readonly groupId: string;
  readonly artifactId: string;
  /** The version the data products were deployed from, as the catalog gave it */
  readonly versionId: string;
  readonly environmentType: CubeDataProductEnvironmentType;
  /** The warehouse the cube runs on; none until one is picked */
  readonly warehouse?: string | undefined;
}

const ENVIRONMENT_TYPES = Object.values(
  CubeDataProductEnvironmentType,
) as string[];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/** The model of a data product cube */
export const createCubeDataProductModel = (
  project: CubeDataProductProject,
): ModelContext =>
  ({
    _type: CUBE_DATA_PRODUCT_MODEL_TYPE,
    groupId: project.groupId,
    artifactId: project.artifactId,
    versionId: project.versionId,
    environmentType: project.environmentType,
    ...(project.warehouse !== undefined
      ? { warehouse: project.warehouse }
      : {}),
  }) as ModelContext;

export const isCubeDataProductModel = (model: ModelContext): boolean =>
  model._type === CUBE_DATA_PRODUCT_MODEL_TYPE;

/** Whether a version moves: a SNAPSHOT's data and columns may change under a cube */
export const isCubeSnapshotVersion = (versionId: string): boolean =>
  versionId.endsWith('-SNAPSHOT');

/**
 * The model with another warehouse; every other key is kept, including ones
 * a later version saved, which a cube keeps as they are
 */
export const withCubeDataProductWarehouse = (
  model: ModelContext,
  warehouse: string,
): ModelContext => ({ ...model, warehouse });

/**
 * Why Cube can't run a data product model, in words a user can act on; none
 * when it can. A saved model is checked before every use: it may have been
 * written by hand or by a later version
 */
export const checkCubeDataProductModel = (
  model: ModelContext,
): readonly string[] => {
  const problems: string[] = [];
  (['groupId', 'artifactId', 'versionId'] as const).forEach((key) => {
    if (!isNonEmptyString(model[key])) {
      problems.push(`The data product's project has no ${key}`);
    }
  });
  if (model.environmentType === DEVELOPMENT_ENVIRONMENT_TYPE) {
    problems.push(`Cube doesn't read development data products yet`);
  } else if (!ENVIRONMENT_TYPES.includes(model.environmentType as string)) {
    problems.push(
      `Cube doesn't know the environment type "${String(model.environmentType)}"`,
    );
  }
  if (model.warehouse !== undefined && !isNonEmptyString(model.warehouse)) {
    problems.push(`The cube's warehouse must be a name`);
  }
  return problems;
};

/** The project of a data product model Cube can run; undefined for any other model */
export const getCubeDataProductProject = (
  model: ModelContext,
): CubeDataProductProject | undefined =>
  isCubeDataProductModel(model) && !checkCubeDataProductModel(model).length
    ? {
        groupId: model.groupId as string,
        artifactId: model.artifactId as string,
        versionId: model.versionId as string,
        environmentType:
          model.environmentType as CubeDataProductEnvironmentType,
        warehouse: model.warehouse as string | undefined,
      }
    : undefined;

/**
 * The warehouse a run uses (PLAN §6.8, DP-2): the cube's own, else the one
 * the viewer last picked, else the default consumer warehouse. Shown and sent
 * alike, so the page shows what runs
 */
export const getEffectiveCubeWarehouse = (
  project: Pick<CubeDataProductProject, 'warehouse'>,
  rememberedWarehouse: string | undefined,
): string =>
  project.warehouse ??
  (isNonEmptyString(rememberedWarehouse)
    ? rememberedWarehouse
    : CUBE_DEFAULT_CONSUMER_WAREHOUSE);
