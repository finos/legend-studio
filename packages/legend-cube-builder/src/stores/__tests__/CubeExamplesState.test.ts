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
import { CUBE_EXAMPLE_DATASETS, CUBE_EXAMPLES } from '../CubeExamples.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CUBE_SPORTS_MODEL } from '../fixtures/CubeSportsModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

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

const setUp = (document?: CubeDocument) => {
  const created = TEST__createCubeHost();
  return { ...created, state: new CubeEditorState(created.host, document) };
};

/** A cube that can run: Northwind's ORDERS, typed */
const ordersCube = (): CubeDocument =>
  new CubeDocument({
    context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

/** An example over Northwind's ORDERS and CUSTOMERS, the tables the fake types */
const topCustomers = () => {
  const example = CUBE_EXAMPLES.find(
    (each) => each.id === 'northwind-top-customers',
  );
  if (!example) {
    throw new Error('No top customers example');
  }
  return example;
};

const sports = () => {
  const dataset = CUBE_EXAMPLE_DATASETS.find((each) => each.id === 'sports');
  if (!dataset) {
    throw new Error('No sports dataset');
  }
  return dataset;
};

describe('Examples', () => {
  test('Lists three datasets, Northwind first, each with its example cubes', () => {
    const { examples } = setUp().state;
    expect(
      examples.datasets.map((dataset) => [
        dataset.id,
        examples.examplesOf(dataset).map((example) => example.id),
      ]),
    ).toEqual([
      ['northwind', ['northwind-top-customers', 'northwind-stock-by-category']],
      ['sports', ['sports-top-watched', 'sports-europe-finals']],
      [
        'trades',
        [
          'trades-notional-by-desk',
          'trades-desk-league',
          'trades-largest-buys',
        ],
      ],
    ]);
    expect(examples.isOpen).toBe(false);
  });

  test('Builds each example as a new, named cube on its dataset, its tables still to be typed', () => {
    CUBE_EXAMPLES.forEach((example) => {
      const document = example.createDocument();
      const dataset = CUBE_EXAMPLE_DATASETS.find(
        (each) => each.id === example.dataset,
      );
      expect(document.name).toBe(example.name);
      expect(document.context?.model).toBe(dataset?.model);
      expect(document.context?.runtime).toBe(dataset?.runtime);
      expect(document.query.selected).toBe(document.query.nodes.at(-1)?.id);
      document.query.nodes
        .filter((node) => node instanceof RelationalTableSource)
        .forEach((source) => {
          expect(source.resolution.kind).toBe('unresolved');
          expect(source.database).toBe(dataset?.database);
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

  test('Opens an example in place of the cube as one undo step, types its tables, then runs it', async () => {
    const { state, fake } = setUp(ordersCube());
    const before = state.document;
    state.examples.open();
    expect(state.isDialogOpen).toBe(true);
    await flowResult(state.examples.openExample(topCustomers()));

    expect(state.examples.isOpen).toBe(false);
    expect(state.document.name).toBe('Top customers by orders');
    expect(state.isResolvingSources).toBe(false);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(state.execution.isStale).toBe(false);

    state.undo();
    expect(state.document.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
    ]);
    expect(state.document.context).toBe(before.context);
  });

  test("Doesn't run an example the user has moved off before its tables were typed", async () => {
    // a cube that could run, so only the check stops a run on Undo
    const { state, fake } = setUp(ordersCube());
    expect(state.execution.canExecute).toBe(true);
    const answer = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const opening = flowResult(state.examples.openExample(topCustomers()));
    expect(state.document.name).toBe('Top customers by orders');
    state.undo();
    expect(state.execution.canExecute).toBe(true);
    answer.resolve(new Map());
    await opening;
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test('Opens an example on a read-only cube too, as an editable cube', async () => {
    const { state } = setUp();
    state.importDocument(ordersCube(), true);
    expect(state.readOnly).toBe(true);
    await flowResult(state.examples.openExample(topCustomers()));
    expect(state.readOnly).toBe(false);
    expect(state.document.name).toBe('Top customers by orders');
  });

  test("Starts a new cube on a dataset, as one undo step, in the source dialog's Model tab on its model", () => {
    const { state } = setUp(ordersCube());
    state.examples.open();
    state.examples.startOnDataset(sports());

    expect(state.examples.isOpen).toBe(false);
    expect(state.document.query.isEmpty).toBe(true);
    expect(state.document.context?.model).toBe(CUBE_SPORTS_MODEL);
    const picker = state.sourcePicker;
    expect(picker.isOpen).toBe(true);
    expect(picker.activeTab.key).toBe(CubeSourcePickerTabKey.MODEL);
    expect(picker.modelTab.model).toBe(CUBE_SPORTS_MODEL);
    // the cube's model is fixed: only the Model tab adds to it
    expect(picker.fixedTab).toBe(picker.modelTab);

    picker.close();
    state.undo();
    expect(state.document.context?.model).toBe(CUBE_NORTHWIND_MODEL);
    expect(state.document.query.nodes).toHaveLength(1);
  });

  test('Starts a new cube on a dataset from a read-only cube too', () => {
    const { state } = setUp();
    state.importDocument(ordersCube(), true);
    state.examples.startOnDataset(sports());
    expect(state.readOnly).toBe(false);
    expect(state.sourcePicker.isOpen).toBe(true);
  });
});
