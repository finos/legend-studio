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
  type ExpressionCheck,
  type ExpressionFilter,
  foldColumnName,
  func,
  getExpressionFilterSignature,
  type IR,
  type JsonObject,
  lambda,
  lambdaJson,
  type NodeRegistry,
  originOf,
  type Query,
  QueryEmitter,
  Schema,
  type SchemaColumn,
  TypeFamily,
} from '@finos/legend-cube';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';
import { withoutEngineContext } from './CubeExtendTyping.js';

// Checking a Filter by Expression's condition with the engine (PLAN §11.11):
// its input's relation, as Cube types any node, then `filter` with the
// condition. A condition that isn't one Boolean fails there with no location
// and the whole relation type, so the same call types the condition alone,
// as an extend column, which gives its type for Cube's own message.

/** The key of the lambda that filters the input with the condition */
const filterKeyOf = (filterId: string): NodeId => `${filterId}#filter`;

/** The key of the lambda that types the condition alone, as an extend column */
const conditionKeyOf = (filterId: string): NodeId => `${filterId}#condition`;

/** A name for the condition typed alone that no input column has, as databases that ignore case compare names */
export const getConditionColumnName = (input: Schema): string => {
  const taken = new Set(input.names().map(foldColumnName));
  let name = 'cube_condition';
  for (let suffix = 2; taken.has(foldColumnName(name)); suffix += 1) {
    name = `cube_condition_${suffix}`;
  }
  return name;
};

/**
 * The lambdas that check a condition, by key: the input's relation filtered
 * with it, and the input's relation extended with it under a name no input
 * column has. A located lambda keeps its locations, so an error points into
 * its text; a stored one is marked with the filter, so an error lands on it.
 * The input must be valid.
 */
export const buildCubeConditionCheckLambdas = (
  query: Query,
  filter: ExpressionFilter,
  condition: JsonObject,
  input: Schema,
  registry: NodeRegistry,
  located: boolean,
): Map<NodeId, IR> => {
  const [inputId] = query.getInputIds(filter.id);
  if (inputId === undefined) {
    throw new Error(
      `Filter by expression "${filter.id}" has no input to check it on`,
    );
  }
  const relation = new QueryEmitter(query, registry).emitRelation(inputId);
  const origin = located ? undefined : originOf(filter.id, EmitRole.EXPRESSION);
  return new Map<NodeId, IR>([
    [
      filterKeyOf(filter.id),
      lambda([], [func('filter', [relation, lambdaJson(condition, origin)])]),
    ],
    [
      conditionKeyOf(filter.id),
      lambda(
        [],
        [
          func('extend', [
            relation,
            colSpecArray([
              colSpec(
                getConditionColumnName(input),
                lambdaJson(condition, origin),
              ),
            ]),
          ]),
        ],
      ),
    ],
  ]);
};

/** A condition's type as the message names it: `Integer`, `Boolean[0..1]` */
const describeConditionType = (column: SchemaColumn): string =>
  `${column.type.displayName}${column.nullable ? '[0..1]' : ''}`;

/** What checking a condition gave: the check to store, and the error the engine gave, if it failed */
export interface CubeConditionCheckResult {
  readonly check: ExpressionCheck;
  readonly error?: CubeEngineError | undefined;
}

/**
 * The check the engine's answers give, for this input and this condition:
 * checked when the filter types; else failed, with the condition's type when
 * it types alone but isn't one Boolean, and the engine's error: the
 * condition's own when it fails alone, as it names no `filter`, else the
 * filter's (a network failure when there is neither)
 */
export const readCubeConditionCheck = (
  answers: ReadonlyMap<NodeId, Schema | CubeEngineError>,
  filter: ExpressionFilter,
  input: Schema,
  upstream: string | undefined,
): CubeConditionCheckResult => {
  const signature = getExpressionFilterSignature(input, filter.lambda);
  const filtered = answers.get(filterKeyOf(filter.id));
  if (filtered instanceof Schema) {
    return { check: { kind: 'checked', signature, upstream } };
  }
  const alone = answers.get(conditionKeyOf(filter.id));
  const conditionColumn =
    alone instanceof Schema ? alone.columns.at(-1) : undefined;
  const resultType =
    conditionColumn &&
    !(
      conditionColumn.type.family === TypeFamily.BOOLEAN &&
      !conditionColumn.nullable
    )
      ? describeConditionType(conditionColumn)
      : undefined;
  const error =
    (alone instanceof CubeEngineError ? alone : undefined) ??
    filtered ??
    new CubeEngineError(
      CubeEngineErrorKind.NETWORK,
      'The engine gave no answer for this condition',
      filter.id,
    );
  return {
    check: {
      kind: 'failed',
      signature,
      message: withoutEngineContext(error.detail),
      resultType,
      upstream,
    },
    error,
  };
};

/** The digest of what the engine was given for the input, which the check recorded */
export const getCubeConditionCheckUpstream = (
  check: ExpressionCheck,
): string | undefined =>
  check.kind === 'unresolved' ? undefined : check.upstream;

/**
 * Whether the filter's check says its condition is one Boolean for this
 * input: checked, for this schema and this condition, and for this input as
 * the engine is given it, or recorded without it, as when loaded
 */
export const isCubeConditionCheckCurrent = (
  filter: ExpressionFilter,
  input: Schema,
  upstream: string | undefined,
): boolean => {
  const { check } = filter;
  const recorded = getCubeConditionCheckUpstream(check);
  return (
    check.kind === 'checked' &&
    filter.currentCheck(input) === check &&
    (recorded === undefined || recorded === upstream)
  );
};

/** Whether two checks say the same: the same kind, signature and input as the engine was given it, and the same failure */
export const isSameCubeConditionCheck = (
  a: ExpressionCheck,
  b: ExpressionCheck,
): boolean => {
  if (getCubeConditionCheckUpstream(a) !== getCubeConditionCheckUpstream(b)) {
    return false;
  }
  if (a.kind === 'checked' && b.kind === 'checked') {
    return a.signature === b.signature;
  }
  if (a.kind === 'failed' && b.kind === 'failed') {
    return (
      a.signature === b.signature &&
      a.message === b.message &&
      a.resultType === b.resultType
    );
  }
  return a.kind === 'unresolved' && b.kind === 'unresolved';
};
