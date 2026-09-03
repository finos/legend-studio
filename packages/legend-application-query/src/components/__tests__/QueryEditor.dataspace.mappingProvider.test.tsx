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
  INTERNAL_ELEMENT_PATH,
  LakehouseRuntime,
  PackageableRuntime,
  PackageableElementExplicitReference,
  RuntimePointer,
  stub_RawLambda,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import { test, expect } from '@jest/globals';
import { act } from '@testing-library/react';
import {
  TEST_DATA__DSL_DataSpace_LakehouseFallback_AnalyticsResult,
  TEST_DATA__DSL_DataSpace_MappingProvider_Entities,
} from './TEST_DATA__QueryEditor_DataSpace_MappingProvider.js';
import {
  TEST_QUERY_NAME,
  TEST__provideMockedQueryEditorStore,
  TEST__setUpDataSpaceExistingQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import {
  type DataSpaceAnalysisResult,
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
  DSL_DataSpace_GraphManagerPreset,
  getDataSpace,
  resolveExecutionContextMapping,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_DataSpace_LegendApplicationPlugin } from '@finos/legend-extension-dsl-data-space/application';
import { LegendQueryDataSpaceQueryBuilderState } from '../../stores/data-space/query-builder/LegendQueryDataSpaceQueryBuilderState.js';

const TEST_LAKEHOUSE_ENV = 'TEST_ENV';
const TEST_LAKEHOUSE_WAREHOUSE = 'TEST_WH';
const TEST_DATA_SPACE_PATH = 'domain::COVIDDatapace';
const TEST_EXECUTION_CONTEXT = 'dummyContext';
const TEST_MAPPING_PATH = 'mapping::CovidDataMapping';
const TEST_DATA_PRODUCT_PATH = 'domain::CovidDataProduct';

const setUpEditor = async (): Promise<{
  queryBuilderState: LegendQueryDataSpaceQueryBuilderState;
  editorStore: ReturnType<typeof TEST__provideMockedQueryEditorStore>;
}> => {
  const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
    extraPlugins: [new DSL_DataSpace_LegendApplicationPlugin()],
    extraPresets: [new DSL_DataSpace_GraphManagerPreset()],
  });
  mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);
  mockedQueryEditorStore.resolveLakehouseEnvAndWarehouse = async () => ({
    env: TEST_LAKEHOUSE_ENV,
    warehouse: TEST_LAKEHOUSE_WAREHOUSE,
  });

  const { queryBuilderState } = await TEST__setUpDataSpaceExistingQueryEditor(
    mockedQueryEditorStore,
    TEST_DATA__DSL_DataSpace_LakehouseFallback_AnalyticsResult,
    TEST_DATA_SPACE_PATH,
    TEST_EXECUTION_CONTEXT,
    stub_RawLambda(),
    TEST_DATA__DSL_DataSpace_MappingProvider_Entities,
  );

  return {
    queryBuilderState: guaranteeType(
      queryBuilderState,
      LegendQueryDataSpaceQueryBuilderState,
    ),
    editorStore: mockedQueryEditorStore,
  };
};

test(
  integrationTest(
    'Data product query editor resolves the mapping through the mapping provider when the execution context has no mapping of its own',
  ),
  async () => {
    const { queryBuilderState } = await setUpEditor();

    const executionContext = guaranteeNonNullable(
      queryBuilderState.executionContext,
      `Expected an execution context to have been resolved`,
    );
    expect(executionContext.name).toBe(TEST_EXECUTION_CONTEXT);
    expect(executionContext.mapping).toBeUndefined();
    expect(executionContext.mappingProvider?.element.value.path).toBe(
      TEST_DATA_PRODUCT_PATH,
    );
    expect(executionContext.mappingProvider?.keys).toEqual(['covidMapg']);

    expect(queryBuilderState.executionContextState.mapping?.path).toBe(
      TEST_MAPPING_PATH,
    );
  },
);

test(
  integrationTest(
    'Data product query editor falls back to a Lakehouse runtime for a mapping-provider-backed execution context',
  ),
  async () => {
    const { queryBuilderState } = await setUpEditor();

    expect(queryBuilderState.injectedLakehouseRuntime).toBeDefined();
    const runtimePointer = guaranteeType(
      queryBuilderState.executionContextState.runtimeValue,
      RuntimePointer,
    );
    const lakehouseRuntime = guaranteeType(
      runtimePointer.packageableRuntime.value.runtimeValue,
      LakehouseRuntime,
    );
    expect(lakehouseRuntime.environment).toBe(TEST_LAKEHOUSE_ENV);
    expect(lakehouseRuntime.warehouse).toBe(TEST_LAKEHOUSE_WAREHOUSE);
  },
);

test(
  integrationTest(
    'Data product query editor scopes classes to the provider-resolved mapping rather than the whole graph',
  ),
  async () => {
    const { queryBuilderState } = await setUpEditor();

    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const context = guaranteeNonNullable(
      dataSpace.executionContexts?.find(
        (ctx) => ctx.name === TEST_EXECUTION_CONTEXT,
      ),
    );
    const resolvedMapping = guaranteeNonNullable(
      resolveExecutionContextMapping(context),
    );
    expect(resolvedMapping.path).toBe(TEST_MAPPING_PATH);

    await act(async () => {
      await queryBuilderState.propagateExecutionContextChange();
    });

    expect(queryBuilderState.executionContextState.mapping?.path).toBe(
      TEST_MAPPING_PATH,
    );
    const compatibleClasses = resolveUsableDataSpaceClasses(
      dataSpace,
      resolvedMapping,
      queryBuilderState.graphManagerState,
      queryBuilderState,
    );
    expect(compatibleClasses.length).toBeGreaterThan(0);
    const sourceClass = guaranteeNonNullable(
      queryBuilderState.sourceClass,
      'expected a source class to be picked from the resolved mapping',
    );
    expect(compatibleClasses).toContain(sourceClass);
  },
);

test(
  integrationTest(
    'Data product query editor eagerly attaches a synthetic Lakehouse runtime to the mapping-provider execution context, so undo/redo replays are deterministic',
  ),
  async () => {
    const { queryBuilderState } = await setUpEditor();

    const executionContext = guaranteeNonNullable(
      queryBuilderState.executionContext,
      'expected an execution context to have been resolved',
    );
    expect(executionContext.name).toBe(TEST_EXECUTION_CONTEXT);
    const attachedRuntimeRef = guaranteeNonNullable(
      executionContext.defaultRuntime,
      'expected the eager attach to have populated `defaultRuntime`',
    );
    const attachedPackageableRuntime = attachedRuntimeRef.value;
    expect(attachedPackageableRuntime.name).toBe('LakehouseRuntime');
    const attachedLakehouseRuntime = guaranteeType(
      attachedPackageableRuntime.runtimeValue,
      LakehouseRuntime,
    );
    expect(attachedLakehouseRuntime.environment).toBe(TEST_LAKEHOUSE_ENV);
    expect(attachedLakehouseRuntime.warehouse).toBe(TEST_LAKEHOUSE_WAREHOUSE);

    expect(queryBuilderState.injectedLakehouseRuntime).toBeDefined();

    const runtimePointer = guaranteeType(
      queryBuilderState.executionContextState.runtimeValue,
      RuntimePointer,
    );
    expect(runtimePointer.packageableRuntime.value).toBe(
      attachedPackageableRuntime,
    );
  },
);

const buildSyntheticFallbackContext = (
  contextName: string,
  template: DataSpaceExecutionContext,
): DataSpaceExecutionContext => {
  const context = new DataSpaceExecutionContext();
  context.name = contextName;
  const mappingProvider = new DataSpaceMappingProvider();
  const templateProvider = guaranteeNonNullable(
    template.mappingProvider,
    'expected template context to have a mapping provider',
  );
  mappingProvider.element = templateProvider.element;
  mappingProvider.keys = [...templateProvider.keys];
  context.mappingProvider = mappingProvider;
  return context;
};

const IS_SNAPSHOT = false;

const swapExecutionContexts = (
  dataSpace: ReturnType<typeof getDataSpace>,
  contexts: DataSpaceExecutionContext[],
): void => {
  dataSpace.executionContexts = contexts;
};

const spyOnCreate = (
  editorStore: ReturnType<typeof TEST__provideMockedQueryEditorStore>,
): { calls: () => number } => {
  let count = 0;
  const previous =
    editorStore.resolveLakehouseEnvAndWarehouse.bind(editorStore);
  editorStore.resolveLakehouseEnvAndWarehouse = async (...args) => {
    count += 1;
    return previous(...args);
  };
  return { calls: () => count };
};

test(
  integrationTest(
    'attachDataSpaceFallbackRuntimes — (a) is a no-op when defaultRuntime is already set',
  ),
  async () => {
    const { queryBuilderState, editorStore } = await setUpEditor();
    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const templateContext = guaranteeNonNullable(
      dataSpace.executionContexts?.find(
        (ctx) => ctx.name === TEST_EXECUTION_CONTEXT,
      ),
    );
    const context = buildSyntheticFallbackContext(
      'aAlreadyHasDefaultRuntime',
      templateContext,
    );
    const preExisting = new PackageableRuntime('preExistingRuntime');
    preExisting.runtimeValue = new LakehouseRuntime('OTHER_ENV', 'OTHER_WH');
    context.defaultRuntime =
      PackageableElementExplicitReference.create(preExisting);
    swapExecutionContexts(dataSpace, [context]);
    const spy = spyOnCreate(editorStore);

    await editorStore.attachDataSpaceFallbackRuntimes(
      dataSpace,
      undefined,
      IS_SNAPSHOT,
    );

    expect(spy.calls()).toBe(0);
    expect(context.defaultRuntime.value).toBe(preExisting);
  },
);

test(
  integrationTest(
    'attachDataSpaceFallbackRuntimes — (b) is a no-op when mappingProvider is undefined (non-MAPG context)',
  ),
  async () => {
    const { queryBuilderState, editorStore } = await setUpEditor();
    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const context = new DataSpaceExecutionContext();
    context.name = 'bNoMappingProvider';
    swapExecutionContexts(dataSpace, [context]);
    const spy = spyOnCreate(editorStore);

    await editorStore.attachDataSpaceFallbackRuntimes(
      dataSpace,
      undefined,
      IS_SNAPSHOT,
    );

    expect(spy.calls()).toBe(0);
    expect(context.defaultRuntime).toBeUndefined();
  },
);

test(
  integrationTest(
    'attachDataSpaceFallbackRuntimes — (d) is a no-op when analytics reports at least one compatible runtime',
  ),
  async () => {
    const { queryBuilderState, editorStore } = await setUpEditor();
    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const templateContext = guaranteeNonNullable(
      dataSpace.executionContexts?.find(
        (ctx) => ctx.name === TEST_EXECUTION_CONTEXT,
      ),
    );
    const context = buildSyntheticFallbackContext(
      'dHasCompatibleRuntimes',
      templateContext,
    );
    swapExecutionContexts(dataSpace, [context]);

    const fakeAnalysisResult = {
      executionContextsIndex: new Map([
        [
          context.name,
          {
            compatibleRuntimes: [{}],
          },
        ],
      ]),
    } as unknown as DataSpaceAnalysisResult;
    const spy = spyOnCreate(editorStore);

    await editorStore.attachDataSpaceFallbackRuntimes(
      dataSpace,
      fakeAnalysisResult,
      IS_SNAPSHOT,
    );

    expect(spy.calls()).toBe(0);
    expect(context.defaultRuntime).toBeUndefined();
  },
);

test(
  integrationTest(
    'attachDataSpaceFallbackRuntimes — (e) attaches ONE shared synth runtime to every gated-in context on the dataspace (single fetch)',
  ),
  async () => {
    const { queryBuilderState, editorStore } = await setUpEditor();
    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const templateContext = guaranteeNonNullable(
      dataSpace.executionContexts?.find(
        (ctx) => ctx.name === TEST_EXECUTION_CONTEXT,
      ),
    );
    templateContext.defaultRuntime = undefined;
    const secondContext = buildSyntheticFallbackContext(
      'eSecondContext',
      templateContext,
    );
    swapExecutionContexts(dataSpace, [templateContext, secondContext]);
    const preAttachRuntimeCount =
      queryBuilderState.graphManagerState.graph.runtimes.length;
    const spy = spyOnCreate(editorStore);

    await editorStore.attachDataSpaceFallbackRuntimes(
      dataSpace,
      undefined,
      IS_SNAPSHOT,
    );

    expect(spy.calls()).toBe(0);
    const postAttachRuntimeCount =
      queryBuilderState.graphManagerState.graph.runtimes.length;
    expect(postAttachRuntimeCount).toBe(preAttachRuntimeCount);

    const reReadTemplateContext = guaranteeNonNullable(
      dataSpace.executionContexts?.[0],
    );
    const attachedRuntime = guaranteeNonNullable(
      reReadTemplateContext.defaultRuntime?.value,
      'expected the eager attach to have populated `defaultRuntime`',
    );
    expect(attachedRuntime.name).toBe('LakehouseRuntime');
    expect(attachedRuntime.package?.path).toBe(INTERNAL_ELEMENT_PATH);
    expect(secondContext.defaultRuntime?.value).toBe(attachedRuntime);
    const lakehouseRuntime = guaranteeType(
      attachedRuntime.runtimeValue,
      LakehouseRuntime,
    );
    expect(lakehouseRuntime.environment).toBe(TEST_LAKEHOUSE_ENV);
    expect(lakehouseRuntime.warehouse).toBe(TEST_LAKEHOUSE_WAREHOUSE);
  },
);

test(
  integrationTest(
    'attachDataSpaceFallbackRuntimes — (f) is idempotent: re-invocation on the same dataspace attaches nothing new and adds no graph element',
  ),
  async () => {
    const { queryBuilderState, editorStore } = await setUpEditor();
    const dataSpace = getDataSpace(
      TEST_DATA_SPACE_PATH,
      queryBuilderState.graphManagerState.graph,
    );
    const preAttachRuntimeCount =
      queryBuilderState.graphManagerState.graph.runtimes.length;
    const spy = spyOnCreate(editorStore);

    await editorStore.attachDataSpaceFallbackRuntimes(
      dataSpace,
      undefined,
      IS_SNAPSHOT,
    );

    expect(spy.calls()).toBe(0);
    const postAttachRuntimeCount =
      queryBuilderState.graphManagerState.graph.runtimes.length;
    expect(postAttachRuntimeCount).toBe(preAttachRuntimeCount);
  },
);
