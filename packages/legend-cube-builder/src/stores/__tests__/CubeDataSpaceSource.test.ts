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
  DataSpaceSource,
  MESSAGE_DATA_SPACE_SOURCE_UNSET,
  printIR,
  resolveCubeType,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  buildFakeDataSpaceEdit,
  createFakeCubeDataSpaceEditor,
  FAKE_TRADES_DATA_SPACE,
  type FakeCubeDataSpaceEditor,
  type FakeCubeDataSpaceEditorSession,
} from '../../__test-utils__/FakeCubeDataSpaceEditor.js';
import { CUBE_DATA_SPACE_MESSAGE } from '../../__lib__/LegendCubeDataSpaceLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeDataSpaceDraft } from '../editors/CubeDataSpaceDraft.js';
import { getCubeDataSpaceKey } from '../source-picker/CubeDataSpaceTabState.js';

// A data space source's editor (PLAN §11.25): the host's query builder, in
// a session the node editor's draft opens; Apply stores its query, which the
// editor then types with the engine

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const TRADES_SCHEMA = new Schema([
  new SchemaColumn('id', resolveCubeType('Integer'), false),
  new SchemaColumn('quantity', resolveCubeType('Float'), true),
]);

const setUp = (): {
  state: CubeEditorState;
  fake: FakeCubeEngine;
  editor: FakeCubeDataSpaceEditor;
} => {
  const { host, fake } = TEST__createCubeHost();
  // the engine types each relation
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    Promise.resolve(
      new Map([...lambdas.keys()].map((key) => [key, TRADES_SCHEMA])),
    ),
  );
  const editor = createFakeCubeDataSpaceEditor();
  return {
    state: new CubeEditorState({ ...host, dataSpaceEditor: editor.editor }),
    fake,
    editor,
  };
};

/** Adds an unset source on the trades data space, as the Data Space tab does, its editor open */
const addTrades = async (
  state: CubeEditorState,
  executionContext = 'production',
): Promise<DataSpaceSource> => {
  state.addNode(DataSpaceSource.TYPE);
  await settle();
  const tab = state.sourcePicker.dataSpaceTab;
  await flowResult(tab.pick(getCubeDataSpaceKey(FAKE_TRADES_DATA_SPACE)));
  tab.setExecutionContext(executionContext);
  await flowResult(state.sourcePicker.confirm());
  return state.document.query.nodes.at(-1) as DataSpaceSource;
};

const draftOf = (state: CubeEditorState): CubeDataSpaceDraft => {
  const { draft } = state.nodeEditor;
  if (!(draft instanceof CubeDataSpaceDraft)) {
    throw new Error('The node editor shows no data space source');
  }
  return draft;
};

const sessionOf = (state: CubeEditorState): FakeCubeDataSpaceEditorSession =>
  draftOf(state).session as FakeCubeDataSpaceEditorSession;

describe("A data space source's editor", () => {
  test('Opens the query builder on the source, and waits for it before Apply', async () => {
    const { state } = setUp();
    const source = await addTrades(state);
    expect(state.analysis.validity.get(source.id)).toEqual([
      MESSAGE_DATA_SPACE_SOURCE_UNSET,
    ]);
    const session = sessionOf(state);
    expect(session.target).toEqual({
      project: FAKE_TRADES_DATA_SPACE.project,
      dataSpace: FAKE_TRADES_DATA_SPACE.path,
      executionContext: 'production',
      query: undefined,
    });
    // nothing to apply while it loads: the editor's body says so
    expect(draftOf(state).applyDisabledReason).toBeUndefined();
    expect(state.nodeEditor.hasChanges).toBe(false);
    session.load();
    // nothing picked yet: nothing to apply, and nothing to say
    expect(draftOf(state).applyDisabledReason).toBeUndefined();
    expect(state.nodeEditor.hasChanges).toBe(false);
    session.setProblem('Aggregates are Cube steps: group after this source');
    expect(draftOf(state).applyDisabledReason).toBe(
      'Aggregates are Cube steps: group after this source',
    );
    // a query Cube can't run, kept open on closing, saying why
    expect(state.nodeEditor.finish()).toBe(false);
    expect(state.nodeEditor.nodeId).toBe(source.id);
    session.fail('The data space has no such entity');
    expect(draftOf(state).applyDisabledReason).toBeUndefined();
  });

  test('Stores the query on Apply as one step, types it with the engine, and runs it from the mapping and runtime', async () => {
    const { state, fake } = setUp();
    const unset = await addTrades(state);
    const session = sessionOf(state);
    session.load();
    session.setEdit(
      buildFakeDataSpaceEdit('trading::Trade', ['id', 'quantity']),
    );
    expect(state.nodeEditor.hasChanges).toBe(true);
    expect(state.nodeEditor.finish()).toBe(true);
    expect(session.isDisposed).toBe(true);
    const applied = state.document.query.getNode(unset.id) as DataSpaceSource;
    expect(applied.entity).toBe('trading::Trade');
    expect(applied.isUnset()).toBe(false);
    await settle();
    // typed as it landed: `{| <its relation>}`, against the cube's project
    const [model, lambdas] = fake.typeLambdas.mock.calls[0] ?? [];
    expect(model).toBe(state.document.context?.model);
    expect(lambdas?.get(unset.id)).toEqual({
      k: 'lambda',
      params: [],
      body: [
        {
          k: 'raw',
          json: (applied.relation?.body as unknown[])[0],
          origin: { nodeId: unset.id, role: 'accessor' },
        },
      ],
    });
    const typed = state.document.query.getNode(unset.id) as DataSpaceSource;
    expect(typed.resolution).toEqual({
      kind: 'resolved',
      schema: TRADES_SCHEMA,
    });
    expect(state.analysis.validity.get(unset.id)).toEqual([]);
    expect(
      printIR(
        state.emitter.emitExecutionLambda({
          runtime: state.document.context?.runtime as string,
          mapping: state.document.context?.mapping,
        }),
      ),
    ).toMatch(/->from\(trading::TradeMapping, trading::TradeRuntime\)\}$/u);
    // the Apply is one undo step, back to the unset source
    state.undo();
    expect(
      (state.document.query.getNode(unset.id) as DataSpaceSource).isUnset(),
    ).toBe(true);
  });

  test("Keeps the cube's typing failure on the source, as for any source", async () => {
    const { state, fake } = setUp();
    fake.typeLambdas.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "Can't find property 'quantity'\nat line 1",
      ),
    );
    const unset = await addTrades(state);
    const session = sessionOf(state);
    session.load();
    session.setEdit(buildFakeDataSpaceEdit('trading::Trade', ['quantity']));
    state.nodeEditor.finish();
    await settle();
    const failed = state.document.query.getNode(unset.id) as DataSpaceSource;
    expect(failed.resolution.kind).toBe('failed');
    expect(state.analysis.validity.get(unset.id)).toEqual([
      "Can't find property 'quantity'",
    ]);
  });

  test("Changes the cube's mapping and runtime with the source's execution context, in the same step, when it is the only data space source", async () => {
    const { state } = setUp();
    const unset = await addTrades(state);
    const session = sessionOf(state);
    session.load();
    session.setEdit(buildFakeDataSpaceEdit('trading::Trade', ['id'], 'uat'));
    expect(draftOf(state).editedContext).toMatchObject({
      mapping: 'trading::TradeUatMapping',
      runtime: 'trading::TradeUatRuntime',
    });
    state.nodeEditor.finish();
    expect(state.document.context).toMatchObject({
      mapping: 'trading::TradeUatMapping',
      runtime: 'trading::TradeUatRuntime',
    });
    expect(
      (state.document.query.getNode(unset.id) as DataSpaceSource)
        .executionContext,
    ).toBe('uat');
    state.undo();
    expect(state.document.context).toMatchObject({
      mapping: 'trading::TradeMapping',
      runtime: 'trading::TradeRuntime',
    });
  });

  test("Refuses another execution context while other data space sources run in the cube's", async () => {
    const { state } = setUp();
    await addTrades(state);
    sessionOf(state).load();
    sessionOf(state).setEdit(buildFakeDataSpaceEdit('trading::Trade', ['id']));
    state.nodeEditor.finish();
    await addTrades(state);
    const session = sessionOf(state);
    session.load();
    session.setEdit(buildFakeDataSpaceEdit('trading::Position', ['id'], 'uat'));
    expect(draftOf(state).applyDisabledReason).toBe(
      CUBE_DATA_SPACE_MESSAGE.OTHER_CONTEXT('uat', 'production'),
    );
    expect(draftOf(state).editedContext).toBeUndefined();
    // in the cube's context, it applies
    session.setEdit(buildFakeDataSpaceEdit('trading::Position', ['id']));
    expect(draftOf(state).applyDisabledReason).toBeUndefined();
  });

  test('Keeps the query builder and its edits while the source is typed underneath it', async () => {
    const { state } = setUp();
    const unset = await addTrades(state);
    const session = sessionOf(state);
    session.load();
    session.setEdit(buildFakeDataSpaceEdit('trading::Trade', ['id']));
    // an Apply that goes on editing: a new draft, on the stored source
    state.nodeEditor.apply();
    expect(session.isDisposed).toBe(true);
    const next = sessionOf(state);
    expect(next).not.toBe(session);
    expect(next.target.query).toEqual(
      (state.document.query.getNode(unset.id) as DataSpaceSource).query,
    );
    // a column added while the engine types the source
    next.load();
    next.setEdit(buildFakeDataSpaceEdit('trading::Trade', ['id', 'quantity']));
    await settle();
    expect(
      (state.document.query.getNode(unset.id) as DataSpaceSource).resolution
        .kind,
    ).toBe('resolved');
    // the same draft, query builder and edits
    expect(sessionOf(state)).toBe(next);
    expect(next.isDisposed).toBe(false);
    expect(state.nodeEditor.hasChanges).toBe(true);
  });

  test("Says why it can't open the query builder on a cube whose project can't be read", async () => {
    const { state } = setUp();
    const unset = await addTrades(state);
    state.nodeEditor.cancel();
    // the cube's project at a version Cube doesn't read
    const context = state.document.context;
    state.applyDocument(
      state.document.withContext({
        ...(context as NonNullable<typeof context>),
        model: {
          ...(context?.model as NonNullable<typeof context>['model']),
          sdlcInfo: {
            _type: 'alloy',
            groupId: 'com.example',
            artifactId: 'trading',
            version: '2.3.0-SNAPSHOT',
            packageableElementPointers: [],
          },
        },
      }),
    );
    state.nodeEditor.open(unset.id);
    const draft = draftOf(state);
    expect(draft.session).toBeUndefined();
    expect(draft.openError).toBe(CUBE_DATA_SPACE_MESSAGE.NO_PROJECT);
    expect(draft.applyDisabledReason).toBeUndefined();
  });
});
