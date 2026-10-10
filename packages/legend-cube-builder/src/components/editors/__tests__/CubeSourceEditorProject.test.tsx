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
import { CubeDocument, Query } from '@finos/legend-cube';
import { fireEvent, screen, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { createFakeCubeProjectCatalog } from '../../../__test-utils__/FakeCubeProjectCatalog.js';
import { createCubeProjectModel } from '../../../graph-manager/CubeProject.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

describe('Source panel of a project cube', () => {
  test("Shows the cube's project and version above its Database", async () => {
    const created = TEST__createCubeHost();
    const host = {
      ...created.host,
      projectCatalog: createFakeCubeProjectCatalog().catalog,
    };
    const editorState = new CubeEditorState(
      host,
      new CubeDocument({
        context: {
          model: createCubeProjectModel({
            groupId: 'com.example',
            artifactId: 'sales',
            versionId: '1.9.0',
          }),
          runtime: NORTHWIND_RUNTIME,
        },
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    await TEST__renderInCubeApplication(
      <div style={{ display: 'flex' }}>
        <div style={{ width: 800, height: 400 }}>
          <CubeCanvas editorState={editorState} />
        </div>
        <CubeNodeEditorPanel editorState={editorState} />
      </div>,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.CANVAS,
    );
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    const panel = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(
      [...panel.querySelectorAll('dt')].map((term) => term.textContent),
    ).toEqual(['Project', 'Version', 'Database', 'Schema', 'Table']);
    expect(within(panel).getByText('com.example:sales')).not.toBeNull();
    expect(within(panel).getByText('1.9.0')).not.toBeNull();
  });
});
