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

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import {
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  FilterOperator,
  MAX_SPEC_BYTES,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
  serializeCubeSpec,
  UnknownNode,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  type CubeEngine,
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

/** The slice: two tables, a join and a filter, captured at the filter */
const sliceDocument = (): CubeDocument =>
  new CubeDocument({ context: CONTEXT, query: sliceQuery() });

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

/** An answer the test gives when it chooses */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

/** Lets every answer the fake engine already gave land */
const settle = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Imports `text`, as Import (dev) does */
const importSpecText = (state: CubeEditorState, text: string): void => {
  state.specTransfer.openImport();
  state.specTransfer.setImportText(text);
  expect(state.specTransfer.importSpec()).toBe(true);
};

/**
 * The cube's node ids: a failed match on the nodes themselves can't be
 * reported across Jest's workers, since their schemas hold BigInts
 */
const nodeIds = (state: CubeEditorState): string[] =>
  state.document.query.nodes.map(({ id }) => id);

/** ORDERS as the engine types it once a column was added since the slice was saved */
const SHIPPED_ORDERS_COLUMNS = [
  ...ORDERS_COLUMNS,
  new SchemaColumn(
    'SHIP_PHONE',
    PrimitiveType.get('meta::pure::precisePrimitives::Varchar', [24]),
    true,
  ),
];

/** The engine's answer for the slice's tables, ORDERS with its column added */
const SHIPPED_SLICE_SCHEMAS: ResolvedSchemas = new Map([
  ['relational101', new Schema(SHIPPED_ORDERS_COLUMNS)],
  ['relational102', new Schema(CUSTOMERS_COLUMNS)],
]);

const SHIPPED_ORDERS_WARNING =
  'This table changed since the cube was saved: added SHIP_PHONE';

/** ORDERS, in the cube shown, has the column added since the slice was saved */
const hasShippedOrders = (state: CubeEditorState): boolean =>
  state.analysis.schemas
    .get('relational101')
    ?.isIdenticalTo(new Schema(SHIPPED_ORDERS_COLUMNS)) ?? false;

const warningsOf = (
  state: CubeEditorState,
  id: string,
): readonly string[] | undefined =>
  state.warnings.get(state.document.query.getNode(id)?.key ?? -1);

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
    // compared by identity: a failed match on documents can't be reported
    expect(state.document === document).toBe(false);
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
    // compared by identity: a failed match on documents can't be reported
    expect(state.document === document).toBe(true);
    expect(state.history === history).toBe(true);
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

  test('Never runs an imported cube, and drops the rows, SQL and node errors of the cube before', async () => {
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
    expect(state.hostIssues.size).toBe(0);
    expect(fake.execute).toHaveBeenCalledTimes(1);
  });

  test('Drops the error of the last run of the cube before, even when the imported tables are left as they are', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.execute.mockRejectedValue(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'Old error'),
    );
    const state = new CubeEditorState(host, ordersDocument());
    await flowResult(state.execution.execute());
    expect(state.execution.error?.firstLine).toBe('Old error');

    importSpecText(state, serializeCubeSpec(ordersDocument()));
    const imported = state.document;
    expect(state.execution.error).toBeUndefined();
    await settle();
    // its table has the saved columns: the imported cube is not replaced
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(state.isResolvingSources).toBe(false);
    expect(state.document === imported).toBe(true);
    expect(state.execution.error).toBeUndefined();
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

  test('Drops a table that was still being added when the import came', async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    const picker = state.sourcePicker;
    picker.open();
    expect(picker.isOpen).toBe(true);
    await settle();
    expect(picker.modelTab.isLoadingModel).toBe(false);
    picker.modelTab.selectTable('ORDERS');
    expect(picker.canConfirm).toBe(true);
    const answer = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const adding = flowResult(picker.confirm());
    expect(picker.modelTab.isResolving).toBe(true);

    // a cube with no model, as the one before: only closing the picker drops the Add
    importSpecText(
      state,
      serializeCubeSpec(new CubeDocument({ name: 'Imported' })),
    );
    expect(picker.isOpen).toBe(false);
    expect(picker.modelTab.isResolving).toBe(false);
    answer.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await adding;
    expect(state.document.name).toBe('Imported');
    expect(nodeIds(state)).toEqual([]);
    expect(state.history).toHaveLength(1);
    expect(picker.isOpen).toBe(false);
    expect(picker.modelTab.error).toBeUndefined();
  });

  test('Keeps saying the tables are being typed while those of a newer import are, when the answer for the cube before comes first', async () => {
    const { host, fake } = TEST__createCubeHost();
    const first = deferred<ResolvedSchemas>();
    const second = deferred<ResolvedSchemas>();
    fake.resolveSchemas
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const state = new CubeEditorState(host);
    importSpecText(state, serializeCubeSpec(ordersDocument()));
    expect(state.isResolvingSources).toBe(true);
    // another cube whose table has the same id, but is another table
    importSpecText(
      state,
      serializeCubeSpec(
        new CubeDocument({
          context: CONTEXT,
          query: new Query(
            [northwindTable('relational101', 'CUSTOMERS', CUSTOMERS_COLUMNS)],
            [],
            'relational101',
          ),
        }),
      ),
    );
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(2);
    expect(state.isResolvingSources).toBe(true);

    first.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await settle();
    expect(state.isResolvingSources).toBe(true);
    second.resolve(new Map([['relational101', new Schema(CUSTOMERS_COLUMNS)]]));
    await settle();
    expect(state.isResolvingSources).toBe(false);
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

  test('Still lets the node to run be chosen on a cube opened read-only, which stays read-only, and types its tables again', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importSpecText(state, newerSpecText(sliceDocument()));
    expect(state.readOnly).toBe(true);
    expect(state.isResolvingSources).toBe(true);
    expect(state.document.query.selected).toBe('filter101');
    state.select('join101');
    expect(state.document.query.selected).toBe('join101');
    expect(state.readOnly).toBe(true);
    expect(state.canUndo).toBe(false);
    state.undo();
    expect(state.document.query.selected).toBe('join101');

    // its tables are typed again, ORDERS with a column added: the choice stays
    answer.resolve(SHIPPED_SLICE_SCHEMAS);
    await settle();
    expect(state.isResolvingSources).toBe(false);
    expect(hasShippedOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      SHIPPED_ORDERS_WARNING,
    ]);
    expect(state.document.query.selected).toBe('join101');
    expect(state.readOnly).toBe(true);
    expect(state.canUndo).toBe(false);
    expect(state.execution.canExecute).toBe(true);
  });

  test('Leaves read-only when another spec is imported, and undo brings the read-only cube back read-only', () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(newerSpecText(sliceDocument()));
    state.specTransfer.importSpec();
    // choosing the node to run still works while read-only
    state.select('join101');
    const readOnlyDocument = state.document;

    state.specTransfer.openImport();
    state.specTransfer.setImportText(serializeCubeSpec(unfinishedDocument()));
    state.specTransfer.importSpec();
    expect(state.readOnly).toBe(false);
    expect(state.canUndo).toBe(true);
    state.undo();
    // compared as text: a failed match on nodes can't be reported
    expect(serializeCubeSpec(state.document, state.registry)).toBe(
      serializeCubeSpec(readOnlyDocument, state.registry),
    );
    expect(state.document.query.selected).toBe('join101');
    expect(state.readOnly).toBe(true);
  });

  test('Brings a cube opened read-only back read-only on undo, even when its tables were typed while another cube was open', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importSpecText(state, newerSpecText(sliceDocument()));
    expect(state.readOnly).toBe(true);
    // an editable cube, whose table the fake types as it was saved
    importSpecText(state, serializeCubeSpec(ordersDocument()));
    await settle();
    expect(state.readOnly).toBe(false);
    expect(state.isResolvingSources).toBe(false);

    answer.resolve(SHIPPED_SLICE_SCHEMAS);
    await settle();
    expect(state.readOnly).toBe(false);
    expect(nodeIds(state)).toEqual(['relational101']);
    state.undo();
    expect(state.readOnly).toBe(true);
    expect(state.canUndo).toBe(false);
    expect(nodeIds(state)).toEqual([
      'relational101',
      'relational102',
      'join101',
      'filter101',
    ]);
    expect(hasShippedOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      SHIPPED_ORDERS_WARNING,
    ]);
  });

  test('Reads a spec file into the import text, refuses a file over the size cap unread, and drops that refusal once another file is read', async () => {
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

    const other = serializeCubeSpec(unfinishedDocument());
    await flowResult(
      state.specTransfer.readImportFile(
        new File([other], 'unfinished.cube.json'),
      ),
    );
    expect(state.specTransfer.importText).toBe(other);
    expect(state.specTransfer.error).toBeUndefined();
  });

  test('Reads a file of exactly the size cap', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    await flowResult(
      state.specTransfer.readImportFile(
        new File(['x'.repeat(MAX_SPEC_BYTES)], 'full.cube.json'),
      ),
    );
    expect(state.specTransfer.error).toBeUndefined();
    // not the text itself: a failed match would print all of it
    expect(state.specTransfer.importText.length).toBe(MAX_SPEC_BYTES);
    expect(state.specTransfer.isReadingFile).toBe(false);
  });

  test('Drops the error of a spec that failed to import once a file is read', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText('{');
    expect(state.specTransfer.importSpec()).toBe(false);
    expect(state.specTransfer.error).toMatch(
      /^Can't import the spec: it is not valid JSON/u,
    );

    const text = serializeCubeSpec(ordersDocument());
    await flowResult(
      state.specTransfer.readImportFile(new File([text], 'orders.cube.json')),
    );
    expect(state.specTransfer.importText).toBe(text);
    expect(state.specTransfer.error).toBeUndefined();
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

describe('Cube spec files', () => {
  const readerClass = globalThis.FileReader;
  /** The reads started, in order, while `HeldReader` is the browser's reader */
  const heldReads: HeldReader[] = [];

  /** A reader whose read ends only when the test says: with a load, or an error event as browsers send */
  class HeldReader {
    onload: (() => void) | null = null;
    onerror: ((event: ProgressEvent) => void) | null = null;
    result: string | null = null;
    error: DOMException | null = null;

    readAsText(): void {
      heldReads.push(this);
    }

    load(text: string): void {
      this.result = text;
      this.onload?.();
    }

    fail(): void {
      this.error = new DOMException(
        'The file could not be read',
        'NotReadableError',
      );
      const event = new ProgressEvent('error');
      Object.defineProperty(event, 'target', { value: this });
      this.onerror?.(event);
    }
  }

  /** The read started `index`-th, which the test ends */
  const heldRead = (index: number): HeldReader => {
    const read = heldReads[index];
    expect(read).toBeDefined();
    return read as HeldReader;
  };

  beforeEach(() => {
    heldReads.length = 0;
  });

  afterEach(() => {
    globalThis.FileReader = readerClass;
  });

  test('Shows the file chosen last, and is reading until that one is read', async () => {
    globalThis.FileReader = HeldReader as unknown as typeof FileReader;
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    const first = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'first.cube.json')),
    );
    const second = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'second.cube.json')),
    );
    expect(heldReads).toHaveLength(2);

    heldRead(0).load('first');
    await first;
    expect(state.specTransfer.isReadingFile).toBe(true);
    expect(state.specTransfer.importText).toBe('');
    heldRead(1).load('second');
    await second;
    expect(state.specTransfer.isReadingFile).toBe(false);
    expect(state.specTransfer.importText).toBe('second');
  });

  test("Never says a file chosen before the one read couldn't be read", async () => {
    globalThis.FileReader = HeldReader as unknown as typeof FileReader;
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    const first = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'first.cube.json')),
    );
    const second = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'second.cube.json')),
    );
    heldRead(1).load('second');
    await second;
    heldRead(0).fail();
    await first;
    expect(state.specTransfer.error).toBeUndefined();
    expect(state.specTransfer.importText).toBe('second');
    expect(state.specTransfer.isReadingFile).toBe(false);
  });

  test('Ends the reading of a file when a file over the size cap is chosen while it is read', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    const first = flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'small.cube.json')),
    );
    expect(state.specTransfer.isReadingFile).toBe(true);
    await flowResult(
      state.specTransfer.readImportFile(
        new File(['x'.repeat(MAX_SPEC_BYTES + 1)], 'big.cube.json'),
      ),
    );
    expect(state.specTransfer.isReadingFile).toBe(false);
    await first;
    // the earlier file was dropped
    expect(state.specTransfer.importText).toBe('');
    expect(state.specTransfer.isReadingFile).toBe(false);
    expect(state.specTransfer.error).toMatch(/^The file is too large/u);
  });

  test("Says why the browser couldn't read a file", async () => {
    // a reader that fails as browsers do: with an error event
    class FailingReader {
      onload: (() => void) | null = null;
      onerror: ((event: ProgressEvent) => void) | null = null;
      readonly result = null;
      readonly error = new DOMException(
        'The file could not be read',
        'NotReadableError',
      );

      readAsText(): void {
        const event = new ProgressEvent('error');
        Object.defineProperty(event, 'target', { value: this });
        this.onerror?.(event);
      }
    }
    globalThis.FileReader = FailingReader as unknown as typeof FileReader;
    const state = new CubeEditorState(TEST__createCubeHost().host);
    state.specTransfer.openImport();
    await flowResult(
      state.specTransfer.readImportFile(new File(['{}'], 'locked.cube.json')),
    );
    expect(state.specTransfer.error).toBe(
      "Can't read the file: The file could not be read",
    );
    expect(state.specTransfer.isReadingFile).toBe(false);
  });
});
