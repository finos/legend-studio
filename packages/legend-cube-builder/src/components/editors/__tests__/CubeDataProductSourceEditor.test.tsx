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
  DataProductAccessPointSource,
  Query,
} from '@finos/legend-cube';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { runInAction } from 'mobx';
import { CUBE_SNAPSHOT_VERSION_LABEL } from '../../../__lib__/LegendCubeDataProductLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { FAKE_DAILY_ORDERS_SCHEMA } from '../../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../../../graph-manager/CubeDataProduct.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

/** A data product cube of one access point, daily_orders, on CUBE_WH */
const dataProductCube = (versionId: string): CubeDocument =>
  new CubeDocument({
    context: {
      model: createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId,
        environmentType: CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
        warehouse: 'CUBE_WH',
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    },
    query: new Query(
      [
        new DataProductAccessPointSource(
          'dataProductAccessPoint101',
          {
            dataProduct: 'sales::products::OrdersProduct',
            accessPointGroup: 'core',
            accessPoint: 'daily_orders',
            dataProductId: 'ORDERS_PRODUCT',
            deploymentId: '1234',
          },
          { kind: 'resolved', schema: FAKE_DAILY_ORDERS_SCHEMA },
        ),
      ],
      [],
      'dataProductAccessPoint101',
    ),
  });

const renderPanel = async (
  options: { versionId?: string; readOnly?: boolean } = {},
): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const editorState = new CubeEditorState(
    host,
    dataProductCube(options.versionId ?? '1.4.0'),
  );
  runInAction(() => {
    editorState.readOnly = options.readOnly ?? false;
  });
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
  fireEvent.click(await TEST__findCanvasNode('dataProductAccessPoint101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return editorState;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const warehouseInput = (): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>('Warehouse');

const applyButton = (): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name: 'Apply' });

beforeEach(() => {
  localStorage.clear();
});

describe('Source panel of a data product cube', () => {
  test('Shows the deployment class, and runs the cube on a warehouse typed and applied', async () => {
    const editorState = await renderPanel();
    expect(within(panel()).getByText('Production (parallel)')).not.toBeNull();
    expect(warehouseInput().value).toBe('CUBE_WH');
    expect(applyButton().disabled).toBe(true);
    fireEvent.change(warehouseInput(), { target: { value: '   ' } });
    expect(applyButton().disabled).toBe(true);
    fireEvent.change(warehouseInput(), { target: { value: ' NEW_WH ' } });
    fireEvent.click(applyButton());
    expect(editorState.document.context?.model.warehouse).toBe('NEW_WH');
    expect(warehouseInput().value).toBe('NEW_WH');
    expect(applyButton().disabled).toBe(true);
    // undo shows the cube's warehouse again
    act(() => editorState.undo());
    expect(await within(panel()).findByDisplayValue('CUBE_WH')).toBe(
      warehouseInput(),
    );
    expect(within(panel()).queryByText(CUBE_SNAPSHOT_VERSION_LABEL)).toBeNull();
  });

  test('Allows no warehouse edit on a cube saved by a newer version', async () => {
    await renderPanel({ readOnly: true });
    expect(warehouseInput().disabled).toBe(true);
    expect(applyButton().disabled).toBe(true);
  });

  test('Says when the project is at a moving SNAPSHOT version', async () => {
    await renderPanel({ versionId: 'feature-returns-SNAPSHOT' });
    expect(
      within(panel()).getByText(CUBE_SNAPSHOT_VERSION_LABEL),
    ).not.toBeNull();
  });
});
