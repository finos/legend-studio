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
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { column } from '../../../__test-utils__/CubeTestNodes.js';
import { isTypingError } from '../../../inference/SchemaInference.js';
import type { RowOrder } from '../../../inference/RowOrder.js';
import {
  ERR_CHECKING,
  ERR_TYPING,
  MESSAGE_CONDITION_BACKSLASH,
  MESSAGE_CONDITION_NOT_A_LAMBDA,
  MESSAGE_CONDITION_NOT_BOOLEAN,
  MESSAGE_CONDITION_NOT_CHECKED,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import type { JsonObject } from '../../../utils/Json.js';
import {
  type ExpressionCheck,
  ExpressionFilter,
  findLikeFunctionWithBackslash,
  getExpressionFilterSignature,
  UNCHECKED,
} from '../ExpressionFilter.js';
import { SortDirection } from '../Sort.js';

const P = 'meta::pure::precisePrimitives::';

const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_VIA', `${P}SmallInt`, true),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
]);

const X = { _type: 'var', name: 'x' };
const property = (name: string): JsonObject => ({
  _type: 'property',
  property: name,
  parameters: [X],
});
const string = (value: string): JsonObject => ({ _type: 'string', value });
const lambdaOf = (body: JsonObject): JsonObject => ({
  _type: 'lambda',
  parameters: [X],
  body: [body],
});

/** `x | $x.ORDER_ID > 10300`, as the engine's JSON */
const LATER = lambdaOf({
  _type: 'func',
  function: 'greaterThan',
  parameters: [property('ORDER_ID'), { _type: 'integer', value: '10300' }],
});

/** `x | $x.SHIP_COUNTRY->toOne()-><fn>(<literal>)` */
const like = (fn: string, literal: string): JsonObject =>
  lambdaOf({
    _type: 'func',
    function: fn,
    parameters: [
      {
        _type: 'func',
        function: 'toOne',
        parameters: [property('SHIP_COUNTRY')],
      },
      string(literal),
    ],
  });

/** The filter, checked by the engine for this input */
const checked = (
  lambda: JsonObject = LATER,
  input = ORDERS,
  code = 'x | $x.ORDER_ID > 10300',
): ExpressionFilter =>
  new ExpressionFilter('expressionFilter101', code, lambda).withCheck({
    kind: 'checked',
    signature: getExpressionFilterSignature(input, lambda),
  });

const validationErrors = (node: ExpressionFilter, input = ORDERS): string[] => {
  const errors: string[] = [];
  expect(node.validate([input], errors)).toBe(errors.length === 0);
  expect(node.validate([input])).toBe(errors.length === 0);
  return errors;
};

describe(unitTest('Filter by Expression node'), () => {
  test('Is a unary node, described by its condition on one line, and without it for logs', () => {
    const node = new ExpressionFilter(
      'expressionFilter101',
      'x |\n  $x.ORDER_ID >   10300',
      LATER,
    );
    expect(node.type).toBe('expressionFilter');
    expect(ExpressionFilter.TYPE).toBe('expressionFilter');
    expect(node.ports).toEqual(['tds']);
    expect(node.describe()).toBe('Filter by x | $x.ORDER_ID > 10300');
    expect(node.describeRedacted()).toBe('Filter by an expression');
    expect(new ExpressionFilter('expressionFilter102').describe()).toBe(
      'Filter by (blank)',
    );
  });

  test('Starts with no condition and nothing checked, and keeps its lambda frozen', () => {
    const node = new ExpressionFilter('expressionFilter101');
    expect(node.code).toBe('');
    expect(node.lambda).toBeUndefined();
    expect(node.check === UNCHECKED).toBe(true);
    const lambda = { ...LATER };
    const kept = new ExpressionFilter('expressionFilter101', 'x', lambda);
    // a copy, so a change to the given JSON doesn't reach the node
    lambda._type = 'changed';
    expect(kept.lambda?._type).toBe('lambda');
    expect(Object.isFrozen(kept.lambda)).toBe(true);
    expect(Object.isFrozen(kept.check)).toBe(true);
  });

  test('Refuses a condition of the wrong shape', () => {
    expect(
      () =>
        new ExpressionFilter(
          'expressionFilter101',
          1 as unknown as string,
          LATER,
        ),
    ).toThrow(/code must be a string/u);
    expect(
      () =>
        new ExpressionFilter(
          'expressionFilter101',
          'x',
          [] as unknown as JsonObject,
        ),
    ).toThrow(/lambda an object/u);
  });

  test('Needs a condition, a lambda of one parameter, before the engine is asked', () => {
    expect(
      validationErrors(new ExpressionFilter('expressionFilter101')),
    ).toEqual(['Condition cannot be empty.']);
    const twoParameters = {
      _type: 'lambda',
      parameters: [X, { _type: 'var', name: 'y' }],
      body: LATER.body,
    };
    expect(
      validationErrors(
        new ExpressionFilter('expressionFilter101', 'x, y | 1', twoParameters),
      ),
    ).toEqual([MESSAGE_CONDITION_NOT_A_LAMBDA]);
    expect(
      new ExpressionFilter('expressionFilter101', 'x', {
        _type: 'lambda',
        parameters: [X],
        body: [],
      }).getConditionProblem(),
    ).toBe(MESSAGE_CONDITION_NOT_A_LAMBDA);
    expect(checked().getConditionProblem()).toBeUndefined();
  });

  test('Refuses a backslash in a startsWith, endsWith or contains literal, as the column Filter does', () => {
    ['startsWith', 'endsWith', 'contains'].forEach((fn) =>
      expect(validationErrors(checked(like(fn, 'a\\b')))).toEqual([
        MESSAGE_CONDITION_BACKSLASH(fn),
      ]),
    );
    expect(MESSAGE_CONDITION_BACKSLASH('contains')).toBe(
      'The value given to "contains" cannot contain a backslash (\\) yet.',
    );
    // no backslash, or a function that isn't a LIKE, is fine
    expect(validationErrors(checked(like('contains', 'ab')))).toEqual([]);
    expect(validationErrors(checked(like('equal', 'a\\b')))).toEqual([]);
  });

  test('Finds a LIKE function with a backslash literal anywhere in the condition, not in its first argument', () => {
    const nested = lambdaOf({
      _type: 'func',
      function: 'and',
      parameters: [
        LATER.body[0] as JsonObject,
        {
          _type: 'func',
          function: 'not',
          parameters: [like('endsWith', '\\').body[0] as JsonObject],
        },
      ],
    });
    expect(findLikeFunctionWithBackslash(nested)).toBe('endsWith');
    // the older JSON writes a literal as `values`
    expect(
      findLikeFunctionWithBackslash({
        _type: 'func',
        function: 'startsWith',
        parameters: [
          property('SHIP_COUNTRY'),
          { _type: 'string', values: ['\\'] },
        ],
      }),
    ).toBe('startsWith');
    // the string searched isn't the pattern
    expect(
      findLikeFunctionWithBackslash({
        _type: 'func',
        function: 'contains',
        parameters: [string('a\\b'), property('SHIP_COUNTRY')],
      }),
    ).toBeUndefined();
    expect(findLikeFunctionWithBackslash(LATER)).toBeUndefined();
  });

  test('Waits for the engine to check its condition, and for this input', () => {
    const node = new ExpressionFilter(
      'expressionFilter101',
      'x | $x.ORDER_ID > 10300',
      LATER,
    );
    expect(validationErrors(node)).toEqual([ERR_CHECKING]);
    // pending, as an Extend waiting to be typed
    expect(isTypingError(ERR_CHECKING)).toBe(true);
    expect(isTypingError(ERR_TYPING)).toBe(true);
    expect(ERR_CHECKING).toBe('Waiting for the engine to check the condition.');
    const done = checked();
    expect(validationErrors(done)).toEqual([]);
    // another input: checked for one that is gone
    const other = new Schema([
      ...ORDERS.columns,
      column('FREIGHT', `${P}Double`),
    ]);
    expect(validationErrors(done, other)).toEqual([ERR_CHECKING]);
    expect(done.currentCheck(other) === UNCHECKED).toBe(true);
    // another condition: the check is kept, but not current
    const changed = done.withCondition(
      'x | true',
      lambdaOf({ _type: 'boolean', value: true }),
    );
    expect(changed.check === done.check).toBe(true);
    expect(validationErrors(changed)).toEqual([ERR_CHECKING]);
  });

  test("Says why the engine couldn't check it: its first line, or the condition's type when it isn't one Boolean", () => {
    const failed = (
      check: Omit<
        Extract<ExpressionCheck, { kind: 'failed' }>,
        'kind' | 'signature'
      >,
    ): ExpressionFilter =>
      new ExpressionFilter('expressionFilter101', 'x | ?', LATER).withCheck({
        kind: 'failed',
        signature: getExpressionFilterSignature(ORDERS, LATER),
        ...check,
      });
    expect(
      validationErrors(
        failed({
          message: "The column 'NOPE' can't be found in the relation\nmore",
        }),
      ),
    ).toEqual([
      MESSAGE_CONDITION_NOT_CHECKED(
        "The column 'NOPE' can't be found in the relation",
      ),
    ]);
    expect(
      validationErrors(
        failed({ message: 'no match', resultType: 'Integer[1]' }),
      ),
    ).toEqual([MESSAGE_CONDITION_NOT_BOOLEAN('Integer[1]')]);
    expect(MESSAGE_CONDITION_NOT_BOOLEAN('Integer[1]')).toBe(
      'Condition must give one Boolean, such as x | $x.PRICE > 10, not Integer[1].',
    );
    expect(MESSAGE_CONDITION_NOT_CHECKED('why')).toBe(
      "Condition can't be checked: why",
    );
  });

  test('Gives its input schema once checked, and nothing before', () => {
    expect(checked().schematize([ORDERS]) === ORDERS).toBe(true);
    expect(
      new ExpressionFilter('expressionFilter101', 'x', LATER).schematize([
        ORDERS,
      ]),
    ).toBeUndefined();
  });

  test("Keeps its input's row order: the rows it keeps stay in order", () => {
    const node = new ExpressionFilter('expressionFilter101');
    const sorted: RowOrder = [
      {
        column: 'ORDER_ID',
        direction: SortDirection.DESC,
        sortId: 'sort101',
        keyIndex: 0,
      },
    ];
    expect(node.outputOrder([sorted])).toBe(sorted);
    expect(node.outputOrder([undefined])).toBeUndefined();
  });
});

describe(unitTest('Filter by Expression signatures'), () => {
  test("Signs the input's names, types and nullability, and the lambda, whatever their keys' order", () => {
    const signature = getExpressionFilterSignature(ORDERS, LATER);
    const reordered = Object.fromEntries(Object.entries(LATER).reverse());
    expect(getExpressionFilterSignature(ORDERS, reordered)).toBe(signature);
    expect(
      getExpressionFilterSignature(
        new Schema([
          column('ORDER_ID', `${P}SmallInt`, true),
          ...ORDERS.columns.slice(1),
        ]),
        LATER,
      ),
    ).not.toBe(signature);
    expect(
      getExpressionFilterSignature(ORDERS, like('contains', 'F')),
    ).not.toBe(signature);
    expect(getExpressionFilterSignature(ORDERS, undefined)).not.toBe(signature);
  });

  test('Keeps the digest of what the engine was given for the input, which Cube never reads', () => {
    const node = checked().withCheck({
      kind: 'checked',
      signature: getExpressionFilterSignature(ORDERS, LATER),
      upstream: 'digest',
    });
    expect(node.check.kind === 'checked' && node.check.upstream).toBe('digest');
    expect(validationErrors(node)).toEqual([]);
  });
});
