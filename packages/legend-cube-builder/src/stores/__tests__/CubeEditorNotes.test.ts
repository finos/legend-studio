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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  DEFAULT_META,
  Filter,
  Limit,
  Query,
  type StepNote,
} from '@finos/legend-cube';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeRowCountDraft } from '../editors/CubeRowCountDraft.js';

// Notes beside the steps (PLAN §11.31): written, followed as the query
// changes, copied with their step, and edited in the step's editor, each
// change one undo step that leaves the query as it is

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS → filter101 → filter102 → limit101, with these notes */
const chain = (notes?: StepNote[]): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Filter('filter101'),
        new Filter('filter102'),
        new Limit('limit101', 5),
      ],
      [
        new Connection('relational101', 'filter101', 'tds'),
        new Connection('filter101', 'filter102', 'tds'),
        new Connection('filter102', 'limit101', 'tds'),
      ],
      'limit101',
    ),
    meta: { ...DEFAULT_META, notes },
  });

const createState = (document: CubeDocument): CubeEditorState =>
  new CubeEditorState(TEST__createCubeHost().host, document);

beforeEach(() => {
  localStorage.clear();
});

describe('Writing notes', () => {
  test("Writes a step's note, its ends trimmed, as one undo step that leaves the query as it is", () => {
    const state = createState(chain());
    const { query } = state.document;
    state.setStepNote('filter102', '  Only EMEA desks, per Risk \n');
    expect(state.document.meta.notes).toEqual([
      { step: 'filter102', text: 'Only EMEA desks, per Risk' },
    ]);
    expect(state.getStepNote('filter102')).toBe('Only EMEA desks, per Risk');
    // only the meta changed, so the rows stay current
    expect(state.document.query).toBe(query);
    state.undo();
    expect(state.getStepNote('filter102')).toBeUndefined();
    state.redo();
    expect(state.getStepNote('filter102')).toBe('Only EMEA desks, per Risk');
  });

  test('Takes a note away when it is written empty; a note written as it was takes no undo step', () => {
    const state = createState(chain([{ step: 'filter102', text: 'Why' }]));
    state.setStepNote('filter102', ' Why ');
    expect(state.canUndo).toBe(false);
    state.setStepNote('filter102', '  ');
    expect(state.document.meta.notes).toEqual([]);
    expect(state.getStepNote('filter102')).toBeUndefined();
    expect(state.canUndo).toBe(true);
  });

  test('Writes no note in a read-only cube, or for a step the cube lacks', () => {
    const state = createState(chain());
    expect(state.canEditStepNote('filter102')).toBe(true);
    expect(state.canEditStepNote('sort101')).toBe(false);
    state.setStepNote('sort101', 'Why');
    expect(state.document.meta.notes).toBeUndefined();
    state.readOnly = true;
    expect(state.canEditStepNote('filter102')).toBe(false);
    state.setStepNote('filter102', 'Why');
    expect(state.document.meta.notes).toBeUndefined();
  });
});

describe('A note follows its step', () => {
  test('Removing a step removes its note, in the same undo step', () => {
    const state = createState(
      chain([
        { step: 'filter101', text: 'Kept' },
        { step: 'filter102', text: 'Only EMEA' },
      ]),
    );
    state.removeNode('filter102');
    expect(state.document.meta.notes).toEqual([
      { step: 'filter101', text: 'Kept' },
    ]);
    state.undo();
    expect(state.getStepNote('filter102')).toBe('Only EMEA');
    expect(state.document.query.getNode('filter102')).toBeDefined();
  });

  test('A new step given the id of a removed one starts without its note', () => {
    const state = createState(
      chain([{ step: 'filter102', text: 'Only EMEA' }]),
    );
    state.removeNode('filter102');
    // ids are the highest number plus one, so the id comes back
    expect(state.addNode(Filter.TYPE, 'filter101')).toBe('filter102');
    expect(state.getStepNote('filter102')).toBeUndefined();
  });

  test('Copy and Paste, and Duplicate, give the copy the step’s note, in one undo step', () => {
    const state = createState(
      chain([{ step: 'filter102', text: 'Only EMEA' }]),
    );
    state.copyNode('filter102');
    state.pasteNode('limit101');
    expect(state.document.query.getInputIds('filter103')).toEqual(['limit101']);
    expect(state.getStepNote('filter103')).toBe('Only EMEA');
    state.duplicateNode('filter102');
    expect(state.getStepNote('filter104')).toBe('Only EMEA');
    // each copy and its note are one undo step
    state.undo();
    expect(state.document.query.getNode('filter104')).toBeUndefined();
    expect(state.getStepNote('filter104')).toBeUndefined();
    expect(state.getStepNote('filter103')).toBe('Only EMEA');
  });

  test('Pastes the note the step had when it was copied, even once the step is gone', () => {
    const state = createState(
      chain([{ step: 'filter102', text: 'Only EMEA' }]),
    );
    state.copyNode('filter102');
    state.setStepNote('filter102', 'Changed after the copy');
    state.removeNode('filter102');
    state.pasteNode('filter101');
    expect(state.getStepNote('filter102')).toBe('Only EMEA');
  });

  test('A step copied without a note is pasted without one', () => {
    const state = createState(
      chain([{ step: 'filter102', text: 'Only EMEA' }]),
    );
    state.copyNode('filter101');
    state.pasteNode('limit101');
    expect(state.document.meta.notes).toEqual([
      { step: 'filter102', text: 'Only EMEA' },
    ]);
  });
});

describe("The note in the step's editor", () => {
  test('Applies a note written in the editor without replacing the step, so the rows stay current', () => {
    const state = createState(chain());
    const { query } = state.document;
    const { nodeEditor } = state;
    nodeEditor.open('filter102');
    expect(nodeEditor.noteText).toBe('');
    nodeEditor.setNoteText('Only EMEA, per Risk ');
    expect(nodeEditor.hasNoteChanges).toBe(true);
    expect(nodeEditor.hasStepChanges).toBe(false);
    expect(nodeEditor.hasChanges).toBe(true);
    expect(nodeEditor.finish()).toBe(true);
    expect(state.getStepNote('filter102')).toBe('Only EMEA, per Risk');
    expect(state.document.query).toBe(query);
    state.undo();
    expect(state.getStepNote('filter102')).toBeUndefined();
  });

  test('Cancel drops the note written; a note written back as it was is no change', () => {
    const state = createState(chain([{ step: 'filter102', text: 'Why' }]));
    const { nodeEditor } = state;
    nodeEditor.open('filter102');
    expect(nodeEditor.noteText).toBe('Why');
    nodeEditor.setNoteText('Why not');
    nodeEditor.cancel();
    expect(state.getStepNote('filter102')).toBe('Why');
    nodeEditor.open('filter102');
    nodeEditor.setNoteText(' Why ');
    expect(nodeEditor.hasChanges).toBe(false);
    nodeEditor.finish();
    expect(state.canUndo).toBe(false);
  });

  test("Applies the step's settings and its note as one undo step", () => {
    const state = createState(chain());
    const { nodeEditor } = state;
    nodeEditor.open('limit101');
    (nodeEditor.draft as CubeRowCountDraft<Limit>).setSizeText('10');
    nodeEditor.setNoteText('Ten is enough');
    nodeEditor.finish();
    expect((state.document.query.getNode('limit101') as Limit).size).toBe(10);
    expect(state.getStepNote('limit101')).toBe('Ten is enough');
    state.undo();
    expect((state.document.query.getNode('limit101') as Limit).size).toBe(5);
    expect(state.getStepNote('limit101')).toBeUndefined();
  });

  test("A source's editor, with no settings to edit, applies its note", () => {
    const state = createState(chain());
    const { query } = state.document;
    const { nodeEditor } = state;
    nodeEditor.open('relational101');
    nodeEditor.setNoteText('The daily load');
    nodeEditor.finish();
    expect(state.getStepNote('relational101')).toBe('The daily load');
    expect(state.document.query).toBe(query);
  });

  test('Keeps the note written when its step is replaced underneath, and drops it, saying so, when the step is removed', () => {
    const state = createState(chain());
    const { nodeEditor } = state;
    nodeEditor.open('filter102');
    nodeEditor.setNoteText('Why');
    // e.g. a re-check, which gives the step a new object
    const before = state.document.query.getNode('filter102');
    state.applyQuery(state.document.query.replace(new Filter('filter102')));
    expect(nodeEditor.node).not.toBe(before);
    expect(nodeEditor.nodeId).toBe('filter102');
    expect(nodeEditor.noteText).toBe('Why');
    expect(nodeEditor.hasNoteChanges).toBe(true);
    state.removeNode('filter102');
    expect(nodeEditor.nodeId).toBeUndefined();
    expect(nodeEditor.notice).toBeDefined();
    expect(state.getStepNote('filter102')).toBeUndefined();
  });

  test("Add Note… opens the step's editor asking its Note field for the keyboard, applying the editor open before", () => {
    const state = createState(chain());
    const { nodeEditor } = state;
    nodeEditor.open('filter101');
    nodeEditor.setNoteText('First');
    nodeEditor.openAtNote('filter102');
    expect(state.getStepNote('filter101')).toBe('First');
    expect(nodeEditor.nodeId).toBe('filter102');
    expect(nodeEditor.noteText).toBe('');
    expect(nodeEditor.isNoteFocusRequested).toBe(true);
    nodeEditor.clearNoteFocusRequest();
    expect(nodeEditor.isNoteFocusRequested).toBe(false);
    // on the step already open, the field takes the keyboard again
    nodeEditor.openAtNote('filter102');
    expect(nodeEditor.isNoteFocusRequested).toBe(true);
    nodeEditor.cancel();
    expect(nodeEditor.isNoteFocusRequested).toBe(false);
  });

  test("Shows the step's note until the field is edited, and follows Undo", () => {
    const state = createState(chain());
    state.setStepNote('filter102', 'Why');
    const { nodeEditor } = state;
    nodeEditor.open('filter102');
    expect(nodeEditor.noteText).toBe('Why');
    state.undo();
    expect(nodeEditor.noteText).toBe('');
  });
});
