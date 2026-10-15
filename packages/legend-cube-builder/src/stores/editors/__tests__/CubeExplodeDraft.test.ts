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
import { Explode, type IR, printIR } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  TEST__payloadSample,
  TEST__setUpPayloadRun,
} from '../../../__test-utils__/CubeVariantTestUtils.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../../CubeEditorState.js';
import { CUBE_JSON_RUN_LABEL } from '../../variant/CubeJsonSampling.js';
import { CubeExplodeDraft } from '../CubeExplodeDraft.js';

beforeEach(() => {
  localStorage.clear();
});

/** The payload cube, then an explode of these settings after its table, and its draft */
const setUp = async (
  explode = new Explode('explode101'),
): Promise<
  Awaited<ReturnType<typeof TEST__setUpPayloadRun>> & {
    draft: CubeExplodeDraft;
  }
> => {
  const setUpRun = await TEST__setUpPayloadRun();
  const state: CubeEditorState = setUpRun.state;
  state.addConfiguredNode(explode, 'relational101');
  const node = state.document.query.getNode(explode.id) as Explode;
  return { ...setUpRun, draft: new CubeExplodeDraft(node, state) };
};

describe('Explode Array draft (PLAN §11.20)', () => {
  test('Gives back its node until edited, then a node of its column, keys and name', async () => {
    const { draft } = await setUp();
    expect(draft.build() === draft.original).toBe(true);
    draft.setColumn('PAYLOAD');
    draft.pickArray(['tags']);
    const built = draft.build();
    expect([built.id, built.column, built.path, built.name]).toEqual([
      'explode101',
      'PAYLOAD',
      ['tags'],
      'tags_element',
    ]);
    // back to how it was: the original again
    draft.setColumn('');
    expect(draft.build() === draft.original).toBe(true);
  });

  test('Names the element after its keys until a name is typed, then keeps that name', async () => {
    const { draft } = await setUp();
    draft.setColumn('PAYLOAD');
    expect(draft.name).toBe('PAYLOAD_element');
    draft.addKey();
    draft.setKey(0, 'user');
    draft.addKey();
    draft.setKey(1, 'roles');
    expect(draft.path).toEqual(['user', 'roles']);
    expect(draft.name).toBe('roles_element');
    draft.removeKey(0);
    expect(draft.path).toEqual(['roles']);
    draft.setName('role');
    draft.pickArray(['tags']);
    expect(draft.name).toBe('role');
    // a node that has a name keeps it
    const named = await setUp(
      new Explode('explode101', 'PAYLOAD', ['tags'], 'tag'),
    );
    named.draft.pickArray([]);
    expect(named.draft.name).toBe('tag');
    // one named as Explore JSON names it still follows the keys
    const offered = await setUp(
      new Explode('explode101', 'PAYLOAD', ['tags'], 'tags_element'),
    );
    offered.draft.pickArray([]);
    expect(offered.draft.name).toBe('PAYLOAD_element');
  });

  test("Finds the arrays in the column's first values, read after its input through Runs", async () => {
    const { state, fake, draft } = await setUp();
    draft.setColumn('PAYLOAD');
    fake.execute.mockResolvedValueOnce(
      TEST__payloadSample([
        '{"tags":["a"],"user":{"roles":["x","y"]},"n":1}',
        '{"tags":[],"user":{}}',
      ]),
    );
    await flowResult(draft.readSample());
    const run = printIR(fake.execute.mock.calls.at(-1)?.[1] as IR);
    expect(run).toContain('->select(~[PAYLOAD])');
    expect(run).toContain('->filter({row | !($row.PAYLOAD->isEmpty())})');
    // not after the explode: its input's rows
    expect(run).not.toContain('lateral');
    expect(state.runStats.entries[0]?.label).toBe(
      CUBE_JSON_RUN_LABEL.sample('PAYLOAD'),
    );
    expect(draft.arrays?.map((array) => array.path)).toEqual([
      ['tags'],
      ['user', 'roles'],
    ]);
    expect(draft.arrays?.[1]?.presence).toBe(0.5);
    // another column's sample is not this one's
    draft.setColumn('ORDER_ID');
    expect(draft.arrays).toBeUndefined();
    expect(draft.path).toEqual([]);
  });

  test("Keeps the engine's message when the sample can't be read", async () => {
    const { fake, draft } = await setUp();
    draft.setColumn('PAYLOAD');
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'The engine is down'),
    );
    await flowResult(draft.readSample());
    expect(draft.sampleError).toBe('The engine is down');
    expect(draft.isSampling).toBe(false);
    expect(draft.arrays).toBeUndefined();
  });
});
