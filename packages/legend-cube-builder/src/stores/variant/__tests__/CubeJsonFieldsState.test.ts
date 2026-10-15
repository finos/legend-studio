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
  Extend,
  type IR,
  MESSAGE_VARIANT_UNSUPPORTED_DATABASE,
  printIR,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  TEST__PAYLOAD,
  TEST__setUpPayloadRun,
} from '../../../__test-utils__/CubeVariantTestUtils.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import type { CubeEditorState } from '../../CubeEditorState.js';
import { CubeJsonFieldsState } from '../CubeJsonFieldsState.js';
import {
  getCubeJsonFieldDefault,
  getCubeJsonFields,
} from '../CubeJsonOffers.js';
import { CUBE_JSON_RUN_LABEL } from '../CubeJsonSampling.js';
import { inferCubeJsonShape } from '../CubeJsonShape.js';

/** The payload cube, run, then an Extend after its table: the rows are stale */
const setUp = async (
  databaseType = 'DuckDB',
): Promise<{
  state: CubeEditorState;
  fake: FakeCubeEngine;
  fields: CubeJsonFieldsState;
}> => {
  const { state, fake } = await TEST__setUpPayloadRun(databaseType);
  state.addConfiguredNode(new Extend('extend101'), 'relational101');
  return { state, fake, fields: new CubeJsonFieldsState(state, 'extend101') };
};

beforeEach(() => {
  localStorage.clear();
});

describe("A Variant column's fields in an expression editor (PLAN §11.20, V.9)", () => {
  test('Reads the column just before the node, through Runs, though the rows are stale', async () => {
    const { state, fake, fields } = await setUp();
    expect(state.execution.isStale).toBe(true);
    await flowResult(fields.toggle(TEST__PAYLOAD));
    const run = printIR(fake.execute.mock.calls.at(-1)?.[1] as IR);
    expect(run).toContain('->select(~[PAYLOAD])');
    expect(run).toContain('->filter({row | !($row.PAYLOAD->isEmpty())})');
    // the node's input, not the node
    expect(run).not.toContain('extend');
    expect(state.runStats.entries[0]?.label).toBe(
      CUBE_JSON_RUN_LABEL.sample('PAYLOAD'),
    );
    expect(fields.isOpen('PAYLOAD')).toBe(true);
    expect(fields.fields?.children.map((field) => field.path)).toEqual([
      ['tags'],
      ['user'],
    ]);
  });

  test('Closes and opens again without reading again, and finds fields by their keys', async () => {
    const { fake, fields } = await setUp();
    await flowResult(fields.toggle(TEST__PAYLOAD));
    const runs = fake.execute.mock.calls.length;
    await flowResult(fields.toggle(TEST__PAYLOAD));
    expect(fields.isOpen('PAYLOAD')).toBe(false);
    await flowResult(fields.toggle(TEST__PAYLOAD));
    expect(fields.isOpen('PAYLOAD')).toBe(true);
    expect(fake.execute.mock.calls.length).toBe(runs);
    fields.setSearch('TIER');
    expect(
      fields.shownFields?.children.map((field) => field.path.join('.')),
    ).toEqual(['user']);
    fields.toggleFolded(['user']);
    expect(fields.isFolded(['user'])).toBe(true);
    fields.toggleForms(['tags']);
    expect(fields.areFormsShown(['tags'])).toBe(true);
    fields.toggleForms(['tags']);
    expect(fields.areFormsShown(['tags'])).toBe(false);
  });

  test("Refuses a database that can't read JSON, reading nothing", async () => {
    const { fake, fields } = await setUp('H2');
    const runs = fake.execute.mock.calls.length;
    await flowResult(fields.toggle(TEST__PAYLOAD));
    expect(fields.error).toBe(MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'));
    expect(fields.databaseProblem).toBe(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    );
    expect(fake.execute.mock.calls.length).toBe(runs);
    expect(fields.fields).toBeUndefined();
  });

  test('Writes a value as its type, an object or array as JSON, the column itself at its root', () => {
    const root = getCubeJsonFields(
      'P',
      inferCubeJsonShape(['{"user":{"tier":"gold"},"tags":["a"]}']),
    );
    expect(getCubeJsonFieldDefault('P', root)).toEqual({ expression: '$x.P' });
    const [tags, user] = root.children as [
      (typeof root.children)[number],
      (typeof root.children)[number],
    ];
    expect(getCubeJsonFieldDefault('P', tags)).toEqual({
      expression: "$x.P->get('tags')",
      column: { name: 'P_tags', code: "x | $x.P->get('tags')" },
    });
    expect(
      getCubeJsonFieldDefault('P', user.children[0] as typeof user),
    ).toEqual({
      expression: "$x.P->get('user')->get('tier')->to(@String)",
      column: {
        name: 'P_user_tier',
        code: "x | $x.P->get('user')->get('tier')->to(@String)",
      },
    });
  });
});
