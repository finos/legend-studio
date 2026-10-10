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
  DataProductAccessPointSource,
  Join,
  Limit,
  Query,
  RelationalTableSource,
} from '@finos/legend-cube';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../graph-manager/CubeDirectConnection.js';
import {
  addCubeNode,
  canAddCubeNode,
  getCubeAddAfterId,
} from '../CubeAddPlacement.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeRowCountDraft } from '../editors/CubeRowCountDraft.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

// One placement rule for the palette, drops and the context menu (PLAN §11.8,
// QUESTIONS.md U3 and U4): a transform goes after the node it targets, else
// after the selected node; a source opens the source dialog on its tab

const TABLE = RelationalTableSource.TYPE;
const DATA_PRODUCT = DataProductAccessPointSource.TYPE;

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** The slice query, with the Join, which feeds the Filter, selected */
const joinSelectedQuery = (): Query => {
  const query = sliceQuery();
  return new Query(query.nodes, query.connections, 'join101');
};

/** ORDERS, then limit101 (10) and limit102 (3), captured at limit102 */
const limitsDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        new Limit('limit101', 10),
        new Limit('limit102', 3),
      ],
      [
        new Connection('relational101', 'limit101', 'tds'),
        new Connection('limit101', 'limit102', 'tds'),
      ],
      'limit102',
    ),
  });

const setUp = (document?: CubeDocument): CubeEditorState =>
  new CubeEditorState(TEST__createCubeHost().host, document);

/** Opens the editor on a Limit and types a size into it */
const editLimit = (
  state: CubeEditorState,
  nodeId: string,
  sizeText: string,
): CubeRowCountDraft<Limit> => {
  state.nodeEditor.open(nodeId);
  const draft = state.nodeEditor.draft as CubeRowCountDraft<Limit>;
  draft.setSizeText(sizeText);
  return draft;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Placing a transform', () => {
  test('Splices it in after the node it targets, leaving the capture where it was', () => {
    const state = setUp(new CubeDocument({ query: sliceQuery() }));
    expect(getCubeAddAfterId(state, 'filter', 'relational102')).toBe(
      'relational102',
    );
    expect(canAddCubeNode(state, 'filter', 'relational102')).toBe(true);
    addCubeNode(state, 'filter', 'relational102');
    const { query } = state.document;
    expect(query.nodes).toHaveLength(5);
    expect(query.getInputIds('filter102')).toEqual(['relational102']);
    expect(query.getInputIds('join101')).toEqual([
      'relational101',
      'filter102',
    ]);
    expect(query.selected).toBe('filter101');
    expect(state.history).toHaveLength(1);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test('Splices it in after the selected node without a target, and captures it', () => {
    const state = setUp(new CubeDocument({ query: joinSelectedQuery() }));
    expect(getCubeAddAfterId(state, 'filter')).toBe('join101');
    addCubeNode(state, 'filter');
    const { query } = state.document;
    expect(query.nodes).toHaveLength(5);
    expect(query.getInputIds('filter102')).toEqual(['join101']);
    expect(query.getInputIds('filter101')).toEqual(['filter102']);
    expect(query.getInputIds('join101')).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(query.selected).toBe('filter102');
    expect(state.history).toHaveLength(1);
    // added with its defaults: no editor opens on it
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test('Adds it on its own in an empty query, where it is the capture', () => {
    const state = setUp();
    expect(getCubeAddAfterId(state, 'filter')).toBeUndefined();
    expect(canAddCubeNode(state, 'filter')).toBe(true);
    addCubeNode(state, 'filter');
    const { query } = state.document;
    expect(query.nodes.map((node) => node.id)).toEqual(['filter101']);
    expect(query.connections).toEqual([]);
    expect(query.selected).toBe('filter101');
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test('Adds nothing after a node the query does not have', () => {
    const state = setUp(new CubeDocument({ query: sliceQuery() }));
    const { document } = state;
    expect(canAddCubeNode(state, 'filter', 'filter999')).toBe(false);
    addCubeNode(state, 'filter', 'filter999');
    // by identity: a diff of documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.history).toHaveLength(0);
  });
});

describe('Placing a source', () => {
  test('Ignores the node it targets and opens the source dialog, adding nothing until confirmed', () => {
    const state = setUp(new CubeDocument({ query: sliceQuery() }));
    const { document } = state;
    expect(getCubeAddAfterId(state, TABLE, 'join101')).toBeUndefined();
    expect(canAddCubeNode(state, TABLE, 'join101')).toBe(true);
    addCubeNode(state, TABLE, 'join101');
    expect(state.sourcePicker.isOpen).toBe(true);
    // by identity: a diff of documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.history).toHaveLength(0);
  });

  test("Opens the dialog on the source's tab", () => {
    const state = setUp(new CubeDocument({ query: sliceQuery() }));
    addCubeNode(state, DATA_PRODUCT, 'join101');
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(
      CubeSourcePickerTabKey.DATA_PRODUCT,
    );
    state.sourcePicker.close();
    addCubeNode(state, TABLE);
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.MODEL);
  });

  test("Opens a table on the cube's own tab, whatever node it targets", () => {
    const state = setUp(
      new CubeDocument({
        context: {
          model: createCubeDirectModel({ _type: 'saved' }),
          runtime: CUBE_DIRECT_RUNTIME_PATH,
        },
      }),
    );
    addCubeNode(state, TABLE, 'join101');
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(
      CubeSourcePickerTabKey.DIRECT_CONNECTION,
    );
  });
});

describe('Adding in a read-only cube', () => {
  test('Can add nothing, and adds nothing', () => {
    const state = setUp();
    state.importDocument(new CubeDocument({ query: sliceQuery() }), true);
    const { document } = state;
    expect(canAddCubeNode(state, 'filter')).toBe(false);
    expect(canAddCubeNode(state, 'filter', 'join101')).toBe(false);
    expect(canAddCubeNode(state, TABLE)).toBe(false);
    addCubeNode(state, 'filter');
    addCubeNode(state, 'filter', 'join101');
    addCubeNode(state, TABLE);
    // by identity: a diff of documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.sourcePicker.isOpen).toBe(false);
  });
});

describe('Adding with the node editor open', () => {
  test("Applies the editor's edits first, then adds after the selected node", () => {
    const state = setUp(limitsDocument());
    editLimit(state, 'limit101', '5');
    addCubeNode(state, 'filter');
    const { query } = state.document;
    expect((query.getNode('limit101') as Limit).size).toBe(5);
    expect(query.getInputIds('filter101')).toEqual(['limit102']);
    expect(query.selected).toBe('filter101');
    // the edits, then the new node
    expect(state.history).toHaveLength(2);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });

  test('Adds nothing while the editor is held open, which keeps its edits', () => {
    const state = setUp(limitsDocument());
    const { document } = state;
    const draft = editLimit(state, 'limit101', '5');
    state.nodeEditor.holdOpen();
    addCubeNode(state, 'filter');
    addCubeNode(state, 'filter', 'limit101');
    addCubeNode(state, TABLE);
    // by identity: a diff of documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.history).toHaveLength(0);
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.nodeEditor.nodeId).toBe('limit101');
    expect(state.nodeEditor.draft).toBe(draft);
    expect(draft.sizeText).toBe('5');
  });

  test("Adds nothing when the editor's edits had to be dropped", () => {
    const state = setUp(limitsDocument());
    const { document } = state;
    state.nodeEditor.open('limit101');
    // a node without the Limit's input port can't replace it
    jest
      .spyOn(state.nodeEditor.draft as CubeRowCountDraft<Limit>, 'build')
      .mockReturnValue(new Join('limit101') as never);
    addCubeNode(state, 'filter');
    // by identity: a diff of documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.history).toHaveLength(0);
    expect(state.nodeEditor.nodeId).toBeUndefined();
  });
});
