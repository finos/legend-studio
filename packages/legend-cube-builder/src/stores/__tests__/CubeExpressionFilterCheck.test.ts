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
  Connection,
  createNodeRegistry,
  ExpressionFilter,
  getExpressionFilterSignature,
  type IR,
  type JsonObject,
  PrimitiveType,
  printIR,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import {
  buildCubeConditionCheckLambdas,
  getConditionColumnName,
  isCubeConditionCheckCurrent,
  isSameCubeConditionCheck,
  readCubeConditionCheck,
} from '../CubeExpressionFilterCheck.js';

const INPUT = new Schema(ORDERS_COLUMNS);
/** `x | true`, as the engine's JSON */
const LAMBDA: JsonObject = {
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [{ _type: 'boolean', value: true }],
};
const FILTER = new ExpressionFilter('expressionFilter101', 'x | true', LAMBDA);
const QUERY = new Query(
  [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), FILTER],
  [new Connection('relational101', 'expressionFilter101', 'tds')],
  'expressionFilter101',
);
const SIGNATURE = getExpressionFilterSignature(INPUT, LAMBDA);

describe('Filter by Expression check lambdas', () => {
  test('Filters the input with the condition, and types the condition alone under a name no input column has', () => {
    const lambdas = buildCubeConditionCheckLambdas(
      QUERY,
      FILTER,
      LAMBDA,
      INPUT,
      createNodeRegistry(),
      false,
    );
    expect([...lambdas.keys()]).toEqual([
      'expressionFilter101#filter',
      'expressionFilter101#condition',
    ]);
    const print = (key: string): string => printIR(lambdas.get(key) as IR);
    expect(print('expressionFilter101#filter')).toMatch(
      /^\{\| #>\{.*ORDERS\}#->filter\(<lambda .*>\)\}$/u,
    );
    expect(print('expressionFilter101#condition')).toMatch(
      /^\{\| #>\{.*ORDERS\}#->extend\(~\[cube_condition: <lambda .*>\]\)\}$/u,
    );
  });

  test('Picks a name for the condition alone that no input column has, in any case', () => {
    expect(getConditionColumnName(INPUT)).toBe('cube_condition');
    expect(
      getConditionColumnName(
        new Schema([
          new SchemaColumn(
            'CUBE_CONDITION',
            PrimitiveType.get('Integer'),
            false,
          ),
          new SchemaColumn(
            'cube_condition_2',
            PrimitiveType.get('Integer'),
            false,
          ),
        ]),
      ),
    ).toBe('cube_condition_3');
  });
});

describe('Filter by Expression check answers', () => {
  const withCondition = (type: string, nullable: boolean): Schema =>
    new Schema([
      ...ORDERS_COLUMNS,
      new SchemaColumn('cube_condition', PrimitiveType.get(type), nullable),
    ]);
  const compile = (message: string): CubeEngineError =>
    new CubeEngineError(
      CubeEngineErrorKind.COMPILE,
      message,
      'expressionFilter101',
    );

  test('Is checked when the filter types, for this input, recording what the engine was given', () => {
    expect(
      readCubeConditionCheck(
        new Map([
          ['expressionFilter101#filter', INPUT],
          ['expressionFilter101#condition', withCondition('Boolean', false)],
        ]),
        FILTER,
        INPUT,
        'upstream1',
      ),
    ).toEqual({
      check: { kind: 'checked', signature: SIGNATURE, upstream: 'upstream1' },
    });
  });

  test("Names the condition's type, typed alone, when the filter fails", () => {
    const { check, error } = readCubeConditionCheck(
      new Map<string, Schema | CubeEngineError>([
        ['expressionFilter101#filter', compile("Can't find a match")],
        ['expressionFilter101#condition', withCondition('String', false)],
      ]),
      FILTER,
      INPUT,
      undefined,
    );
    expect(check).toEqual({
      kind: 'failed',
      signature: SIGNATURE,
      message: "Can't find a match",
      resultType: 'String',
      upstream: undefined,
    });
    expect(error?.kind).toBe(CubeEngineErrorKind.COMPILE);
  });

  test("Gives the condition's own error when it fails alone too, and a network failure when there is no answer", () => {
    expect(
      readCubeConditionCheck(
        new Map([
          ['expressionFilter101#filter', compile('in filter')],
          ['expressionFilter101#condition', compile('alone')],
        ]),
        FILTER,
        INPUT,
        undefined,
      ).check,
    ).toMatchObject({
      kind: 'failed',
      message: 'alone',
      resultType: undefined,
    });
    const { check, error } = readCubeConditionCheck(
      new Map(),
      FILTER,
      INPUT,
      undefined,
    );
    expect(check.kind).toBe('failed');
    expect(error?.kind).toBe(CubeEngineErrorKind.NETWORK);
  });

  test('Tells a current check, and two checks that say the same', () => {
    const checked = FILTER.withCheck({
      kind: 'checked',
      signature: SIGNATURE,
      upstream: 'upstream1',
    });
    expect(isCubeConditionCheckCurrent(checked, INPUT, 'upstream1')).toBe(true);
    expect(isCubeConditionCheckCurrent(checked, INPUT, 'upstream2')).toBe(
      false,
    );
    // recorded without what the engine was given, as when loaded
    const loaded = FILTER.withCheck({ kind: 'checked', signature: SIGNATURE });
    expect(isCubeConditionCheckCurrent(loaded, INPUT, 'upstream2')).toBe(true);
    expect(isCubeConditionCheckCurrent(FILTER, INPUT, undefined)).toBe(false);
    expect(isSameCubeConditionCheck(checked.check, { ...checked.check })).toBe(
      true,
    );
    expect(isSameCubeConditionCheck(checked.check, loaded.check)).toBe(false);
    const failed = {
      kind: 'failed' as const,
      signature: SIGNATURE,
      message: 'm',
      resultType: 'String',
    };
    expect(isSameCubeConditionCheck(failed, { ...failed })).toBe(true);
    expect(
      isSameCubeConditionCheck(failed, { ...failed, resultType: 'Integer' }),
    ).toBe(false);
  });
});
