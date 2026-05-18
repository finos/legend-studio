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

import { test, expect, jest } from '@jest/globals';
import { unitTest, createSpy } from '@finos/legend-shared/test';
import { flowResult } from 'mobx';
import { ProjectConfiguration } from '@finos/legend-server-sdlc';
import {
  type DeployProjectResponse,
  MetadataRequestOptions,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import { DevMetadataState } from '../dev-metadata/DevMetadataState.js';
import { LegendStudioTelemetryHelper } from '../../../../__lib__/LegendStudioTelemetryHelper.js';

const TEST_GROUP_ID = 'org.finos.legend';
const TEST_ARTIFACT_ID = 'my-artifact';

const buildTestProjectConfiguration = (): ProjectConfiguration =>
  ProjectConfiguration.serialization.fromJson({
    projectStructureVersion: { version: 11, extensionVersion: 1 },
    projectId: 'test-project',
    groupId: TEST_GROUP_ID,
    artifactId: TEST_ARTIFACT_ID,
    projectDependencies: [],
    metamodelDependencies: [],
  });

const buildTestDeployResponse = (): DeployProjectResponse =>
  ({
    finalStatus: 'SUCCESS',
    projectDetails: {
      groupId: TEST_GROUP_ID,
      artifactId: TEST_ARTIFACT_ID,
      version: 'master-SNAPSHOT',
    },
    phaseStates: [],
  }) as unknown as DeployProjectResponse;

test(unitTest('DevMetadataState: setOptions replaces options'), () => {
  const editorStore = TEST__getTestEditorStore();
  const state = new DevMetadataState(editorStore);

  const newOptions = new MetadataRequestOptions();
  newOptions.includeArtifacts = true;
  newOptions.buildOverrides = { foo: 'bar' };

  state.setOptions(newOptions);
  expect(state.options).toBe(newOptions);
  expect(state.options.includeArtifacts).toBe(true);
  expect(state.options.buildOverrides).toEqual({ foo: 'bar' });
});

test(
  unitTest(
    'DevMetadataState: projectGAV returns undefined when no project configuration',
  ),
  () => {
    const editorStore = TEST__getTestEditorStore();
    const state = new DevMetadataState(editorStore);
    expect(state.projectGAV).toBeUndefined();
  },
);

test(
  unitTest(
    'DevMetadataState: projectGAV returns groupId/artifactId from project configuration',
  ),
  () => {
    const editorStore = TEST__getTestEditorStore();
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      buildTestProjectConfiguration(),
    );
    const state = new DevMetadataState(editorStore);
    expect(state.projectGAV).toEqual({
      groupId: TEST_GROUP_ID,
      artifactId: TEST_ARTIFACT_ID,
    });
  },
);

test(
  unitTest(
    'DevMetadataState: push succeeds, sets result and transitions pushState',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      buildTestProjectConfiguration(),
    );
    const state = new DevMetadataState(editorStore);

    const customOptions = new MetadataRequestOptions();
    customOptions.includeArtifacts = true;
    customOptions.buildOverrides = { override1: 'value1' };
    state.setOptions(customOptions);

    const expectedResponse = buildTestDeployResponse();
    const pushSpy = createSpy(
      editorStore.graphManagerState.graphManager,
      'pushToDevMetadata',
    ).mockResolvedValue(expectedResponse);

    const telemetryLaunchSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_DevMetadataPushLaunched')
      .mockImplementation(() => {
        // no-op
      });
    const telemetryFailureSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_DevMetadataPushFailure')
      .mockImplementation(() => {
        // no-op
      });

    await flowResult(state.push());

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      TEST_GROUP_ID,
      TEST_ARTIFACT_ID,
      undefined,
      customOptions,
      editorStore.graphManagerState.graph,
    );
    expect(state.result).toBe(expectedResponse);
    expect(state.pushState.hasSucceeded).toBe(true);
    expect(state.pushState.hasFailed).toBe(false);
    expect(telemetryLaunchSpy).toHaveBeenCalledTimes(1);
    expect(telemetryFailureSpy).not.toHaveBeenCalled();

    telemetryLaunchSpy.mockRestore();
    telemetryFailureSpy.mockRestore();
  },
);

test(
  unitTest(
    'DevMetadataState: push fails when graphManager throws and notifies error',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    editorStore.projectConfigurationEditorState.setProjectConfiguration(
      buildTestProjectConfiguration(),
    );
    const state = new DevMetadataState(editorStore);

    createSpy(
      editorStore.graphManagerState.graphManager,
      'pushToDevMetadata',
    ).mockRejectedValue(new Error('engine boom'));

    const notifyErrorSpy = createSpy(
      editorStore.applicationStore.notificationService,
      'notifyError',
    ).mockImplementation(() => {
      // no-op
    });

    const telemetryLaunchSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_DevMetadataPushLaunched')
      .mockImplementation(() => {
        // no-op
      });
    const telemetryFailureSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_DevMetadataPushFailure')
      .mockImplementation(() => {
        // no-op
      });

    await flowResult(state.push());

    expect(state.result).toBeUndefined();
    expect(state.pushState.hasFailed).toBe(true);
    expect(state.pushState.hasSucceeded).toBe(false);
    expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
    const notifiedMessage = String(notifyErrorSpy.mock.calls[0]?.[0]);
    expect(notifiedMessage).toContain('engine boom');
    expect(telemetryLaunchSpy).not.toHaveBeenCalled();
    expect(telemetryFailureSpy).toHaveBeenCalledTimes(1);

    telemetryLaunchSpy.mockRestore();
    telemetryFailureSpy.mockRestore();
  },
);

test(
  unitTest(
    'DevMetadataState: push fails when no project configuration is loaded',
  ),
  async () => {
    const editorStore = TEST__getTestEditorStore();
    const state = new DevMetadataState(editorStore);

    const pushSpy = createSpy(
      editorStore.graphManagerState.graphManager,
      'pushToDevMetadata',
    );
    const notifyErrorSpy = createSpy(
      editorStore.applicationStore.notificationService,
      'notifyError',
    ).mockImplementation(() => {
      // no-op
    });
    const telemetryFailureSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_DevMetadataPushFailure')
      .mockImplementation(() => {
        // no-op
      });

    await flowResult(state.push());

    expect(pushSpy).not.toHaveBeenCalled();
    expect(state.pushState.hasFailed).toBe(true);
    expect(state.result).toBeUndefined();
    expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
    expect(telemetryFailureSpy).toHaveBeenCalledTimes(1);

    telemetryFailureSpy.mockRestore();
  },
);
