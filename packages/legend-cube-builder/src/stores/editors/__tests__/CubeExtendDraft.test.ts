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
  OpaqueType,
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
import { getEditorKeptOpenNotice } from '../../../__lib__/LegendCubeLabels.js';
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

  test("Puts Cube's own problems on their rows before the engine types anything", async () => {
    const { fake, draft } = open();
    fake.parseExpression.mockImplementation(async (code, sourceId) => {
      const lambda: JsonObject =
        code === '1'
          ? { _type: 'integer', value: '1' }
          : code === '{a, b | 1}'
            ? {
                _type: 'lambda',
                parameters: [
                  { _type: 'var', name: 'a' },
                  { _type: 'var', name: 'b' },
                ],
                body: [{ _type: 'integer', value: '1' }],
              }
            : lambdaOf(code, sourceId);
      return { lambda, located: lambda };
    });
    const [first] = keysOf(draft);
    // ORDERS has SHIP_VIA: the engine, which compares names exactly, would type it
    draft.setName(first ?? 0, 'ship_via');
    draft.setCode(first ?? 0, 'x | 1');
    draft.addRow();
    draft.setCode(keysOf(draft)[1] ?? 0, '1');
    draft.addRow();
    draft.setCode(keysOf(draft)[2] ?? 0, '{a, b | 1}');
    await flowResult(draft.validate());
    expect(draft.rows.map(({ problem }) => problem?.message)).toEqual([
      'Column "ship_via" is already present in the input schema.',
      // the first row's name was free again for the next
      '"col_1" must be a lambda with one parameter, such as x | $x.PRICE.',
      '"col_2" must be a lambda with one parameter, such as x | $x.PRICE.',
    ]);
    expect(fake.typeLambdas).not.toHaveBeenCalled();
    expect(fake.planLambda).not.toHaveBeenCalled();
    expect(draft.typing?.kind).toBe('unresolved');
  });

  test("Puts a type Cube can't hold on its row, and plans nothing", async () => {
    const { fake, draft } = open();
    fake.typeLambdas.mockImplementation(
      async (_model, lambdas) =>
        new Map(
          [...lambdas.keys()].map((key) => [
            key,
            new Schema([
              ...ORDERS_COLUMNS,
              new SchemaColumn(
                'col_1',
                OpaqueType.get('meta::pure::metamodel::type::Any'),
                false,
              ),
            ]),
          ]),
        ),
    );
    draft.setCode(keysOf(draft)[0] ?? 0, "x | if(true, |1, |'a')");
    await flowResult(draft.validate());
    expect(draft.rows[0]?.problem?.message).toBe(
      '"col_1" does not have a valid type.',
    );
    expect(fake.planLambda).not.toHaveBeenCalled();
  });

  test("Names the first column the database can't run, planning only up to it", async () => {
    const { fake, draft } = open();
    draft.setCode(keysOf(draft)[0] ?? 0, 'x | [1, 2]->stdDevSample()');
    draft.addRow();
    draft.setCode(keysOf(draft)[1] ?? 0, 'x | 1');
    draft.addRow();
    draft.setCode(keysOf(draft)[2] ?? 0, 'x | 2');
    // every plan has the first column
    fake.planLambda.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Assert failure at typeInference.pure',
        'extend101',
      ),
    );
    await flowResult(draft.validate());
    // the whole node, then the first column alone
    expect(fake.planLambda).toHaveBeenCalledTimes(2);
    expect(draft.rows.map(({ problem }) => problem !== undefined)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe('Extend editor panel', () => {
  test('Stays open while its expressions wait for Validate, rather than storing or dropping them', async () => {
    const { state } = open();
    const { nodeEditor } = state;
    nodeEditor.open('extend101');
    const draft = nodeEditor.draft as CubeExtendDraft;
    draft.setCode(keysOf(draft)[0] ?? 0, 'x | 2');
    nodeEditor.apply();
    expect(state.history).toHaveLength(0);
    nodeEditor.close();
    expect(nodeEditor.nodeId).toBe('extend101');
    expect(nodeEditor.notice).toBe(
      getEditorKeptOpenNotice(
        'extend101',
        'Validate the expressions first (F10)',
      ),
    );
    // another node
    nodeEditor.open('relational101');
    expect(nodeEditor.nodeId).toBe('extend101');
    expect(nodeEditor.draft === draft).toBe(true);
    // every other way of finishing with it too: a click on the canvas or
    // outside, Escape, a shortcut (PLAN §11.8)
    expect(nodeEditor.finish()).toBe(false);
    expect(nodeEditor.finishApplied()).toBe(false);
    expect(nodeEditor.nodeId).toBe('extend101');
    expect(nodeEditor.draft === draft).toBe(true);
    expect(state.history).toHaveLength(0);
    // validated, it closes, applying
    await flowResult(draft.validate());
    nodeEditor.close();
    expect(nodeEditor.nodeId).toBeUndefined();
    expect(nodeEditor.notice).toBeUndefined();
    expect(
      (state.document.query.getNode('extend101') as Extend).columns[0]?.code,
    ).toBe('x | 2');
    // Cancel drops the changes
    nodeEditor.open('extend101');
    const next = nodeEditor.draft as CubeExtendDraft;
    next.setCode(keysOf(next)[0] ?? 0, 'x | 3');
    nodeEditor.cancel();
    expect(nodeEditor.nodeId).toBeUndefined();
  });

  test('Goes on with its edits when the engine types the node in the background', async () => {
    const { state } = open();
    const { nodeEditor } = state;
    nodeEditor.open('extend101');
    const draft = nodeEditor.draft as CubeExtendDraft;
    const [key] = keysOf(draft);
    draft.setCode(key ?? 0, 'x | 1');
    await flowResult(draft.validate());
    // a rename keeps the codes validated, but not the typing: the stored
    // node waits, and the engine types it in the background
    draft.setName(key ?? 0, 'renamed');
    nodeEditor.apply();
    const stored = state.document.query.getNode('extend101') as Extend;
    expect(state.isTypingNode(stored)).toBe(true);
    const editing = nodeEditor.draft as CubeExtendDraft;
    editing.addRow();
    editing.setCode(keysOf(editing)[1] ?? 0, 'x | $x.renamed + 1');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const typed = state.document.query.getNode('extend101') as Extend;
    expect(typed === stored).toBe(false);
    expect(typed.typing.kind).toBe('typed');
    // the panel follows it, with the rows being edited
    expect(nodeEditor.nodeId).toBe('extend101');
    expect(nodeEditor.notice).toBeUndefined();
    expect(nodeEditor.draft === editing).toBe(true);
    expect(editing.original === typed).toBe(true);
    expect(editing.rows.map(({ code }) => code)).toEqual([
      'x | 1',
      'x | $x.renamed + 1',
    ]);
    expect(nodeEditor.hasChanges).toBe(true);
  });
});
