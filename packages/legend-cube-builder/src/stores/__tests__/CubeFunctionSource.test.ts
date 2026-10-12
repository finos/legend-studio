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
  CubeDocument,
  FunctionSource,
  type IR,
  MESSAGE_PARAMETER_VALUE_INVALID,
  MESSAGE_PARAMETER_WITHOUT_VALUE,
  Query,
  RelationalTableSource,
  resolveCubeType,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import { NORTHWIND_RUNTIME } from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { CUBE_FUNCTION_MESSAGE } from '../../__lib__/LegendCubeFunctionLabels.js';
import {
  ALL_ORDERS,
  ARCHIVE_RUNTIME,
  ARCHIVED,
  FUNCTION_SCHEMA,
  FUNCTIONS_OUTLINE as OUTLINE,
  ORDERS_ABOVE,
  ORDERS_OF,
  SHIPPED,
} from '../../__test-utils__/CubeFunctionTestOutline.js';
import { createCubeDirectModel } from '../../graph-manager/CubeDirectConnection.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeFunctionDraft } from '../editors/CubeFunctionDraft.js';
import { CubeModelReadKind } from '../source-picker/CubeInlineModelTabState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const setUp = (): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({ outline: OUTLINE });
  // the engine types each function's call
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    Promise.resolve(
      new Map([...lambdas.keys()].map((key) => [key, FUNCTION_SCHEMA])),
    ),
  );
  return { state: new CubeEditorState(host), fake };
};

/** Opens the dialog from the palette's Function item, on the model's functions */
const openFunctions = async (
  state: CubeEditorState,
): Promise<CubeEditorState['sourcePicker']['modelTab']> => {
  state.addNode(FunctionSource.TYPE);
  await settle();
  return state.sourcePicker.modelTab;
};

/** The call a typing lambda makes, as `name(arg kinds)` */
const callOf = (ir: IR | undefined): unknown =>
  ir?.k === 'lambda' ? ir.body[0] : undefined;

describe('Adding a function source (PLAN §6.5)', () => {
  test("Opens the model's tab on its functions from the palette, the table item on its tables", async () => {
    const { state } = setUp();
    const tab = await openFunctions(state);
    expect(state.sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.MODEL);
    expect(tab.readKind).toBe(CubeModelReadKind.FUNCTION);
    expect(tab.functions.map((each) => each.path)).toEqual([
      'northwind::allOrders',
      'northwind::ordersAbove',
      'northwind::shipped',
      'northwind::archived',
      'northwind::ordersOf',
    ]);
    tab.setFunctionSearch('ORDERS');
    expect(tab.functions).toHaveLength(3);
    state.sourcePicker.close();
    state.addNode(RelationalTableSource.TYPE);
    expect(tab.readKind).toBe(CubeModelReadKind.TABLE);
  });

  test('Adds a function that leaves the runtime to the cube once each required value is valid, on the runtime picked', async () => {
    const { state, fake } = setUp();
    const tab = await openFunctions(state);
    tab.selectFunction(ORDERS_ABOVE.signature);
    // two runtimes: none is picked for the user
    expect(tab.functionRuntimePath).toBeUndefined();
    expect(tab.functionRuntimes.map((runtime) => runtime.path)).toEqual([
      NORTHWIND_RUNTIME,
      ARCHIVE_RUNTIME,
    ]);
    tab.selectFunctionRuntime(NORTHWIND_RUNTIME);
    expect(tab.canConfirm).toBe(false);
    tab.setFunctionValueText(0, 'lots');
    expect(tab.functionValues[0]).toEqual({ kind: 'invalid', text: 'lots' });
    expect(tab.canConfirm).toBe(false);
    tab.setFunctionValueText(0, '100');
    // the optional String left empty is no value, not ''
    expect(tab.functionValues).toEqual([
      { kind: 'float', value: '100' },
      undefined,
    ]);
    expect(tab.canConfirm).toBe(true);
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.isOpen).toBe(false);
    const [node] = state.document.query.nodes as FunctionSource[];
    expect(node).toBeInstanceOf(FunctionSource);
    expect(node?.function).toBe('northwind::ordersAbove');
    expect(node?.parameters).toEqual([
      { name: 'min', type: resolveCubeType('Float'), optional: false },
      { name: 'status', type: resolveCubeType('String'), optional: true },
    ]);
    expect(node?.values).toEqual([{ kind: 'float', value: '100' }, undefined]);
    expect(node?.resolution).toEqual({
      kind: 'resolved',
      schema: FUNCTION_SCHEMA,
    });
    expect(state.document.context?.runtime).toBe(NORTHWIND_RUNTIME);
    // typed with the engine: its call, with its values
    const [, lambdas] = fake.typeLambdas.mock.calls[0] ?? [];
    expect(callOf(lambdas?.get(node?.id ?? ''))).toMatchObject({
      k: 'func',
      name: 'northwind::ordersAbove',
      params: [
        { k: 'literal', value: { kind: 'float', value: '100' } },
        { k: 'collection', values: [] },
      ],
    });
    expect(state.analysis.validity.get(node?.id ?? '')).toEqual([]);
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.document.context).toBeUndefined();
  });

  test('Runs a cube on the runtime of a function with its own, and refuses one of another runtime after', async () => {
    const { state } = setUp();
    const tab = await openFunctions(state);
    tab.selectFunction(ARCHIVED.signature);
    expect(tab.functionRuntime).toBe(ARCHIVE_RUNTIME);
    await flowResult(state.sourcePicker.confirm());
    expect(state.document.context?.runtime).toBe(ARCHIVE_RUNTIME);
    await openFunctions(state);
    tab.selectFunction(SHIPPED.signature);
    expect(tab.functionProblem).toBe(
      CUBE_FUNCTION_MESSAGE.OTHER_RUNTIME(NORTHWIND_RUNTIME, ARCHIVE_RUNTIME),
    );
    expect(tab.canConfirm).toBe(false);
    // one that leaves it to the cube takes the cube's
    tab.selectFunction(ALL_ORDERS.signature);
    expect(tab.functionRuntimes.map((runtime) => runtime.path)).toEqual([
      ARCHIVE_RUNTIME,
    ]);
    expect(tab.functionRuntimePath).toBe(ARCHIVE_RUNTIME);
    expect(tab.canConfirm).toBe(true);
  });

  test("Won't add a function whose outline says why it can't be", async () => {
    const { state } = setUp();
    const tab = await openFunctions(state);
    tab.selectFunction(ORDERS_OF.signature);
    expect(tab.functionProblem).toBe(ORDERS_OF.problem);
    expect(tab.canConfirm).toBe(false);
  });

  test('Joins the tables of the same model: a function, then a table, in one cube', async () => {
    const { state } = setUp();
    const tab = await openFunctions(state);
    tab.selectFunction(SHIPPED.signature);
    await flowResult(state.sourcePicker.confirm());
    expect(state.canAddNode(RelationalTableSource.TYPE)).toBe(true);
    state.addNode(RelationalTableSource.TYPE);
    await settle();
    expect(tab.readKind).toBe(CubeModelReadKind.TABLE);
    expect(tab.runtimes.map((runtime) => runtime.path)).toEqual([
      NORTHWIND_RUNTIME,
    ]);
    tab.selectSchema('NORTHWIND');
    tab.selectTable('ORDERS');
    await flowResult(state.sourcePicker.confirm());
    expect(state.document.query.nodes.map((node) => node.type)).toEqual([
      'function',
      'relational',
    ]);
    expect(state.analysis.validity.get('relational101')).toEqual([]);
  });

  test("Isn't offered on a cube of a direct connection: a function comes from a model", () => {
    const { state } = setUp();
    state.importDocument(
      new CubeDocument({
        context: {
          model: createCubeDirectModel({ _type: 'saved' }),
          runtime: 'cube::direct::Runtime',
        },
      }),
      false,
    );
    expect(state.sourcePicker.fixedTab).toBe(state.sourcePicker.directTab);
    expect(state.canAddNode(FunctionSource.TYPE)).toBe(false);
    expect(state.canAddNode(RelationalTableSource.TYPE)).toBe(true);
  });
});

describe('A function source in the cube', () => {
  const opened = async (
    values: FunctionSource['values'],
  ): Promise<{ state: CubeEditorState; fake: FakeCubeEngine }> => {
    const { state, fake } = setUp();
    const source = new FunctionSource(
      'function101',
      {
        function: ORDERS_ABOVE.path,
        signature: ORDERS_ABOVE.signature,
        parameters: [
          { name: 'min', type: resolveCubeType('Float'), optional: false },
          { name: 'status', type: resolveCubeType('String'), optional: true },
        ],
      },
      values,
    );
    state.importDocument(
      new CubeDocument({
        context: {
          model: { _type: 'text', code: '' },
          runtime: NORTHWIND_RUNTIME,
        },
        query: new Query([source], [], source.id),
      }),
      false,
    );
    await settle();
    return { state, fake };
  };

  test('Is typed on opening, with a placeholder where a required value is missing', async () => {
    const { state, fake } = await opened([]);
    const typed = state.document.query.getNode('function101') as FunctionSource;
    expect(typed.resolution).toEqual({
      kind: 'resolved',
      schema: FUNCTION_SCHEMA,
    });
    // still invalid: its value is missing
    expect(state.analysis.validity.get('function101')).toEqual([
      MESSAGE_PARAMETER_WITHOUT_VALUE('min'),
    ]);
    const [, lambdas] = fake.typeLambdas.mock.calls[0] ?? [];
    expect(callOf(lambdas?.get('function101'))).toMatchObject({
      name: 'northwind::ordersAbove',
      params: [
        { k: 'literal', value: { kind: 'float', value: '0' } },
        { k: 'collection', values: [] },
      ],
    });
  });

  test('Takes new values in its editor, as one undo step, and keeps its columns', async () => {
    const { state } = await opened([{ kind: 'float', value: '100' }]);
    state.nodeEditor.open('function101');
    const draft = state.nodeEditor.draft as CubeFunctionDraft;
    expect(draft).toBeInstanceOf(CubeFunctionDraft);
    expect(draft.valueTexts).toEqual(['100', '']);
    expect(draft.build()).toBe(draft.original);
    draft.setValueText(0, 'many');
    const errors: string[] = [];
    draft.build().validate([], errors);
    expect(errors).toEqual([
      MESSAGE_PARAMETER_VALUE_INVALID('min', 'many', 'Float'),
    ]);
    draft.setValueText(0, '250.5');
    draft.setValueText(1, 'SHIPPED');
    state.nodeEditor.finish();
    const edited = state.document.query.getNode(
      'function101',
    ) as FunctionSource;
    expect(edited.values).toEqual([
      { kind: 'float', value: '250.5' },
      { kind: 'string', value: 'SHIPPED' },
    ]);
    expect(edited.resolution.kind).toBe('resolved');
    state.undo();
    expect(
      (state.document.query.getNode('function101') as FunctionSource).values[0],
    ).toEqual({ kind: 'float', value: '100' });
  });

  test("Runs with the database type of its runtime's connections", async () => {
    const { state } = await opened([{ kind: 'float', value: '1' }]);
    await flowResult(state.loadModelOutline());
    const { context } = state.document;
    expect(
      state.getRunDatabaseType(
        state.document.query,
        'function101',
        context?.model ?? { _type: 'text' },
        ARCHIVE_RUNTIME,
      ),
    ).toBe('Postgres');
    expect(
      state.getRunDatabaseType(
        state.document.query,
        'function101',
        context?.model ?? { _type: 'text' },
        NORTHWIND_RUNTIME,
      ),
    ).toBe('H2');
  });
});
