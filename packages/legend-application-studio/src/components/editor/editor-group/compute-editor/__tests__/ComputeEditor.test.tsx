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

import { test, expect, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  act,
  waitFor,
  fireEvent,
  getByText,
  findByText,
  queryByText,
  screen,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { runInAction } from 'mobx';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import {
  type AppDirOwner,
  AppDirLevel,
  SnowflakeComputeSpecification,
  SnowflakeResourceConstraint,
  SnowflakeScalingPolicy,
  SnowflakeWarehouseSize,
  SnowflakeWarehouseType,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { ComputeEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/compute/ComputeEditorState.js';

const COMPUTE_CLASSIFIER =
  'meta::external::compute::specification::metamodel::Compute';

const TEST_DATA__ComputeElements = [
  {
    path: 'test::SnowflakeWh',
    content: {
      _type: 'compute',
      name: 'SnowflakeWh',
      package: 'test',
      owner: {
        _type: 'appDir',
        prodParallel: { appDirId: 67890, level: 'DEPLOYMENT' },
        production: { appDirId: 12345, level: 'DEPLOYMENT' },
      },
      specification: {
        _type: 'snowflakeComputeSpecification',
        autoSuspend: 300,
        comment: 'test warehouse',
        enableQueryAcceleration: true,
        maxClusterCount: 6,
        maxConcurrencyLevel: 8,
        minClusterCount: 2,
        queryAccelerationMaxScaleFactor: 8,
        resourceConstraint: 'MEMORY_1X',
        scalingPolicy: 'ECONOMY',
        statementQueuedTimeoutInSeconds: 60,
        statementTimeoutInSeconds: 3600,
        warehouseSize: 'MEDIUM',
        warehouseType: 'SNOWPARK_OPTIMIZED',
      },
    },
    classifierPath: COMPUTE_CLASSIFIER,
  },
  {
    path: 'test::AdaptiveWh',
    content: {
      _type: 'compute',
      name: 'AdaptiveWh',
      package: 'test',
      owner: {
        _type: 'appDir',
        production: { appDirId: 12345, level: 'DEPLOYMENT' },
      },
      specification: {
        _type: 'snowflakeComputeSpecification',
        comment: 'adaptive warehouse',
        maxQueryPerformanceLevel: 'LARGE',
        queryThroughputMultiplier: 3,
        statementTimeoutInSeconds: 3600,
        warehouseType: 'ADAPTIVE',
      },
    },
    classifierPath: COMPUTE_CLASSIFIER,
  },
  {
    // an owner with no production node: ok to create in studio, rejected by engine
    path: 'test::NoOwnerWh',
    content: {
      _type: 'compute',
      name: 'NoOwnerWh',
      package: 'test',
      owner: { _type: 'appDir' },
      specification: {
        _type: 'snowflakeComputeSpecification',
        warehouseType: 'STANDARD',
      },
    },
    classifierPath: COMPUTE_CLASSIFIER,
  },
  {
    path: 'test::DbxWh',
    content: {
      _type: 'compute',
      name: 'DbxWh',
      package: 'test',
      owner: {
        _type: 'appDir',
        production: { appDirId: 12345, level: 'DEPLOYMENT' },
      },
      specification: {
        _type: 'databricksComputeSpecification',
        autoStopMins: 30,
        clusterSize: 'SMALL',
        enablePhoton: true,
      },
    },
    classifierPath: COMPUTE_CLASSIFIER,
  },
];

const TOGGLED_CLASS = 'panel__content__form__section__toggler__btn--toggled';

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;

beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__ComputeElements,
  });
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
});

const getSnowflakeSpec = (
  path = 'test::SnowflakeWh',
): SnowflakeComputeSpecification =>
  guaranteeType(
    MOCK__editorStore.graphManagerState.graph.getCompute(path).specification,
    SnowflakeComputeSpecification,
  );

const getOwner = (path = 'test::SnowflakeWh'): AppDirOwner =>
  MOCK__editorStore.graphManagerState.graph.getCompute(path).owner;

const textInput = (editorGroup: HTMLElement, label: string): HTMLInputElement =>
  guaranteeNonNullable(
    getByText(editorGroup, label)
      .closest('.panel__content__form__section')
      ?.querySelector('input'),
  );

const toggleButton = (
  editorGroup: HTMLElement,
  label: string,
): HTMLButtonElement =>
  guaranteeNonNullable(
    getByText(editorGroup, label)
      .closest('.panel__content__form__section__toggler')
      ?.querySelector('button'),
  );

const selectEnum = async (
  editorGroup: HTMLElement,
  currentValue: string,
  nextValue: string,
): Promise<void> => {
  fireEvent.mouseDown(getByText(editorGroup, currentValue));
  const options = await screen.findAllByRole('option');
  const option = options.find((opt) => opt.textContent === nextValue);
  expect(option).not.toBeUndefined();
  fireEvent.click(guaranteeNonNullable(option));
  await findByText(editorGroup, nextValue);
};

// `marker` is how each test confirms it landed on the right form state
const openComputeEditor = async (
  path: string,
  marker: string | RegExp,
): Promise<HTMLElement> => {
  await TEST__openElementFromExplorerTree(path, renderResult);
  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );
  await waitFor(() => getByText(editorGroup, marker));
  return editorGroup;
};

const openSnowflakeEditor = (): Promise<HTMLElement> =>
  openComputeEditor('test::SnowflakeWh', 'Owner');

test(
  integrationTest(
    'Snowflake Compute form-mode editor renders the fields legal for the current warehouse type',
  ),
  async () => {
    const editorGroup = await openSnowflakeEditor();

    getByText(editorGroup, 'Warehouse');
    getByText(editorGroup, 'Cluster');
    getByText(editorGroup, 'Concurrency & Timeouts');
    getByText(editorGroup, 'Advanced');

    // Adaptive Sizing holds nothing legal for SNOWPARK_OPTIMIZED, so the
    // section is dropped rather than rendered empty
    expect(queryByText(editorGroup, 'Adaptive Sizing')).toBeNull();

    expect(textInput(editorGroup, 'Production AppDir ID').value).toBe('12345');
    expect(textInput(editorGroup, 'Prod-parallel AppDir ID').value).toBe(
      '67890',
    );

    getByText(editorGroup, 'SNOWPARK_OPTIMIZED'); // warehouse type
    getByText(editorGroup, 'MEDIUM'); // warehouse size
    getByText(editorGroup, 'MEMORY_1X'); // resource constraint

    // `generation` is illegal for SNOWPARK_OPTIMIZED
    expect(queryByText(editorGroup, 'Generation')).toBeNull();

    expect(textInput(editorGroup, 'Min Cluster Count').value).toBe('2');
    expect(textInput(editorGroup, 'Max Cluster Count').value).toBe('6');
    getByText(editorGroup, 'ECONOMY'); // scaling policy

    expect(textInput(editorGroup, 'Max Concurrency Level').value).toBe('8');
    expect(
      textInput(editorGroup, 'Statement Queued Timeout (seconds)').value,
    ).toBe('60');
    expect(textInput(editorGroup, 'Statement Timeout (seconds)').value).toBe(
      '3600',
    );

    expect(textInput(editorGroup, 'Auto Suspend (seconds)').value).toBe('300');
    expect(textInput(editorGroup, 'Comment').value).toBe('test warehouse');
    expect(
      toggleButton(editorGroup, 'Query Acceleration').classList.contains(
        TOGGLED_CLASS,
      ),
    ).toBe(true);
    expect(
      textInput(editorGroup, 'Query Acceleration Max Scale Factor').value,
    ).toBe('8');
  },
);

test(
  integrationTest(
    'Editing every Snowflake Compute field writes back to the graph model',
  ),
  async () => {
    const editorGroup = await openSnowflakeEditor();

    const edits: (
      | { widget: 'text'; label: string; input: string }
      | { widget: 'enum'; from: string; to: string }
    )[] = [
      { widget: 'text', label: 'Production AppDir ID', input: '55555' },
      { widget: 'text', label: 'Prod-parallel AppDir ID', input: '11111' },
      { widget: 'enum', from: 'MEDIUM', to: 'XLARGE' },
      { widget: 'enum', from: 'MEMORY_1X', to: 'MEMORY_64X' },
      { widget: 'text', label: 'Min Cluster Count', input: '3' },
      { widget: 'text', label: 'Max Cluster Count', input: '9' },
      { widget: 'enum', from: 'ECONOMY', to: 'STANDARD' },
      { widget: 'text', label: 'Max Concurrency Level', input: '16' },
      {
        widget: 'text',
        label: 'Statement Queued Timeout (seconds)',
        input: '120',
      },
      { widget: 'text', label: 'Statement Timeout (seconds)', input: '7200' },
      { widget: 'text', label: 'Auto Suspend (seconds)', input: '600' },
      { widget: 'text', label: 'Comment', input: 'updated comment' },
      {
        widget: 'text',
        label: 'Query Acceleration Max Scale Factor',
        input: '16',
      },
    ];

    for (const edit of edits) {
      if (edit.widget === 'text') {
        fireEvent.change(textInput(editorGroup, edit.label), {
          target: { value: edit.input },
        });
      } else {
        await selectEnum(editorGroup, edit.from, edit.to);
      }
    }

    const owner = getOwner();
    expect(owner.production?.appDirId).toBe(55555);
    expect(owner.prodParallel?.appDirId).toBe(11111);

    const spec = getSnowflakeSpec();
    expect(spec.warehouseSize).toBe(SnowflakeWarehouseSize.XLARGE);
    expect(spec.resourceConstraint).toBe(
      SnowflakeResourceConstraint.MEMORY_64X,
    );
    expect(spec.minClusterCount).toBe(3);
    expect(spec.maxClusterCount).toBe(9);
    expect(spec.scalingPolicy).toBe(SnowflakeScalingPolicy.STANDARD);
    expect(spec.maxConcurrencyLevel).toBe(16);
    expect(spec.statementQueuedTimeoutInSeconds).toBe(120);
    expect(spec.statementTimeoutInSeconds).toBe(7200);
    expect(spec.autoSuspend).toBe(600);
    expect(spec.comment).toBe('updated comment');
    expect(spec.queryAccelerationMaxScaleFactor).toBe(16);
  },
);

test(
  integrationTest(
    'Every Snowflake Compute spec field is clearable; clearing writes undefined',
  ),
  async () => {
    const editorGroup = await openSnowflakeEditor();

    // Snowflake defaults an omitted property, so the form has to be able to
    // leave one out rather than force a concrete value
    fireEvent.change(textInput(editorGroup, 'Comment'), {
      target: { value: '' },
    });
    expect(getSnowflakeSpec().comment).toBeUndefined();

    fireEvent.change(textInput(editorGroup, 'Min Cluster Count'), {
      target: { value: '' },
    });
    expect(getSnowflakeSpec().minClusterCount).toBeUndefined();

    const warehouseSizeSection = getByText(
      editorGroup,
      'Warehouse Size',
    ).closest('.panel__content__form__section');
    fireEvent.mouseDown(
      guaranteeNonNullable(
        warehouseSizeSection?.querySelector('.selector-input__clear-indicator'),
      ),
    );
    expect(getSnowflakeSpec().warehouseSize).toBeUndefined();

    fireEvent.change(textInput(editorGroup, 'Production AppDir ID'), {
      target: { value: '' },
    });
    expect(getOwner().production).toBeUndefined();
    await waitFor(() =>
      getByText(editorGroup, 'A production AppDir ID is required'),
    );
  },
);

test(
  integrationTest(
    'A Compute with no production AppDir ID reports the omission on open',
  ),
  async () => {
    const editorGroup = await openComputeEditor(
      'test::NoOwnerWh',
      'A production AppDir ID is required',
    );

    fireEvent.change(textInput(editorGroup, 'Production AppDir ID'), {
      target: { value: '24680' },
    });
    const owner = getOwner('test::NoOwnerWh');
    expect(owner.production?.appDirId).toBe(24680);
    expect(owner.production?.level).toBe(AppDirLevel.DEPLOYMENT);
    await waitFor(() =>
      expect(
        queryByText(editorGroup, 'A production AppDir ID is required'),
      ).toBeNull(),
    );
  },
);

test(
  integrationTest(
    'Turning query acceleration off hides and clears the scale factor',
  ),
  async () => {
    const editorGroup = await openSnowflakeEditor();
    expect(getSnowflakeSpec().queryAccelerationMaxScaleFactor).toBe(8);

    fireEvent.click(toggleButton(editorGroup, 'Query Acceleration'));
    expect(getSnowflakeSpec().enableQueryAcceleration).toBe(false);
    expect(getSnowflakeSpec().queryAccelerationMaxScaleFactor).toBeUndefined();
    expect(
      queryByText(editorGroup, 'Query Acceleration Max Scale Factor'),
    ).toBeNull();
  },
);

test(
  integrationTest(
    'Switching to ADAPTIVE trades the sizing sections for Adaptive Sizing',
  ),
  async () => {
    const editorGroup = await openSnowflakeEditor();

    await selectEnum(editorGroup, 'SNOWPARK_OPTIMIZED', 'ADAPTIVE');

    // one cleared property and one preserved; the descriptor unit test
    // enumerates which properties ADAPTIVE admits
    const spec = getSnowflakeSpec();
    expect(spec.warehouseType).toBe(SnowflakeWarehouseType.ADAPTIVE);
    expect(spec.warehouseSize).toBeUndefined();
    expect(spec.comment).toBe('test warehouse');

    await waitFor(() => expect(queryByText(editorGroup, 'Cluster')).toBeNull());
    expect(queryByText(editorGroup, 'Warehouse')).toBeNull();
    getByText(editorGroup, 'Adaptive Sizing');
    getByText(editorGroup, 'Max Query Performance Level');
    getByText(editorGroup, 'Query Throughput Multiplier');
    expect(queryByText(editorGroup, 'Max Concurrency Level')).toBeNull();
    getByText(editorGroup, 'Statement Timeout (seconds)');
    getByText(editorGroup, 'Comment');

    // the fields come back empty: clearing is destructive
    await selectEnum(editorGroup, 'ADAPTIVE', 'SNOWPARK_OPTIMIZED');
    expect(getSnowflakeSpec().warehouseSize).toBeUndefined();
    getByText(editorGroup, 'Cluster');
    expect(queryByText(editorGroup, 'Adaptive Sizing')).toBeNull();
  },
);

test(
  integrationTest('An ADAPTIVE Compute loads and edits its sizing pair'),
  async () => {
    const editorGroup = await openComputeEditor(
      'test::AdaptiveWh',
      'Adaptive Sizing',
    );

    getByText(editorGroup, 'LARGE'); // max query performance level
    expect(textInput(editorGroup, 'Query Throughput Multiplier').value).toBe(
      '3',
    );

    await selectEnum(editorGroup, 'LARGE', 'XLARGE');
    fireEvent.change(textInput(editorGroup, 'Query Throughput Multiplier'), {
      target: { value: '0' },
    });

    const spec = getSnowflakeSpec('test::AdaptiveWh');
    expect(spec.maxQueryPerformanceLevel).toBe(SnowflakeWarehouseSize.XLARGE);
    // 0 means unlimited — a value the form must write, not read as an omission
    expect(spec.queryThroughputMultiplier).toBe(0);
  },
);

test(
  integrationTest('Read-only Compute editor disables all fields'),
  async () => {
    const editorGroup = await openSnowflakeEditor();
    await act(async () => {
      runInAction(() => {
        MOCK__editorStore.tabManagerState.getCurrentEditorState(
          ComputeEditorState,
        ).isReadOnly = true;
      });
    });

    await waitFor(() =>
      expect(textInput(editorGroup, 'Production AppDir ID').disabled).toBe(
        true,
      ),
    );
    expect(textInput(editorGroup, 'Comment').disabled).toBe(true);
    expect(toggleButton(editorGroup, 'Query Acceleration').disabled).toBe(true);
    expect(textInput(editorGroup, 'Warehouse Type').disabled).toBe(true);
  },
);

test(
  integrationTest(
    'Compute with a non-Snowflake specification falls back to the text-mode message',
  ),
  async () => {
    const editorGroup = await openComputeEditor(
      'test::DbxWh',
      /not supported in form mode/,
    );
    getByText(editorGroup, 'Owner');
  },
);
