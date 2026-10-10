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
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { flowResult, runInAction } from 'mobx';
import {
  CUBE_SNAPSHOT_VERSION_LABEL,
  getCubeWarehouseErrorHint,
} from '../../../__lib__/LegendCubeDataProductLabels.js';
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
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeGridRegion } from '../../grid/CubeGridRegion.js';

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
): Promise<
  ReturnType<typeof TEST__createCubeHost> & { editorState: CubeEditorState }
> => {
  const created = TEST__createCubeHost();
  const { host } = created;
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
      <CubeGridRegion editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  fireEvent.click(await TEST__findCanvasNode('dataProductAccessPoint101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { ...created, editorState };
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
    const { editorState } = await renderPanel();
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

  test('Runs the cube on a warehouse typed but not applied when the editor closes, as one undo step', async () => {
    const { editorState } = await renderPanel();
    fireEvent.change(warehouseInput(), { target: { value: 'TYPED_WH' } });
    act(() => {
      editorState.nodeEditor.finish();
    });
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.document.context?.model.warehouse).toBe('TYPED_WH');
    expect(editorState.history).toHaveLength(1);
  });

  test('Changes no warehouse when the editor closes with blank text', async () => {
    const { editorState } = await renderPanel();
    fireEvent.change(warehouseInput(), { target: { value: '  ' } });
    act(() => {
      editorState.nodeEditor.finish();
    });
    expect(editorState.document.context?.model.warehouse).toBe('CUBE_WH');
    expect(editorState.history).toHaveLength(0);
  });

  test('Drops a warehouse typed but not applied when the editor is cancelled', async () => {
    const { editorState } = await renderPanel();
    fireEvent.change(warehouseInput(), { target: { value: 'TYPED_WH' } });
    // a source's editor has no Cancel button; cancel is what drops edits
    act(() => editorState.nodeEditor.cancel());
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.document.context?.model.warehouse).toBe('CUBE_WH');
    expect(editorState.history).toHaveLength(0);
  });

  test('Runs the cube on a warehouse typed but not applied when a press outside closes the editor', async () => {
    const { editorState } = await renderPanel();
    fireEvent.change(warehouseInput(), { target: { value: 'TYPED_WH' } });
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
      );
    });
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(editorState.document.context?.model.warehouse).toBe('TYPED_WH');
    expect(editorState.history).toHaveLength(1);
  });

  test('Leaves text typed in an editor since closed out of later closes', async () => {
    const { editorState } = await renderPanel();
    fireEvent.change(warehouseInput(), { target: { value: 'TYPED_WH' } });
    act(() => editorState.nodeEditor.cancel());
    fireEvent.click(await TEST__findCanvasNode('dataProductAccessPoint101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(warehouseInput().value).toBe('CUBE_WH');
    act(() => {
      editorState.nodeEditor.finish();
    });
    expect(editorState.nodeEditor.nodeId).toBeUndefined();
    expect(editorState.document.context?.model.warehouse).toBe('CUBE_WH');
    expect(editorState.history).toHaveLength(0);
  });

  test("Links the access point's group to its product's page in the marketplace", async () => {
    await renderPanel();
    expect(
      within(panel()).getByRole<HTMLAnchorElement>('link', {
        name: 'Open in Marketplace',
      }).href,
    ).toBe(
      'https://marketplace.test/dataProduct/deployed/ORDERS_PRODUCT/1234#core',
    );
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

  test("Reads the access point's columns again on Refresh, through the catalog, and warns once when that fails", async () => {
    const { fake, dataProducts } = await renderPanel();
    fireEvent.click(within(panel()).getByText('Refresh'));
    await waitFor(() =>
      expect(
        within(panel()).getByText<HTMLButtonElement>('Refresh').disabled,
      ).toBe(false),
    );
    expect(dataProducts.resolveSchemas).toHaveBeenCalledTimes(1);
    expect([
      ...(dataProducts.resolveSchemas.mock.calls[0]?.[1] ?? new Map()).keys(),
    ]).toEqual(['dataProductAccessPoint101']);
    expect(within(panel()).queryAllByRole('status')).toHaveLength(0);

    dataProducts.resolveSchemas.mockRejectedValueOnce(
      new Error('Depot unavailable'),
    );
    fireEvent.click(within(panel()).getByText('Refresh'));
    await waitFor(() =>
      expect(within(panel()).getAllByRole('status')).toHaveLength(1),
    );
    // the access point keeps its columns
    expect(
      within(panel()).getByRole('table', { name: 'Columns' }),
    ).not.toBeNull();
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
  });

  test("Says, in the run's error and beside the warehouse, when the warehouse refused the run, until it changes", async () => {
    const { editorState, fake } = await renderPanel();
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'SQL compilation error:\nNo active warehouse selected in the current session',
        'dataProductAccessPoint101',
      ),
    );
    await act(() => flowResult(editorState.execution.execute()));
    const hint = getCubeWarehouseErrorHint('CUBE_WH', true);
    expect(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR)).getByText(
        hint,
      ),
    ).not.toBeNull();
    expect(within(panel()).getByText(hint)).not.toBeNull();
    fireEvent.change(warehouseInput(), { target: { value: 'NEW_WH' } });
    fireEvent.click(applyButton());
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).toBeNull();
    expect(within(panel()).queryByText(hint)).toBeNull();
    expect(
      screen.queryByText(getCubeWarehouseErrorHint('NEW_WH', true)),
    ).toBeNull();
  });

  test('Offers no other warehouse on a cube saved by a newer version, whose warehouse refused the run', async () => {
    const { editorState, fake } = await renderPanel({ readOnly: true });
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'No active warehouse selected in the current session',
        'dataProductAccessPoint101',
      ),
    );
    await act(() => flowResult(editorState.execution.execute()));
    expect(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR)).getByText(
        getCubeWarehouseErrorHint('CUBE_WH', false),
      ),
    ).not.toBeNull();
    expect(
      screen.queryByText(getCubeWarehouseErrorHint('CUBE_WH', true)),
    ).toBeNull();
  });

  test("Links a run refused for access to the data to the access point group's page in the marketplace, in the run's error", async () => {
    const { editorState, fake } = await renderPanel();
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Insufficient privileges to operate on table ORDERS',
        'dataProductAccessPoint101',
      ),
    );
    await act(() => flowResult(editorState.execution.execute()));
    const link = within(
      screen.getByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).getByRole<HTMLAnchorElement>('link', { name: 'Request access' });
    expect(link.href).toBe(
      'https://marketplace.test/dataProduct/deployed/ORDERS_PRODUCT/1234#core',
    );
    expect(link.target).toBe('_blank');
  });
});
