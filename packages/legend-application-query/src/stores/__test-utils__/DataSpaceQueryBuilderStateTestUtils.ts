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

import { ApplicationStore } from '@finos/legend-application';
import {
  Core_GraphManagerPreset,
  DataProduct,
  Mapping,
  ModelAccessPointGroup,
  PackageableElementExplicitReference,
  PackageableRuntime,
} from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph/test';
import {
  QueryBuilderActionConfig,
  QueryBuilderAdvancedWorkflowState,
  QueryBuilder_GraphManagerPreset,
  type QueryBuilderConfig,
  TEST__LegendApplicationPluginManager,
} from '@finos/legend-query-builder';
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceMappingProvider,
  DSL_DataSpace_GraphManagerPreset,
} from '@finos/legend-extension-dsl-data-space/graph';
import { DataSpaceQueryBuilderState } from '@finos/legend-extension-dsl-data-space/application';
import { TEST__getTestLegendQueryApplicationConfig } from './LegendQueryApplicationTestUtils.js';

export const TEST_DATA_SPACE_PATH = 'COVIDDatapace';

const DEFAULT_MAPG_ID = 'PureAlloyUsageMAPG';

export const buildRuntime = (name: string): PackageableRuntime =>
  new PackageableRuntime(name);

export const buildMapping = (name: string): Mapping => new Mapping(name);

export const buildMappingProvider = (
  mapping: Mapping,
  groupId = DEFAULT_MAPG_ID,
  dataProductName = 'Pure_Usage_Stats_Modeled',
): DataSpaceMappingProvider => {
  const group = new ModelAccessPointGroup();
  group.id = groupId;
  group.mapping = PackageableElementExplicitReference.create(mapping);
  const dataProduct = new DataProduct(dataProductName);
  dataProduct.accessPointGroups = [group];
  const provider = new DataSpaceMappingProvider();
  provider.element = PackageableElementExplicitReference.create(dataProduct);
  provider.keys = [groupId];
  return provider;
};

export const buildContext = (
  name: string,
  config: {
    mapping?: Mapping | undefined;
    mappingProvider?: DataSpaceMappingProvider | undefined;
    defaultRuntime?: PackageableRuntime | undefined;
  },
): DataSpaceExecutionContext => {
  const context = new DataSpaceExecutionContext();
  context.name = name;
  context.mapping = config.mapping
    ? PackageableElementExplicitReference.create(config.mapping)
    : undefined;
  context.mappingProvider = config.mappingProvider;
  context.defaultRuntime = config.defaultRuntime
    ? PackageableElementExplicitReference.create(config.defaultRuntime)
    : undefined;
  return context;
};

export const buildDataSpace = (
  name: string,
  contexts: DataSpaceExecutionContext[] | undefined,
  defaultContextName?: string | undefined,
): DataSpace => {
  const dataSpace = new DataSpace(name);
  dataSpace.package = undefined;
  dataSpace.executionContexts = contexts;
  dataSpace.defaultExecutionContext =
    defaultContextName && contexts
      ? contexts.find((ctx) => ctx.name === defaultContextName)
      : undefined;
  return dataSpace;
};

export const buildState = (
  dataSpace: DataSpace,
  executionContext: DataSpaceExecutionContext,
  options?: { config?: QueryBuilderConfig },
): DataSpaceQueryBuilderState => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new QueryBuilder_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
    ])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );
  return new DataSpaceQueryBuilderState(
    applicationStore,
    TEST__getTestGraphManagerState(pluginManager),
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    QueryBuilderActionConfig.INSTANCE,
    dataSpace,
    executionContext,
    false,
    undefined,
    async () => {
      /* no-op */
    },
    undefined,
    undefined,
    undefined,
    undefined,
    options?.config,
  );
};
