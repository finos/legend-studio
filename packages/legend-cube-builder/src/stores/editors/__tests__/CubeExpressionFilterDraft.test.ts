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

import { afterEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  ExpressionFilter,
  type IR,
  type JsonObject,
  MESSAGE_CONDITION_BACKSLASH,
  MESSAGE_CONDITION_NOT_BOOLEAN,
  MESSAGE_CONDITION_WILDCARD,
  MESSAGE_PATTERN_NOT_LITERAL,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { TEST__expression } from '../../../__test-utils__/CubeExpressionTestUtils.js';
import {
  createFakeNorthwindOutline,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  type NodeId,
} from '../../../graph-manager/CubeEngine.js';
import {
  EXPRESSION_FILTER_PARENTHESES_HINT,
  getEditorKeptOpenNotice,
} from '../../../__lib__/LegendCubeLabels.js';
import { CubeEditorState } from '../../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../fixtures/CubeNorthwindModel.js';
import {
  CubeExpressionFilterDraft,
  NEW_CONDITION_CODE,
} from '../CubeExpressionFilterDraft.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** The engine's JSON for a code: a lambda whose body is the code itself, as a string, located or not */
const lambdaOf = (code: string, sourceId?: string): JsonObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'string',
      value: code,
      ...(sourceId ? { sourceInformation: { sourceId } } : {}),
    },
  ],
});

/** The engine's answer: the filter types, and the condition alone is of this type */
const answerFor = (
  lambdas: ReadonlyMap<NodeId, IR>,
  condition: { type: string; nullable: boolean } = {
    type: 'Boolean',
    nullable: false,
  },
  filterFails?: CubeEngineError,
): Map<NodeId, Schema | CubeEngineError> =>
  new Map<NodeId, Schema | CubeEngineError>(
    [...lambdas.keys()].map((key): [NodeId, Schema | CubeEngineError] =>
      key.endsWith('#filter')
        ? [key, filterFails ?? new Schema(ORDERS_COLUMNS)]
        : [
            key,
            new Schema([
              ...ORDERS_COLUMNS,
              new SchemaColumn(
                'cube_condition',
                PrimitiveType.get(condition.type),
                condition.nullable,
              ),
            ]),
          ],
    ),
  );

const states: CubeEditorState[] = [];
afterEach(() => {
  states.splice(0).forEach((state) => state.dispose());
});

/** ORDERS, then the filter, captured, in an editor whose fake engine answers by default */
const open = (
  filter = new ExpressionFilter('expressionFilter101'),
  outline?: CubeModelOutline,
): {
  state: CubeEditorState;
  fake: FakeCubeEngine;
  draft: CubeExpressionFilterDraft;
} => {
  // the cube loads its model's outline as it opens
  const { host, fake } = TEST__createCubeHost(outline ? { outline } : {});
  fake.parseExpression.mockImplementation(async (code, sourceId) => ({
    lambda: lambdaOf(code),
    located: lambdaOf(code, sourceId),
  }));
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    answerFor(lambdas),
  );
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), filter],
        [new Connection('relational101', filter.id, 'tds')],
        filter.id,
      ),
    }),
  );
  states.push(state);
  return {
    state,
    fake,
    draft: new CubeExpressionFilterDraft(filter, state),
  };
};

const COMPILE = (message: string): CubeEngineError =>
  new CubeEngineError(
    CubeEngineErrorKind.COMPILE,
    message,
    'expressionFilter101',
  );

describe('Filter by Expression draft', () => {
  test('Starts a new filter with a lambda to finish, waiting for its check', () => {
    const { draft } = open();
    expect(draft.code).toBe(NEW_CONDITION_CODE);
    expect(draft.build() === draft.original).toBe(true);
    expect(draft.isValidated).toBe(false);
    expect(draft.applyDisabledReason).toBe(
      'Wait for the condition to be checked, once you stop typing (F10 checks it at once)',
    );
  });

  test('Validates: parses the code, checks it located, plans it, then Apply stores a checked node', async () => {
    const { state, fake, draft } = open();
    draft.setCode('x | $x.SHIPPED_DATE > $x.REQUIRED_DATE');
    await flowResult(draft.validate());
    expect(
      fake.parseExpression.mock.calls.map(([code, id]) => [code, id]),
    ).toEqual([
      [
        'x | $x.SHIPPED_DATE > $x.REQUIRED_DATE',
        'expressionFilter101:condition',
      ],
    ]);
    // checked located, so an error points into the code
    const checked = fake.typeLambdas.mock.calls.at(-1)?.[1];
    expect([...(checked?.keys() ?? [])]).toEqual([
      'expressionFilter101#filter',
      'expressionFilter101#condition',
    ]);
    expect(
      JSON.stringify(checked?.get('expressionFilter101#filter')),
    ).toContain('"sourceId":"expressionFilter101:condition"');
    expect(fake.planLambda).toHaveBeenCalledTimes(1);
    expect(draft.problem).toBeUndefined();
    expect(draft.isChecked).toBe(true);
    expect(draft.applyDisabledReason).toBeUndefined();
    // the node holds the lambda without locations, and its check
    const built = draft.build();
    expect(JSON.stringify(built.lambda)).not.toContain('sourceId');
    expect(built.check.kind).toBe('checked');
    state.applyQuery(state.document.query.replace(built));
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    // a code edit asks for another Validate, and the node gets no lambda
    draft.setCode('x | $x.SHIPPED_DATE >= $x.REQUIRED_DATE');
    expect(draft.applyDisabledReason).toBe(
      'Wait for the condition to be checked, once you stop typing (F10 checks it at once)',
    );
    expect(draft.isChecked).toBe(false);
    expect(draft.build().lambda).toBeUndefined();
    // parsed again on the next Validate only
    await flowResult(draft.validate());
    await flowResult(draft.validate());
    expect(fake.parseExpression).toHaveBeenCalledTimes(2);
  });

  test('Puts a parse error under the code, located, and checks nothing', async () => {
    const { fake, draft } = open();
    draft.setCode('x | $x.ORDER_ID >');
    const location = {
      sourceId: 'expressionFilter101:condition',
      startLine: 1,
      startColumn: 17,
      endLine: 1,
      endColumn: 17,
    };
    fake.parseExpression.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "no viable alternative at input '>'",
        undefined,
        undefined,
        location,
      ),
    );
    await flowResult(draft.validate());
    expect(draft.problem).toEqual({
      message: "no viable alternative at input '>'",
      location,
      hint: undefined,
    });
    expect(fake.typeLambdas).not.toHaveBeenCalled();
    expect(draft.isValidated).toBe(false);
  });

  test("Drops a check's answer when the code changed while it ran, and keeps typing open", async () => {
    const { fake, draft } = open();
    draft.setCode('x | $x.ORDER_ID >');
    let failParse: ((error: unknown) => void) | undefined;
    fake.parseExpression.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failParse = reject;
        }),
    );
    const checking = flowResult(draft.validate());
    expect(draft.validating).toBe(true);
    // typing goes on while it is checked
    draft.setCode('x | $x.ORDER_ID > 1');
    failParse?.(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "no viable alternative at input '>'",
      ),
    );
    await checking;
    // the answer was for the code before: no problem shown for the code now
    expect(draft.problem).toBeUndefined();
    expect(draft.isValidated).toBe(false);
    // the code now is then checked
    await flowResult(draft.validate());
    expect(draft.isValidated).toBe(true);
    expect(draft.checked?.code).toBe('x | $x.ORDER_ID > 1');
    draft.dispose();
  });

  test("Refuses a backslash in a LIKE function's literal before asking the engine", async () => {
    const { fake, draft } = open();
    const like: JsonObject = {
      _type: 'lambda',
      parameters: [{ _type: 'var', name: 'x' }],
      body: [
        {
          _type: 'func',
          function: 'startsWith',
          parameters: [
            {
              _type: 'property',
              property: 'SHIP_NAME',
              parameters: [{ _type: 'var', name: 'x' }],
            },
            { _type: 'string', value: 'a\\' },
          ],
        },
      ],
    };
    fake.parseExpression.mockResolvedValueOnce({ lambda: like, located: like });
    draft.setCode("x | $x.SHIP_NAME->startsWith('a\\\\')");
    await flowResult(draft.validate());
    expect(draft.problem).toEqual({
      message: MESSAGE_CONDITION_BACKSLASH('startsWith'),
      refused: true,
    });
    expect(fake.typeLambdas).not.toHaveBeenCalled();
  });

  test.each([
    ['DuckDB', true],
    ['H2', false],
  ])(
    "Refuses %% or _ in a LIKE function's literal before asking the engine, on DuckDB only: on %s, %s",
    async (databaseType, refused) => {
      const { fake, draft } = open(
        undefined,
        createFakeNorthwindOutline(databaseType),
      );
      const like = TEST__expression.lambda(
        TEST__expression.call(
          'contains',
          TEST__expression.call('toOne', TEST__expression.column('SHIP_NAME')),
          TEST__expression.string('50%'),
        ),
      );
      fake.parseExpression.mockResolvedValueOnce({
        lambda: like,
        located: like,
      });
      draft.setCode("x | $x.SHIP_NAME->toOne()->contains('50%')");
      await flowResult(draft.validate());
      if (refused) {
        expect(draft.problem).toEqual({
          message: MESSAGE_CONDITION_WILDCARD('contains', 'DuckDB'),
          refused: true,
        });
        expect(fake.typeLambdas).not.toHaveBeenCalled();
      } else {
        expect(draft.problem).toBeUndefined();
        expect(fake.typeLambdas).toHaveBeenCalledTimes(1);
      }
    },
  );

  test.each([
    ['H2', true],
    ['DuckDB', true],
    ['Snowflake', false],
  ])(
    'Refuses a pattern that is not a literal before asking the engine, but on Snowflake: on %s, %s',
    async (databaseType, refused) => {
      const { fake, draft } = open(
        undefined,
        createFakeNorthwindOutline(databaseType),
      );
      const byColumn = TEST__expression.lambda(
        TEST__expression.call(
          'contains',
          TEST__expression.call('toOne', TEST__expression.column('SHIP_NAME')),
          TEST__expression.call('toOne', TEST__expression.column('SHIP_CITY')),
        ),
      );
      fake.parseExpression.mockResolvedValueOnce({
        lambda: byColumn,
        located: byColumn,
      });
      draft.setCode(
        'x | $x.SHIP_NAME->toOne()->contains($x.SHIP_CITY->toOne())',
      );
      await flowResult(draft.validate());
      if (refused) {
        expect(draft.problem).toEqual({
          message: MESSAGE_PATTERN_NOT_LITERAL('contains'),
          refused: true,
        });
        expect(fake.typeLambdas).not.toHaveBeenCalled();
      } else {
        expect(draft.problem).toBeUndefined();
        expect(fake.typeLambdas).toHaveBeenCalledTimes(1);
      }
    },
  );

  test("Names the condition's type when it isn't one Boolean, and plans nothing", async () => {
    const { fake, draft } = open();
    fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
      answerFor(
        lambdas,
        { type: 'Integer', nullable: false },
        COMPILE("Can't find a match for function 'filter(Relation<…>[1],…)'"),
      ),
    );
    draft.setCode('x | $x.ORDER_ID + 1');
    await flowResult(draft.validate());
    expect(draft.problem).toEqual({
      message: MESSAGE_CONDITION_NOT_BOOLEAN('Integer'),
    });
    expect(draft.isChecked).toBe(false);
    expect(draft.build().check.kind).toBe('failed');
    expect(fake.planLambda).not.toHaveBeenCalled();
  });

  test('Hints at parentheses when the engine refuses an and, or or not given something other than a Boolean', async () => {
    const { fake, draft } = open();
    const precedence = COMPILE(
      "Can't find a match for function 'and(Boolean[1],SmallInt[1])'",
    );
    fake.typeLambdas.mockImplementation(
      async (_model, lambdas) =>
        new Map([...lambdas.keys()].map((key) => [key, precedence])),
    );
    draft.setCode('x | $x.ORDER_ID > 1 && $x.SHIP_VIA > 3');
    await flowResult(draft.validate());
    expect(draft.problem).toEqual({
      message: "Can't find a match for function 'and(Boolean[1],SmallInt[1])'",
      location: undefined,
      hint: EXPRESSION_FILTER_PARENTHESES_HINT,
    });
    expect(EXPRESSION_FILTER_PARENTHESES_HINT).toBe(
      'Put each comparison in parentheses: ($x.A > 1) && ($x.B > 3).',
    );
  });

  test("Names the database that can't run the condition", async () => {
    const { fake, draft } = open();
    fake.planLambda.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Assert failure at typeInference.pure',
        'expressionFilter101',
      ),
    );
    draft.setCode('x | $x.ORDER_DATE->toOne()->year() == 1997');
    await flowResult(draft.validate());
    expect(draft.problem?.message).toMatch(
      /can't run it: Assert failure at typeInference\.pure$/u,
    );
  });

  test('Stays open while its condition waits for Validate, rather than storing or dropping it', async () => {
    const { state } = open();
    const { nodeEditor } = state;
    nodeEditor.open('expressionFilter101');
    const draft = nodeEditor.draft as CubeExpressionFilterDraft;
    draft.setCode('x | $x.ORDER_ID > 10300');
    expect(nodeEditor.finish()).toBe(false);
    expect(nodeEditor.nodeId).toBe('expressionFilter101');
    expect(nodeEditor.notice).toBe(
      getEditorKeptOpenNotice(
        'expressionFilter101',
        'Wait for the condition to be checked, once you stop typing (F10 checks it at once)',
      ),
    );
    expect(state.history).toHaveLength(0);
    // validated, it closes, applying
    await flowResult(draft.validate());
    expect(nodeEditor.finish()).toBe(true);
    expect(nodeEditor.nodeId).toBeUndefined();
    const stored = state.document.query.getNode(
      'expressionFilter101',
    ) as ExpressionFilter;
    expect(stored.code).toBe('x | $x.ORDER_ID > 10300');
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
  });

  test('Goes on with its code when the engine checks the node in the background', () => {
    const lambda = lambdaOf('x | true');
    const { state } = open(
      new ExpressionFilter('expressionFilter101', 'x | true', lambda),
    );
    const { nodeEditor } = state;
    nodeEditor.open('expressionFilter101');
    const draft = nodeEditor.draft as CubeExpressionFilterDraft;
    draft.setCode('x | false');
    const node = state.document.query.getNode(
      'expressionFilter101',
    ) as ExpressionFilter;
    const checked = node.withCheck({ kind: 'checked', signature: 'any' });
    expect(draft.follow(checked)).toBe(true);
    expect(draft.original === checked).toBe(true);
    expect(draft.code).toBe('x | false');
    // another condition is another node
    expect(
      draft.follow(node.withCondition('x | 1 > 0', lambdaOf('x | 1 > 0'))),
    ).toBe(false);
  });
});
