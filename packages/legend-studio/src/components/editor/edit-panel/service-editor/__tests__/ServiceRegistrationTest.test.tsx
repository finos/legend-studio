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

import type { RenderResult } from '@testing-library/react';
import {
  getByPlaceholderText,
  getByTitle,
  waitFor,
  getByText,
  fireEvent,
} from '@testing-library/react';
import TEST_DATA__serviceEntities from '../../../../editor/edit-panel/service-editor/__tests__/TEST_DATA__ServiceRegistration.json';
import {
  integrationTest,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  TEST_DATA__DefaultSDLCInfo,
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
} from '../../../../EditorComponentTestUtils';
import { LEGEND_STUDIO_TEST_ID } from '../../../../LegendStudioTestID';
import type { PlainObject } from '@finos/legend-shared';
import type { EditorStore } from '../../../../../stores/EditorStore';
import { ServiceEditorState } from '../../../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import {
  NOTIFCATION_SEVERITY,
  TEST__provideMockedApplicationStore,
} from '@finos/legend-application';
import { LATEST_PROJECT_REVISION } from '../../../../../stores/editor-state/element-editor-state/service/ServiceRegistrationState';
import { flowResult } from 'mobx';
import type { Project, Version, Workspace } from '@finos/legend-server-sdlc';
import {
  ServiceExecutionMode,
  ServiceRegistrationResult,
} from '@finos/legend-graph';
import { TEST__getTestStudioConfig } from '../../../../../stores/EditorStoreTestUtils';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager';

let renderResult: RenderResult;

const setup = async (
  project: PlainObject<Project>,
  workspace: PlainObject<Workspace>,
  versions?: PlainObject<Version>[],
): Promise<EditorStore> => {
  const mockedEditorStore = TEST__provideMockedEditorStore({
    applicationStore: TEST__provideMockedApplicationStore(
      TEST__getTestStudioConfig({
        extensions: {
          core: {
            TEMPORARY__serviceRegistrationConfig: [
              {
                env: 'int',
                url: 'int.dummyUrl.com',
                modes: [
                  ServiceExecutionMode.FULL_INTERACTIVE,
                  ServiceExecutionMode.SEMI_INTERACTIVE,
                  ServiceExecutionMode.PROD,
                ],
              },
              {
                env: 'dev',
                url: 'dev.dummyUrl.com',
                modes: [
                  ServiceExecutionMode.FULL_INTERACTIVE,
                  ServiceExecutionMode.SEMI_INTERACTIVE,
                  ServiceExecutionMode.PROD,
                ],
              },
              {
                env: 'prod',
                url: 'exec.dummyUrl.com',
                modes: [ServiceExecutionMode.PROD],
              },
            ],
          },
        },
      }),
      LegendStudioPluginManager.create(),
    ),
  });
  renderResult = await TEST__setUpEditor(mockedEditorStore, {
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
    availableImportDescriptions: [
      ...TEST_DATA__DefaultSDLCInfo.availableSchemaImports,
      ...TEST_DATA__DefaultSDLCInfo.availableCodeImports,
    ],
    projects: [],
    projectData: [],
    projectDependency: [],
  });
  return mockedEditorStore;
};

test(
  integrationTest(
    'Service Editor basic registration functionality for PRODUCTION projects',
  ),
  async () => {
    const mockedEditorStore = await setup(
      {
        projectId: 'PROD-19481',
        description: 'sdlcTesting',
        tags: [],
        projectType: 'PRODUCTION',
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
    await flowResult(mockedEditorStore.sdlcState.fetchProjectVersions());
    const result = new ServiceRegistrationResult(
      '/example/myTestUrl/testing',
      'myURL',
      'id1',
    );
    MOBX__enableSpyOrMock();
    jest
      .spyOn(
        mockedEditorStore.graphManagerState.graphManager,
        'registerService',
      )
      .mockResolvedValue(result);
    jest
      .spyOn(
        mockedEditorStore.graphManagerState.graphManager,
        'activateService',
      )
      .mockResolvedValue();
    MOBX__disableSpyOrMock();
    await TEST__openElementFromExplorerTree('test::myService', renderResult);
    const editPanelHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS),
    );
    await waitFor(() => getByText(editPanelHeader, 'myService'));
    const editPanel = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDIT_PANEL),
    );
    fireEvent.click(getByTitle(editPanel, 'Register service...'));
    const serviceEditorState =
      mockedEditorStore.getCurrentEditorState(ServiceEditorState);
    const registrationModal = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_MODAL,
      ),
    );
    await waitFor(() =>
      getByText(
        registrationModal,
        'Only valid for Semi Interactive and Prod service types',
      ),
    );
    await waitFor(() => getByText(registrationModal, 'Alloy Server'));
    await waitFor(() => getByText(registrationModal, 'Service Type'));
    await waitFor(() => getByText(registrationModal, 'Project Version'));
    const registrationState = serviceEditorState.registrationState;
    expect(registrationState.executionModes).toHaveLength(3);
    const versions = mockedEditorStore.sdlcState.projectVersions;
    expect(versions).toHaveLength(2);
    // TODO: rewrite how we test 'dropdown', once the issue of the dropdown options not showing is resolved
    // since `int` is the first env in the config list, it is expected to be selected by default
    // we will then change env from `int` to `prod`
    await waitFor(() => getByText(registrationModal, 'INT'));
    registrationState.updateEnv('prod');
    await waitFor(() => getByText(registrationModal, 'PROD'));
    // select version
    await waitFor(() => getByText(registrationModal, 'Select...'));
    registrationState.setProjectVersion(
      versions.find((v) => v.id.id === '1.0.1'),
    );
    expect(registrationState.versionOptions).toHaveLength(2);
    expect(registrationState.executionModes).toHaveLength(1);
    expect(registrationState.executionModes[0]).toBe(ServiceExecutionMode.PROD);
    // change env from prod to int
    registrationState.updateEnv('int');
    // change from full to semi
    await waitFor(() =>
      getByText(
        registrationModal,
        prettyCONSTName(ServiceExecutionMode.FULL_INTERACTIVE),
      ),
    );
    registrationState.updateType(ServiceExecutionMode.SEMI_INTERACTIVE);
    await waitFor(() =>
      getByText(
        registrationModal,
        prettyCONSTName(ServiceExecutionMode.SEMI_INTERACTIVE),
      ),
    );
    await waitFor(() => getByText(registrationModal, LATEST_PROJECT_REVISION));
    expect(registrationState.versionOptions).toHaveLength(3);
  },
);

test(
  integrationTest(
    'Service Editor basic general and registration functionality for PROTOTYPE projects',
  ),
  async () => {
    const mockedEditorStore = await setup(
      TEST_DATA__DefaultSDLCInfo.project,
      TEST_DATA__DefaultSDLCInfo.workspace,
    );
    const result = new ServiceRegistrationResult(
      '/example/myTestUrl/testing',
      'myURL',
      'id1',
    );
    MOBX__enableSpyOrMock();
    jest
      .spyOn(
        mockedEditorStore.graphManagerState.graphManager,
        'registerService',
      )
      .mockResolvedValue(result);
    jest
      .spyOn(
        mockedEditorStore.graphManagerState.graphManager,
        'activateService',
      )
      .mockResolvedValue();
    MOBX__disableSpyOrMock();
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
      mockedEditorStore.getCurrentEditorState(ServiceEditorState);
    const service = serviceEditorState.service;
    expect(service.owners).toHaveLength(2);
    fireEvent.click(getByTitle(editPanel, 'Add owner'));
    const ownerInput = await waitFor(() =>
      getByPlaceholderText(editPanel, 'Enter an owner...'),
    );
    fireEvent.change(ownerInput, { target: { value: 'owner3' } });
    fireEvent.click(getByText(editPanel, 'Save'));
    await waitFor(() => getByText(editPanel, 'owner3'));
    expect(service.owners).toHaveLength(3);
    // registration
    fireEvent.click(getByTitle(editPanel, 'Register service...'));
    const registrationModal = await waitFor(() =>
      renderResult.getByTestId(
        LEGEND_STUDIO_TEST_ID.SERVICE_REGISTRATION_MODAL,
      ),
    );
    await waitFor(() =>
      getByText(
        registrationModal,
        'Only valid for Semi Interactive and Prod service types',
      ),
    );
    await waitFor(() => getByText(registrationModal, 'Alloy Server'));
    await waitFor(() => getByText(registrationModal, 'Service Type'));
    await waitFor(() => getByText(registrationModal, 'Project Version'));
    const registrationState = serviceEditorState.registrationState;
    // register
    await flowResult(registrationState.registerService());
    expect(mockedEditorStore.applicationStore.notification?.severity).toBe(
      NOTIFCATION_SEVERITY.SUCCESS,
    );
    // check no owners check
    serviceEditorState.service.deleteOwner(0);
    serviceEditorState.service.deleteOwner(0);
    serviceEditorState.service.deleteOwner(0);
    await flowResult(registrationState.registerService());
    expect(mockedEditorStore.applicationStore.notification?.severity).toBe(
      NOTIFCATION_SEVERITY.ERROR,
    );
  },
);
