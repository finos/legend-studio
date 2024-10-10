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
import { type PlainObject, prettyCONSTName } from '@finos/legend-shared';
import { integrationTest, createSpy } from '@finos/legend-shared/test';
import {
  TEST_DATA__DefaultDepotReport,
  TEST_DATA__DefaultSDLCInfo,
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditor,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../../stores/editor/EditorStore.js';
import { ServiceEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import { LATEST_PROJECT_REVISION } from '../../../../../stores/editor/editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { flowResult } from 'mobx';
import type { Project, Version, Workspace } from '@finos/legend-server-sdlc';
import {
  DeploymentOwnership,
  ServiceExecutionMode,
  ServiceRegistrationSuccess,
} from '@finos/legend-graph';
import { LegendStudioPluginManager } from '../../../../../application/LegendStudioPluginManager.js';
import {
  service_deleteOwner,
  service_setOwnership,
} from '../../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { ApplicationStore } from '@finos/legend-application';
import { TEST__getLegendStudioApplicationConfig } from '../../../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import type { StoreProjectData } from '@finos/legend-server-depot';

let renderResult: RenderResult;

const setup = async (
  project: PlainObject<Project>,
  workspace: PlainObject<Workspace>,
  versions?: PlainObject<Version>[],
  projectData?: PlainObject<StoreProjectData>[],
  projectDependencyVersions?: string[],
): Promise<EditorStore> => {
  const MOCK__editorStore = TEST__provideMockedEditorStore({
    applicationStore: new ApplicationStore(
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
    projectDependency: [],
    projectDependencyVersions: projectDependencyVersions ?? [],
    projectDependencyReport: TEST_DATA__DefaultDepotReport.dependencyReport,
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
          groupId: 'com.finos.legend',
          artifactId: 'service-sdlc-testing',
        },
      ],
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
      ['1.0.1', '1.0.0', 'master-snapshot', 'UsedForEntitiesTest'],
    );
    await act(async () => {
      await flowResult(MOCK__editorStore.sdlcState.fetchProjectVersions());
    });
    await act(async () => {
      await flowResult(
        MOCK__editorStore.sdlcState.fetchPublishedProjectVersions(),
      );
    });
    MockedMonacoEditorInstance.getValue.mockReturnValue('');
    const result = new ServiceRegistrationSuccess(
      undefined,
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

    await TEST__openElementFromExplorerTree(
      'model::RelationalService',
      renderResult,
    );
    const editorGroupHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS),
    );
    await waitFor(() => getByText(editorGroupHeader, 'RelationalService'));
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    fireEvent.click(getByText(editorGroup, 'Registration'));
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
    const versions = MOCK__editorStore.sdlcState.projectPublishedVersions;
    expect(versions).toHaveLength(4);
    // TODO: rewrite how we test 'dropdown', once the issue of the dropdown options not showing is resolved
    // since `int` is the first env in the config list, it is expected to be selected by default
    // we will then change env from `int` to `prod`
    await waitFor(() => getByText(registrationEditor, 'INT'));

    await act(async () => {
      registrationState.updateEnv('prod');
    });
    await waitFor(() => getByText(registrationEditor, 'PROD'));

    // select version
    await act(async () => {
      registrationState.setProjectVersion(versions.find((v) => v === '1.0.1'));
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
    expect(registrationState.versionOptions).toHaveLength(5);
  },
);

test(
  integrationTest(
    'Service Editor basic general and registration functionality for projects without versions',
  ),
  async () => {
    const MOCK__editorStore = await setup(
      TEST_DATA__DefaultSDLCInfo.project,
      // TEST_DATA__DefaultSDLCInfo.projectData,
      TEST_DATA__DefaultSDLCInfo.workspace,
    );
    MockedMonacoEditorInstance.getValue.mockReturnValue('');

    const result = new ServiceRegistrationSuccess(
      undefined,
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

    await TEST__openElementFromExplorerTree(
      'model::RelationalService',
      renderResult,
    );
    const editorGroupHeader = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP__HEADER_TABS),
    );
    await waitFor(() => getByText(editorGroupHeader, 'RelationalService'));
    const editorGroup = await waitFor(() =>
      renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
    );
    // labels + values
    fireEvent.click(getByText(editorGroup, 'General'));
    await waitFor(() => getByText(editorGroup, 'URL Pattern'));
    expect(
      await waitFor(() =>
        editorGroup.querySelector(
          `input[value="/example/myTestUrl/{myParam}"]`,
        ),
      ),
    ).toBeTruthy();
    await waitFor(() => getByText(editorGroup, 'URL Pattern'));
    await waitFor(() => getByText(editorGroup, 'myParam'));
    await waitFor(() => getByText(editorGroup, 'Documentation'));
    await waitFor(() => getByText(editorGroup, 'Auto Activate Updates'));
    await waitFor(() => getByText(editorGroup, 'Owners (deprecated)'));
    await waitFor(() => getByText(editorGroup, 'owner1'));
    await waitFor(() => getByText(editorGroup, 'owner2'));
    // add owner
    const serviceEditorState =
      MOCK__editorStore.tabManagerState.getCurrentEditorState(
        ServiceEditorState,
      );
    const service = serviceEditorState.service;
    expect(service.owners).toHaveLength(2);
    // registration
    fireEvent.click(getByText(editorGroup, 'Registration'));
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
    //check ownership doesnt trigger owner check criteria
    service_setOwnership(
      serviceEditorState.service,
      new DeploymentOwnership('test1', serviceEditorState.service),
    );
    fireEvent.click(getByTitle(registrationEditor, 'Register Service'));
    const actionAlertDialogForRegistration = await waitFor(() =>
      renderResult.getByRole('dialog'),
    );
    await waitFor(() =>
      getByText(actionAlertDialogForRegistration, 'Launch Service'),
    );
    getByText(
      actionAlertDialogForRegistration,
      'Service with pattern /myservice registered and activated',
    );
    fireEvent.click(renderResult.getByText('Close'));
  },
);
