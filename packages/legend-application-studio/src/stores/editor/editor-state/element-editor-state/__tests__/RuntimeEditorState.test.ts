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

import { test, expect, describe, jest } from '@jest/globals';
import { flowResult } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import {
  EngineRuntime,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
  ObserverContext,
  PackageableRuntime,
  type ConnectionPointer,
} from '@finos/legend-graph';
import { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import { TEST__getTestEditorStore } from '../../../__test-utils__/EditorStoreTestUtils.js';
import {
  RuntimeEditorState,
  EngineRuntimeEditorState,
  LakehouseBaseRuntimeEditorState,
  LakehouseRuntimeEditorState,
  LakehouseSingleStoreRuntimeEditorState,
  LakehouseRuntimeType,
} from '../RuntimeEditorState.js';
import {
  LakehouseComputeEngine,
  lakehouseRuntime_setComputeEngine,
} from '../../../../graph-modifier/DSL_LakehouseRuntime_GraphModifierHelper.js';

const buildIngestDeploymentServerConfig = (
  ingestServerUrl: string,
): IngestDeploymentServerConfig =>
  Object.assign(new IngestDeploymentServerConfig(), {
    ingestEnvironmentUrn: 'urn:test',
    environmentName: 'test-env',
    environmentClassification: 'DEV',
    ingestServerUrl,
  });

describe(unitTest('RuntimeEditorState constructor branching'), () => {
  test('creates a LakehouseRuntimeEditorState for a LakehouseRuntime', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    expect(state.runtimeValueEditorState).toBeInstanceOf(
      LakehouseRuntimeEditorState,
    );
  });

  test('creates a LakehouseSingleStoreRuntimeEditorState for a LakehouseSingleStoreRuntime', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseSingleStoreRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    expect(state.runtimeValueEditorState).toBeInstanceOf(
      LakehouseSingleStoreRuntimeEditorState,
    );
  });

  test('creates a plain EngineRuntimeEditorState (not a Lakehouse subclass) for a plain EngineRuntime', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new EngineRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    expect(state.runtimeValueEditorState).toBeInstanceOf(
      EngineRuntimeEditorState,
    );
    expect(state.runtimeValueEditorState).not.toBeInstanceOf(
      LakehouseRuntimeEditorState,
    );
    expect(state.runtimeValueEditorState).not.toBeInstanceOf(
      LakehouseSingleStoreRuntimeEditorState,
    );
  });
});

describe(unitTest('LakehouseRuntimeEditorState'), () => {
  test('defaults to ENVIRONMENT mode when the runtime has no connectionPointer', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const lakehouseState = state.runtimeValueEditorState;
    if (!(lakehouseState instanceof LakehouseRuntimeEditorState)) {
      throw new Error('Expected LakehouseRuntimeEditorState');
    }
    expect(lakehouseState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.ENVIRONMENT,
    );
  });

  test('defaults to CONNECTION mode when the runtime already has a connectionPointer', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime(
      undefined,
      undefined,
      {} as ConnectionPointer,
    );
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const lakehouseState = state.runtimeValueEditorState;
    if (!(lakehouseState instanceof LakehouseRuntimeEditorState)) {
      throw new Error('Expected LakehouseRuntimeEditorState');
    }
    expect(lakehouseState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.CONNECTION,
    );
  });

  const buildLakehouseRuntimeEditorState = (): LakehouseRuntimeEditorState => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const lakehouseState = state.runtimeValueEditorState;
    if (!(lakehouseState instanceof LakehouseRuntimeEditorState)) {
      throw new Error('Expected LakehouseRuntimeEditorState');
    }
    return lakehouseState;
  };

  test('isEnvironmentModeActive is true in ENVIRONMENT mode and false in CONNECTION mode', () => {
    const lakehouseState = buildLakehouseRuntimeEditorState();
    const typedState = lakehouseState as unknown as {
      isEnvironmentModeActive: boolean;
    };
    expect(typedState.isEnvironmentModeActive).toBe(true);
    lakehouseState.setLakehouseRuntimeType(LakehouseRuntimeType.CONNECTION);
    expect(typedState.isEnvironmentModeActive).toBe(false);
  });

  test('switching to CONNECTION clears environment and warehouse on the runtime', () => {
    const lakehouseState = buildLakehouseRuntimeEditorState();
    lakehouseState.runtimeValue.environment = 'dev01';
    lakehouseState.runtimeValue.warehouse = 'MY_WH';

    lakehouseState.setLakehouseRuntimeType(LakehouseRuntimeType.CONNECTION);

    expect(lakehouseState.runtimeValue.environment).toBeUndefined();
    expect(lakehouseState.runtimeValue.warehouse).toBeUndefined();
    expect(lakehouseState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.CONNECTION,
    );
  });

  test('switching to ENVIRONMENT clears the connection pointer', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime(
      undefined,
      undefined,
      {} as ConnectionPointer,
    );
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const lakehouseState = state.runtimeValueEditorState;
    if (!(lakehouseState instanceof LakehouseRuntimeEditorState)) {
      throw new Error('Expected LakehouseRuntimeEditorState');
    }
    expect(lakehouseState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.CONNECTION,
    );

    lakehouseState.setLakehouseRuntimeType(LakehouseRuntimeType.ENVIRONMENT);

    expect(runtimeValue.connectionPointer).toBeUndefined();
    expect(lakehouseState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.ENVIRONMENT,
    );
  });

  test('setting the same type again is a no-op', () => {
    const lakehouseState = buildLakehouseRuntimeEditorState();
    lakehouseState.runtimeValue.environment = 'dev01';
    lakehouseState.runtimeValue.warehouse = 'MY_WH';

    lakehouseState.setLakehouseRuntimeType(LakehouseRuntimeType.ENVIRONMENT);

    expect(lakehouseState.runtimeValue.environment).toBe('dev01');
    expect(lakehouseState.runtimeValue.warehouse).toBe('MY_WH');
  });
});

describe(unitTest('LakehouseSingleStoreRuntimeEditorState'), () => {
  test('defaults to ENVIRONMENT mode, making isEnvironmentModeActive true', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseSingleStoreRuntime();
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const singleStoreState = state.runtimeValueEditorState;
    if (!(singleStoreState instanceof LakehouseSingleStoreRuntimeEditorState)) {
      throw new Error('Expected LakehouseSingleStoreRuntimeEditorState');
    }
    expect(singleStoreState.lakehouseRuntimeType).toBe(
      LakehouseRuntimeType.ENVIRONMENT,
    );
    expect(
      (singleStoreState as unknown as { isEnvironmentModeActive: boolean })
        .isEnvironmentModeActive,
    ).toBe(true);
  });
});

describe(unitTest('lakehouseRuntime_setComputeEngine'), () => {
  const observerContext = new ObserverContext([]);

  test('swapping Snowflake to SingleStore preserves environment and drops warehouse/connectionPointer', () => {
    const packageableRuntime = new PackageableRuntime('test::MyRuntime');
    packageableRuntime.runtimeValue = new LakehouseRuntime(
      'dev01',
      'MY_WH',
      {} as ConnectionPointer,
    );

    const next = lakehouseRuntime_setComputeEngine(
      packageableRuntime,
      LakehouseComputeEngine.SINGLE_STORE,
      observerContext,
    );

    expect(next).toBeInstanceOf(LakehouseSingleStoreRuntime);
    expect(packageableRuntime.runtimeValue).toBe(next);
    expect(next.environment).toBe('dev01');
  });

  test('swapping SingleStore to Snowflake preserves environment and leaves warehouse/connectionPointer undefined', () => {
    const packageableRuntime = new PackageableRuntime('test::MyRuntime');
    packageableRuntime.runtimeValue = new LakehouseSingleStoreRuntime('dev01');

    const next = lakehouseRuntime_setComputeEngine(
      packageableRuntime,
      LakehouseComputeEngine.SNOWFLAKE,
      observerContext,
    );

    expect(next).toBeInstanceOf(LakehouseRuntime);
    expect(packageableRuntime.runtimeValue).toBe(next);
    expect(next.environment).toBe('dev01');
    expect((next as LakehouseRuntime).warehouse).toBeUndefined();
    expect((next as LakehouseRuntime).connectionPointer).toBeUndefined();
  });
});

describe(unitTest('RuntimeEditorState.setRuntimeValueEditorState'), () => {
  test('rebuilds runtimeValueEditorState as the other concrete subclass, keeping RuntimeEditorState.uuid stable', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime('dev01', 'MY_WH');
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const { uuid } = state;
    expect(state.runtimeValueEditorState).toBeInstanceOf(
      LakehouseRuntimeEditorState,
    );

    const nextRuntimeValue = new LakehouseSingleStoreRuntime('dev01');
    state.setRuntimeValueEditorState(nextRuntimeValue);

    expect(state.runtimeValueEditorState).toBeInstanceOf(
      LakehouseSingleStoreRuntimeEditorState,
    );
    expect(state.runtimeValueEditorState.runtimeValue).toBe(nextRuntimeValue);
    expect(state.uuid).toBe(uuid);
  });

  test('carries over already-fetched environment options across the swap without refetching', () => {
    const editorStore = TEST__getTestEditorStore();
    const runtimeValue = new LakehouseRuntime('dev01', 'MY_WH');
    const state = new RuntimeEditorState(editorStore, runtimeValue, false);
    const previous = state.runtimeValueEditorState;
    if (!(previous instanceof LakehouseBaseRuntimeEditorState)) {
      throw new Error('Expected LakehouseBaseRuntimeEditorState');
    }
    previous.setEnvSummaries([
      Object.assign(new IngestDeploymentServerConfig(), {
        ingestEnvironmentUrn: 'urn:test',
        environmentName: 'test-env',
        environmentClassification: 'DEV',
        ingestServerUrl: 'https://dev01.example.com',
      }),
    ]);

    state.setRuntimeValueEditorState(new LakehouseSingleStoreRuntime('dev01'));

    const next = state.runtimeValueEditorState;
    if (!(next instanceof LakehouseBaseRuntimeEditorState)) {
      throw new Error('Expected LakehouseBaseRuntimeEditorState');
    }
    expect(next.envOptions).toEqual([
      { label: 'dev01.example.com', value: 'dev01.example.com' },
    ]);
  });
});

describe(
  unitTest('LakehouseBaseRuntimeEditorState.fetchLakehouseSummaries'),
  () => {
    const mockIngestionManager = (
      editorStore: ReturnType<typeof TEST__getTestEditorStore>,
      envs: IngestDeploymentServerConfig[],
    ): void => {
      (
        editorStore as unknown as { ingestionManager: unknown }
      ).ingestionManager = {
        fetchLakehouseEnvironmentSummaries: jest
          .fn<() => Promise<IngestDeploymentServerConfig[]>>()
          .mockResolvedValue(envs),
      };
    };

    test('populates envOptions and auto-selects the first env when environment mode is active and no environment is set', async () => {
      const editorStore = TEST__getTestEditorStore();
      const runtimeValue = new LakehouseSingleStoreRuntime();
      const state = new RuntimeEditorState(editorStore, runtimeValue, false);
      const singleStoreState = state.runtimeValueEditorState;
      if (
        !(singleStoreState instanceof LakehouseSingleStoreRuntimeEditorState)
      ) {
        throw new Error('Expected LakehouseSingleStoreRuntimeEditorState');
      }
      mockIngestionManager(editorStore, [
        buildIngestDeploymentServerConfig('https://dev01.example.com'),
        buildIngestDeploymentServerConfig('https://dev02.example.com'),
      ]);

      await flowResult(singleStoreState.fetchLakehouseSummaries());

      expect(singleStoreState.envOptions).toEqual([
        { label: 'dev01.example.com', value: 'dev01.example.com' },
        { label: 'dev02.example.com', value: 'dev02.example.com' },
      ]);
      expect(runtimeValue.environment).toBe('dev01.example.com');
    });

    test('does not auto-populate environment when environment mode is not active (LakehouseRuntime in CONNECTION mode)', async () => {
      const editorStore = TEST__getTestEditorStore();
      const runtimeValue = new LakehouseRuntime(
        undefined,
        undefined,
        {} as ConnectionPointer,
      );
      const state = new RuntimeEditorState(editorStore, runtimeValue, false);
      const lakehouseState = state.runtimeValueEditorState;
      if (!(lakehouseState instanceof LakehouseRuntimeEditorState)) {
        throw new Error('Expected LakehouseRuntimeEditorState');
      }
      expect(lakehouseState.lakehouseRuntimeType).toBe(
        LakehouseRuntimeType.CONNECTION,
      );
      mockIngestionManager(editorStore, [
        buildIngestDeploymentServerConfig('https://dev01.example.com'),
      ]);

      await flowResult(lakehouseState.fetchLakehouseSummaries());

      expect(lakehouseState.envOptions).toEqual([
        { label: 'dev01.example.com', value: 'dev01.example.com' },
      ]);
      expect(runtimeValue.environment).toBeUndefined();
    });

    test('convertEnvToOption strips the configured discovery URL suffix from the host', () => {
      const editorStore = TEST__getTestEditorStore();
      editorStore.applicationStore.config.options.ingestDeploymentConfig = {
        discoveryUrlSuffix: '.example.com',
      } as never;
      const runtimeValue = new LakehouseSingleStoreRuntime();
      const state = new RuntimeEditorState(editorStore, runtimeValue, false);
      const singleStoreState = state.runtimeValueEditorState;
      if (
        !(singleStoreState instanceof LakehouseSingleStoreRuntimeEditorState)
      ) {
        throw new Error('Expected LakehouseSingleStoreRuntimeEditorState');
      }

      const option = singleStoreState.convertEnvToOption(
        buildIngestDeploymentServerConfig('https://dev01.example.com'),
      );

      expect(option).toEqual({ label: 'dev01', value: 'dev01' });
    });

    test('convertEnvToOption keeps the full host when no discovery URL suffix is configured', () => {
      const editorStore = TEST__getTestEditorStore();
      const runtimeValue = new LakehouseSingleStoreRuntime();
      const state = new RuntimeEditorState(editorStore, runtimeValue, false);
      const singleStoreState = state.runtimeValueEditorState;
      if (
        !(singleStoreState instanceof LakehouseSingleStoreRuntimeEditorState)
      ) {
        throw new Error('Expected LakehouseSingleStoreRuntimeEditorState');
      }

      const option = singleStoreState.convertEnvToOption(
        buildIngestDeploymentServerConfig('https://dev01.example.com'),
      );

      expect(option).toEqual({
        label: 'dev01.example.com',
        value: 'dev01.example.com',
      });
    });
  },
);
