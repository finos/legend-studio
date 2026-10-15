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

import { expect, test } from '@jest/globals';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { ApplicationStore } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { TEST__getLegendStudioApplicationConfig } from '../../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { LegendStudioPluginManager } from '../../../../application/LegendStudioPluginManager.js';
import { PANEL_MODE } from '../../../../stores/editor/EditorConfig.js';

const openDeveloperTools = async (
  backendOverrides: { enabled?: boolean } | undefined,
): Promise<void> => {
  const pluginManager = LegendStudioPluginManager.create();
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    pluginManager,
    applicationStore: new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(
        backendOverrides ? { application: { backendOverrides } } : {},
      ),
      pluginManager,
    ),
  });
  await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore);
  act(() => {
    MOCK__editorStore.setActivePanelMode(PANEL_MODE.DEV_TOOL);
    MOCK__editorStore.panelGroupDisplayState.open();
  });
  await screen.findByText('Engine client base URL');
};

test(
  integrationTest(
    'Developer Tools lists the backend servers and opens the backend servers dialog',
  ),
  async () => {
    await openDeveloperTools({ enabled: true });
    const sdlc = screen.getByTestId('dev-tool-backend-server-sdlc');
    expect(within(sdlc).getByText('SDLC Server')).not.toBeNull();
    expect(within(sdlc).getByText('https://testSdlcUrl')).not.toBeNull();
    expect(screen.getByTestId('dev-tool-backend-server-engine')).not.toBeNull();

    fireEvent.click(screen.getByText('change backend servers...'));
    const sdlcInput = await screen.findByLabelText('SDLC Server URL');
    expect((sdlcInput as HTMLInputElement).placeholder).toBe(
      'https://testSdlcUrl',
    );
    expect(screen.getByLabelText('Depot Server URL')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Developer Tools shows no backend servers unless the deployment allows overriding them',
  ),
  async () => {
    await openDeveloperTools(undefined);
    expect(screen.queryByText('Backend Servers')).toBeNull();
    expect(screen.queryByText('change backend servers...')).toBeNull();
  },
);
