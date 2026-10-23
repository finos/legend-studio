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
  CubeDocument,
  DataSpaceSource,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  CUBE_DATA_SPACE_EDITOR_HINT,
  CUBE_DATA_SPACE_MESSAGE,
} from '../../../__lib__/LegendCubeDataSpaceLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  buildFakeDataSpaceEdit,
  createFakeCubeDataSpaceEditor,
  FAKE_TRADES_DATA_SPACE,
  type FakeCubeDataSpaceEditor,
} from '../../../__test-utils__/FakeCubeDataSpaceEditor.js';
import { createCubeProjectModel } from '../../../graph-manager/CubeProject.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

/** A cube of one data space source, added from the source dialog and not set yet */
const dataSpaceCube = (): CubeDocument =>
  new CubeDocument({
    context: {
      model: createCubeProjectModel(FAKE_TRADES_DATA_SPACE.project),
      runtime: 'trading::TradeRuntime',
      mapping: 'trading::TradeMapping',
    },
    query: new Query(
      [
        new DataSpaceSource('dataSpace101', {
          dataSpace: FAKE_TRADES_DATA_SPACE.path,
          executionContext: 'production',
        }),
      ],
      [],
      'dataSpace101',
    ),
  });

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const renderCube = async (): Promise<{
  editorState: CubeEditorState;
  editor: FakeCubeDataSpaceEditor;
}> => {
  const { host, fake } = TEST__createCubeHost();
  // the engine types each relation
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    Promise.resolve(
      new Map(
        [...lambdas.keys()].map((key) => [
          key,
          new Schema([
            new SchemaColumn('id', PrimitiveType.get('Integer'), false),
          ]),
        ]),
      ),
    ),
  );
  const editor = createFakeCubeDataSpaceEditor();
  const editorState = new CubeEditorState(
    { ...host, dataSpaceEditor: editor.editor },
    dataSpaceCube(),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  return { editorState, editor };
};

beforeEach(() => {
  localStorage.clear();
});

describe("A data space source's editor", () => {
  test('Shows the query builder, wide, once the data space loads, and applies its query', async () => {
    const { editorState, editor } = await renderCube();
    fireEvent.click(await TEST__findCanvasNode('dataSpace101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(within(panel()).getByText(CUBE_DATA_SPACE_EDITOR_HINT)).toBeTruthy();
    // said once, in the editor's body
    expect(
      within(panel()).getAllByText(CUBE_DATA_SPACE_MESSAGE.LOADING),
    ).toHaveLength(1);
    // taller than any other node's editor, which the query builder fills
    expect(
      screen
        .getByTestId(LEGEND_CUBE_TEST_ID.DATA_SPACE_EDITOR)
        .closest('.h-\\[60vh\\]'),
    ).not.toBeNull();
    const [session] = editor.sessions;
    act(() => session?.load());
    expect(within(panel()).getByTestId('fake-query-builder').textContent).toBe(
      'The query builder on trading::TradesDataSpace',
    );
    const apply = within(panel()).getByRole('button', { name: 'Apply' });
    expect(apply).toHaveProperty('disabled', true);
    act(() =>
      session?.setEdit(buildFakeDataSpaceEdit('trading::Trade', ['id'])),
    );
    expect(apply).toHaveProperty('disabled', false);
    fireEvent.click(apply);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    const applied = (): DataSpaceSource =>
      editorState.document.query.getNode('dataSpace101') as DataSpaceSource;
    expect(applied().entity).toBe('trading::Trade');
    expect(session?.isDisposed).toBe(true);
    // then typed by the engine
    await waitFor(() => expect(applied().resolution.kind).toBe('resolved'));
  });

  test("Leaves an Escape in the query builder's fields to them, and closes on one elsewhere", async () => {
    const { editor } = await renderCube();
    fireEvent.click(await TEST__findCanvasNode('dataSpace101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    const [session] = editor.sessions;
    act(() => session?.load());
    // the explorer's search clears on Escape
    const search = within(panel()).getByRole('textbox', {
      name: 'Search properties',
    });
    search.focus();
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR),
    ).not.toBeNull();
    const remove = within(panel()).getByRole('button', {
      name: 'Remove column',
    });
    remove.focus();
    fireEvent.keyDown(remove, { key: 'Escape' });
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
  });

  test("Says why Apply waits: the query builder's reason, and the data space that can't load", async () => {
    const { editor } = await renderCube();
    fireEvent.click(await TEST__findCanvasNode('dataSpace101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    const [session] = editor.sessions;
    act(() => {
      session?.load();
      session?.setProblem('Aggregates are Cube steps: group after this source');
    });
    expect(
      within(panel()).getByText(
        'Aggregates are Cube steps: group after this source',
      ),
    ).toBeTruthy();
    act(() => session?.fail('No data space trading::TradesDataSpace at 2.3.0'));
    expect(
      within(panel()).getAllByText(
        'No data space trading::TradesDataSpace at 2.3.0',
      ),
    ).toHaveLength(1);
  });
});
