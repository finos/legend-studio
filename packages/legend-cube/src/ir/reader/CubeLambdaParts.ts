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

import { func, type IR } from '../CubeIR.js';
import { CubeLambdaReadError } from './CubeLambdaReadError.js';

export const CUBE_LAMBDA_PARTS_MESSAGE = {
  NOT_A_LAMBDA:
    'Cube reads a lambda, such as `|#>{db::Store.S.T}#->limit(10)`.',
  PARAMETERS: (names: readonly string[]): string =>
    `Cube reads a lambda with no parameters, but this one has ${names.map((name) => `$${name}`).join(', ')}.`,
  EMPTY: 'The lambda is empty.',
  NOT_A_LET:
    'Cube reads a lambda of one query, after any lets it reads, but this one has other statements.',
  LET_TWICE: (name: string): string => `The lambda binds $${name} twice.`,
};

/**
 * The parts of a lambda Cube reads into a cube (PLAN §11.18): the relation
 * whose steps are read, the lets it reads, and, for a run's lambda, the run's
 * own parts. A matview's lambda is its relation alone.
 */
export interface CubeLambdaParts {
  /** The relation the steps are read from, with a run's sort and limit as they were applied */
  readonly relation: IR;
  /** What each let binds, by name, read where the relation reads it (window isolation, PLAN §8.6) */
  readonly lets: ReadonlyMap<string, IR>;
  /** The runtime `from()` names, when the lambda runs with one */
  readonly runtime?: string | undefined;
  /**
   * Whether a `limit` stood beside `from()`: the grid's row limit in a lambda
   * Cube ran (the Runs panel's Pure), or the user's own, which can't be told
   * apart, so it is read as a Limit step
   */
  readonly limitBesideFrom: boolean;
}

const isCall = (
  ir: IR | undefined,
  name: string,
  arity: number,
): ir is Extract<IR, { readonly k: 'func' }> =>
  ir?.k === 'func' && ir.name === name && ir.params.length === arity;

/** `<relation>->from(<runtime>)`: the relation and the runtime's path */
const readFrom = (
  ir: IR | undefined,
): { readonly rows: IR; readonly runtime: string } | undefined => {
  if (!isCall(ir, 'from', 2)) {
    return undefined;
  }
  const [rows, runtime] = ir.params as [IR, IR];
  return runtime.k === 'elementPtr'
    ? { rows, runtime: runtime.path }
    : undefined;
};

/** The statements of a lambda body: its lets, then its one query */
const splitStatements = (
  statements: readonly IR[],
  lets: Map<string, IR>,
): IR => {
  const query = statements.at(-1);
  if (query === undefined) {
    throw new CubeLambdaReadError(CUBE_LAMBDA_PARTS_MESSAGE.EMPTY);
  }
  statements.slice(0, -1).forEach((statement) => {
    if (statement.k !== 'let') {
      throw new CubeLambdaReadError(CUBE_LAMBDA_PARTS_MESSAGE.NOT_A_LET);
    }
    if (lets.has(statement.name)) {
      throw new CubeLambdaReadError(
        CUBE_LAMBDA_PARTS_MESSAGE.LET_TWICE(statement.name),
      );
    }
    lets.set(statement.name, statement.value);
  });
  return query;
};

/**
 * A lambda's parts. A run's lambda (§8.6) has one of two shapes:
 * `{| <relation>->sort(…)->limit(n)->from(<runtime>)}`, or with lets
 * `{| {| <lets>; <relation>}->from(<runtime>)->sort(…)->limit(n)}`, the sort
 * and the limit each there or not. `from()` comes off; the sort and the limit
 * stay on the relation, as the steps they read as.
 */
export const splitCubeLambda = (lambda: IR): CubeLambdaParts => {
  if (lambda.k !== 'lambda') {
    throw new CubeLambdaReadError(CUBE_LAMBDA_PARTS_MESSAGE.NOT_A_LAMBDA);
  }
  if (lambda.params.length) {
    throw new CubeLambdaReadError(
      CUBE_LAMBDA_PARTS_MESSAGE.PARAMETERS(lambda.params),
    );
  }
  const lets = new Map<string, IR>();
  const query = splitStatements(lambda.body, lets);

  // without lets: from() is outermost, the run's sort and limit inside it
  const from = readFrom(query);
  if (from) {
    return {
      relation: from.rows,
      lets,
      runtime: from.runtime,
      limitBesideFrom: isCall(from.rows, 'limit', 2),
    };
  }

  // with lets: from() reads a lambda of the lets and the relation, and the
  // run's sort and limit come after it
  const limit = isCall(query, 'limit', 2) ? query : undefined;
  const afterLimit = limit ? limit.params[0] : query;
  const sort = isCall(afterLimit, 'sort', 2) ? afterLimit : undefined;
  const inner = readFrom(sort ? sort.params[0] : afterLimit);
  if (inner?.rows.k === 'lambda' && !inner.rows.params.length) {
    let relation = splitStatements(inner.rows.body, lets);
    if (sort) {
      relation = func('sort', [relation, sort.params[1] as IR]);
    }
    if (limit) {
      relation = func('limit', [relation, limit.params[1] as IR]);
    }
    return {
      relation,
      lets,
      runtime: inner.runtime,
      limitBesideFrom: limit !== undefined,
    };
  }
  return { relation: query, lets, limitBesideFrom: false };
};
