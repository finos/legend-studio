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

import { test, expect, jest } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react';
import {
  PackageableRuntime,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
  EngineRuntime,
} from '@finos/legend-graph';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { integrationTest } from '@finos/legend-shared/test';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { TEST__provideMockedEditorStore } from '../../__test-utils__/EditorComponentTestUtils.js';
import {
  RuntimeEditorState,
  LakehouseBaseRuntimeEditorState,
  LakehouseRuntimeEditorState,
  LakehouseSingleStoreRuntimeEditorState,
  LakehouseRuntimeType,
  PackageableRuntimeEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/RuntimeEditorState.js';
import {
  LakehouseRuntimeEditor,
  PackageableRuntimeEditor,
} from '../RuntimeEditor.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const selectOption = (container: HTMLElement, optionText: string): void => {
  const selectorInput = container.querySelector(
    'input[role="combobox"]',
  ) as HTMLElement;
  fireEvent.keyDown(selectorInput, { key: 'ArrowDown' });
  fireEvent.click(screen.getByText(optionText));
};

// section header labels can collide with a selector's currently-selected
// option text (e.g. "Environment" is both a section header and, by default,
// the selected label of the ENVIRONMENT/CONNECTION type switcher), so find
// the header specifically rather than using a plain text query
const getSectionHeaderLabel = (text: string): HTMLElement =>
  screen
    .getAllByText(text)
    .find((el) =>
      el.classList.contains('panel__content__form__section__header__label'),
    ) as HTMLElement;

const getDropdownContainer = (headerText: string): HTMLElement =>
  getSectionHeaderLabel(headerText).parentElement?.querySelector(
    '.explorer__new-element-modal__driver__dropdown',
  ) as HTMLElement;

const buildPackageableRuntime = (
  runtimeValue: EngineRuntime,
  editorStore: ReturnType<typeof TEST__provideMockedEditorStore>,
): PackageableRuntime => {
  const packageableRuntime = new PackageableRuntime('testRuntime');
  packageableRuntime.package = editorStore.graphManagerState.graph.root;
  packageableRuntime.runtimeValue = runtimeValue;
  return packageableRuntime;
};

test(
  integrationTest(
    'LakehouseRuntimeEditor renders only Environment + Compute Engine (no Warehouse) for a LakehouseSingleStoreRuntime',
  ),
  () => {
    const editorStore = TEST__provideMockedEditorStore();
    const lakehouseRuntime = new LakehouseSingleStoreRuntime('dev01');
    const packageableRuntime = buildPackageableRuntime(
      lakehouseRuntime,
      editorStore,
    );
    const runtimeEditorState = new RuntimeEditorState(
      editorStore,
      packageableRuntime.runtimeValue,
      false,
    );
    const lakehouseRuntimeEditorState =
      runtimeEditorState.runtimeValueEditorState;
    expect(lakehouseRuntimeEditorState).toBeInstanceOf(
      LakehouseSingleStoreRuntimeEditorState,
    );
    const typedState =
      lakehouseRuntimeEditorState as LakehouseBaseRuntimeEditorState;

    render(
      <LakehouseRuntimeEditor
        runtimeEditorState={runtimeEditorState}
        packageableRuntime={packageableRuntime}
        lakehouseRuntimeEditorState={typedState}
        isReadOnly={false}
      />,
    );

    // `useLakehouseSummariesEffect`'s mount effect resets `availableEnvs` to
    // undefined (no ingestionManager configured in this mocked EditorStore),
    // so seed the env options AFTER mount, not before
    act(() => {
      typedState.setEnvSummaries([
        { ingestServerUrl: 'https://env-a.example.com' },
        { ingestServerUrl: 'https://env-b.example.com' },
      ] as IngestDeploymentServerConfig[]);
    });

    expect(getSectionHeaderLabel('Environment')).not.toBeUndefined();
    expect(getSectionHeaderLabel('Compute Engine')).not.toBeUndefined();
    expect(screen.queryByText('SingleStore')).not.toBeNull();
    expect(screen.queryByText('Warehouse')).toBeNull();
    expect(screen.queryByText('Lakehouse Runtime Source')).toBeNull();

    const envSelectorContainer = getDropdownContainer('Environment');
    selectOption(envSelectorContainer, 'env-a.example.com');

    expect(lakehouseRuntime.environment).toBe('env-a.example.com');
  },
);

test(
  integrationTest(
    'LakehouseRuntimeEditor renders Environment + Compute Engine + Warehouse for a LakehouseRuntime, and switches to Connection mode',
  ),
  () => {
    const editorStore = TEST__provideMockedEditorStore();
    const lakehouseRuntime = new LakehouseRuntime('dev01', 'WH_1');
    const packageableRuntime = buildPackageableRuntime(
      lakehouseRuntime,
      editorStore,
    );
    const runtimeEditorState = new RuntimeEditorState(
      editorStore,
      packageableRuntime.runtimeValue,
      false,
    );
    const lakehouseRuntimeEditorState =
      runtimeEditorState.runtimeValueEditorState;
    expect(lakehouseRuntimeEditorState).toBeInstanceOf(
      LakehouseRuntimeEditorState,
    );
    const typedState =
      lakehouseRuntimeEditorState as LakehouseRuntimeEditorState;
    expect(typedState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.ENVIRONMENT,
    );

    render(
      <LakehouseRuntimeEditor
        runtimeEditorState={runtimeEditorState}
        packageableRuntime={packageableRuntime}
        lakehouseRuntimeEditorState={typedState}
        isReadOnly={false}
      />,
    );

    expect(getSectionHeaderLabel('Environment')).not.toBeUndefined();
    expect(getSectionHeaderLabel('Compute Engine')).not.toBeUndefined();
    expect(screen.queryByText('Snowflake')).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const warehouseInput = screen.getByPlaceholderText(
      'Enter warehouse',
    ) as HTMLInputElement;
    expect(warehouseInput.value).toBe('WH_1');

    fireEvent.change(warehouseInput, { target: { value: 'WH_2' } });
    expect(lakehouseRuntime.warehouse).toBe('WH_2');

    // switch to CONNECTION mode
    selectOption(
      getDropdownContainer('Lakehouse Runtime Source'),
      'Connection',
    );

    expect(screen.queryByPlaceholderText('Enter warehouse')).toBeNull();
    expect(screen.queryByText('Environment')).toBeNull();
    expect(getSectionHeaderLabel('Connection')).not.toBeUndefined();
    // Compute Engine selector survives the Environment/Connection sub-mode switch
    expect(getSectionHeaderLabel('Compute Engine')).not.toBeUndefined();
  },
);

test(
  integrationTest(
    'PackageableRuntimeEditor routes to the Lakehouse editor for both runtime types, and the generic editor otherwise',
  ),
  () => {
    const runLakehouseRuntime = (runtimeValue: EngineRuntime): HTMLElement => {
      const editorStore = TEST__provideMockedEditorStore();
      const packageableRuntime = buildPackageableRuntime(
        runtimeValue,
        editorStore,
      );
      const editorState = new PackageableRuntimeEditorState(
        editorStore,
        packageableRuntime,
      );
      editorStore.tabManagerState.openTab(editorState);
      const { container } = render(
        <ApplicationStoreProvider store={editorStore.applicationStore}>
          <PackageableRuntimeEditor />
        </ApplicationStoreProvider>,
      );
      return container;
    };

    const lakehouseContainer = runLakehouseRuntime(
      new LakehouseRuntime('dev01', 'WH_1'),
    );
    expect(lakehouseContainer.textContent?.includes('Snowflake')).toBe(true);
    expect(
      lakehouseContainer.textContent?.includes('Lakehouse Runtime Source'),
    ).toBe(true);

    const singleStoreContainer = runLakehouseRuntime(
      new LakehouseSingleStoreRuntime('dev01'),
    );
    expect(singleStoreContainer.textContent?.includes('SingleStore')).toBe(
      true,
    );
    expect(
      singleStoreContainer.textContent?.includes('Lakehouse Runtime Source'),
    ).toBe(false);
    expect(singleStoreContainer.textContent?.includes('Environment')).toBe(
      true,
    );

    // NOTE: a plain (non-Lakehouse) EngineRuntime routes to the generic
    // `RuntimeEditor`, which requires a DnD context to render (a pre-existing,
    // unrelated dependency of that component) -- rather than pull in that
    // scaffolding, verify the routing decision at the state level instead
    const editorStore = TEST__provideMockedEditorStore();
    const engineRuntimeEditorState = new RuntimeEditorState(
      editorStore,
      new EngineRuntime(),
      false,
    ).runtimeValueEditorState;
    expect(engineRuntimeEditorState).not.toBeInstanceOf(
      LakehouseBaseRuntimeEditorState,
    );
  },
);

test(
  integrationTest(
    'Switching Compute Engine on an open LakehouseRuntime swaps to LakehouseSingleStoreRuntime, preserving environment and dropping Warehouse',
  ),
  () => {
    const editorStore = TEST__provideMockedEditorStore();
    const packageableRuntime = buildPackageableRuntime(
      new LakehouseRuntime('dev01', 'WH_1'),
      editorStore,
    );
    const editorState = new PackageableRuntimeEditorState(
      editorStore,
      packageableRuntime,
    );
    editorStore.tabManagerState.openTab(editorState);
    render(
      <ApplicationStoreProvider store={editorStore.applicationStore}>
        <PackageableRuntimeEditor />
      </ApplicationStoreProvider>,
    );

    expect(screen.getByPlaceholderText('Enter warehouse')).not.toBeNull();

    selectOption(getDropdownContainer('Compute Engine'), 'SingleStore');

    expect(screen.queryByPlaceholderText('Enter warehouse')).toBeNull();
    expect(screen.queryByText('Lakehouse Runtime Source')).toBeNull();
    expect(getSectionHeaderLabel('Environment')).not.toBeUndefined();
    expect(packageableRuntime.runtimeValue).toBeInstanceOf(
      LakehouseSingleStoreRuntime,
    );
    expect(
      (packageableRuntime.runtimeValue as LakehouseSingleStoreRuntime)
        .environment,
    ).toBe('dev01');

    // switch back to Snowflake
    selectOption(getDropdownContainer('Compute Engine'), 'Snowflake');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const warehouseInput = screen.getByPlaceholderText(
      'Enter warehouse',
    ) as HTMLInputElement;
    expect(warehouseInput.value).toBe('');
    expect(packageableRuntime.runtimeValue).toBeInstanceOf(LakehouseRuntime);
    expect(
      (packageableRuntime.runtimeValue as LakehouseRuntime).environment,
    ).toBe('dev01');
    expect(
      (packageableRuntime.runtimeValue as LakehouseRuntime).warehouse,
    ).toBeUndefined();
    expect(
      (packageableRuntime.runtimeValue as LakehouseRuntime).connectionPointer,
    ).toBeUndefined();
  },
);

test(
  integrationTest(
    'Switching Compute Engine to SingleStore while in Connection mode drops the connection and returns to Environment mode',
  ),
  () => {
    const editorStore = TEST__provideMockedEditorStore();
    const packageableRuntime = buildPackageableRuntime(
      new LakehouseRuntime('dev01', 'WH_1'),
      editorStore,
    );
    const editorState = new PackageableRuntimeEditorState(
      editorStore,
      packageableRuntime,
    );
    editorStore.tabManagerState.openTab(editorState);
    render(
      <ApplicationStoreProvider store={editorStore.applicationStore}>
        <PackageableRuntimeEditor />
      </ApplicationStoreProvider>,
    );

    // put the Snowflake runtime into Connection mode first
    selectOption(
      getDropdownContainer('Lakehouse Runtime Source'),
      'Connection',
    );
    expect(getSectionHeaderLabel('Connection')).not.toBeUndefined();
    expect(screen.queryByPlaceholderText('Enter warehouse')).toBeNull();

    // now swap compute engine from within Connection mode
    selectOption(getDropdownContainer('Compute Engine'), 'SingleStore');

    // SingleStore has no connection concept, so the Connection picker and the
    // Environment/Connection toggle both go away and we land back on an
    // environment-only editor
    expect(screen.queryByText('Connection')).toBeNull();
    expect(screen.queryByText('Lakehouse Runtime Source')).toBeNull();
    expect(screen.queryByPlaceholderText('Enter warehouse')).toBeNull();
    expect(getSectionHeaderLabel('Environment')).not.toBeUndefined();
    expect(packageableRuntime.runtimeValue).toBeInstanceOf(
      LakehouseSingleStoreRuntime,
    );
  },
);

test(
  integrationTest(
    're-selecting the already-active Compute Engine is a no-op and does not reset the runtime',
  ),
  () => {
    const editorStore = TEST__provideMockedEditorStore();
    const originalRuntimeValue = new LakehouseRuntime('dev01', 'WH_1');
    const packageableRuntime = buildPackageableRuntime(
      originalRuntimeValue,
      editorStore,
    );
    const editorState = new PackageableRuntimeEditorState(
      editorStore,
      packageableRuntime,
    );
    editorStore.tabManagerState.openTab(editorState);
    render(
      <ApplicationStoreProvider store={editorStore.applicationStore}>
        <PackageableRuntimeEditor />
      </ApplicationStoreProvider>,
    );

    // pick "Snowflake" again while Snowflake is already active -- the guard in
    // `onComputeEngineChange` must short-circuit, otherwise a fresh
    // LakehouseRuntime would be constructed and silently drop the warehouse
    const computeEngineContainer = getDropdownContainer('Compute Engine');
    const selectorInput = computeEngineContainer.querySelector(
      'input[role="combobox"]',
    ) as HTMLElement;
    fireEvent.keyDown(selectorInput, { key: 'ArrowDown' });
    // the active value also renders in the control, so target the menu entry
    fireEvent.click(screen.getAllByText('Snowflake').at(-1) as HTMLElement);

    expect(packageableRuntime.runtimeValue).toBe(originalRuntimeValue);
    expect(
      (packageableRuntime.runtimeValue as LakehouseRuntime).warehouse,
    ).toBe('WH_1');
  },
);
