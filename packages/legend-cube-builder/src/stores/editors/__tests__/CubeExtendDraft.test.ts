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
  Extend,
  type IR,
  type JsonObject,
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
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../fixtures/CubeNorthwindModel.js';
import { CubeExtendDraft, NEW_EXPRESSION_CODE } from '../CubeExtendDraft.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const INTEGER = PrimitiveType.get('Integer');

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

const answerFor = (
  lambdas: ReadonlyMap<NodeId, IR>,
  fail?: (key: NodeId) => CubeEngineError | undefined,
): Map<NodeId, Schema | CubeEngineError> =>
  new Map<NodeId, Schema | CubeEngineError>(
    [...lambdas.keys()].map((key): [NodeId, Schema | CubeEngineError] => {
      const failure = fail?.(key);
      return failure
        ? [key, failure]
        : [
            key,
            new Schema([
              ...ORDERS_COLUMNS,
              ...Array.from(
                { length: Number(key.split('#')[1]) },
                (_, index) => new SchemaColumn(`c${index}`, INTEGER, false),
              ),
            ]),
          ];
    }),
  );

const states: CubeEditorState[] = [];
afterEach(() => {
  states.splice(0).forEach((state) => state.dispose());
});

/** ORDERS, then an Extend of these columns, captured, in an editor whose fake engine answers by default */
const open = (
  extend = new Extend('extend101'),
): { state: CubeEditorState; fake: FakeCubeEngine; draft: CubeExtendDraft } => {
  const { host, fake } = TEST__createCubeHost();
  fake.parseExpression.mockImplementation(async (code, sourceId) => ({
    lambda: lambdaOf(code),
    located: lambdaOf(code, sourceId),
  }));
  // each chain: the input's columns, then Integer columns for its extends
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    answerFor(lambdas),
  );
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), extend],
        [new Connection('relational101', extend.id, 'tds')],
        extend.id,
      ),
    }),
  );
  states.push(state);
  return { state, fake, draft: new CubeExtendDraft(extend, state) };
};

const keysOf = (draft: CubeExtendDraft): number[] =>
  draft.rows.map(({ key }) => key);

describe('Extend draft', () => {
  test('Starts a new extend with one column, named so no column has its name, its code a lambda to finish', () => {
    const { draft } = open();
    expect(draft.rows.map(({ name, code }) => [name, code])).toEqual([
      ['col_1', NEW_EXPRESSION_CODE],
    ]);
    expect(draft.build() === draft.original).toBe(true);
    expect(draft.isValidated).toBe(false);
    expect(draft.applyDisabledReason).toBe(
      'Validate the expressions first (F10)',
    );
    draft.addRow();
    expect(draft.rows.map(({ name }) => name)).toEqual(['col_1', 'col_2']);
  });

  test('Validates: parses each code under its row, types the columns located, plans them, then Apply stores a typed node', async () => {
    const { state, fake, draft } = open();
    const [first] = keysOf(draft);
    draft.setCode(first ?? 0, 'x | $x.ORDER_ID + 1');
    draft.addRow();
    const second = keysOf(draft)[1] ?? 0;
    draft.setCode(second, 'x | $x.col_1 * 2');
    await flowResult(draft.validate());
    expect(
      fake.parseExpression.mock.calls.map(([code, id]) => [code, id]),
    ).toEqual([
      ['x | $x.ORDER_ID + 1', `extend101:${first}`],
      ['x | $x.col_1 * 2', `extend101:${second}`],
    ]);
    // typed located, so an error points into the code
    const typed = fake.typeLambdas.mock.calls.at(-1)?.[1];
    expect([...(typed?.keys() ?? [])]).toEqual(['extend101#1', 'extend101#2']);
    expect(JSON.stringify(typed?.get('extend101#2'))).toContain(
      `"sourceId":"extend101:${second}"`,
    );
    expect(fake.planLambda).toHaveBeenCalledTimes(1);
    expect(
      draft.rows.map(({ type, problem }) => [type?.displayName, problem]),
    ).toEqual([
      ['Integer', undefined],
      ['Integer', undefined],
    ]);
    expect(draft.applyDisabledReason).toBeUndefined();
    // the node holds the lambdas without locations, and its typing
    const built = draft.build();
    expect(JSON.stringify(built.columns)).not.toContain('sourceId');
    expect(built.typing.kind).toBe('typed');
    state.applyQuery(state.document.query.replace(built));
    expect(state.analysis.validity.get('extend101')).toEqual([]);
    // a code edit asks for another Validate, and drops the type
    draft.setCode(second, 'x | $x.col_1 * 3');
    expect(draft.applyDisabledReason).toBe(
      'Validate the expressions first (F10)',
    );
    expect(draft.rows[1]?.type).toBeUndefined();
    expect(draft.build().columns[1]?.lambda).toBeUndefined();
  });

  test('Puts a parse error on its row, located, and types nothing', async () => {
    const { fake, draft } = open();
    const [key] = keysOf(draft);
    draft.setCode(key ?? 0, 'x | $x.ORDER_ID +');
    fake.parseExpression.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "no viable alternative at input '+'",
        undefined,
        undefined,
        {
          sourceId: `extend101:${key}`,
          startLine: 1,
          startColumn: 17,
          endLine: 1,
          endColumn: 17,
        },
      ),
    );
    await flowResult(draft.validate());
    expect(draft.rows[0]?.problem).toEqual({
      message: "no viable alternative at input '+'",
      location: {
        sourceId: `extend101:${key}`,
        startLine: 1,
        startColumn: 17,
        endLine: 1,
        endColumn: 17,
      },
      hint: undefined,
    });
    expect(fake.typeLambdas).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ size: 1 }),
    );
    expect(draft.applyDisabledReason).toBe(
      'Validate the expressions first (F10)',
    );
  });

  test('Puts a typing error on the column it names, with the toOne() hint for a column that can be empty', async () => {
    const { fake, draft } = open();
    draft.setCode(keysOf(draft)[0] ?? 0, 'x | 1');
    draft.addRow();
    draft.setCode(keysOf(draft)[1] ?? 0, 'x | $x.SHIP_VIA + 1');
    fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
      answerFor(lambdas, (key) =>
        key === 'extend101#2'
          ? new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              'Collection element must have a multiplicity [1] - Context:[...]',
              'extend101#2',
            )
          : undefined,
      ),
    );
    await flowResult(draft.validate());
    expect(draft.rows[0]?.problem).toBeUndefined();
    expect(draft.rows[1]?.problem?.hint).toBe(
      'A column that can be empty needs ->toOne() first, such as $x.QTY->toOne() + 1.',
    );
    expect(draft.typing?.kind).toBe('failed');
    expect(fake.planLambda).not.toHaveBeenCalled();
  });

  test("Plans again column by column to find the one the database can't run", async () => {
    const { fake, draft } = open();
    draft.setCode(keysOf(draft)[0] ?? 0, 'x | 1');
    draft.addRow();
    draft.setCode(keysOf(draft)[1] ?? 0, 'x | [1, 2]->stdDevSample()');
    fake.planLambda.mockImplementation(async (_model, lambda) => {
      if (JSON.stringify(lambda).includes('col_2')) {
        throw new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          'Assert failure at typeInference.pure',
          'extend101',
        );
      }
    });
    await flowResult(draft.validate());
    // the whole node, then the first column alone
    expect(fake.planLambda).toHaveBeenCalledTimes(2);
    expect(draft.rows[0]?.problem).toBeUndefined();
    expect(draft.rows[1]?.problem?.message).toMatch(
      /can't run it: Assert failure at typeInference\.pure$/u,
    );
  });

  test('Moves and removes rows, building their columns in order', () => {
    const { draft } = open(
      new Extend('extend101', [
        { name: 'a', code: 'x | 1', lambda: lambdaOf('x | 1') },
        { name: 'b', code: 'x | 2', lambda: lambdaOf('x | 2') },
      ]),
    );
    // saved lambdas count as validated
    expect(draft.isValidated).toBe(true);
    const [a, b] = keysOf(draft);
    draft.moveRow(b ?? 0, -1);
    expect(draft.build().columns.map(({ name }) => name)).toEqual(['b', 'a']);
    draft.removeRow(a ?? 0);
    expect(draft.build().columns.map(({ name }) => name)).toEqual(['b']);
  });
});
