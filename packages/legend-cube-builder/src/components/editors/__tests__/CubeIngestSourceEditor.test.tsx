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
  diffSchemas,
  IngestDatasetSource,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { getCubeWarehouseErrorHint } from '../../../__lib__/LegendCubeDataProductLabels.js';
import { getDataSetDriftWarning } from '../../../__lib__/LegendCubeIngestLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeIngestCatalog,
  FAKE_INGEST_ORDERS,
  FAKE_INGEST_TRADES_SCHEMA,
  fakeIngestUrnOf,
} from '../../../__test-utils__/FakeCubeIngestCatalog.js';
import { CubeDataProductEnvironmentType } from '../../../graph-manager/CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import {
  createCubeIngestModel,
  CUBE_INGEST_MODEL_TYPE,
  CUBE_INGEST_RUNTIME_PATH,
} from '../../../graph-manager/CubeIngest.js';
import { getCubeRememberedWarehouse } from '../../../stores/CubeDataProductWarehouse.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeGridRegion } from '../../grid/CubeGridRegion.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

/** An ingest cube of one data set, TRADES, saved with an older column */
const ingestCube = (): CubeDocument =>
  new CubeDocument({
    context: {
      model: createCubeIngestModel({
        environmentType: CubeDataProductEnvironmentType.PRODUCTION,
        producerDeploymentId: '1234',
        warehouse: 'CUBE_WH',
      }),
      runtime: CUBE_INGEST_RUNTIME_PATH,
    },
    query: new Query(
      [
        new IngestDatasetSource(
          'ingestDataset101',
          {
            ingestDefinitionUrn: fakeIngestUrnOf(FAKE_INGEST_ORDERS),
            ingestDefinition: FAKE_INGEST_ORDERS,
            dataSet: 'TRADES',
          },
          {
            kind: 'resolved',
            schema: new Schema([
              new SchemaColumn('TRADE_ID', PrimitiveType.get('Integer'), false),
            ]),
          },
        ),
      ],
      [],
      'ingestDataset101',
    ),
  });

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const warehouseInput = (): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>('Warehouse');

beforeEach(() => {
  localStorage.clear();
});

describe("An ingest data set's panel", () => {
  test('Shows where it reads from, the cube’s class, producer and warehouse, and reads its columns again on Refresh', async () => {
    const { host } = TEST__createCubeHost();
    const ingest = createFakeCubeIngestCatalog();
    const editorState = new CubeEditorState(
      { ...host, ingestCatalog: ingest.catalog },
      ingestCube(),
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
    fireEvent.click(await TEST__findCanvasNode('ingestDataset101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    expect(within(panel()).getByText(FAKE_INGEST_ORDERS)).toHaveProperty(
      'title',
      fakeIngestUrnOf(FAKE_INGEST_ORDERS),
    );
    expect(within(panel()).getByText('TRADES')).toBeTruthy();
    expect(within(panel()).getByText('Production')).toBeTruthy();
    expect(within(panel()).getByText('Deployment 1234')).toBeTruthy();
    expect(
      within(panel()).getByLabelText<HTMLInputElement>('Warehouse').value,
    ).toBe('CUBE_WH');
    // its saved columns, one fewer than the deployed definition declares
    expect(within(panel()).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(within(panel()).getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(within(panel()).getAllByRole('row')).toHaveLength(
        FAKE_INGEST_TRADES_SCHEMA.columns.length + 1,
      ),
    );
    expect(ingest.resolveSchemas.mock.calls).toEqual([
      [
        CubeDataProductEnvironmentType.PRODUCTION,
        new Map([
          [
            'ingestDataset101',
            {
              ingestDefinitionUrn: fakeIngestUrnOf(FAKE_INGEST_ORDERS),
              ingestDefinition: FAKE_INGEST_ORDERS,
              dataSet: 'TRADES',
            },
          ],
        ]),
        { fresh: true },
      ],
    ]);
    const node = guaranteeNonNullable(
      editorState.document.query.getNode('ingestDataset101'),
    );
    expect(editorState.warnings.get(node.key)).toEqual([
      getDataSetDriftWarning(
        diffSchemas(
          new Schema([
            new SchemaColumn('TRADE_ID', PrimitiveType.get('Integer'), false),
          ]),
          FAKE_INGEST_TRADES_SCHEMA,
        ),
      ),
    ]);
  });

  test('Runs the cube on a warehouse typed and applied, as one undo step, and says beside it when the warehouse refused the run', async () => {
    const created = TEST__createCubeHost();
    const { host, fake } = created;
    const ingest = createFakeCubeIngestCatalog();
    const editorState = new CubeEditorState(
      { ...host, ingestCatalog: ingest.catalog },
      ingestCube(),
    );
    await TEST__renderInCubeApplication(
      <div style={{ display: 'flex' }}>
        <div style={{ width: 800, height: 400 }}>
          <CubeCanvas editorState={editorState} />
        </div>
        <CubeNodeEditorPanel editorState={editorState} />
        <CubeGridRegion editorState={editorState} />
      </div>,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.CANVAS,
    );
    fireEvent.click(await TEST__findCanvasNode('ingestDataset101'));
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'SQL compilation error:\nNo active warehouse selected in the current session',
        'ingestDataset101',
      ),
    );
    await act(() => flowResult(editorState.execution.execute()));
    const hint = getCubeWarehouseErrorHint('CUBE_WH', true);
    expect(within(panel()).getByText(hint)).toBeTruthy();
    expect(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR)).getByText(
        hint,
      ),
    ).toBeTruthy();
    fireEvent.change(warehouseInput(), { target: { value: ' NEW_WH ' } });
    fireEvent.keyDown(warehouseInput(), { key: 'Enter' });
    expect(editorState.document.context?.model).toEqual({
      _type: CUBE_INGEST_MODEL_TYPE,
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      producerDeploymentId: '1234',
      warehouse: 'NEW_WH',
    });
    expect(editorState.history).toHaveLength(1);
    expect(
      getCubeRememberedWarehouse(host.applicationStore.userDataService),
    ).toBe('NEW_WH');
    expect(within(panel()).queryByText(hint)).toBeNull();
    act(() => editorState.undo());
    expect(await within(panel()).findByDisplayValue('CUBE_WH')).toBe(
      warehouseInput(),
    );
  });
});
