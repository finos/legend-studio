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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { flowResult } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import {
  Service,
  ServiceRegistrationFail,
  ServiceRegistrationSuccess,
  type ServiceRegistrationResult,
} from '@finos/legend-graph';
import type { ProjectConfiguration } from '@finos/legend-server-sdlc';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../EditorStore.js';
import {
  ServiceConfigState,
  ServiceRegistrationState,
} from '../editor-state/element-editor-state/service/ServiceRegistrationState.js';
import {
  BulkServiceRegistrationState,
  GlobalBulkServiceRegistrationState,
} from '../sidebar-state/BulkServiceRegistrationState.js';
import { ServiceRegistrationEnvironmentConfig } from '../../../application/LegendStudioApplicationConfig.js';
import { LegendStudioTelemetryHelper } from '../../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * These tests protect the "one launch → exactly one terminal event" contract
 * for flows whose inner steps swallow or aggregate errors: global generation,
 * the service registration precheck, and bulk service registration.
 */

const buildEnv = (env: string): ServiceRegistrationEnvironmentConfig =>
  Object.assign(new ServiceRegistrationEnvironmentConfig(), {
    env,
    executionUrl: `https://${env.toLowerCase()}.example.test`,
    managementUrl: `https://${env.toLowerCase()}.example.test/manage`,
    modes: ['FULL_INTERACTIVE'],
  });

const buildService = (name: string): Service => {
  const service = new Service(name);
  service.pattern = `/${name.toLowerCase()}`;
  return service;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe(unitTest('GraphGenerationState.globalGenerate outcome'), () => {
  let successSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_GenerationSucceeded
  >;
  let failureSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_GenerationFailure
  >;

  beforeEach(() => {
    successSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_GenerationSucceeded')
      .mockImplementation(() => {});
    failureSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_GenerationFailure')
      .mockImplementation(() => {});
  });

  const runGlobalGenerate = async (stepErrors: {
    models?: Error;
    artifacts?: Error;
  }): Promise<EditorStore> => {
    const editorStore = TEST__getTestEditorStore();
    const generationState = editorStore.graphState.graphGenerationState;
    jest
      .spyOn(
        editorStore.graphState,
        'checkIfApplicationUpdateOperationIsRunning',
      )
      .mockReturnValue(false);
    const generateModelsSpy = jest
      .spyOn(generationState, 'generateModels')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(Promise.resolve(stepErrors.models) as any);
    const generateArtifactsSpy = jest
      .spyOn(generationState, 'generateArtifacts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(Promise.resolve(stepErrors.artifacts) as any);
    await flowResult(generationState.globalGenerate());
    // artifact generation still runs after a model generation failure
    expect(generateModelsSpy).toHaveBeenCalledTimes(1);
    expect(generateArtifactsSpy).toHaveBeenCalledTimes(1);
    return editorStore;
  };

  test('emits a single success when both steps succeed', async () => {
    await runGlobalGenerate({});
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(failureSpy).not.toHaveBeenCalled();
  });

  test('emits a single failure (and no success) when model generation fails', async () => {
    await runGlobalGenerate({ models: new Error('models boom') });
    expect(successSpy).not.toHaveBeenCalled();
    expect(failureSpy).toHaveBeenCalledTimes(1);
    expect(failureSpy.mock.calls[0]?.[2]).toMatchObject({
      errorMessage: 'models boom',
    });
  });

  test('emits a single failure (and no success) when artifact generation fails', async () => {
    await runGlobalGenerate({ artifacts: new Error('artifacts boom') });
    expect(successSpy).not.toHaveBeenCalled();
    expect(failureSpy).toHaveBeenCalledTimes(1);
    expect(failureSpy.mock.calls[0]?.[2]).toMatchObject({
      errorMessage: 'artifacts boom',
    });
  });
});

describe(
  unitTest('ServiceRegistrationState.checkServiceRegistration outcome'),
  () => {
    let successSpy: jest.SpiedFunction<
      typeof LegendStudioTelemetryHelper.logEvent_ServiceRegistrationCheckSucceeded
    >;
    let failureSpy: jest.SpiedFunction<
      typeof LegendStudioTelemetryHelper.logEvent_ServiceRegistrationCheckFailure
    >;

    beforeEach(() => {
      successSpy = jest
        .spyOn(
          LegendStudioTelemetryHelper,
          'logEvent_ServiceRegistrationCheckSucceeded',
        )
        .mockImplementation(() => {});
      failureSpy = jest
        .spyOn(
          LegendStudioTelemetryHelper,
          'logEvent_ServiceRegistrationCheckFailure',
        )
        .mockImplementation(() => {});
    });

    const runCheck = async (
      outcomes: Record<string, boolean | Error>,
    ): Promise<void> => {
      const editorStore = TEST__getTestEditorStore();
      const envs = Object.keys(outcomes).map(buildEnv);
      jest
        .spyOn(
          editorStore.graphManagerState.graphManager,
          'checkServiceRegisteredByPattern',
        )
        .mockImplementation((executionUrl: string) => {
          const env = envs.find((e) => e.executionUrl === executionUrl);
          const outcome = outcomes[env?.env ?? ''];
          return outcome instanceof Error
            ? Promise.reject(outcome)
            : Promise.resolve(Boolean(outcome));
        });
      const state = new ServiceRegistrationState(
        editorStore,
        buildService('MyService'),
        envs,
        false,
      );
      await flowResult(state.checkServiceRegistration());
    };

    test('partial per-env errors emit a single success with failedEnvs', async () => {
      await runCheck({
        DEV: true,
        UAT: false,
        PROD: new Error('timeout'),
      });
      expect(failureSpy).not.toHaveBeenCalled();
      expect(successSpy).toHaveBeenCalledTimes(1);
      expect(successSpy.mock.calls[0]?.[2]).toMatchObject({
        servicePath: 'MyService',
        envCount: 3,
        registeredEnvCount: 1,
        errorCount: 1,
        failedEnvs: ['PROD'],
      });
    });

    test('all envs erroring emit a single failure (and no success)', async () => {
      await runCheck({
        DEV: new Error('dev down'),
        PROD: new Error('prod down'),
      });
      expect(successSpy).not.toHaveBeenCalled();
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toMatchObject({
        servicePath: 'MyService',
        envCount: 2,
        errorCount: 2,
        failedEnvs: ['DEV', 'PROD'],
        errorMessage: 'prod down',
      });
    });
  },
);

describe(
  unitTest('GlobalBulkServiceRegistrationState.registerServices outcome'),
  () => {
    let successSpy: jest.SpiedFunction<
      typeof LegendStudioTelemetryHelper.logEvent_ServiceRegistrationSucceeded
    >;
    let failureSpy: jest.SpiedFunction<
      typeof LegendStudioTelemetryHelper.logEvent_ServiceRegistrationFailure
    >;

    beforeEach(() => {
      successSpy = jest
        .spyOn(
          LegendStudioTelemetryHelper,
          'logEvent_ServiceRegistrationSucceeded',
        )
        .mockImplementation(() => {});
      failureSpy = jest
        .spyOn(
          LegendStudioTelemetryHelper,
          'logEvent_ServiceRegistrationFailure',
        )
        .mockImplementation(() => {});
    });

    const runBulk = async (
      buildResults: (services: Service[]) => ServiceRegistrationResult[],
      options?: { activationError?: Error },
    ): Promise<void> => {
      const editorStore = TEST__getTestEditorStore();
      const services = [buildService('S1'), buildService('S2')];
      const bulkState = new GlobalBulkServiceRegistrationState(
        editorStore,
        editorStore.sdlcState,
      );
      bulkState.serviceConfigState = new ServiceConfigState(
        editorStore,
        [buildEnv('DEV')],
        false,
      );
      bulkState.bulkServiceRegistrationState = services.map((service) => {
        const state = new BulkServiceRegistrationState(bulkState, service);
        state.toggleIsSelected();
        return state;
      });
      editorStore.projectConfigurationEditorState.setProjectConfiguration({
        groupId: 'org.finos',
        artifactId: 'demo',
      } as unknown as ProjectConfiguration);
      jest
        .spyOn(bulkState, 'validateBulkServiceForRegistration')
        .mockImplementation(() => {});
      jest
        .spyOn(
          editorStore.graphManagerState.graphManager,
          'bulkServiceRegistration',
        )
        .mockResolvedValue(buildResults(services));
      const activationError = options?.activationError;
      jest
        .spyOn(editorStore.graphManagerState.graphManager, 'activateService')
        .mockImplementation(() =>
          activationError ? Promise.reject(activationError) : Promise.resolve(),
        );
      await flowResult(bulkState.registerServices());
    };

    const success = (service: Service): ServiceRegistrationSuccess =>
      new ServiceRegistrationSuccess(
        service,
        'https://dev.example.test',
        service.pattern,
        `${service.name}-instance`,
      );
    const fail = (service: Service): ServiceRegistrationFail =>
      new ServiceRegistrationFail(service, `${service.name} rejected`);

    test('partial success emits success with per-service counts', async () => {
      await runBulk(([s1, s2]) => [
        success(s1 as Service),
        fail(s2 as Service),
      ]);
      expect(failureSpy).not.toHaveBeenCalled();
      expect(successSpy).toHaveBeenCalledTimes(1);
      expect(successSpy.mock.calls[0]?.[2]).toMatchObject({
        serviceCount: 2,
        registeredCount: 1,
        failedCount: 1,
        activationFailedCount: 0,
      });
    });

    test('every service failing emits failure (and no success)', async () => {
      await runBulk(([s1, s2]) => [fail(s1 as Service), fail(s2 as Service)]);
      expect(successSpy).not.toHaveBeenCalled();
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toMatchObject({
        registeredCount: 0,
        failedCount: 2,
        errorMessage: 'S1 rejected',
      });
    });

    test('rejected activations are awaited and counted rather than left unhandled', async () => {
      await runBulk(
        ([s1, s2]) => [success(s1 as Service), success(s2 as Service)],
        { activationError: new Error('activation boom') },
      );
      expect(failureSpy).not.toHaveBeenCalled();
      expect(successSpy).toHaveBeenCalledTimes(1);
      expect(successSpy.mock.calls[0]?.[2]).toMatchObject({
        registeredCount: 2,
        failedCount: 0,
        activationFailedCount: 2,
      });
    });
  },
);
