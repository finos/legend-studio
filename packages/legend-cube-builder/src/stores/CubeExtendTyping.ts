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
  colSpec,
  colSpecArray,
  EmitRole,
  type Extend,
  type ExtendTyping,
  func,
  getExtendSignature,
  type IR,
  type JsonObject,
  lambda,
  lambdaJson,
  type NodeRegistry,
  originOf,
  type Query,
  QueryEmitter,
  type Schema,
} from '@finos/legend-cube';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';

// Typing an Extend's columns with the engine (PLAN §11.7): its input's
// relation, as Cube types any node, then one extend per column. The whole
// chain gives every type; each shorter chain, typed with it, tells which
// column the engine fails on, since a stored lambda has no locations.

/** A column to type: its name, and its lambda, located in its text or not */
export interface CubeExtendTypingColumn {
  readonly name: string;
  readonly lambda: JsonObject;
}

/** The key of the lambda that types the first `count` columns */
const keyOf = (extendId: string, count: number): NodeId =>
  `${extendId}#${count}`;

/**
 * The lambdas that type an Extend's columns, by key: the input's relation
 * then the first k columns, for every k. A located lambda keeps its
 * locations, so an error points into its text; a stored one is marked with
 * the Extend, so an error lands on it. The input must be valid.
 */
export const buildCubeExtendTypingLambdas = (
  query: Query,
  extend: Extend,
  columns: readonly CubeExtendTypingColumn[],
  registry: NodeRegistry,
  located: boolean,
): Map<NodeId, IR> => {
  const [inputId] = query.getInputIds(extend.id);
  if (inputId === undefined) {
    throw new Error(`Extend "${extend.id}" has no input to type it on`);
  }
  const input = new QueryEmitter(query, registry).emitRelation(inputId);
  const lambdas = new Map<NodeId, IR>();
  columns.reduce<IR>((relation, column, index) => {
    const extended = func('extend', [
      relation,
      colSpecArray([
        colSpec(
          column.name,
          lambdaJson(
            column.lambda,
            located ? undefined : originOf(extend.id, EmitRole.EXPRESSION),
          ),
        ),
      ]),
    ]);
    lambdas.set(keyOf(extend.id, index + 1), lambda([], [extended]));
    return extended;
  }, input);
  return lambdas;
};

/** What typing an Extend gave: the typing to store, and the error the engine gave, if it failed */
export interface CubeExtendTypingResult {
  readonly typing: ExtendTyping;
  readonly error?: CubeEngineError | undefined;
}

/**
 * The typing the engine's answers give, for this input and these columns:
 * every column's type, from the whole chain, else the first column whose
 * chain fails, with the engine's error (a network failure on none)
 */
export const readCubeExtendTyping = (
  answers: ReadonlyMap<NodeId, Schema | CubeEngineError>,
  extend: Extend,
  input: Schema,
  columns: readonly CubeExtendTypingColumn[],
): CubeExtendTypingResult => {
  const signature = getExtendSignature(input, extend.columns);
  const whole = answers.get(keyOf(extend.id, columns.length));
  if (whole !== undefined && !(whole instanceof CubeEngineError)) {
    return {
      typing: {
        kind: 'typed',
        signature,
        types: whole.columns
          .slice(-columns.length)
          .map((column) => column.type),
      },
    };
  }
  const failing = columns.findIndex(
    (_, index) =>
      answers.get(keyOf(extend.id, index + 1)) instanceof CubeEngineError,
  );
  const error =
    (answers.get(keyOf(extend.id, failing + 1)) as
      | CubeEngineError
      | undefined) ??
    new CubeEngineError(
      CubeEngineErrorKind.NETWORK,
      'The engine gave no type for these columns',
      extend.id,
    );
  return {
    typing: {
      kind: 'failed',
      signature,
      message: error.detail,
      column:
        failing < 0 || error.kind === CubeEngineErrorKind.NETWORK
          ? undefined
          : failing,
    },
    error,
  };
};
