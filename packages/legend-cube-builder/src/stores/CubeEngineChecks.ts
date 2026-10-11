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
  buildSchemasAndValidity,
  ERR_CHECKING,
  ERR_TYPING,
  ExpressionFilter,
  Extend,
  type IR,
  isTypingError,
  type JsonObject,
  type ModelContext,
  type NodeRegistry,
  type Query,
  QueryEmitter,
  type QueryNode,
  type QueryRule,
  type Schema,
} from '@finos/legend-cube';
import {
  getConditionRecheckWarning,
  getExtendRetypeWarning,
} from '../__lib__/LegendCubeLabels.js';
import {
  type CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../graph-manager/CubeEngine.js';
import {
  buildCubeConditionCheckLambdas,
  getCubeConditionCheckUpstream,
  isCubeConditionCheckCurrent,
  isSameCubeConditionCheck,
  readCubeConditionCheck,
} from './CubeExpressionFilterCheck.js';
import {
  buildCubeExtendTypingLambdas,
  getCubeExtendTypingUpstream,
  getCubeExtendUpstream,
  isCubeExtendTypingCurrent,
  isSameCubeExtendTyping,
  readCubeExtendTyping,
} from './CubeExtendTyping.js';

// The nodes the engine checks in the background, outside the undo history:
// an Extend, whose columns it types (PLAN §11.7), and a Filter by Expression,
// whose condition it checks (PLAN §11.11). One path serves both, so what
// M6.11's review fixed for Extends holds for filters too.

/** A node the engine checks: an Extend or a Filter by Expression */
export type CubeEngineCheckedNode = Extend | ExpressionFilter;

export const isCubeEngineCheckedNode = (
  node: QueryNode,
): node is CubeEngineCheckedNode =>
  node instanceof Extend || node instanceof ExpressionFilter;

/** The digest of what the engine was given for the node's input, which its last check recorded */
export const getCubeEngineCheckUpstream = (
  node: CubeEngineCheckedNode,
): string | undefined =>
  node instanceof Extend
    ? getCubeExtendTypingUpstream(node.typing)
    : getCubeConditionCheckUpstream(node.check);

/** What the engine's answers make of a node: the node to store, when they say anything new */
export interface CubeEngineCheckOutcome {
  /** The node with its new check, or `undefined` when the answers say what it says already */
  readonly node: CubeEngineCheckedNode | undefined;
  /** The engine's error, when the check failed */
  readonly error?: CubeEngineError | undefined;
  /**
   * When the engine couldn't be reached and the node's last check still
   * holds for this input, the warning that keeps it, as a source keeps its
   * saved columns
   */
  readonly keptWarning?: string | undefined;
}

/** The lambdas that check one node, and how to read the engine's answers to them */
export interface CubeEngineCheckRequest {
  readonly node: CubeEngineCheckedNode;
  readonly lambdas: ReadonlyMap<NodeId, IR>;
  read(
    answers: ReadonlyMap<NodeId, Schema | CubeEngineError>,
  ): CubeEngineCheckOutcome;
}

/** What to make of a node's new check: kept with a warning, offline, when the last one holds; else stored if new */
const outcomeOf = (
  node: CubeEngineCheckedNode,
  error: CubeEngineError | undefined,
  stillCurrent: () => boolean,
  isSame: boolean,
  withCheck: () => CubeEngineCheckedNode,
  warn: (firstLine: string) => string,
): CubeEngineCheckOutcome =>
  error?.kind === CubeEngineErrorKind.NETWORK && stillCurrent()
    ? { node: undefined, error, keptWarning: warn(error.firstLine) }
    : { node: isSame ? undefined : withCheck(), error };

/**
 * The request that checks a node for the input it has now, its lambdas
 * marked with the node; `undefined` when it has nothing to send yet: an
 * Extend column without a lambda, or a condition with a problem Cube finds
 * itself. The input must be valid.
 */
export const buildCubeEngineCheckRequest = (
  query: Query,
  node: CubeEngineCheckedNode,
  input: Schema,
  upstream: string | undefined,
  registry: NodeRegistry,
): CubeEngineCheckRequest | undefined => {
  if (node instanceof Extend) {
    if (node.columns.some(({ lambda }) => lambda === undefined)) {
      return undefined;
    }
    const columns = node.columns.map(({ name, lambda }) => ({
      name,
      lambda: lambda as JsonObject,
    }));
    return {
      node,
      lambdas: buildCubeExtendTypingLambdas(
        query,
        node,
        columns,
        registry,
        false,
      ),
      read: (answers) => {
        const { typing, error } = readCubeExtendTyping(
          answers,
          node,
          input,
          columns,
          upstream,
        );
        return outcomeOf(
          node,
          error,
          () => isCubeExtendTypingCurrent(node, input, upstream),
          isSameCubeExtendTyping(typing, node.typing),
          () => node.withTyping(typing),
          getExtendRetypeWarning,
        );
      },
    };
  }
  const { lambda } = node;
  if (lambda === undefined || node.getConditionProblem() !== undefined) {
    return undefined;
  }
  return {
    node,
    lambdas: buildCubeConditionCheckLambdas(
      query,
      node,
      lambda,
      input,
      registry,
      false,
    ),
    read: (answers) => {
      const { check, error } = readCubeConditionCheck(
        answers,
        node,
        input,
        upstream,
      );
      return outcomeOf(
        node,
        error,
        () => isCubeConditionCheckCurrent(node, input, upstream),
        isSameCubeConditionCheck(check, node.check),
        () => node.withCheck(check),
        getConditionRecheckWarning,
      );
    },
  };
};

/**
 * A query rule for the editor (PLAN §11.7, §11.11): a node whose check
 * recorded another input than the engine would be given now waits to be
 * checked again (`ERR_TYPING` for an Extend, `ERR_CHECKING` for a filter),
 * e.g. after an Extend above it gains `->toOne()`, which Cube's schema
 * doesn't show. A check that recorded nothing, as one loaded, is used as it
 * is; a node that already waits, or whose input is invalid, is left to its
 * own checks.
 */
export const createStaleCubeEngineCheckRule =
  (
    registry: NodeRegistry,
    modelOf: () => ModelContext | undefined,
  ): QueryRule =>
  (query) => {
    const stale = new Map<string, readonly string[]>();
    const model = modelOf();
    const recorded = query.nodes.filter(
      (node): node is CubeEngineCheckedNode =>
        isCubeEngineCheckedNode(node) &&
        getCubeEngineCheckUpstream(node) !== undefined,
    );
    if (!model || !recorded.length) {
      return stale;
    }
    const { validity } = buildSchemasAndValidity(query, registry.queryRules);
    const emitter = new QueryEmitter(query, registry);
    recorded.forEach((node) => {
      if ((validity.get(node.id) ?? []).some(isTypingError)) {
        return;
      }
      const upstream = getCubeExtendUpstream(emitter, node.id, model);
      if (
        upstream !== undefined &&
        upstream !== getCubeEngineCheckUpstream(node)
      ) {
        stale.set(node.id, [
          node instanceof Extend ? ERR_TYPING : ERR_CHECKING,
        ]);
      }
    });
    return stale;
  };
