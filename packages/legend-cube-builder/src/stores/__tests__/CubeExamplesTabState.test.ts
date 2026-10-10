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
  createNodeRegistry,
  CubeDocument,
  MAX_SPEC_BYTES,
  parseCubeSpec,
  Query,
  RelationalTableSource,
  serializeCubeSpec,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { CubeEngine } from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_EXAMPLES } from '../CubeExamples.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../graph-manager/CubeDirectConnection.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { EXAMPLES } = CubeSourcePickerTabKey;

/** An example over Northwind's ORDERS and CUSTOMERS, the tables the fake types */
const TOP_CUSTOMERS = 'northwind-top-customers';

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

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

const setUp = (document?: CubeDocument) => {
  const created = TEST__createCubeHost();
  return { ...created, state: new CubeEditorState(created.host, document) };
};

describe('Examples tab', () => {
  test('Lists two example cubes per dataset, Northwind first, with nothing picked', () => {
    const { state } = setUp();
    const tab = state.sourcePicker.examplesTab;
    expect(
      tab.datasets.map(([dataset, examples]) => [
        dataset,
        examples.map((example) => example.id),
      ]),
    ).toEqual([
      ['Northwind', [TOP_CUSTOMERS, 'northwind-stock-by-category']],
      ['Sports', ['sports-top-watched', 'sports-europe-finals']],
      ['Trades', ['trades-notional-by-desk', 'trades-largest-buys']],
    ]);
    expect(tab.canConfirm).toBe(false);
    tab.select(TOP_CUSTOMERS);
    expect(tab.selected?.name).toBe('Top customers by orders');
    expect(tab.canConfirm).toBe(true);
  });

  test('Builds each example as a new, named cube on its model, its tables still to be typed', () => {
    CUBE_EXAMPLES.forEach((example) => {
      const document = example.createDocument();
      expect(document.name).toBe(example.name);
      expect(document.context?.runtime).toBeDefined();
      expect(document.query.selected).toBe(document.query.nodes.at(-1)?.id);
      document.query.nodes
        .filter((node) => node instanceof RelationalTableSource)
        .forEach((source) => {
          expect(source.resolution.kind).toBe('unresolved');
        });
      // a new cube each time, so editing one never changes the next
      expect(example.createDocument()).not.toBe(document);
    });
  });

  test('Exports each example as a spec that imports back to the same cube, within the size cap', () => {
    const registry = createNodeRegistry();
    CUBE_EXAMPLES.forEach((example) => {
      const document = example.createDocument();
      const text = serializeCubeSpec(document, registry);
      expect(new TextEncoder().encode(text).length).toBeLessThan(
        MAX_SPEC_BYTES,
      );
      const decoded = parseCubeSpec(text, { registry }).document;
      expect(decoded.name).toBe(document.name);
      expect(decoded.context).toEqual(document.context);
      expect(serializeCubeSpec(decoded, registry)).toBe(text);
    });
  });

  test('Opens the example in place of the cube as one undo step, types its tables, then runs it', async () => {
    const { state, fake } = setUp(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    const before = state.document;
    const picker = state.sourcePicker;
    picker.open(EXAMPLES);
    expect(picker.activeTab.key).toBe(EXAMPLES);
    picker.examplesTab.select(TOP_CUSTOMERS);
    await flowResult(picker.confirm());

    expect(picker.isOpen).toBe(false);
    expect(state.document.name).toBe('Top customers by orders');
    expect(state.isResolvingSources).toBe(false);
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(state.execution.isStale).toBe(false);

    state.undo();
    expect(state.document.name).toBeUndefined();
    expect(state.document.query.isEmpty).toBe(true);
    expect(state.document.context).toBe(before.context);
  });

  test("Doesn't run an example the user has moved off before its tables were typed", async () => {
    // a cube that could run, so only the check stops a run on Undo
    const { state, fake } = setUp(
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    expect(state.execution.canExecute).toBe(true);
    const answer = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const picker = state.sourcePicker;
    picker.open(EXAMPLES);
    picker.examplesTab.select(TOP_CUSTOMERS);
    const opening = flowResult(picker.confirm());
    expect(state.document.name).toBe('Top customers by orders');
    state.undo();
    expect(state.execution.canExecute).toBe(true);
    answer.resolve(new Map());
    await opening;
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test('Stays enabled on a cube whose source is fixed, and opens when asked for', () => {
    const { state } = setUp(
      new CubeDocument().withContext({
        model: createCubeDirectModel({ _type: 'saved' }),
        runtime: CUBE_DIRECT_RUNTIME_PATH,
      }),
    );
    const picker = state.sourcePicker;
    expect(picker.isTabEnabled(picker.examplesTab)).toBe(true);
    expect(picker.isTabEnabled(picker.modelTab)).toBe(false);
    picker.open(EXAMPLES);
    expect(picker.activeTab.key).toBe(EXAMPLES);
    picker.close();
    // asked for nothing, the dialog opens on the cube's own tab
    picker.open();
    expect(picker.activeTab.key).toBe(CubeSourcePickerTabKey.DIRECT_CONNECTION);
    // a table palette item never opens on the Examples tab
    picker.selectTab(EXAMPLES);
    expect(picker.tabForSourceType(RelationalTableSource.TYPE)?.key).toBe(
      CubeSourcePickerTabKey.DIRECT_CONNECTION,
    );
  });

  test('Never gives a table palette item the Examples tab, even when it was open last', () => {
    const { state } = setUp();
    const picker = state.sourcePicker;
    picker.open(EXAMPLES);
    picker.close();
    expect(picker.activeTab.key).toBe(EXAMPLES);
    expect(picker.tabForSourceType(RelationalTableSource.TYPE)?.key).toBe(
      CubeSourcePickerTabKey.MODEL,
    );
  });
});
