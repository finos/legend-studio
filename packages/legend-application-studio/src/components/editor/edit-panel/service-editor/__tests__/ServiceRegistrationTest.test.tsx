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

import { test, expect } from '@jest/globals';
import {
  type RenderResult,
  getByTitle,
  waitFor,
  getByText,
  fireEvent,
  act,
} from '@testing-library/react';
import { TEST_DATA__serviceEntities } from './TEST_DATA__ServiceEditor.js';
import {
  type PlainObject,
  integrationTest,
  prettyCONSTName,
  createSpy,
} from '@finos/legend-shared';
import {
  TEST_DATA__DefaultDepotReport,
  TEST_DATA__DefaultSDLCInfo,
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
} from '../../../../EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../LegendStudioTestID.js';
import type { EditorStore } from '../../../../../stores/EditorStore.js';
import { ServiceEditorState } from '../../../../../stores/editor-state/element-editor-state/service/ServiceEditorState.js';
import { TEST__provideMockedApplicationStore } from '@finos/legend-application';
import { LATEST_PROJECT_REVISION } from '../../../../../stores/editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { flowResult } from 'mobx';
import type { Project, Version, Workspace } from '@finos/legend-server-sdlc';
import {
  ServiceExecutionMode,
  ServiceRegistrationResult,
} from '@finos/legend-graph';
import { TEST__getLegendStudioApplicationConfig } from '../../../../../stores/EditorStoreTestUtils.js';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import { service_deleteOwner } from '../../../../../stores/shared/modifier/DSL_Service_GraphModifierHelper.js';

let renderResult: RenderResult;

const setup = async (
  project: PlainObject<Project>,
  workspace: PlainObject<Workspace>,
  versions?: PlainObject<Version>[],
): Promise<EditorStore> => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    applicationStore: TEST__provideMockedApplicationStore(
      TEST__getLegendStudioApplicationConfig({
        extensions: {
          core: {
            TEMPORARY__serviceRegistrationConfig: [
              {
                env: 'int',
                executionUrl: 'int.dummyUrl.com',
                managementUrl: 'int.services.com',
                modes: [
                  ServiceExecutionMode.FULL_INTERACTIVE,
                  ServiceExecutionMode.SEMI_INTERACTIVE,
                  ServiceExecutionMode.PROD,
                ],
              },
              {
                env: 'dev',
                executionUrl: 'dev.dummyUrl.com',
                managementUrl: 'dev.services.com',
                modes: [
                  ServiceExecutionMode.FULL_INTERACTIVE,
                  ServiceExecutionMode.SEMI_INTERACTIVE,
                  ServiceExecutionMode.PROD,
                ],
              },
              {
                env: 'prod',
                executionUrl: 'exec.dummyUrl.com',
                managementUrl: 'services.com',
                modes: [ServiceExecutionMode.PROD],
              },
            ],
          },
        },
      }),
      LegendStudioPluginManager.create(),
    ),
  });

  renderResult = await TEST__setUpEditor(MOCK__editorStore, {
    project: project,
    workspace: workspace,
    curentRevision: TEST_DATA__DefaultSDLCInfo.currentRevision,
    projectVersions: versions ?? [],
    entities: TEST_DATA__serviceEntities,
    projectConfiguration: TEST_DATA__DefaultSDLCInfo.projectConfig,
    latestProjectStructureVersion:
      TEST_DATA__DefaultSDLCInfo.latestProjectStructureVersion,
    availableGenerationDescriptions: [
      ...TEST_DATA__DefaultSDLCInfo.availableSchemaGenerations,
      ...TEST_DATA__DefaultSDLCInfo.availableCodeGenerations,
    ],
    projects: [],
    projectData: [],
    projectDependency: [],
    dependencyReport: TEST_DATA__DefaultDepotReport.dependencyReport,
  });
  return MOCK__editorStore;
};

test(
  integrationTest(
    'Service Editor basic registration functionality for projects with versions',
  ),
  async () => {
    const MOCK__editorStore = await setup(
      {
        projectId: 'PROD-19481',
        description: 'sdlcTesting',
        tags: [],
        name: 'TEST_SDLC',
      },
      {
        projectId: 'PROD-19481',
        userId: 'testuser',
        workspaceId: 'UsedForEntitiesTest',
      },
      [
        {
          projectId: 'PROD-19481',
          revisionId: 'revisionId2',
          notes: 'second release',
          id: { majorVersion: 1, minorVersion: 0, patchVersion: 1 },
        },
        {
          projectId: 'PROD-19481',
          revisionId: 'revisionId3',
          notes: 'first release',
          id: { majorVersion: 1, minorVersion: 0, patchVersion: 0 },
        },
      ],
    );
    await act(async () => {
      await flowResult(MOCK__editorStore.sdlcState.fetchProjectVersions());
    });
    const result = new ServiceRegistrationResult(
      'https://legend.org/exec',
      '/myservice',
      'id1',
    );

    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'registerService',
    ).mockResolvedValue(result);
    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'activateService',
    ).mockResolvedValue();

    await TEST__openElementFromExplorerTree('test::myService', renderResult);
    const editPanelHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS),
    );
    await waitFor(() => getByText(editPanelHeader, 'myService'));
    const editPanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL),
    );
    fireEvent.click(getByText(editPanel, 'Registration'));
    const serviceEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        ServiceEditorState,
      );
    const registrationEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_EDITOR,
      ),
    );
    await waitFor(() =>
      getByText(
        registrationEditor,
        'Only valid for Semi Interactive and Prod service types',
      ),
    );
    await waitFor(() => getByText(registrationEditor, 'Execution Server'));
    await waitFor(() => getByText(registrationEditor, 'Service Type'));
    await waitFor(() => getByText(registrationEditor, 'Project Version'));
    const registrationState = serviceEditorState.registrationState;
    expect(registrationState.executionModes).toHaveLength(3);
    const versions = MOCK__editorStore.sdlcState.projectVersions;
    expect(versions).toHaveLength(2);
    // TODO: rewrite how we test 'dropdown', once the issue of the dropdown options not showing is resolved
    // since `int` is the first env in the config list, it is expected to be selected by default
    // we will then change env from `int` to `prod`
    await waitFor(() => getByText(registrationEditor, 'INT'));

    await act(async () => {
      registrationState.updateEnv('prod');
    });
    await waitFor(() => getByText(registrationEditor, 'PROD'));

    // select version
    await waitFor(() => getByText(registrationEditor, 'Select...'));
    await act(async () => {
      registrationState.setProjectVersion(
        versions.find((v) => v.id.id === '1.0.1'),
      );
    });
    expect(registrationState.versionOptions).toHaveLength(2);
    expect(registrationState.executionModes).toHaveLength(1);
    expect(registrationState.executionModes[0]).toBe(ServiceExecutionMode.PROD);

    // change env
    await act(async () => {
      registrationState.updateEnv('int');
    });
    // change from full to semi
    await waitFor(() =>
      getByText(
        registrationEditor,
        prettyCONSTName(ServiceExecutionMode.FULL_INTERACTIVE),
      ),
    );
    await act(async () => {
      registrationState.updateType(ServiceExecutionMode.SEMI_INTERACTIVE);
    });
    await waitFor(() =>
      getByText(
        registrationEditor,
        prettyCONSTName(ServiceExecutionMode.SEMI_INTERACTIVE),
      ),
    );
    await waitFor(() => getByText(registrationEditor, LATEST_PROJECT_REVISION));
    expect(registrationState.versionOptions).toHaveLength(3);
  },
);

test(
  integrationTest(
    'Service Editor basic general and registration functionality for projects without versions',
  ),
  async () => {
    const MOCK__editorStore = await setup(
      TEST_DATA__DefaultSDLCInfo.project,
      TEST_DATA__DefaultSDLCInfo.workspace,
    );
    const result = new ServiceRegistrationResult(
      'https://legend.org/exec',
      '/myservice',
      'id1',
    );

    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'registerService',
    ).mockResolvedValue(result);
    createSpy(
      MOCK__editorStore.graphManagerState.graphManager,
      'activateService',
    ).mockResolvedValue();

    await TEST__openElementFromExplorerTree('test::myService', renderResult);
    const editPanelHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS),
    );
    await waitFor(() => getByText(editPanelHeader, 'myService'));
    const editPanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL),
    );
    // labels + values
    await waitFor(() => getByText(editPanel, 'URL Pattern'));
    expect(
      await waitFor(() =>
        editPanel.querySelector(`input[value="/example/myTestUrl/{myParam}"]`),
      ),
    ).toBeTruthy();
    await waitFor(() => getByText(editPanel, 'URL Pattern'));
    await waitFor(() => getByText(editPanel, 'myParam'));
    await waitFor(() => getByText(editPanel, 'Documentation'));
    await waitFor(() => getByText(editPanel, 'Auto Activate Updates'));
    await waitFor(() => getByText(editPanel, 'Owners'));
    await waitFor(() => getByText(editPanel, 'owner1'));
    await waitFor(() => getByText(editPanel, 'owner2'));
    // add owner
    const serviceEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        ServiceEditorState,
      );
    const service = serviceEditorState.service;
    expect(service.owners).toHaveLength(2);
    // registration
    fireEvent.click(getByText(editPanel, 'Registration'));
    const registrationEditor = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_EDITOR,
      ),
    );
    await waitFor(() =>
      getByText(
        registrationEditor,
        'Only valid for Semi Interactive and Prod service types',
      ),
    );
    await waitFor(() => getByText(registrationEditor, 'Execution Server'));
    await waitFor(() => getByText(registrationEditor, 'Service Type'));
    await waitFor(() => getByText(registrationEditor, 'Project Version'));
    // register
    fireEvent.click(getByTitle(registrationEditor, 'Register Service'));
    const actionAlertDialog = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    await waitFor(() => getByText(actionAlertDialog, 'Launch Service'));
    getByText(
      actionAlertDialog,
      'Service with pattern /myservice registered and activated',
    );
    fireEvent.click(renderResult.getByText('Close'));
    // check no owners check
    service_deleteOwner(serviceEditorState.service, 0);
    service_deleteOwner(serviceEditorState.service, 0);
    service_deleteOwner(serviceEditorState.service, 0);
    fireEvent.click(getByTitle(registrationEditor, 'Register Service'));
    await waitFor(() =>
      renderResult.getByText(
        'Service needs to have at least 2 owners in order to be registered',
      ),
    );
  },
);
