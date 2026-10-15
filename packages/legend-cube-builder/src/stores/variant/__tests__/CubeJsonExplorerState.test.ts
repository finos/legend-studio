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
  Explode,
  Extend,
  type IR,
  MESSAGE_VARIANT_UNSUPPORTED_DATABASE,
  printIR,
} from '@finos/legend-cube';
import { flowResult, runInAction } from 'mobx';
import { CUBE_QUICK_ACTION_DISABLED_REASON } from '../../../__lib__/LegendCubeLabels.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  TEST__PAYLOAD,
  TEST__payloadSample,
  TEST__setUpPayloadRun,
} from '../../../__test-utils__/CubeVariantTestUtils.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import {
  CUBE_JSON_RUN_LABEL,
  CUBE_JSON_SAMPLE_SIZE,
} from '../CubeJsonSampling.js';

const PAYLOAD = TEST__PAYLOAD;
const setUp = TEST__setUpPayloadRun;

/** The last lambda the engine ran, as Pure-like text */
const lastRun = (fake: FakeCubeEngine): string =>
  printIR(fake.execute.mock.calls.at(-1)?.[1] as IR);

beforeEach(() => {
  localStorage.clear();
});

describe('Explore JSON (PLAN §11.20)', () => {
  test("Reads the column's first values through Runs: the query up to the node that ran, the column alone, its non-empty values", async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    expect(explorer.getDisabledReason()).toBeUndefined();
    await flowResult(explorer.open(PAYLOAD));
    expect(explorer.isOpen).toBe(true);
    const run = lastRun(fake);
    expect(run).toContain('->select(~[PAYLOAD])');
    expect(run).toContain('->filter({row | !($row.PAYLOAD->isEmpty())})');
    expect(run).toContain(`->limit(${CUBE_JSON_SAMPLE_SIZE + 1})`);
    expect(state.runStats.entries[0]?.label).toBe(
      CUBE_JSON_RUN_LABEL.sample('PAYLOAD'),
    );
    // fewer values than asked for: the whole column
    expect(explorer.sample).toMatchObject({ rows: 2, complete: true });
    expect(
      explorer.fields?.children.map((field) => field.path.join('.')),
    ).toEqual(['tags', 'user']);
    // reading leaves the cube alone
    expect(state.document.query.selected).toBe('relational101');
  });

  test('Reads every row on request, without a limit, as its own run', async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    await flowResult(explorer.read(true));
    expect(lastRun(fake)).toContain(
      `->limit(${String(BigInt(Number.MAX_SAFE_INTEGER) + 1n)})`,
    );
    expect(state.runStats.entries[0]?.label).toBe(
      CUBE_JSON_RUN_LABEL.everyRow('PAYLOAD'),
    );
  });

  test('Adds the ticked offers as one Extend after the node that ran, one undo step, each under a free name, once the engine parses them', async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    explorer.select(['user', 'name']);
    const name = explorer.selectedField?.offers[0];
    expect(name?.code).toBe(
      "x | $x.PAYLOAD->get('user')->get('name')->to(@String)",
    );
    explorer.toggle(['user', 'name'], name as never);
    explorer.select(['tags']);
    const count = explorer.selectedField?.offers.find(
      (offer) => offer.key === 'count',
    );
    explorer.toggle(['tags'], count as never);
    expect(explorer.tickedOffers).toHaveLength(2);
    fake.parseExpression.mockImplementation(async (code) =>
      Promise.resolve({
        lambda: { _type: 'lambda', parameters: [], body: [], code },
        located: {},
      }),
    );
    const history = state.history.length;
    await flowResult(explorer.add());
    const { query } = state.document;
    const extend = query.getNode(query.selected ?? '');
    expect(extend).toBeInstanceOf(Extend);
    expect((extend as Extend).columns.map((column) => column.name)).toEqual([
      'PAYLOAD_user_name',
      // PAYLOAD_TAGS_COUNT is taken, folded
      'PAYLOAD_tags_count_2',
    ]);
    expect((extend as Extend).columns.map((column) => column.code)).toEqual([
      "x | $x.PAYLOAD->get('user')->get('name')->to(@String)",
      "x | $x.PAYLOAD->get('tags')->toMany(@Variant)->size()",
    ]);
    expect(query.getInputIds(extend?.id ?? '')).toEqual(['relational101']);
    expect(state.history.length).toBe(history + 1);
    expect(fake.parseExpression).toHaveBeenCalledTimes(2);
    expect(explorer.isOpen).toBe(false);
  });

  test('Adds one row per element as an Explode Array after the Extend, one undo step, its element named freely', async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    explorer.select(['tags']);
    const offers = explorer.selectedField?.offers ?? [];
    const explode = offers.find((offer) => offer.key === 'explode');
    expect(explode).toMatchObject({
      label: 'one row per element',
      name: 'tags_element',
      code: undefined,
      explode: { column: 'PAYLOAD', path: ['tags'] },
    });
    explorer.toggle(['tags'], explode as never);
    explorer.toggle(
      ['tags'],
      offers.find((offer) => offer.key === 'count') as never,
    );
    fake.parseExpression.mockImplementation(async (code) =>
      Promise.resolve({
        lambda: { _type: 'lambda', parameters: [], body: [], code },
        located: {},
      }),
    );
    const history = state.history.length;
    await flowResult(explorer.add());
    const { query } = state.document;
    const added = query.getNode(query.selected ?? '');
    expect(added).toBeInstanceOf(Explode);
    expect([
      (added as Explode).column,
      (added as Explode).path,
      (added as Explode).name,
    ]).toEqual(['PAYLOAD', ['tags'], 'tags_element']);
    const [extendId] = query.getInputIds(added?.id ?? '');
    const extend = query.getNode(extendId ?? '');
    expect(extend).toBeInstanceOf(Extend);
    expect(query.getInputIds(extend?.id ?? '')).toEqual(['relational101']);
    expect(state.history.length).toBe(history + 1);
    expect(explorer.isOpen).toBe(false);
  });

  test('Ticks one row per element for one array at a time, and adds it alone', async () => {
    const { state } = await setUp(
      'DuckDB',
      TEST__payloadSample(['{"a":[1],"b":[2]}']),
    );
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    const explodeOf = (key: string): never =>
      explorer.fields?.children
        .find((field) => field.path[0] === key)
        ?.offers.find((offer) => offer.key === 'explode') as never;
    explorer.toggle(['a'], explodeOf('a'));
    explorer.toggle(['b'], explodeOf('b'));
    expect(explorer.tickedOffers.map((offer) => offer.name)).toEqual([
      'b_element',
    ]);
    await flowResult(explorer.add());
    const { query } = state.document;
    const added = query.getNode(query.selected ?? '') as Explode;
    expect(added).toBeInstanceOf(Explode);
    expect(added.path).toEqual(['b']);
    expect(query.getInputIds(added.id)).toEqual(['relational101']);
  });

  test("Keeps the dialog open with the engine's message when a column doesn't parse, adding nothing", async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    explorer.select(['user', 'name']);
    explorer.toggle(
      ['user', 'name'],
      explorer.selectedField?.offers[0] as never,
    );
    fake.parseExpression.mockRejectedValue(
      new CubeEngineError(CubeEngineErrorKind.COMPILE, 'Unexpected token'),
    );
    await flowResult(explorer.add());
    expect(explorer.isOpen).toBe(true);
    expect(explorer.error).toBe('Unexpected token');
    expect(state.document.query.selected).toBe('relational101');
  });

  test("Refuses a database that can't read JSON, reading nothing", async () => {
    const { state, fake } = await setUp('H2');
    const runs = fake.execute.mock.calls.length;
    await flowResult(state.jsonExplorer.open(PAYLOAD));
    expect(state.jsonExplorer.error).toBe(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    );
    expect(fake.execute.mock.calls.length).toBe(runs);
    expect(state.jsonExplorer.sample).toBeUndefined();
    // the menu says so too, once the model's databases are known
    expect(state.jsonExplorer.getDisabledReason()).toBe(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    );
  });

  test('Is disabled on stale rows, as the quick actions are', async () => {
    const { state } = await setUp();
    runInAction(() => {
      state.readOnly = true;
    });
    expect(state.jsonExplorer.getDisabledReason()).toBeDefined();
    runInAction(() => {
      state.readOnly = false;
    });
    state.addConfiguredNode(
      new Extend(state.document.query.generateId(Extend.TYPE)),
      'relational101',
    );
    expect(state.jsonExplorer.getDisabledReason()).toBe(
      CUBE_QUICK_ACTION_DISABLED_REASON.STALE_ROWS,
    );
  });

  test('Stops a read in flight, keeping what was read', async () => {
    const { state, fake } = await setUp();
    const explorer = state.jsonExplorer;
    await flowResult(explorer.open(PAYLOAD));
    const sample = explorer.sample;
    fake.execute.mockImplementation(
      async (_model, _lambda, options) =>
        new Promise((_resolve, reject) =>
          options?.abortController?.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          ),
        ),
    );
    const reading = flowResult(explorer.read(true));
    expect(explorer.isReading).toBe(true);
    explorer.stop();
    await reading;
    expect(explorer.isReading).toBe(false);
    expect(explorer.sample).toBe(sample);
    expect(explorer.error).toBeUndefined();
  });
});
