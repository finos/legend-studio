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
  CubeExpressionCodec,
  IR,
  JsonObject,
  Schema,
} from '@finos/legend-cube';
import {
  parseLosslessJSON,
  type PlainObject,
  stringifyLosslessJSON,
} from '@finos/legend-shared';
import type { CubeIngestDataSet } from '../../CubeIngestCatalog.js';
import type { CubeFunctionDefinition } from '../../CubeDefinitionFunctions.js';
import { V1_readCubeFunctionDefinition } from './v1/V1_CubeFunctionDefinition.js';
import {
  V1_getCubeIngestMetadataSchema,
  V1_readCubeIngestDataSets,
} from './v1/V1_CubeIngestDefinition.js';
import { V1_serializeCubeLambda } from './v1/V1_CubeLambdaSerializer.js';
import {
  V1_readCubeLambda,
  V1_readCubeLambdaParameters,
  V1_readCubeValueSpecification,
} from './v1/V1_CubeLambdaReader.js';
import { V1_readCubeExpression } from './v1/V1_CubeExpression.js';
import { V1_findCubeSqlSources } from './v1/V1_CubeSqlIsland.js';
import type { CubeSqlStep } from '../../CubeSqlStructure.js';
import {
  V1_CubeSqlTreeError,
  V1_readCubeSqlTree,
} from './v1/V1_CubeSqlTree.js';

// Cube's readers of protocol JSON a host already has, which need no engine:
// apart from the engine's clients (`CubeEngineBuilder`), so a page that only
// reads, e.g. a definition flow (`@finos/legend-cube-builder/definition-flow`),
// loads none of them

/**
 * The data sets of an ingest definition's content, its protocol JSON, in
 * order, typed from what it declares; for a host that lists definitions of
 * its own, e.g. Studio's workspace. Throws when the content can't be read.
 */
export const readCubeIngestDataSets = (
  content: PlainObject,
): CubeIngestDataSet[] => V1_readCubeIngestDataSets(content);

/**
 * The columns of a data set's batch metadata, `#I{definition.dataSet|metadata}#`:
 * the same for every data set, so known without the definition
 */
export const getCubeIngestMetadataSchema = (): Schema =>
  V1_getCubeIngestMetadataSchema();

/** What the SQL of an island, `#SQL{…}#`, names in its text */
export interface CubeSqlSources {
  /** Each ingest data set, `i('definition.dataSet')`: the definition's path, then the data set */
  readonly dataSets: readonly (readonly [string, string])[];
  /** Each access point, `p('dataProduct.accessPoint')`: the data product's path, then its id */
  readonly accessPoints: readonly (readonly [string, string])[];
}

/**
 * The ingest data sets and data product access points the SQL of an island
 * names, each once, as legend-graph finds them in its text: Cube doesn't
 * parse the SQL, so they are what it names, not all it reads
 */
export const findCubeSqlSources = (sql: string): CubeSqlSources =>
  V1_findCubeSqlSources(sql);

/** An island's SQL as steps; or what of it Cube has no step for, in words */
export type CubeSqlTreeReading =
  | {
      /** Its last step, which reads the steps before it */
      readonly last: CubeSqlStep;
    }
  | { readonly refused: string };

/**
 * The steps of the SQL of an island, read from the engine's tree of it, as
 * its SQL grammar gives it: its clauses in the order they run, each
 * saying what it says as SQL. Cube checks none of it. Never throws for a
 * tree it can't read: it says what it has no step for.
 */
export const readCubeSqlTree = (tree: unknown): CubeSqlTreeReading => {
  try {
    return { last: V1_readCubeSqlTree(tree) };
  } catch (error) {
    if (error instanceof V1_CubeSqlTreeError) {
      return { refused: error.message };
    }
    throw error;
  }
};

/**
 * A user-defined function's element, its content (protocol JSON) as Depot or
 * a graph gives it, read for a definition's flow to open its calls;
 * `undefined` for content that isn't a function's (PLAN §11.33)
 */
export const readCubeFunctionDefinition = (
  path: string,
  content: PlainObject,
  origin?: string,
): CubeFunctionDefinition | undefined =>
  V1_readCubeFunctionDefinition(path, content, origin);

/**
 * The IR of a lambda's protocol JSON, Cube's or the engine's grammar's, for
 * Import Pure (PLAN §11.18): a host's matview, or a pasted lambda. Throws a
 * `CubeLambdaReadError` naming what Cube can't read.
 */
export const readCubeLambdaJson = (json: unknown): IR =>
  V1_readCubeLambda(json);

/** A lambda's parameter, as its protocol JSON declares it */
export interface CubeLambdaParameterDeclaration {
  readonly name: string;
  /** Its type, `undefined` when the JSON declares none Cube can read */
  readonly type: Extract<IR, { readonly k: 'genericType' }> | undefined;
  /** How many values it takes, its upper bound `undefined` for any number; `undefined` when the JSON doesn't say */
  readonly multiplicity:
    | { readonly lowerBound: number; readonly upperBound: number | undefined }
    | undefined;
}

/**
 * The parameters a lambda's protocol JSON declares, in order, with the types
 * and multiplicities its IR doesn't keep (`readCubeLambdaJson`); never throws
 */
export const readCubeLambdaParameters = (
  json: unknown,
): CubeLambdaParameterDeclaration[] => V1_readCubeLambdaParameters(json);

/**
 * How Import Pure stores an expression it reads into a step, and reads one a
 * step stores (PLAN §11.18): as the Extend and Filter by Expression editors
 * store the engine's JSON, with no source information and number literals as
 * their digit strings
 */
export const CUBE_EXPRESSION_CODEC: CubeExpressionCodec = {
  write: (lambda: IR): JsonObject =>
    V1_readCubeExpression(
      parseLosslessJSON(stringifyLosslessJSON(V1_serializeCubeLambda(lambda))),
    ).lambda,
  read: (json: JsonObject): IR => V1_readCubeValueSpecification(json),
};
