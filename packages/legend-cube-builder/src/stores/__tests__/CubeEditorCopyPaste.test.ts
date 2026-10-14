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
import { CubeDocument } from '@finos/legend-cube';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CUBE_TRADES_MODEL } from '../fixtures/CubeTradesModel.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const setUp = (): CubeEditorState =>
  new CubeEditorState(
    TEST__createCubeHost().host,
    new CubeDocument({ context: CONTEXT, query: sliceQuery() }),
  );

describe('Copying, pasting and duplicating steps', () => {
  test('Pastes a copied table into a cube of the same model, on its own, typed as it was', () => {
    const state = setUp();
    state.copyNode('relational101');
    expect(state.canPaste).toBe(true);
    state.pasteNode('filter101');
    const pasted = state.document.query.getNode('relational103');
    expect(pasted?.describe()).toBe(
      state.document.query.getNode('relational101')?.describe(),
    );
    // a source takes no input: on its own
    expect(state.document.query.getInputIds('relational103')).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  test("Refuses a table copied from a cube of another model, and takes one into an empty cube with the copied cube's model", () => {
    const state = setUp();
    state.copyNode('relational101');
    state.applyDocument(
      new CubeDocument({
        context: { model: CUBE_TRADES_MODEL, runtime: 'other::Runtime' },
        query: sliceQuery(),
      }),
    );
    expect(state.canPaste).toBe(false);
    state.startNewCube();
    expect(state.canPaste).toBe(true);
    state.pasteNode();
    expect(state.document.context).toEqual(CONTEXT);
    expect(state.document.query.nodes.map(({ id }) => id)).toEqual([
      'relational101',
    ]);
  });

  test('Pastes a transform into any cube; Duplicate leaves the copied step as it was', () => {
    const state = setUp();
    state.copyNode('filter101');
    state.duplicateNode('join101');
    expect(state.copiedNode?.node.id).toBe('filter101');
    expect(state.document.query.getInputIds('join102')).toEqual(['join101']);
  });
});
