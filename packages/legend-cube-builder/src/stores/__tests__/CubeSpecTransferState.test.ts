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
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  FilterOperator,
  MAX_SPEC_BYTES,
  Query,
  serializeCubeSpec,
  UnknownNode,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';
import {
  CUBE_SPEC_TRANSFER_MODE,
  getCubeSpecFileName,
  getSpecImportError,
} from '../CubeSpecTransferState.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/**
 * The slice with an order id that isn't a number, then a node of a type this
 * version doesn't know, and a top-level key it doesn't know either: none of
 * it can run, all of it must survive
 */
const unfinishedDocument = (): CubeDocument => {
  const slice = sliceQuery(
    new ColumnComparisonFilter('ORDER_ID', FilterOperator.EQUAL, {
      kind: 'invalid',
      text: 'ten',
    }),
  );
  return new CubeDocument({
    name: 'Unfinished',
    context: CONTEXT,
    query: new Query(
      [
        ...slice.nodes,
        new UnknownNode('pivot101', 1, {
          kind: 'pivot',
          pivotColumns: ['SHIP_COUNTRY'],
        }),
      ],
      [...slice.connections, new Connection('filter101', 'pivot101', 'in0')],
      'pivot101',
    ),
    rest: { savedBy: 'a newer Cube' },
  });
};

const ordersDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

const ORDERS_RESULT: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [ORDERS_COLUMNS.map(() => null)],
  sql: ['select 1'],
  durationMs: 1,
};

/** The spec text of a document saved by a later format version */
const newerSpecText = (document: CubeDocument): string =>
  JSON.stringify({
    ...JSON.parse(serializeCubeSpec(document)),
    formatVersion: 2,
  });

/** An editor on `document`, with Export written and its text pasted into Import */
const roundTrip = (document: CubeDocument): CubeEditorState => {
  const state = new CubeEditorState(TEST__createCubeHost().host, document);
  state.specTransfer.openExport();
  const text = state.specTransfer.exportText as string;
  state.specTransfer.openImport();
  state.specTransfer.setImportText(text);
  expect(state.specTransfer.importSpec()).toBe(true);
  return state;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube spec export and import', () => {
  test('Exports the spec the codec writes, for a cube that cannot run', () => {
    const document = unfinishedDocument();
    const state = new CubeEditorState(TEST__createCubeHost().host, document);
    expect(state.execution.canExecute).toBe(false);
    state.specTransfer.openExport();
    expect(state.specTransfer.mode).toBe(CUBE_SPEC_TRANSFER_MODE.EXPORT);
    expect(state.specTransfer.error).toBeUndefined();
    expect(state.specTransfer.exportText).toBe(
      serializeCubeSpec(document, state.registry),
    );
  });

  test('Imports what it exported as the same cube, unknown node, unknown keys and invalid values included', () => {
    const document = unfinishedDocument();
    const state = roundTrip(document);
    expect(serializeCubeSpec(state.document, state.registry)).toBe(
      serializeCubeSpec(document, state.registry),
    );
    expect(state.document).not.toBe(document);
    const pivot = state.document.query.getNode('pivot101');
    expect(pivot).toBeInstanceOf(UnknownNode);
    expect((pivot as UnknownNode).savedKind).toBe('pivot');
    expect(state.document.rest).toEqual({ savedBy: 'a newer Cube' });
    expect(state.specTransfer.mode).toBeUndefined();
    expect(state.readOnly).toBe(false);
  });

  test('Refuses to export a cube whose spec is over the size cap, and writes nothing', () => {
    const state = new CubeEditorState(
      TEST__createCubeHost().host,
      ordersDocument().withName('x'.repeat(MAX_SPEC_BYTES)),
    );
    state.specTransfer.openExport();
    expect(state.specTransfer.exportText).toBeUndefined();
    expect(state.specTransfer.error).toMatch(/^The cube is too large to save/u);
  });

  test('Shows where a broken spec is broken, and leaves the cube, its undo history and its rows as they were', async () => {
    const { host } = TEST__createCubeHost({ result: ORDERS_RESULT });
    const state = new CubeEditorState(host);
    state.applyDocument(ordersDocument());
    await flowResult(state.execution.execute());
    const { document, history } = state;
    const result = state.execution.result;
    const spec = JSON.parse(serializeCubeSpec(document)) as {
      query: { nodes: Record<string, unknown>[] };
    };
    delete spec.query.nodes[0]?.database;

    state.specTransfer.openImport();
    state.specTransfer.setImportText(JSON.stringify(spec));
    expect(state.specTransfer.importSpec()).toBe(false);
    expect(state.specTransfer.error).toBe(
      "Can't import the spec: query.nodes[0].database is required",
    );
    expect(state.specTransfer.mode).toBe(CUBE_SPEC_TRANSFER_MODE.IMPORT);
    expect(state.document).toBe(document);
    expect(state.history).toBe(history);
    expect(state.execution.result).toBe(result);

    // typing again clears the error
    state.specTransfer.setImportText('{');
    expect(state.specTransfer.error).toBeUndefined();
    expect(state.specTransfer.importSpec()).toBe(false);
    expect(state.specTransfer.error).toMatch(
      /^Can't import the spec: it is not valid JSON/u,
    );
  });

  test('Refuses a spec over the size cap', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(' '.repeat(MAX_SPEC_BYTES + 1));
    expect(state.specTransfer.importSpec()).toBe(false);
    expect(state.specTransfer.error).toBe(
      `Can't import the spec: it is over ${MAX_SPEC_BYTES} bytes`,
    );
  });

  test('Words an unexpected import failure by its message', () => {
    expect(getSpecImportError(new Error('Boom'))).toBe(
      "Can't import the spec: Boom",
    );
  });

  test('Never runs an imported cube, and drops the rows, SQL and engine errors of the cube before', async () => {
    const { host, fake } = TEST__createCubeHost({ result: ORDERS_RESULT });
    const state = new CubeEditorState(host, ordersDocument());
    await flowResult(state.execution.execute());
    state.setHostIssue(
      'relational101',
      new CubeEngineError(CubeEngineErrorKind.COMPILE, 'Old error'),
    );
    expect(state.execution.result).toBeDefined();

    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(unfinishedDocument()));
    state.specTransfer.importSpec();
    expect(state.document.name).toBe('Unfinished');
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test("Stops the run in flight, whose late answer never shows as the imported cube's rows", async () => {
    const { host, fake } = TEST__createCubeHost();
    let answer: (result: CubeResult) => void = () => undefined;
    fake.execute.mockImplementation(
      async () =>
        new Promise<CubeResult>((resolve) => {
          answer = resolve;
        }),
    );
    const state = new CubeEditorState(host, ordersDocument());
    const run = flowResult(state.execution.execute());
    expect(state.execution.isRunning).toBe(true);
    const signal = fake.execute.mock.calls[0]?.[2]?.abortController?.signal;

    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(ordersDocument()));
    state.specTransfer.importSpec();
    expect(state.execution.isRunning).toBe(false);
    expect(signal?.aborted).toBe(true);
    answer(ORDERS_RESULT);
    await run;
    expect(state.execution.result).toBeUndefined();
    expect(state.execution.error).toBeUndefined();
  });

  test('Drops a table that was still being added when the import came', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.sourcePicker.open();
    expect(state.sourcePicker.isOpen).toBe(true);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(ordersDocument()));
    state.specTransfer.importSpec();
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.sourcePicker.isResolving).toBe(false);
  });

  test('Is one undo step', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const before = ordersDocument();
    state.applyDocument(before);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(unfinishedDocument()));
    state.specTransfer.importSpec();
    expect(state.history).toHaveLength(2);
    state.undo();
    expect(serializeCubeSpec(state.document)).toBe(serializeCubeSpec(before));
  });

  test('Opens a spec from a newer version read-only: no edits, undo or export, but it can run', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.applyDocument(ordersDocument());
    state.specTransfer.openImport();
    state.specTransfer.setImportText(newerSpecText(ordersDocument()));
    expect(state.specTransfer.importSpec()).toBe(true);
    expect(state.readOnly).toBe(true);
    expect(state.canUndo).toBe(false);
    state.undo();
    expect(state.readOnly).toBe(true);
    state.sourcePicker.open();
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.execution.canExecute).toBe(true);
  });

  test('Leaves read-only when another spec is imported, and undo brings the read-only cube back read-only', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(newerSpecText(ordersDocument()));
    state.specTransfer.importSpec();
    const readOnlyDocument = state.document;
    // choosing the node to run is no change to the saved cube
    state.select('relational101');

    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(unfinishedDocument()));
    state.specTransfer.importSpec();
    expect(state.readOnly).toBe(false);
    expect(state.canUndo).toBe(true);
    state.undo();
    expect(state.document.query.nodes).toEqual(readOnlyDocument.query.nodes);
    expect(state.readOnly).toBe(true);
  });

  test('Reads a spec file into the import text, and refuses a file over the size cap unread', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    const text = serializeCubeSpec(ordersDocument());
    await flowResult(
      state.specTransfer.readImportFile(
        new File([text], 'orders.cube.json', { type: 'application/json' }),
      ),
    );
    expect(state.specTransfer.importText).toBe(text);
    expect(state.specTransfer.isReadingFile).toBe(false);

    await flowResult(
      state.specTransfer.readImportFile(
        new File(['x'.repeat(MAX_SPEC_BYTES + 1)], 'big.cube.json'),
      ),
    );
    expect(state.specTransfer.error).toBe(
      `The file is too large to import: a spec is at most ${MAX_SPEC_BYTES} bytes`,
    );
    expect(state.specTransfer.importText).toBe(text);
  });

  test('Drops a file read that finishes after the dialog closed', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    const read = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'late.cube.json')),
    );
    state.specTransfer.close();
    await read;
    expect(state.specTransfer.importText).toBe('');
    expect(state.specTransfer.isReadingFile).toBe(false);
  });

  test('Names the downloaded file after the cube, in characters any file system takes', () => {
    expect(getCubeSpecFileName(undefined)).toBe('cube.cube.json');
    expect(getCubeSpecFileName('  ')).toBe('cube.cube.json');
    expect(getCubeSpecFileName('Orders 1997/France')).toBe(
      'Orders_1997_France.cube.json',
    );
  });
});
