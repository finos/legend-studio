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
import { Connection, CubeDocument, Distinct, Query } from '@finos/legend-cube';
import { fireEvent, screen, within } from '@testing-library/react';
import { DISTINCT_EDITOR_TEXT } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

beforeEach(() => {
  localStorage.clear();
});

describe('Distinct editor', () => {
  test('Says there is nothing to set, with no Apply or Cancel, and closes without a change', async () => {
    const { host } = TEST__createCubeHost();
    const editorState = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new Distinct('distinct101'),
          ],
          [new Connection('relational101', 'distinct101', 'tds')],
          'distinct101',
        ),
      }),
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
    fireEvent.click(await TEST__findCanvasNode('distinct101'));
    const panel = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(within(panel).getByText('Distinct Values')).toBeDefined();
    expect(within(panel).getByText(DISTINCT_EDITOR_TEXT)).toBeDefined();
    expect(within(panel).queryByText(/can't be edited/u)).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Apply' })).toBeNull();
    expect(within(panel).queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(within(panel).queryByRole('alert')).toBeNull();
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Close the editor' }),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.history).toHaveLength(0);
  });
});
