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
import { CubeDataProductEnvironmentType } from './CubeDataProduct.js';

// An ingest cube (PLAN §6.7) saves, as its model, what Data Cube's producer
// source picks before a definition: the class (production or production
// parallel), the producer deployment and, once picked, the warehouse. Its
// sources save each definition's URN, path and data set. The engine's
// implementation builds, for each call, a model of the definitions the call
// reads, as the ingest server serves them, and for a run a lakehouse runtime
// at a fixed path, which the saved runtime names

export const CUBE_INGEST_MODEL_TYPE = 'cubeIngest';

export const CUBE_INGEST_RUNTIME_PATH = 'cube::ingest::Runtime';

/** What an ingest cube runs on, as its model saves it */
export interface CubeIngestSettings {
  readonly environmentType: CubeDataProductEnvironmentType;
  /** The producer deployment whose definitions the cube reads, as text */
  readonly producerDeploymentId: string;
  /** The warehouse the cube runs on; none until one is picked */
  readonly warehouse?: string | undefined;
}

const ENVIRONMENT_TYPES = Object.values(
  CubeDataProductEnvironmentType,
) as string[];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export const createCubeIngestModel = (
  settings: CubeIngestSettings,
): ModelContext =>
  ({
    _type: CUBE_INGEST_MODEL_TYPE,
    environmentType: settings.environmentType,
    producerDeploymentId: settings.producerDeploymentId,
    ...(settings.warehouse !== undefined
      ? { warehouse: settings.warehouse }
      : {}),
  }) as ModelContext;

export const isCubeIngestModel = (model: ModelContext): boolean =>
  model._type === CUBE_INGEST_MODEL_TYPE;

/** The same model, running on another warehouse */
export const withCubeIngestWarehouse = (
  model: ModelContext,
  warehouse: string,
): ModelContext => ({ ...model, warehouse });

/** What's wrong with an ingest model, e.g. one saved by a later Cube: nothing for one Cube can use */
export const checkCubeIngestModel = (
  model: ModelContext,
): readonly string[] => {
  const problems: string[] = [];
  if (!ENVIRONMENT_TYPES.includes(model.environmentType as string)) {
    problems.push(
      `Cube doesn't know the environment type "${String(model.environmentType)}"`,
    );
  }
  if (
    typeof model.producerDeploymentId !== 'string' ||
    !/^\d+$/u.test(model.producerDeploymentId)
  ) {
    problems.push(`The cube's producer deployment must be a deployment id`);
  }
  if (model.warehouse !== undefined && !isNonEmptyString(model.warehouse)) {
    problems.push(`The cube's warehouse must be a name`);
  }
  return problems;
};

/** An ingest model's settings, when Cube can use it */
export const getCubeIngestSettings = (
  model: ModelContext,
): CubeIngestSettings | undefined =>
  isCubeIngestModel(model) && !checkCubeIngestModel(model).length
    ? {
        environmentType:
          model.environmentType as CubeDataProductEnvironmentType,
        producerDeploymentId: model.producerDeploymentId as string,
        warehouse: model.warehouse as string | undefined,
      }
    : undefined;

/** The class a URN's environment segment names */
const URN_ENVIRONMENT_TYPES: Readonly<
  Record<string, CubeDataProductEnvironmentType>
> = {
  prod: CubeDataProductEnvironmentType.PRODUCTION,
  'prod-parallel': CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
};

/** What an SDLC-deployed definition's URN names: its class, its project and its path */
export interface CubeIngestUrn {
  readonly environmentType: CubeDataProductEnvironmentType;
  readonly groupId: string;
  readonly artifactId: string;
  /** The IngestDefinition element's path */
  readonly definition: string;
}

const SDLC_DEPLOYED_URN =
  /^urn:lakehouse:(?<environment>[^:]+):ingest:definition:alloy-git:(?<groupId>[^~]+)~(?<artifactId>[^~]+)~(?<definition>.+)$/u;

/**
 * A deployed definition's URN, when it was deployed from SDLC
 * (`urn:lakehouse:<prod|prod-parallel>:ingest:definition:alloy-git:<group>~<artifact>~<path>`);
 * nothing for an ad hoc one (`rest-api:`), another class, or text that isn't one
 */
export const parseCubeIngestUrn = (urn: string): CubeIngestUrn | undefined => {
  const parts = SDLC_DEPLOYED_URN.exec(urn)?.groups;
  const environment = parts?.environment;
  const environmentType =
    environment && Object.hasOwn(URN_ENVIRONMENT_TYPES, environment)
      ? URN_ENVIRONMENT_TYPES[environment]
      : undefined;
  return parts && environmentType
    ? {
        environmentType,
        groupId: parts.groupId ?? '',
        artifactId: parts.artifactId ?? '',
        definition: parts.definition ?? '',
      }
    : undefined;
};
