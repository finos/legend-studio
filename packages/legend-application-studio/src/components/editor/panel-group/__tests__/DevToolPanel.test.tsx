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

import { expect, jest, test } from '@jest/globals';
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
import { LegendStudioApplicationPlugin } from '../../../../stores/LegendStudioApplicationPlugin.js';
import type { LegendStudioLocalEngine } from '../../../../stores/local-engine/LegendStudioLocalEngine.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../../__lib__/LegendStudioSetting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

class TEST__LocalEnginePlugin extends LegendStudioApplicationPlugin {
  constructor() {
    super('test-local-engine-plugin', '0.0.0');
  }

  override getExtraLocalEngines(): LegendStudioLocalEngine[] {
    return [
      {
        key: 'stand-in',
        label: 'Stand-in engine',
        supportedRoutes: ['grammar/grammarToJson/model'],
        answer: () => Promise.resolve({ status: 200, body: '{}' }),
      },
    ];
  }
}

let initializeSpy:
  | jest.SpiedFunction<
      EditorStore['graphManagerState']['graphManager']['initialize']
    >
  | undefined;

const openDeveloperTools = async (
  backendOverrides: { enabled?: boolean } | undefined,
  localEngine?: { mode: string; routes: string[] } | undefined,
): Promise<EditorStore> => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager.usePlugins([new TEST__LocalEnginePlugin()]).install();
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    pluginManager,
    applicationStore: new ApplicationStore(
      TEST__getLegendStudioApplicationConfig({
        ...(backendOverrides ? { application: { backendOverrides } } : {}),
        ...(localEngine
          ? { engine: { url: 'https://testEngineUrl', local: localEngine } }
          : {}),
      }),
      pluginManager,
    ),
  });
  initializeSpy = jest.spyOn(
    MOCK__editorStore.graphManagerState.graphManager,
    'initialize',
  );
  await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore);
  act(() => {
    MOCK__editorStore.setActivePanelMode(PANEL_MODE.DEV_TOOL);
    MOCK__editorStore.panelGroupDisplayState.open();
  });
  await screen.findByText('Engine client base URL');
  return MOCK__editorStore;
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Change Backend Servers...' }),
    );
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
    expect(screen.queryByText('Change Backend Servers...')).toBeNull();
  },
);

test(
  integrationTest(
    'Developer Tools turns local mode off for this browser, where the deployment has it on',
  ),
  async () => {
    const editorStore = await openDeveloperTools(undefined, {
      mode: 'on',
      routes: ['grammar/grammarToJson/model'],
    });
    // the editor gives its engine client the router
    expect(editorStore.localEngineRouter).toBeDefined();
    expect(
      initializeSpy?.mock.calls.some(
        ([config]) =>
          config.clientConfig.localEngineRouter ===
          editorStore.localEngineRouter,
      ),
    ).toBe(true);
    const field = screen
      .getByText('Local engine: off for this browser')
      .closest('.panel__content__form__section');
    expect(field).not.toBeNull();
    expect(
      within(field as HTMLElement).getByText(
        /Stand-in engine answers grammar\/grammarToJson\/model/,
      ),
    ).not.toBeNull();

    fireEvent.click(within(field as HTMLElement).getByRole('button'));
    expect(editorStore.localEngineRouter?.isTurnedOffInThisBrowser).toBe(true);
    expect(
      editorStore.applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.ENGINE_LOCAL_ENGINE_OFF,
      ),
    ).toBe(true);
  },
);

test(
  integrationTest(
    'Developer Tools has no local engine switch where the deployment has local mode off',
  ),
  async () => {
    await openDeveloperTools(undefined);
    expect(screen.queryByText('Local engine: off for this browser')).toBeNull();
  },
);
