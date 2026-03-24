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

import { type RenderResult, render, waitFor } from '@testing-library/react';
import {
  type PlainObject,
  type AbstractPlugin,
  type AbstractPreset,
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
import {
  type GraphManagerState,
  type RawMappingModelCoverageAnalysisResult,
  type QueryInfo,
  Query,
  LightQuery,
  RawLambda,
  QueryExplicitExecutionContext,
  QueryDataSpaceExecutionContext,
  QueryDataProductModelAccessExecutionContext,
  QueryDataProductNativeExecutionContext,
  PackageableElementExplicitReference,
  QueryDataSpaceExecutionContextInfo,
  QueryExplicitExecutionContextInfo,
  QueryDataProductModelAccessExecutionContextInfo,
  QueryDataProductNativeExecutionContextInfo,
  ModelAccessPointGroup,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { DepotServerClient } from '@finos/legend-server-depot';
import {
  ApplicationStoreProvider,
  ApplicationStore,
} from '@finos/legend-application';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { ExistingQueryEditor } from '../QueryEditor.js';
import type {
  EntitiesWithOrigin,
  Entity,
  StoredFileGeneration,
} from '@finos/legend-storage';
import {
  ExistingQueryEditorStore,
  QueryBuilderActionConfig_QueryApplication,
} from '../../stores/QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../../stores/LegendQueryBaseStore.js';
import {
  type QueryBuilderState,
  QUERY_BUILDER_TEST_ID,
  QueryBuilderDataBrowserWorkflow,
} from '@finos/legend-query-builder';
import { LegendQueryFrameworkProvider } from '../LegendQueryFrameworkProvider.js';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { Core_LegendQueryApplicationPlugin } from '../Core_LegendQueryApplicationPlugin.js';
import {
  Route,
  Routes,
  generateExtensionUrlPattern,
} from '@finos/legend-application/browser';
import {
  generateExistingQueryEditorRoute,
  LEGEND_QUERY_ROUTE_PATTERN,
} from '../../__lib__/LegendQueryNavigation.js';
import {
  generateDataSpaceTemplateQueryCreatorRoute,
  LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN,
} from '../../__lib__/DSL_DataSpace_LegendQueryNavigation.js';
import { DataSpaceTemplateQueryCreator } from '../data-space/DataSpaceTemplateQueryCreator.js';
import {
  type V1_DataSpaceAnalysisResult,
  DSL_DataSpace_getGraphManagerExtension,
} from '@finos/legend-extension-dsl-data-space/graph';
import { LegendQueryDataProductQueryBuilderState } from '../../stores/data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';
import { DataProductSelectorState } from '../../stores/data-space/DataProductSelectorState.js';
import { DataSpaceTemplateQueryCreatorStore } from '../../stores/data-space/DataSpaceTemplateQueryCreatorStore.js';

const TEST_QUERY_ID = 'test-query-id';
const TEST_GROUP_ID = 'test-group';
const TEST_ARTIFACT_ID = 'test-artifact';
const TEST_VERSION_ID = 'test-version';
const TEST_TEMPLATE_QUERY_ID = 'templateQuery';
const TEST_DATA_SPACE_PATH = 'domain::COVIDDatapace';
export const TEST_QUERY_NAME = 'MyTestQuery';

export const TEST__provideMockedQueryEditorStore = (customization?: {
  mock?: ExistingQueryEditorStore;
  applicationStore?: LegendQueryApplicationStore;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendQueryPluginManager;
  extraPlugins?: AbstractPlugin[];
  extraPresets?: AbstractPreset[];
}): ExistingQueryEditorStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([
      new Core_LegendQueryApplicationPlugin(),
      ...(customization?.extraPlugins ?? []),
    ])
    .usePresets([...(customization?.extraPresets ?? [])])
    .install();
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      pluginManager,
    );
  const depotServerClient = new DepotServerClient({
    serverUrl: applicationStore.config.depotServerUrl,
  });
  depotServerClient.setTracerService(applicationStore.tracerService);
  const value =
    customization?.mock ??
    new ExistingQueryEditorStore(
      applicationStore,
      depotServerClient,
      TEST_QUERY_ID,
      undefined,
    );
  const MOCK__QueryEditorStoreProvider = require('../QueryEditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-require-imports,@typescript-eslint/no-unsafe-assignment
  MOCK__QueryEditorStoreProvider.useQueryEditorStore = createMock();
  MOCK__QueryEditorStoreProvider.useQueryEditorStore.mockReturnValue(value);
  return value;
};

export const TEST__provideMockedDataSpaceTemplateQueryCreatorStore =
  (customization?: {
    mock?: DataSpaceTemplateQueryCreatorStore;
    applicationStore?: LegendQueryApplicationStore;
    graphManagerState?: GraphManagerState;
    pluginManager?: LegendQueryPluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): DataSpaceTemplateQueryCreatorStore => {
    const pluginManager =
      customization?.pluginManager ?? LegendQueryPluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendQueryApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([...(customization?.extraPresets ?? [])])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendQueryApplicationConfig(),
        pluginManager,
      );
    const depotServerClient = new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    });
    depotServerClient.setTracerService(applicationStore.tracerService);
    const value =
      customization?.mock ??
      new DataSpaceTemplateQueryCreatorStore(
        applicationStore,
        depotServerClient,
        TEST_GROUP_ID,
        TEST_ARTIFACT_ID,
        TEST_VERSION_ID,
        TEST_DATA_SPACE_PATH,
        TEST_TEMPLATE_QUERY_ID,
        { fips: 'value' },
      );
    const MOCK__QueryEditorStoreProvider = require('../QueryEditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-require-imports,@typescript-eslint/no-unsafe-assignment
    MOCK__QueryEditorStoreProvider.useQueryEditorStore = createMock();
    MOCK__QueryEditorStoreProvider.useQueryEditorStore.mockReturnValue(value);
    return value;
  };

export const TEST__setUpQueryEditor = async (
  MOCK__editorStore: ExistingQueryEditorStore,
  entities: PlainObject<Entity>[],
  lambda: RawLambda,
  mappingPath: string,
  runtimePath: string,
  rawMappingModelCoverageAnalysisResult?: RawMappingModelCoverageAnalysisResult,
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const projectData = {
    id: 'test-id',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  };

  const lightQuery = new LightQuery();
  lightQuery.name = TEST_QUERY_NAME;
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities as unknown as Entity[],
    graphManagerState.graphBuildState,
  );

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  const _mapping = graphManagerState.graph.getMapping(mappingPath);
  const execContext = new QueryExplicitExecutionContext();
  execContext.mapping = PackageableElementExplicitReference.create(_mapping);
  execContext.runtime = PackageableElementExplicitReference.create(
    graphManagerState.graph.getRuntime(runtimePath),
  );
  query.executionContext = execContext;
  query.content = 'some content';

  const execContextInfo = new QueryExplicitExecutionContextInfo();
  execContextInfo.mapping = mappingPath;
  execContextInfo.runtime = runtimePath;

  const queryInfo: QueryInfo = {
    name: TEST_QUERY_NAME,
    id: TEST_QUERY_ID,
    versionId: '0.0.0',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    executionContext: execContextInfo,
    content: 'some content',
    isCurrentUserQuery: true,
  };

  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntities',
  ).mockResolvedValue(entities);
  createSpy(graphManagerState.graphManager, 'getLightQuery').mockResolvedValue(
    lightQuery,
  );
  createSpy(graphManagerState.graphManager, 'getQueryInfo').mockResolvedValue(
    queryInfo,
  );
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(graphManagerState.graphManager, 'getQuery').mockResolvedValue(
    query,
  );
  if (rawMappingModelCoverageAnalysisResult) {
    createSpy(
      graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        rawMappingModelCoverageAnalysisResult,
        _mapping,
      ),
    );
  }

  MOCK__editorStore.buildGraph = createMock();
  graphManagerState.graphManager.initialize = createMock();

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateExistingQueryEditorRoute(lightQuery.id)]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
              element={<ExistingQueryEditor />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};

export const TEST__setUpDataSpaceExistingQueryEditor = async (
  MOCK__editorStore: ExistingQueryEditorStore,
  V1_dataspaceAnalyticsResult: PlainObject<V1_DataSpaceAnalysisResult>,
  dataSpacePath: string,
  executionContext: string,
  lambda: RawLambda,
  entities: PlainObject<Entity>[],
  buildWithMinimalGraph = false,
  V1_dataspaceArtifacts: PlainObject<StoredFileGeneration>[] = [],
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  if (buildWithMinimalGraph) {
    MOCK__editorStore.applicationStore.config.options.TEMPORARY__enableMinimalGraph =
      true;
  }

  const projectData = {
    id: 'test-id',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  };

  const lightQuery = new LightQuery();
  lightQuery.name = TEST_QUERY_NAME;
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await graphManagerState.initializeSystem();

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  const execContext = new QueryDataSpaceExecutionContext();
  execContext.dataSpacePath = dataSpacePath;
  execContext.executionKey = executionContext;
  query.executionContext = execContext;
  query.content = 'some content';

  const execContextInfo = new QueryDataSpaceExecutionContextInfo();
  execContextInfo.dataSpacePath = dataSpacePath;
  execContextInfo.executionKey = executionContext;

  const queryInfo: QueryInfo = {
    name: TEST_QUERY_NAME,
    id: TEST_QUERY_ID,
    versionId: '0.0.0',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    executionContext: execContextInfo,
    content: 'some content',
    isCurrentUserQuery: true,
  };

  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntities',
  ).mockResolvedValue(buildWithMinimalGraph ? [] : entities);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getIndexedDependencyEntities',
  ).mockResolvedValue(new Map<string, EntitiesWithOrigin>());
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getGenerationContentByPath',
  ).mockResolvedValue(JSON.stringify(V1_dataspaceAnalyticsResult));
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getGenerationFilesByType',
  ).mockResolvedValue(V1_dataspaceArtifacts);
  createSpy(graphManagerState.graphManager, 'getLightQuery').mockResolvedValue(
    lightQuery,
  );
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(
    graphManagerState.graphManager,
    'lambdaToPureCode',
  ).mockResolvedValue('');
  createSpy(graphManagerState.graphManager, 'getQuery').mockResolvedValue(
    query,
  );
  createSpy(graphManagerState.graphManager, 'getQueryInfo').mockResolvedValue(
    queryInfo,
  );
  createSpy(graphManagerState.graphManager, 'surveyDatasets').mockResolvedValue(
    [],
  );
  createSpy(
    graphManagerState.graphManager,
    'checkDatasetEntitlements',
  ).mockResolvedValue([]);

  const graphManagerExtension = DSL_DataSpace_getGraphManagerExtension(
    graphManagerState.graphManager,
  );
  const dataspaceAnalyticsResult =
    await graphManagerExtension.buildDataSpaceAnalytics(
      V1_dataspaceAnalyticsResult,
      graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
    );
  createSpy(graphManagerExtension, 'analyzeDataSpace').mockResolvedValue(
    dataspaceAnalyticsResult,
  );

  MOCK__editorStore.buildGraph = createMock();
  graphManagerState.graphManager.initialize = createMock();

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateExistingQueryEditorRoute(lightQuery.id)]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
              element={<ExistingQueryEditor />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};

export const TEST__setUpDataSpaceTemplateQueryEditor = async (
  MOCK__editorStore: DataSpaceTemplateQueryCreatorStore,
  V1_dataspaceAnalyticsResult: PlainObject<V1_DataSpaceAnalysisResult>,
  dataSpacePath: string,
  executionContext: string,
  lambda: RawLambda,
  entities: PlainObject<Entity>[],
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const projectData = {
    id: 'test-id',
    groupId: MOCK__editorStore.groupId,
    artifactId: MOCK__editorStore.artifactId,
    projectId: 'test-project-id',
    versions: [MOCK__editorStore.versionId],
    latestVersion: MOCK__editorStore.versionId,
  };

  const graphManagerState = MOCK__editorStore.graphManagerState;

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await graphManagerState.initializeSystem();

  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntities',
  ).mockResolvedValue(entities);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getIndexedDependencyEntities',
  ).mockResolvedValue(new Map<string, EntitiesWithOrigin>());
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getGenerationContentByPath',
  ).mockResolvedValue(JSON.stringify(V1_dataspaceAnalyticsResult));
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getGenerationFilesByType',
  ).mockResolvedValue([]);
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(
    graphManagerState.graphManager,
    'lambdaToPureCode',
  ).mockResolvedValue('');
  createSpy(graphManagerState.graphManager, 'surveyDatasets').mockResolvedValue(
    [],
  );
  createSpy(
    graphManagerState.graphManager,
    'checkDatasetEntitlements',
  ).mockResolvedValue([]);

  // Mock engine's transformCodeToValueSpecifications to handle preset URL string parameter values.
  const pureGraphManager = guaranteeType(
    graphManagerState.graphManager,
    V1_PureGraphManager,
  );
  createSpy(
    pureGraphManager.engine,
    'transformCodeToValueSpecifications',
  ).mockImplementation(async (input: Record<string, { value: string }>) => {
    const result = new Map<string, PlainObject>();
    for (const [key, entry] of Object.entries(input)) {
      const match = /^'(?<content>.*)'$/.exec(entry.value);
      if (match?.groups) {
        result.set(key, { _type: 'string', value: match.groups.content });
      }
    }
    return result;
  });

  const graphManagerExtension = DSL_DataSpace_getGraphManagerExtension(
    graphManagerState.graphManager,
  );
  const dataspaceAnalyticsResult =
    await graphManagerExtension.buildDataSpaceAnalytics(
      V1_dataspaceAnalyticsResult,
      graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
    );
  createSpy(graphManagerExtension, 'analyzeDataSpace').mockResolvedValue(
    dataspaceAnalyticsResult,
  );

  MOCK__editorStore.buildGraph = createMock();
  graphManagerState.graphManager.initialize = createMock();

  const templateRoute = generateDataSpaceTemplateQueryCreatorRoute(
    MOCK__editorStore.groupId,
    MOCK__editorStore.artifactId,
    MOCK__editorStore.versionId,
    MOCK__editorStore.dataSpacePath,
    MOCK__editorStore.templateQueryId,
  );

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={[templateRoute]}>
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={generateExtensionUrlPattern(
                LEGACY_DATA_SPACE_QUERY_ROUTE_PATTERN.TEMPLATE_QUERY,
              )}
              element={<DataSpaceTemplateQueryCreator />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};

export const TEST__setUpDataProductExistingQueryEditor = async (
  MOCK__editorStore: ExistingQueryEditorStore,
  dataProductPath: string,
  accessPointGroupId: string,
  lambda: RawLambda,
  entities: PlainObject<Entity>[],
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const projectData = {
    id: 'test-id',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  };

  const lightQuery = new LightQuery();
  lightQuery.name = TEST_QUERY_NAME;
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities as unknown as Entity[],
    graphManagerState.graphBuildState,
  );

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  const execContext = new QueryDataProductModelAccessExecutionContext();
  execContext.dataProductPath = dataProductPath;
  execContext.accessPointGroupId = accessPointGroupId;
  query.executionContext = execContext;
  query.content = 'some content';

  const execContextInfo = new QueryDataProductModelAccessExecutionContextInfo();
  execContextInfo.dataProductPath = dataProductPath;
  execContextInfo.accessPointGroupId = accessPointGroupId;

  const queryInfo: QueryInfo = {
    name: TEST_QUERY_NAME,
    id: TEST_QUERY_ID,
    versionId: '0.0.0',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    executionContext: execContextInfo,
    content: 'some content',
    isCurrentUserQuery: true,
  };

  // Resolve the data product and execution state from the built graph
  const dataProduct = graphManagerState.graph.getDataProduct(dataProductPath);
  const modelGroups = dataProduct.accessPointGroups.filter(
    filterByType(ModelAccessPointGroup),
  );
  const executionState = guaranteeNonNullable(
    modelGroups.find((g) => g.id === accessPointGroupId),
    `Can't find access point group '${accessPointGroupId}'`,
  );

  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntities',
  ).mockResolvedValue(entities);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getVersions',
  ).mockResolvedValue([projectData.latestVersion]);
  createSpy(graphManagerState.graphManager, 'getLightQuery').mockResolvedValue(
    lightQuery,
  );
  createSpy(graphManagerState.graphManager, 'getQueryInfo').mockResolvedValue(
    queryInfo,
  );
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(graphManagerState.graphManager, 'getQuery').mockResolvedValue(
    query,
  );
  createSpy(
    graphManagerState.graphManager,
    'analyzeMappingModelCoverage',
  ).mockResolvedValue(
    graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
      { mappedEntities: [] },
      executionState.mapping.value,
    ),
  );

  // Build the query builder state that buildDataProductQueryBuilderState would return
  const mockQueryBuilderState = new LegendQueryDataProductQueryBuilderState(
    MOCK__editorStore.applicationStore,
    graphManagerState,
    QueryBuilderDataBrowserWorkflow.INSTANCE,
    new QueryBuilderActionConfig_QueryApplication(MOCK__editorStore),
    dataProduct,
    undefined,
    executionState,
    MOCK__editorStore.depotServerClient,
    { groupId: 'test.group', artifactId: 'test-artifact', versionId: '0.0.0' },
    async () => {
      /* no-op for tests */
    },
    new DataProductSelectorState(
      MOCK__editorStore.depotServerClient,
      MOCK__editorStore.applicationStore,
    ),
    undefined,
    undefined,
    undefined,
    MOCK__editorStore.applicationStore.config.options.queryBuilderConfig,
    {
      groupId: 'test.group',
      artifactId: 'test-artifact',
      versionId: '0.0.0',
      dataProduct: dataProductPath,
    },
  );
  mockQueryBuilderState.initWithDataProduct(dataProduct, executionState);

  MOCK__editorStore.buildGraph = createMock();
  MOCK__editorStore.buildFullGraph = createMock();
  MOCK__editorStore.fetchDataProductArtifact = createMock();
  (
    MOCK__editorStore.fetchDataProductArtifact as ReturnType<typeof createMock>
  ).mockResolvedValue({});
  MOCK__editorStore.buildDataProductQueryBuilderState = createMock();
  (
    MOCK__editorStore.buildDataProductQueryBuilderState as ReturnType<
      typeof createMock
    >
  ).mockResolvedValue(mockQueryBuilderState);
  graphManagerState.graphManager.initialize = createMock();

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateExistingQueryEditorRoute(lightQuery.id)]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
              element={<ExistingQueryEditor />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};

export const TEST__setUpDataProductNativeExistingQueryEditor = async (
  MOCK__editorStore: ExistingQueryEditorStore,
  dataProductPath: string,
  executionKey: string,
  lambda: RawLambda,
  entities: PlainObject<Entity>[],
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: QueryBuilderState;
}> => {
  const projectData = {
    id: 'test-id',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  };

  const lightQuery = new LightQuery();
  lightQuery.name = TEST_QUERY_NAME;
  lightQuery.id = TEST_QUERY_ID;
  lightQuery.versionId = '0.0.0';
  lightQuery.groupId = 'test.group';
  lightQuery.artifactId = 'test-artifact';
  lightQuery.owner = 'test-artifact';
  lightQuery.isCurrentUserQuery = true;

  const graphManagerState = MOCK__editorStore.graphManagerState;

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });

  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities as unknown as Entity[],
    graphManagerState.graphBuildState,
  );

  const query = new Query();
  query.name = lightQuery.name;
  query.id = lightQuery.id;
  query.versionId = lightQuery.versionId;
  query.groupId = lightQuery.groupId;
  query.artifactId = lightQuery.artifactId;
  query.owner = lightQuery.owner;
  query.isCurrentUserQuery = lightQuery.isCurrentUserQuery;
  const execContext = new QueryDataProductNativeExecutionContext();
  execContext.dataProductPath = dataProductPath;
  execContext.executionKey = executionKey;
  query.executionContext = execContext;
  query.content = 'some content';

  const execContextInfo = new QueryDataProductNativeExecutionContextInfo();
  execContextInfo.dataProductPath = dataProductPath;
  execContextInfo.executionKey = executionKey;

  const queryInfo: QueryInfo = {
    name: TEST_QUERY_NAME,
    id: TEST_QUERY_ID,
    versionId: '0.0.0',
    groupId: 'test.group',
    artifactId: 'test-artifact',
    executionContext: execContextInfo,
    content: 'some content',
    isCurrentUserQuery: true,
  };

  // Resolve the data product and execution state from the built graph
  const dataProduct = graphManagerState.graph.getDataProduct(dataProductPath);
  const nativeAccess = guaranteeNonNullable(
    dataProduct.nativeModelAccess,
    `Data product '${dataProductPath}' has no native model access`,
  );
  const executionState = guaranteeNonNullable(
    nativeAccess.nativeModelExecutionContexts.find(
      (ctx) => ctx.key === executionKey,
    ),
    `Can't find native execution context '${executionKey}'`,
  );

  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProject',
  ).mockResolvedValue(projectData);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntities',
  ).mockResolvedValue(entities);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockResolvedValue([]);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getVersions',
  ).mockResolvedValue([projectData.latestVersion]);
  createSpy(graphManagerState.graphManager, 'getLightQuery').mockResolvedValue(
    lightQuery,
  );
  createSpy(graphManagerState.graphManager, 'getQueryInfo').mockResolvedValue(
    queryInfo,
  );
  createSpy(
    graphManagerState.graphManager,
    'pureCodeToLambda',
  ).mockResolvedValue(new RawLambda(lambda.parameters, lambda.body));
  createSpy(graphManagerState.graphManager, 'getQuery').mockResolvedValue(
    query,
  );
  createSpy(
    graphManagerState.graphManager,
    'analyzeMappingModelCoverage',
  ).mockResolvedValue(
    graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
      { mappedEntities: [] },
      executionState.mapping.value,
    ),
  );

  // Build the query builder state that buildDataProductQueryBuilderState would return
  const mockQueryBuilderState = new LegendQueryDataProductQueryBuilderState(
    MOCK__editorStore.applicationStore,
    graphManagerState,
    QueryBuilderDataBrowserWorkflow.INSTANCE,
    new QueryBuilderActionConfig_QueryApplication(MOCK__editorStore),
    dataProduct,
    undefined,
    executionState,
    MOCK__editorStore.depotServerClient,
    { groupId: 'test.group', artifactId: 'test-artifact', versionId: '0.0.0' },
    async () => {
      /* no-op for tests */
    },
    new DataProductSelectorState(
      MOCK__editorStore.depotServerClient,
      MOCK__editorStore.applicationStore,
    ),
    undefined,
    undefined,
    undefined,
    MOCK__editorStore.applicationStore.config.options.queryBuilderConfig,
    {
      groupId: 'test.group',
      artifactId: 'test-artifact',
      versionId: '0.0.0',
      dataProduct: dataProductPath,
    },
  );
  mockQueryBuilderState.initWithDataProduct(dataProduct, executionState);

  MOCK__editorStore.buildGraph = createMock();
  MOCK__editorStore.buildFullGraph = createMock();
  MOCK__editorStore.fetchDataProductArtifact = createMock();
  (
    MOCK__editorStore.fetchDataProductArtifact as ReturnType<typeof createMock>
  ).mockResolvedValue({});
  MOCK__editorStore.buildDataProductQueryBuilderState = createMock();
  (
    MOCK__editorStore.buildDataProductQueryBuilderState as ReturnType<
      typeof createMock
    >
  ).mockResolvedValue(mockQueryBuilderState);
  graphManagerState.graphManager.initialize = createMock();

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateExistingQueryEditorRoute(lightQuery.id)]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY}
              element={<ExistingQueryEditor />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(QUERY_BUILDER_TEST_ID.QUERY_BUILDER),
  );

  return {
    renderResult,
    queryBuilderState: guaranteeNonNullable(
      MOCK__editorStore.queryBuilderState,
      `Query builder state should have been initialized`,
    ),
  };
};
