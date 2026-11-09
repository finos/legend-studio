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

import type { CubeExpressionCodec, IR, JsonObject } from '@finos/legend-cube';
import {
  parseLosslessJSON,
  type PlainObject,
  stringifyLosslessJSON,
} from '@finos/legend-shared';
import type { CubeIngestDataSet } from '../../CubeIngestCatalog.js';
import { V1_readCubeIngestDataSets } from './v1/V1_CubeIngestDefinition.js';
import { V1_serializeCubeLambda } from './v1/V1_CubeLambdaSerializer.js';
import {
  V1_readCubeLambda,
  V1_readCubeValueSpecification,
} from './v1/V1_CubeLambdaReader.js';
import { V1_readCubeExpression } from './v1/V1_CubeExpression.js';

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
 * The IR of a lambda's protocol JSON, Cube's or the engine's grammar's, for
 * Import Pure (PLAN §11.18): a host's matview, or a pasted lambda. Throws a
 * `CubeLambdaReadError` naming what Cube can't read.
 */
export const readCubeLambdaJson = (json: unknown): IR =>
  V1_readCubeLambda(json);

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
