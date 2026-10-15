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

import { describe, expect, test } from '@jest/globals';
import {
  colSpec,
  elementPtr,
  func,
  lambda,
  letBinding,
  literal,
  storeAccessor,
  variable,
  type IR,
} from '../../CubeIR.js';
import { isSameCubeIR } from '../CubeIRComparison.js';
import {
  CUBE_LAMBDA_PARTS_MESSAGE,
  splitCubeLambda,
} from '../CubeLambdaParts.js';
import { CubeLambdaReadError } from '../CubeLambdaReadError.js';

const TABLE = storeAccessor(['db::Store', 'S', 'T']);
const RUNTIME = elementPtr('db::Runtime');
const sorted = (rows: IR): IR =>
  func('sort', [rows, func('descending', [colSpec('A')])]);
const limited = (rows: IR): IR =>
  func('limit', [rows, literal({ kind: 'integer', value: '1001' })]);
const from = (rows: IR): IR => func('from', [rows, RUNTIME]);

describe("A lambda's parts", () => {
  test('Reads a matview, its relation alone', () => {
    const parts = splitCubeLambda(lambda([], [sorted(TABLE)]));
    expect(isSameCubeIR(parts.relation, sorted(TABLE))).toBe(true);
    expect(parts.runtime).toBeUndefined();
    expect(parts.limitBesideFrom).toBe(false);
    expect(parts.lets.size).toBe(0);
  });

  test("Takes a run's from() off, keeping its sort and limit as steps", () => {
    const parts = splitCubeLambda(lambda([], [from(limited(sorted(TABLE)))]));
    expect(parts.runtime).toBe('db::Runtime');
    expect(parts.limitBesideFrom).toBe(true);
    expect(isSameCubeIR(parts.relation, limited(sorted(TABLE)))).toBe(true);

    // Show Pure: no row limit
    const shown = splitCubeLambda(lambda([], [from(sorted(TABLE))]));
    expect(shown.limitBesideFrom).toBe(false);
    expect(isSameCubeIR(shown.relation, sorted(TABLE))).toBe(true);
  });

  test("Reads a run with lets: from() of the lets' lambda, the run's sort and limit after it", () => {
    const window = func('extend', [TABLE]);
    const run = lambda(
      [],
      [
        limited(
          sorted(
            from(
              lambda(
                [],
                [letBinding('n_p', window), func('select', [variable('n_p')])],
              ),
            ),
          ),
        ),
      ],
    );
    const parts = splitCubeLambda(run);
    expect(parts.runtime).toBe('db::Runtime');
    expect(parts.limitBesideFrom).toBe(true);
    expect([...parts.lets.keys()]).toEqual(['n_p']);
    expect(
      isSameCubeIR(
        parts.relation,
        limited(sorted(func('select', [variable('n_p')]))),
      ),
    ).toBe(true);
  });

  test('Refuses a lambda with parameters, other statements, or a let bound twice', () => {
    expect(() => splitCubeLambda(TABLE)).toThrow(CubeLambdaReadError);
    expect(() => splitCubeLambda(lambda(['x'], [TABLE]))).toThrow(
      CUBE_LAMBDA_PARTS_MESSAGE.PARAMETERS(['x']),
    );
    expect(() => splitCubeLambda(lambda([], [TABLE, TABLE]))).toThrow(
      CUBE_LAMBDA_PARTS_MESSAGE.NOT_A_LET,
    );
    expect(() =>
      splitCubeLambda(
        lambda(
          [],
          [letBinding('a', TABLE), letBinding('a', TABLE), variable('a')],
        ),
      ),
    ).toThrow(CUBE_LAMBDA_PARTS_MESSAGE.LET_TWICE('a'));
    expect(() => splitCubeLambda(lambda([], []))).toThrow(
      CUBE_LAMBDA_PARTS_MESSAGE.EMPTY,
    );
  });
});
