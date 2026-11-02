/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  getByDisplayValue,
  waitFor,
  fireEvent,
  getByText,
  getByTitle,
  getByLabelText,
  getByRole,
  queryByText,
  queryAllByText,
} from '@testing-library/react';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import { Platform, PlatformConfiguration } from '@finos/legend-server-sdlc';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { TEST_DATA__EmptyProjectDependencyReport } from './TEST_DATA__ProjectDependencyReport.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { EDITOR_MODE } from '../../../../stores/editor/EditorConfig.js';

let renderResult: RenderResult;

const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [],
  metamodelDependencies: [],
};

const TEST_DATA__latestProjectStructure = { version: 11, extensionVersion: 1 };

let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: [],
    projectConfiguration: TEST_DATA__ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA__latestProjectStructure,
    projectDependencyReport: TEST_DATA__EmptyProjectDependencyReport,
  });
  fireEvent.click(renderResult.getByTitle('Project Configuration Panel'));
  const editorGroupContent = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  const updateButton = getByText(editorGroupContent, 'Update configuration');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  await waitFor(() => renderResult.getByText('Project Structure'));
});

test(integrationTest('Test Project Structure'), async () => {
  const editorGroupContent = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  await waitFor(() => getByText(editorGroupContent, '10.1'));
  await waitFor(() => getByText(editorGroupContent, '11.1 available'));
  await waitFor(() => getByText(editorGroupContent, 'Update to 11.1'));
  await waitFor(() =>
    getByDisplayValue(editorGroupContent, 'org.finos.legend'),
  );
  await waitFor(() => getByDisplayValue(editorGroupContent, 'dependency-test'));
  // the coordinates the project is published as
  getByText(editorGroupContent, 'org.finos.legend:dependency-test');
  // TODO: test update project structure
});

test(
  integrationTest(
    'Changing the coordinates warns about the impact and enables saving',
  ),
  async () => {
    const editorGroupContent = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
    );
    expect(
      queryByText(editorGroupContent, /Changing the coordinates/),
    ).toBeNull();
    expect(
      queryByText(editorGroupContent, 'Unsaved configuration changes'),
    ).toBeNull();

    fireEvent.change(getByTitle(editorGroupContent, 'Group ID'), {
      target: { value: 'org.finos.legend.v2' },
    });

    await waitFor(() =>
      getByText(editorGroupContent, /Changing the coordinates/),
    );
    getByText(editorGroupContent, 'org.finos.legend.v2:dependency-test');
    getByText(editorGroupContent, 'Unsaved configuration changes');
    expect(
      getByText(editorGroupContent, 'Update configuration').getAttribute(
        'disabled',
      ),
    ).toBeNull();
  },
);

const TEST_DATA__Platforms = [
  new Platform('legend-engine', 'org.finos.legend.engine', '4.95.1'),
  new Platform('legend-sdlc', 'org.finos.legend.sdlc', '0.201.0'),
];

const openConfigurationTab = (tab: string): HTMLElement => {
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'platforms',
    'get',
  ).mockReturnValue(TEST_DATA__Platforms);
  const editorGroupContent = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  fireEvent.click(getByText(editorGroupContent, tab));
  return editorGroupContent;
};

const getPlatformVersions = (): string[] | undefined =>
  MOCK__editorStore.projectConfigurationEditorState.currentProjectConfiguration.platformConfigurations?.map(
    (platform) => `${platform.name}:${platform.version}`,
  );

test(
  integrationTest('Platform versions can be frozen at the latest versions'),
  async () => {
    const editorGroupContent = openConfigurationTab('Platform Configurations');
    await waitFor(() => getByText(editorGroupContent, 'legend-engine'));
    getByText(editorGroupContent, '4.95.1');
    expect(queryAllByText(editorGroupContent, 'Latest')).toHaveLength(2);
    expect(
      getByLabelText<HTMLInputElement>(
        editorGroupContent,
        /Use the latest versions/,
      ).checked,
    ).toBe(true);

    fireEvent.click(getByLabelText(editorGroupContent, /Freeze versions/));

    expect(getPlatformVersions()).toEqual([
      'legend-engine:4.95.1',
      'legend-sdlc:0.201.0',
    ]);
    await waitFor(() =>
      expect(queryAllByText(editorGroupContent, 'Up to date')).toHaveLength(2),
    );
    getByText(editorGroupContent, 'Unsaved configuration changes');
  },
);

test(
  integrationTest('Each frozen platform version shows whether it is behind'),
  async () => {
    act(() =>
      MOCK__editorStore.projectConfigurationEditorState.currentProjectConfiguration.setPlatformConfigurations(
        [
          new PlatformConfiguration('legend-engine', '4.80.0'),
          new PlatformConfiguration('legend-sdlc', '0.201.0'),
        ],
      ),
    );
    const editorGroupContent = openConfigurationTab('Platform Configurations');

    // only the engine is behind
    const updateButton = await waitFor(() =>
      getByText(editorGroupContent, '4.95.1 available'),
    );
    expect(queryAllByText(editorGroupContent, 'Up to date')).toHaveLength(1);
    getByText(editorGroupContent, 'Update all to latest');

    fireEvent.click(updateButton);

    expect(getPlatformVersions()).toEqual([
      'legend-engine:4.95.1',
      'legend-sdlc:0.201.0',
    ]);
    await waitFor(() =>
      expect(queryAllByText(editorGroupContent, 'Up to date')).toHaveLength(2),
    );
    expect(queryByText(editorGroupContent, 'Update all to latest')).toBeNull();
  },
);

test(
  integrationTest(
    'Platform versions entered by hand change nothing until they are applied',
  ),
  async () => {
    const editorGroupContent = openConfigurationTab('Platform Configurations');
    await waitFor(() => getByText(editorGroupContent, 'legend-engine'));
    const enterVersionsManually = async (): Promise<void> => {
      fireEvent.click(getByText(editorGroupContent, 'Enter versions manually'));
      fireEvent.click(await renderResult.findByText('Continue'));
      fireEvent.change(
        await waitFor(() =>
          getByTitle(editorGroupContent, 'legend-engine version'),
        ),
        { target: { value: '4.96.0' } },
      );
    };

    // cancelling drops what was typed
    await enterVersionsManually();
    expect(getPlatformVersions()).toBeUndefined();
    fireEvent.click(getByText(editorGroupContent, 'Cancel'));
    await waitFor(() =>
      getByText(editorGroupContent, 'Enter versions manually'),
    );
    expect(getPlatformVersions()).toBeUndefined();

    await enterVersionsManually();
    fireEvent.click(getByText(editorGroupContent, 'Freeze at these versions'));

    expect(getPlatformVersions()).toEqual([
      'legend-engine:4.96.0',
      'legend-sdlc:0.201.0',
    ]);
    await waitFor(() => getByText(editorGroupContent, '4.95.1 available'));
  },
);

test(
  integrationTest(
    'Platform versions entered by hand never change the configured objects',
  ),
  async () => {
    const engine = new PlatformConfiguration('legend-engine', '4.80.0');
    const sdlc = new PlatformConfiguration('legend-sdlc', '0.201.0');
    act(() =>
      MOCK__editorStore.projectConfigurationEditorState.currentProjectConfiguration.setPlatformConfigurations(
        [engine, sdlc],
      ),
    );
    const editorGroupContent = openConfigurationTab('Platform Configurations');
    await waitFor(() => getByText(editorGroupContent, '4.95.1 available'));
    fireEvent.click(getByText(editorGroupContent, 'Enter versions manually'));
    fireEvent.click(await renderResult.findByText('Continue'));
    fireEvent.change(
      await waitFor(() =>
        getByTitle(editorGroupContent, 'legend-engine version'),
      ),
      { target: { value: '4.96.0' } },
    );

    // typing only changes the draft
    expect(engine.version).toBe('4.80.0');
    expect(getPlatformVersions()).toEqual([
      'legend-engine:4.80.0',
      'legend-sdlc:0.201.0',
    ]);

    fireEvent.click(getByText(editorGroupContent, 'Freeze at these versions'));

    // applying writes new objects, and leaves the old ones as they were
    expect(getPlatformVersions()).toEqual([
      'legend-engine:4.96.0',
      'legend-sdlc:0.201.0',
    ]);
    expect(engine.version).toBe('4.80.0');
    expect(
      MOCK__editorStore.projectConfigurationEditorState.currentProjectConfiguration.platformConfigurations?.includes(
        engine,
      ),
    ).toBe(false);
  },
);

test(
  integrationTest(
    'A manual platform versions draft starts over when the configured versions change',
  ),
  async () => {
    const editorGroupContent = openConfigurationTab('Platform Configurations');
    await waitFor(() => getByText(editorGroupContent, 'legend-engine'));
    fireEvent.click(getByText(editorGroupContent, 'Enter versions manually'));
    fireEvent.click(await renderResult.findByText('Continue'));
    fireEvent.change(
      await waitFor(() =>
        getByTitle(editorGroupContent, 'legend-engine version'),
      ),
      { target: { value: '4.96.0' } },
    );

    // e.g. the configuration is reloaded while the draft is open
    act(() =>
      MOCK__editorStore.projectConfigurationEditorState.currentProjectConfiguration.setPlatformConfigurations(
        [
          new PlatformConfiguration('legend-engine', '4.90.0'),
          new PlatformConfiguration('legend-sdlc', '0.201.0'),
        ],
      ),
    );

    await waitFor(() =>
      expect(
        getByTitle<HTMLInputElement>(
          editorGroupContent,
          'legend-engine version',
        ).value,
      ).toBe('4.90.0'),
    );
  },
);

test(
  integrationTest('Advanced settings: dependency tests and the project type'),
  async () => {
    const editorGroupContent = openConfigurationTab('Advanced');
    const runDependencyTests = await waitFor(() =>
      getByRole(editorGroupContent, 'checkbox', {
        name: /Run dependency tests/,
      }),
    );
    expect(runDependencyTests.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(runDependencyTests);

    expect(
      MOCK__editorStore.projectConfigurationEditorState
        .currentProjectConfiguration.runDependencyTests,
    ).toBe(true);
    await waitFor(() =>
      expect(runDependencyTests.getAttribute('aria-checked')).toBe('true'),
    );

    // the project is managed: changing its type asks first
    getByText(editorGroupContent, 'Current');
    fireEvent.click(getByText(editorGroupContent, 'Change to Embedded…'));
    await renderResult.findByText(
      /You are about to change from the managed to the embedded project type/,
    );
  },
);

test(
  integrationTest(
    'Platform versions and advanced settings are read-only in viewer mode',
  ),
  async () => {
    act(() => MOCK__editorStore.setMode(EDITOR_MODE.VIEWER));
    const editorGroupContent = openConfigurationTab('Platform Configurations');
    await waitFor(() => getByText(editorGroupContent, 'legend-engine'));
    expect(
      getByLabelText<HTMLInputElement>(editorGroupContent, /Freeze versions/)
        .disabled,
    ).toBe(true);
    expect(
      getByText(editorGroupContent, 'Enter versions manually').closest('button')
        ?.disabled,
    ).toBe(true);

    fireEvent.click(getByText(editorGroupContent, 'Advanced'));
    await waitFor(() =>
      expect(
        getByRole(editorGroupContent, 'checkbox', {
          name: /Run dependency tests/,
        }).hasAttribute('disabled'),
      ).toBe(true),
    );
    expect(
      getByText(editorGroupContent, 'Change to Embedded…').closest('button')
        ?.disabled,
    ).toBe(true);
  },
);
