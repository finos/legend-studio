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
  colSpec,
  colSpecArray,
  EmitRole,
  ERR_TYPING,
  Extend,
  type ExtendTyping,
  func,
  getExtendSignature,
  hashText,
  type IR,
  isTypingError,
  type JsonObject,
  lambda,
  lambdaJson,
  type ModelContext,
  type NodeRegistry,
  originOf,
  printIR,
  type Query,
  QueryEmitter,
  type QueryRule,
  type Schema,
  stableJsonText,
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

/** An engine message without the compiler's ` - Context:[…]` trail, which repeats what it was doing */
export const withoutEngineContext = (message: string): string =>
  message.replace(/ - Context:\[[^\n]*/gu, '');

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

/** Each model's digest, by the object, so a large model is digested once */
const MODEL_DIGESTS = new WeakMap<ModelContext, string>();

const digestModel = (model: ModelContext): string => {
  let digest = MODEL_DIGESTS.get(model);
  if (digest === undefined) {
    digest = hashText(stableJsonText(model));
    MODEL_DIGESTS.set(model, digest);
  }
  return digest;
};

/**
 * What the engine is given for an Extend's input when it types it, digested
 * (PLAN §11.7): the input's relation as emitted, and the model. A typing
 * records it (`upstream`), since the engine sees more than Cube's schema
 * does; `undefined` when the input can't be emitted, e.g. it is invalid.
 */
export const getCubeExtendUpstream = (
  emitter: QueryEmitter,
  extendId: string,
  model: ModelContext,
): string | undefined => {
  const [inputId] = emitter.query.getInputIds(extendId);
  if (inputId === undefined || !emitter.canEmit(inputId)) {
    return undefined;
  }
  return hashText(
    `${digestModel(model)}\n${printIR(emitter.emitRelation(inputId))}`,
  );
};

/** The digest of what the engine was given for the input, which the typing recorded */
export const getCubeExtendTypingUpstream = (
  typing: ExtendTyping,
): string | undefined =>
  typing.kind === 'unresolved' ? undefined : typing.upstream;

const upstreamOf = getCubeExtendTypingUpstream;

/**
 * Whether the Extend's typing gives its types for this input: typed, for
 * this schema and these columns, and for this input as the engine is given
 * it, or recorded without it, as when loaded
 */
export const isCubeExtendTypingCurrent = (
  extend: Extend,
  input: Schema,
  upstream: string | undefined,
): boolean => {
  const { typing } = extend;
  const recorded = upstreamOf(typing);
  return (
    typing.kind === 'typed' &&
    extend.currentTyping(input) === typing &&
    (recorded === undefined || recorded === upstream)
  );
};

/**
 * A query rule for the editor (PLAN §11.7): an Extend whose typing recorded
 * another input than the engine would be given now waits to be typed again
 * (`ERR_TYPING`), e.g. after an Extend above it gains `->toOne()`, which
 * Cube's schema doesn't show. A typing that recorded nothing, as one loaded,
 * is used as it is; an Extend that already waits, or whose input is invalid,
 * is left to its own checks.
 */
export const createStaleCubeExtendTypingRule =
  (
    registry: NodeRegistry,
    modelOf: () => ModelContext | undefined,
  ): QueryRule =>
  (query) => {
    const stale = new Map<string, readonly string[]>();
    const model = modelOf();
    const recorded = query.nodes.filter(
      (node): node is Extend =>
        node instanceof Extend && upstreamOf(node.typing) !== undefined,
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
      if (upstream !== undefined && upstream !== upstreamOf(node.typing)) {
        stale.set(node.id, [ERR_TYPING]);
      }
    });
    return stale;
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
  upstream: string | undefined,
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
        upstream,
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
      message: withoutEngineContext(error.detail),
      column:
        failing < 0 || error.kind === CubeEngineErrorKind.NETWORK
          ? undefined
          : failing,
      upstream,
    },
    error,
  };
};

/**
 * Whether two typings say the same: the same kind, signature and input as
 * the engine was given it, and the same types, or the same failure
 */
export const isSameCubeExtendTyping = (
  a: ExtendTyping,
  b: ExtendTyping,
): boolean => {
  if (upstreamOf(a) !== upstreamOf(b)) {
    return false;
  }
  if (a.kind === 'typed' && b.kind === 'typed') {
    return (
      a.signature === b.signature &&
      a.types.length === b.types.length &&
      a.types.every((type, index) => {
        const other = b.types[index];
        return other !== undefined && type.equals(other);
      })
    );
  }
  if (a.kind === 'failed' && b.kind === 'failed') {
    return (
      a.signature === b.signature &&
      a.message === b.message &&
      a.column === b.column
    );
  }
  return a.kind === 'unresolved' && b.kind === 'unresolved';
};
