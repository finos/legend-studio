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
  ERR_TYPING,
  Extend,
  type ExtendColumn,
  type IR,
  type JsonObject,
  PrimitiveType,
  Query,
  Restrict,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { getCubeCanvasNodeStatus } from '../../components/canvas/CubeCanvasElements.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const INTEGER = PrimitiveType.get('Integer');
const LAMBDA: JsonObject = {
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [{ _type: 'integer', value: '1' }],
};
const column = (name: string): ExtendColumn => ({
  name,
  code: 'x | 1',
  lambda: LAMBDA,
});

/** ORDERS, maybe restricted, then an untyped Extend of these columns, captured */
const ordersExtended = (names: string[], restricted = false): Query => {
  const nodes = [
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    ...(restricted
      ? [new Restrict('restrict101', ['ORDER_ID', 'SHIP_VIA'])]
      : []),
    new Extend('extend101', names.map(column)),
  ];
  return new Query(
    nodes,
    nodes
      .slice(1)
      .map(
        (node, index) => new Connection(nodes[index]?.id ?? '', node.id, 'tds'),
      ),
    'extend101',
  );
};

/** The engine's answer to typing a chain: the input's columns, then Integer columns named as the chain's extends */
const answerFor = (
  lambdas: ReadonlyMap<NodeId, IR>,
  fail?: (key: NodeId) => CubeEngineError | undefined,
): Map<NodeId, Schema | CubeEngineError> =>
  new Map<NodeId, Schema | CubeEngineError>(
    [...lambdas.keys()].map((key): [NodeId, Schema | CubeEngineError] => {
      const failure = fail?.(key);
      if (failure) {
        return [key, failure];
      }
      const count = Number(key.split('#')[1]);
      return [
        key,
        new Schema([
          ...ORDERS_COLUMNS,
          ...Array.from(
            { length: count },
            (_, index) =>
              new SchemaColumn(String.fromCharCode(97 + index), INTEGER, false),
          ),
        ]),
      ];
    }),
  );

/** Makes the fake answer each typing when the test says so */
const deferTyping = (
  fake: FakeCubeEngine,
): Array<{
  lambdas: ReadonlyMap<NodeId, IR>;
  resolve: (answer: Map<NodeId, Schema | CubeEngineError>) => void;
  reject: (error: unknown) => void;
}> => {
  const calls: ReturnType<typeof deferTyping> = [];
  fake.typeLambdas.mockImplementation(
    (_model, lambdas) =>
      new Promise((resolve, reject) => {
        calls.push({ lambdas, resolve, reject });
      }),
  );
  return calls;
};

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

let editorStates: CubeEditorState[] = [];

afterEach(() => {
  editorStates.forEach((state) => state.dispose());
  editorStates = [];
});

const open = (
  query: Query,
): {
  state: CubeEditorState;
  fake: FakeCubeEngine;
  calls: ReturnType<typeof deferTyping>;
} => {
  const { host, fake } = TEST__createCubeHost();
  const calls = deferTyping(fake);
  const state = new CubeEditorState(
    host,
    new CubeDocument({ context: CONTEXT, query }),
  );
  editorStates.push(state);
  return { state, fake, calls };
};

const extendOf = (state: CubeEditorState): Extend =>
  state.document.query.getNode('extend101') as Extend;

describe('Extend retyping', () => {
  test('Types a waiting Extend in the background, in one call, outside the undo history', async () => {
    const { state, calls } = open(ordersExtended(['a', 'b']));
    expect(calls).toHaveLength(1);
    expect([...(calls[0]?.lambdas.keys() ?? [])]).toEqual([
      'extend101#1',
      'extend101#2',
    ]);
    // pending meanwhile: no error, and the node shows it is being typed
    expect(state.analysis.validity.get('extend101')).toEqual([ERR_TYPING]);
    expect(state.isTypingExtends).toBe(true);
    const status = getCubeCanvasNodeStatus(state, extendOf(state));
    expect(status.isInvalid).toBe(false);
    expect(status.isResolving).toBe(true);
    // no second call while the first is out
    expect(state.extendsToType).toEqual([]);
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(extendOf(state).typing.kind).toBe('typed');
    expect(state.analysis.validity.get('extend101')).toEqual([]);
    expect(state.analysis.schemas.get('extend101')?.names().slice(-2)).toEqual([
      'a',
      'b',
    ]);
    expect(state.isTypingExtends).toBe(false);
    expect(state.history).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });

  test('Shows on the column the engine failed on, and names no column when it could not be reached', async () => {
    const { state, calls } = open(ordersExtended(['a', 'b']));
    calls[0]?.resolve(
      answerFor(calls[0].lambdas, (key) =>
        key === 'extend101#2'
          ? new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              "The column 'NOPE' can't be found",
              'extend101',
            )
          : undefined,
      ),
    );
    await settle();
    expect(state.analysis.validity.get('extend101')).toEqual([
      `"b" can't be typed: The column 'NOPE' can't be found`,
    ]);
    // a failure is no reason to type again
    expect(calls).toHaveLength(1);

    const second = open(ordersExtended(['a']));
    second.calls[0]?.reject(new Error('Failed to fetch'));
    await settle();
    expect(second.state.analysis.validity.get('extend101')).toEqual([
      "The new columns can't be typed: Failed to fetch",
    ]);
  });

  test('Drops an answer for a node changed meanwhile, and types the new one', async () => {
    const { state, calls } = open(ordersExtended(['a']));
    // the user renames the column while the engine types it
    const renamed = extendOf(state).withColumns([column('b')]);
    state.applyQuery(state.document.query.replace(renamed));
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(extendOf(state) === renamed).toBe(true);
    expect(extendOf(state).typing.kind).toBe('unresolved');
    // its own round
    expect(calls).toHaveLength(2);
    calls[1]?.resolve(answerFor(calls[1].lambdas));
    await settle();
    expect(extendOf(state).typing.kind).toBe('typed');
    // the undo snapshot keeps its node, typed only if it was sent
    expect(state.history).toHaveLength(1);
  });

  test('Types an Extend again once its input changes', async () => {
    const { state, calls } = open(ordersExtended(['a'], true));
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    expect(state.analysis.validity.get('extend101')).toEqual([]);
    const restrict = state.document.query.getNode('restrict101') as Restrict;
    state.applyQuery(
      state.document.query.replace(
        new Restrict('restrict101', [...restrict.columns, 'FREIGHT']),
      ),
    );
    expect(state.analysis.validity.get('extend101')).toEqual([ERR_TYPING]);
    expect(calls).toHaveLength(2);
  });

  test('Types every Extend once on import, a typed one too, and keeps a typing that comes back the same', async () => {
    const { state, calls } = open(ordersExtended(['a']));
    calls[0]?.resolve(answerFor(calls[0].lambdas));
    await settle();
    const typed = extendOf(state);
    expect(typed.typing.kind).toBe('typed');
    state.importDocument(state.document, false);
    expect(calls).toHaveLength(2);
    calls[1]?.resolve(answerFor(calls[1].lambdas));
    await settle();
    // the same node: nothing changed
    expect(extendOf(state) === typed).toBe(true);
    expect(state.analysis.validity.get('extend101')).toEqual([]);
  });
});
