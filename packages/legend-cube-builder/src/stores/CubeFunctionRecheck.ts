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
  emitFunctionSource,
  type EnteredValue,
  type FunctionSource,
  getLiteralKinds,
  type IR,
  lambda,
  type LiteralValue,
  type ModelContext,
  type Schema,
} from '@finos/legend-cube';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeEngine,
  type NodeId,
} from '../graph-manager/CubeEngine.js';

/** A value of each kind, which only types the call: a function's columns don't depend on its values */
const PLACEHOLDERS: Readonly<Record<LiteralValue['kind'], LiteralValue>> = {
  string: { kind: 'string', value: '' },
  boolean: { kind: 'boolean', value: false },
  integer: { kind: 'integer', value: '0' },
  float: { kind: 'float', value: '0' },
  decimal: { kind: 'decimal', value: '0' },
  strictDate: { kind: 'strictDate', value: '2000-01-01' },
  dateTime: { kind: 'dateTime', value: '2000-01-01T00:00:00' },
  enum: { kind: 'enum', value: '' },
};

/**
 * The lambda that types a function source, `{| sales::ordersAbove(…)}`: its
 * values where they are valid, else a placeholder of the parameter's type, or
 * `[]` for an empty optional one
 */
export const buildCubeFunctionTypingLambda = (source: FunctionSource): IR => {
  const values: EnteredValue[] = source.parameters.map((parameter, index) => {
    const value = source.values[index];
    if (value !== undefined && value.kind !== 'invalid') {
      return value;
    }
    if (value === undefined && parameter.optional) {
      return undefined;
    }
    const [kind] = getLiteralKinds(parameter.type);
    return kind ? PLACEHOLDERS[kind] : undefined;
  });
  return lambda([], [emitFunctionSource(source.withValues(values))]);
};

/**
 * Types a cube's functions again with the engine (PLAN §6.5), in one call:
 * their columns as the engine types the call. One answer per source,
 * failures included; never rejects.
 */
export const recheckCubeFunctionSources = async (
  engine: CubeEngine,
  model: ModelContext,
  sources: readonly FunctionSource[],
): Promise<Map<NodeId, Schema | CubeEngineError>> => {
  try {
    return await engine.typeLambdas(
      model,
      new Map(
        sources.map((source) => [
          source.id,
          buildCubeFunctionTypingLambda(source),
        ]),
      ),
    );
  } catch (error) {
    const failure =
      error instanceof CubeEngineError
        ? error
        : new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            error instanceof Error ? error.message : String(error),
          );
    return new Map(sources.map((source) => [source.id, failure]));
  }
};
