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

import type { IR } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import type { CubeDataProductEnvironmentType } from '../../../CubeDataProduct.js';
import {
  CUBE_INGEST_RUNTIME_PATH,
  type CubeIngestSettings,
  parseCubeIngestUrn,
} from '../../../CubeIngest.js';

// The models an ingest cube's engine calls run on (PLAN §6.7), built for
// each call and never saved, as Data Cube builds its producer source's: the
// definitions the call reads, as the ingest server serves them, and for a
// run a lakehouse runtime at Cube's fixed path

/**
 * The deployed definitions an ingest cube reads, from the host's ingest
 * servers: what the engine needs to type and run them
 */
export interface V1_CubeIngestDefinitionSource {
  /** A definition's element, as protocol JSON, by its URN, for the cube's class */
  getDefinitionElement(
    urn: string,
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<PlainObject>;
  /** The environment a run's lakehouse runtime names, for the cube's class */
  getRuntimeEnvironment(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<string>;
}

/** An ingest data set a lambda reads */
export interface V1_CubeIngestAccessor {
  readonly definition: string;
  readonly dataSet: string;
  readonly urn: string | undefined;
}

/** Why a lambda's ingest data sets can't be read on the cube */
export const V1_CUBE_INGEST_MESSAGE = {
  NO_URN: (definition: string): string =>
    `The ingest data set of ${definition} doesn't say which deployed definition it reads`,
  NOT_SDLC: (definition: string): string =>
    `Ingest definition ${definition} wasn't deployed from a project, which Cube doesn't read`,
  OTHER_CLASS: (definition: string): string =>
    `Ingest definition ${definition} is deployed to another environment than the cube's`,
  OTHER_PATH: (definition: string): string =>
    `The URN of ingest definition ${definition} names another definition`,
} as const;

/** The ingest data sets a lambda reads, in tree order */
export const V1_collectCubeIngestAccessors = (
  ir: IR,
): V1_CubeIngestAccessor[] => {
  const found: V1_CubeIngestAccessor[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const node = value as PlainObject;
    if (node.k === 'ingestAccessor') {
      const [definition, dataSet] = node.path as [string, string];
      found.push({
        definition,
        dataSet,
        urn: typeof node.urn === 'string' ? node.urn : undefined,
      });
      return;
    }
    if (node.k !== 'raw') {
      Object.values(node).forEach(visit);
    }
  };
  visit(ir);
  return found;
};

/** Whether a lambda reads an ingest data set, anywhere in it */
export const V1_hasCubeIngestAccessor = (ir: IR): boolean =>
  V1_collectCubeIngestAccessors(ir).length > 0;

/**
 * Why a lambda's ingest data sets can't be read on the cube, if they can't:
 * each must say which SDLC-deployed definition it reads, deployed to the
 * cube's class, under the path the query reads
 */
export const V1_checkCubeIngestAccessors = (
  accessors: readonly V1_CubeIngestAccessor[],
  settings: CubeIngestSettings,
): string | undefined => {
  for (const accessor of accessors) {
    if (accessor.urn === undefined) {
      return V1_CUBE_INGEST_MESSAGE.NO_URN(accessor.definition);
    }
    const urn = parseCubeIngestUrn(accessor.urn);
    if (!urn) {
      return V1_CUBE_INGEST_MESSAGE.NOT_SDLC(accessor.definition);
    }
    if (urn.environmentType !== settings.environmentType) {
      return V1_CUBE_INGEST_MESSAGE.OTHER_CLASS(accessor.definition);
    }
    if (urn.definition !== accessor.definition) {
      return V1_CUBE_INGEST_MESSAGE.OTHER_PATH(accessor.definition);
    }
  }
  return undefined;
};

/** The URNs of the definitions lambdas read, each once */
export const V1_getCubeIngestUrns = (
  accessors: readonly V1_CubeIngestAccessor[],
): string[] => [
  ...new Set(
    accessors
      .map((accessor) => accessor.urn)
      .filter((urn): urn is string => urn !== undefined),
  ),
];

/** A definition as the model holds it: its test suites, which reference test data the model lacks, left out */
const toModelElement = (element: PlainObject): PlainObject => {
  const { testSuites, ...rest } = element;
  return rest;
};

const splitPath = (path: string): { package: string; name: string } => {
  const index = path.lastIndexOf('::');
  return { package: path.slice(0, index), name: path.slice(index + 2) };
};

/** The model typing runs on: the definitions alone, with no runtime */
export const V1_buildCubeIngestTypingContext = (
  definitions: readonly PlainObject[],
): PlainObject => ({
  _type: 'data',
  elements: definitions.map(toModelElement),
});

/**
 * The model a run runs on: the definitions, then the lakehouse runtime at
 * Cube's fixed path, with the environment and the warehouse, always given
 */
export const V1_buildCubeIngestExecutionContext = (
  definitions: readonly PlainObject[],
  environment: string,
  warehouse: string,
): PlainObject => ({
  _type: 'data',
  elements: [
    ...definitions.map(toModelElement),
    {
      _type: 'runtime',
      ...splitPath(CUBE_INGEST_RUNTIME_PATH),
      runtimeValue: {
        _type: 'LakehouseRuntime',
        connectionStores: [],
        connections: [],
        mappings: [],
        environment,
        warehouse,
      },
    },
  ],
});
