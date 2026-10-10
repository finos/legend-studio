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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  Join,
  Limit,
  printIR,
  Query,
} from '@finos/legend-cube';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import type { CubeResult } from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeRowCountDraft } from '../editors/CubeRowCountDraft.js';

// One finish path for the node editor (PLAN §11.8, M3b.2): every close but
// Cancel commits the editor's pending input, then applies its edits as one
// undo step; nothing finishes it while something opened from it holds it open

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const ORDERS_RESULT: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [ORDERS_COLUMNS.map(() => null)],
  sql: ['select * from NORTHWIND.ORDERS'],
  durationMs: 1,
};

/** ORDERS, then limit101 (10) and limit102 of the size, captured at limit102 */
const limitsDocument = (lastSize: number | undefined): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Limit('limit101', 10),
        new Limit('limit102', lastSize),
      ],
      [
        new Connection('relational101', 'limit101', 'tds'),
        new Connection('limit101', 'limit102', 'tds'),
      ],
      'limit102',
    ),
  });

const setUp = (
  document = limitsDocument(3),
): { state: CubeEditorState; fake: FakeCubeEngine } => {
  const { host, fake } = TEST__createCubeHost({ result: ORDERS_RESULT });
  return { state: new CubeEditorState(host, document), fake };
};

/** The open editor's draft, which a Limit's editor edits as text */
const limitDraft = (state: CubeEditorState): CubeRowCountDraft<Limit> =>
  state.nodeEditor.draft as CubeRowCountDraft<Limit>;

/** The size the cube has for a Limit */
const sizeOf = (state: CubeEditorState, nodeId: string): number | undefined =>
  (state.document.query.getNode(nodeId) as Limit | undefined)?.size;

/** Opens the editor on a Limit and types a size into it */
const editLimit = (
  state: CubeEditorState,
  nodeId: string,
  sizeText: string,
): CubeRowCountDraft<Limit> => {
  state.nodeEditor.open(nodeId);
  const draft = limitDraft(state);
  draft.setSizeText(sizeText);
  return draft;
};

/** Waits for the run in flight to end */
const runEnded = async (state: CubeEditorState): Promise<void> => {
  for (let tries = 0; state.execution.isRunning && tries < 50; tries++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(state.execution.isRunning).toBe(false);
};

beforeEach(() => {
  localStorage.clear();
});

describe('Finishing the node editor', () => {
  test('Applies the edits as one undo step and closes', () => {
    const { state } = setUp();
    const before = state.document;
    editLimit(state, 'limit101', '5');
    expect(state.nodeEditor.finish()).toBe(true);
    expect(sizeOf(state, 'limit101')).toBe(5);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toBe(before);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(state.nodeEditor.draft).toBeUndefined();
  });

  test('Adds no undo step without changes, and only closes', () => {
    const { state } = setUp();
    const before = state.document;
    // an edit put back by hand is no change
    editLimit(state, 'limit101', '5').setSizeText('10');
    expect(state.nodeEditor.finish()).toBe(true);
    expect(state.document).toBe(before);
    expect(state.history).toHaveLength(0);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test('Says the editor is closed when nothing is open', () => {
    const { state } = setUp();
    expect(state.nodeEditor.finish()).toBe(true);
    expect(state.history).toHaveLength(0);
  });

  test("Commits the editor's pending input before applying, with every flusher still registered", () => {
    const { state } = setUp();
    const { nodeEditor } = state;
    nodeEditor.open('limit101');
    const draft = limitDraft(state);
    // a field that stores its text only when it loses the focus
    const kept = jest.fn(() => draft.setSizeText('7'));
    const removed = jest.fn(() => draft.setSizeText('8'));
    nodeEditor.addFlusher(kept);
    const remove = nodeEditor.addFlusher(removed);
    remove();
    expect(nodeEditor.finish()).toBe(true);
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    expect(sizeOf(state, 'limit101')).toBe(7);
    expect(state.history).toHaveLength(1);
  });

  test('Runs a flusher asked to run first before the others, whenever it was added', () => {
    const { state } = setUp();
    state.nodeEditor.open('limit101');
    const order: string[] = [];
    state.nodeEditor.addFlusher(() => order.push('warehouse'));
    state.nodeEditor.addFlusher(() => order.push('blur'), { first: true });
    state.nodeEditor.addFlusher(() => order.push('other'));
    state.nodeEditor.finish();
    expect(order).toEqual(['blur', 'warehouse', 'other']);
  });

  test('Applies nothing in a read-only cube, and closes', () => {
    const { state } = setUp(new CubeDocument());
    state.importDocument(limitsDocument(3), true);
    const { document } = state;
    const steps = state.history.length;
    editLimit(state, 'limit101', '5');
    expect(state.nodeEditor.hasChanges).toBe(true);
    expect(state.hasEditsToApply).toBe(false);
    expect(state.nodeEditor.finish()).toBe(true);
    expect(state.document).toBe(document);
    expect(state.history).toHaveLength(steps);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test("Closes with a notice, storing nothing, when the query can't take the edits", () => {
    const { state } = setUp();
    const before = state.document;
    state.nodeEditor.open('limit101');
    // a node without the Limit's input port can't replace it
    jest
      .spyOn(limitDraft(state), 'build')
      .mockReturnValue(new Join('limit101') as never);
    expect(state.nodeEditor.hasChanges).toBe(true);
    expect(state.nodeEditor.finish()).toBe(true);
    expect(state.document).toBe(before);
    expect(state.history).toHaveLength(0);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(state.nodeEditor.notice).toBe(
      "The query can't take the changes to limit101, so the editor of limit101 closed without applying its changes.",
    );
  });
});

describe('Holding the node editor open', () => {
  test('Nothing finishes it while held: it stays open with its edits', () => {
    const { state } = setUp();
    const { nodeEditor } = state;
    const draft = editLimit(state, 'limit101', '5');
    const release = nodeEditor.holdOpen();
    expect(nodeEditor.isHeld).toBe(true);
    expect(nodeEditor.finish()).toBe(false);
    expect(nodeEditor.nodeId).toBe('limit101');
    expect(nodeEditor.draft).toBe(draft);
    expect(draft.sizeText).toBe('5');
    expect(state.history).toHaveLength(0);
    release();
    expect(nodeEditor.isHeld).toBe(false);
    expect(nodeEditor.finish()).toBe(true);
    expect(sizeOf(state, 'limit101')).toBe(5);
  });

  test('Each hold is released once, however often its release is called', () => {
    const { state } = setUp();
    const { nodeEditor } = state;
    nodeEditor.open('limit101');
    const releaseFirst = nodeEditor.holdOpen();
    const releaseSecond = nodeEditor.holdOpen();
    releaseFirst();
    releaseFirst();
    expect(nodeEditor.isHeld).toBe(true);
    expect(nodeEditor.finish()).toBe(false);
    releaseSecond();
    expect(nodeEditor.isHeld).toBe(false);
    expect(nodeEditor.finish()).toBe(true);
  });

  test('Opening another node does nothing while held', () => {
    const { state } = setUp();
    const { nodeEditor } = state;
    const draft = editLimit(state, 'limit101', '5');
    nodeEditor.holdOpen();
    nodeEditor.open('limit102');
    expect(nodeEditor.nodeId).toBe('limit101');
    expect(nodeEditor.draft).toBe(draft);
    expect(state.history).toHaveLength(0);
  });
});

describe('Opening another node', () => {
  test("Applies the open editor's edits as one undo step, then opens the other node", () => {
    const { state } = setUp();
    const before = state.document;
    editLimit(state, 'limit101', '5');
    state.nodeEditor.open('limit102');
    expect(sizeOf(state, 'limit101')).toBe(5);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toBe(before);
    expect(state.nodeEditor.nodeId).toBe('limit102');
    expect(state.nodeEditor.node).toBe(
      state.document.query.getNode('limit102'),
    );
    expect(state.nodeEditor.hasChanges).toBe(false);
  });

  test("Drops an earlier editor's notice", () => {
    const { state } = setUp();
    state.nodeEditor.open('limit101');
    jest
      .spyOn(limitDraft(state), 'build')
      .mockReturnValue(new Join('limit101') as never);
    state.nodeEditor.finish();
    expect(state.nodeEditor.notice).toBeDefined();
    state.nodeEditor.open('limit102');
    expect(state.nodeEditor.notice).toBeUndefined();
    expect(state.nodeEditor.nodeId).toBe('limit102');
  });
});

describe('Execute and Undo with edits', () => {
  test('Execute applies the edits, then runs the edited query, even when the stored one could not run', async () => {
    const { state, fake } = setUp(limitsDocument(undefined));
    expect(state.execution.canExecute).toBe(false);
    editLimit(state, 'limit102', '5');
    expect(state.hasEditsToApply).toBe(true);
    state.executeEdited();
    expect(sizeOf(state, 'limit102')).toBe(5);
    expect(state.history).toHaveLength(1);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(state.execution.isRunning).toBe(true);
    await runEnded(state);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(printIR(fake.execute.mock.calls[0]?.[1] as never)).toContain(
      '->limit(5)',
    );
    expect(state.execution.result?.query).toBe(state.document.query);
  });

  test("Execute applies the edits but runs nothing when the edited query can't run", async () => {
    const { state, fake } = setUp();
    editLimit(state, 'limit102', '');
    state.executeEdited();
    expect(sizeOf(state, 'limit102')).toBeUndefined();
    expect(state.history).toHaveLength(1);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(state.execution.isRunning).toBe(false);
    await runEnded(state);
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test('Execute runs nothing while the editor is held open', () => {
    const { state, fake } = setUp();
    editLimit(state, 'limit102', '5');
    state.nodeEditor.holdOpen();
    state.executeEdited();
    expect(state.execution.isRunning).toBe(false);
    expect(fake.execute).not.toHaveBeenCalled();
    expect(state.history).toHaveLength(0);
  });

  test('Undo applies the edits, then undoes them, back to the cube before them', () => {
    const { state } = setUp();
    state.applyDocument(state.document.withName('Orders'));
    editLimit(state, 'limit101', '5');
    expect(state.hasEditsToApply).toBe(true);
    state.undoEdited();
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(sizeOf(state, 'limit101')).toBe(10);
    expect(state.document.name).toBe('Orders');
    expect(state.history).toHaveLength(1);
  });

  test("Execute and Undo stop after edits the query can't take are dropped", async () => {
    const { state, fake } = setUp();
    state.applyDocument(state.document.withName('Orders'));
    const unappliable = (): void => {
      state.nodeEditor.open('limit101');
      jest
        .spyOn(limitDraft(state), 'build')
        .mockReturnValue(new Join('limit101') as never);
    };
    unappliable();
    expect(state.nodeEditor.finishApplied()).toBe(false);
    unappliable();
    state.executeEdited();
    expect(state.nodeEditor.notice).toBeDefined();
    await runEnded(state);
    expect(fake.execute).not.toHaveBeenCalled();
    unappliable();
    state.undoEdited();
    expect(state.nodeEditor.notice).toBeDefined();
    // the change before the dropped edits stays
    expect(state.document.name).toBe('Orders');
    expect(state.history).toHaveLength(1);
  });

  test('finishApplied says whether the edits are in the cube: not while held', () => {
    const { state } = setUp();
    editLimit(state, 'limit101', '5');
    const release = state.nodeEditor.holdOpen();
    expect(state.nodeEditor.finishApplied()).toBe(false);
    release();
    expect(state.nodeEditor.finishApplied()).toBe(true);
    expect(sizeOf(state, 'limit101')).toBe(5);
  });

  test('Undo with no edits undoes the last change and closes the editor', () => {
    const { state } = setUp();
    state.applyDocument(state.document.withName('Orders'));
    state.nodeEditor.open('limit101');
    state.undoEdited();
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(state.document.name).toBeUndefined();
    expect(state.history).toHaveLength(0);
  });
});
