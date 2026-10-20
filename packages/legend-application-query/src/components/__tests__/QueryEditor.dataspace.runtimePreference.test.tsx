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

import { beforeEach, expect, test } from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import { DepotServerClient } from '@finos/legend-server-depot';
import {
  act,
  fireEvent,
  waitFor,
  type RenderResult,
} from '@testing-library/react';
import { type Entity } from '@finos/legend-storage';
import { stub_RawLambda } from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import {
  DSL_DataSpace_GraphManagerPreset,
  DSL_DataSpace_getGraphManagerExtension,
  type DataSpaceExecutionContext,
} from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_DataSpace_LegendApplicationPlugin } from '@finos/legend-extension-dsl-data-space/application';
import TEST_DATA__DSL_DataSpace_AnalyticsResult from './TEST_DATA__DSL_DataSpace_AnalyticsResult.json' with { type: 'json' };
import TEST_DATA__DSL_DataSpace_Entities from './TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import {
  TEST_DATA__DSL_DataSpace_LakehouseFallback_AnalyticsResult,
  TEST_DATA__DSL_DataSpace_MappingProvider_Entities,
} from './TEST_DATA__QueryEditor_DataSpace_MappingProvider.js';
import {
  TEST_QUERY_NAME,
  TEST__provideMockedQueryEditorStore,
  TEST__setUpDataSpaceExistingQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import { LegendQueryDataSpaceQueryBuilderState } from '../../stores/data-space/query-builder/LegendQueryDataSpaceQueryBuilderState.js';
import type {
  ExistingQueryEditorStore,
  QueryEditorStore,
} from '../../stores/QueryEditorStore.js';
import {
  DataProductQueryCreatorStore,
  QueryableLegacyDataProduct,
} from '../../stores/data-space/DataProductQueryCreatorStore.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { Core_LegendQueryApplicationPlugin } from '../Core_LegendQueryApplicationPlugin.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import { createDataSpaceRuntimePreferenceId } from '../../__lib__/LegendQueryUserDataSpaceHelper.js';

// the project of the saved query in `TEST__setUpDataSpaceExistingQueryEditor`
const GROUP_ID = 'test.group';
const ARTIFACT_ID = 'test-artifact';
const DATA_SPACE_PATH = 'domain::COVIDDatapace';
const CONTEXT = 'dummyContext';
const OTHER_CONTEXT = 'dummyContext2';
const DEFAULT_RUNTIME = 'runtime::H2Runtime';
const OTHER_RUNTIME = 'runtime::H2RuntimeAlt';
const RESET_TITLE =
  /^(?:Using the runtime you picked for this context\. )?Use the context's default runtime/;

const preferenceId = (context: string): string =>
  createDataSpaceRuntimePreferenceId(
    GROUP_ID,
    ARTIFACT_ID,
    DATA_SPACE_PATH,
    context,
  );

/**
 * The COVID data space, with a second runtime both its contexts can run on
 */
const buildFixtures = (): {
  entities: PlainObject<Entity>[];
  analytics: typeof TEST_DATA__DSL_DataSpace_AnalyticsResult;
} => {
  const entities = JSON.parse(
    JSON.stringify(TEST_DATA__DSL_DataSpace_Entities),
  ) as PlainObject<Entity>[];
  const defaultRuntime = guaranteeNonNullable(
    entities.find((entity) => entity.path === DEFAULT_RUNTIME),
  );
  entities.push({
    ...defaultRuntime,
    path: OTHER_RUNTIME,
    content: {
      ...(defaultRuntime.content as PlainObject),
      name: 'H2RuntimeAlt',
    },
  });
  const analytics = JSON.parse(
    JSON.stringify(TEST_DATA__DSL_DataSpace_AnalyticsResult),
  ) as typeof TEST_DATA__DSL_DataSpace_AnalyticsResult;
  analytics.executionContexts.forEach((context) =>
    context.compatibleRuntimes.push(OTHER_RUNTIME),
  );
  return { entities, analytics };
};

const provideEditorStore = (): ExistingQueryEditorStore => {
  const editorStore = TEST__provideMockedQueryEditorStore({
    extraPlugins: [new DSL_DataSpace_LegendApplicationPlugin()],
    extraPresets: [new DSL_DataSpace_GraphManagerPreset()],
  });
  editorStore.setExistingQueryName(TEST_QUERY_NAME);
  return editorStore;
};

const openSavedQuery = async (
  editorStore: ExistingQueryEditorStore,
): Promise<{
  renderResult: RenderResult;
  queryBuilderState: LegendQueryDataSpaceQueryBuilderState;
}> => {
  const { entities, analytics } = buildFixtures();
  const { renderResult, queryBuilderState } =
    await TEST__setUpDataSpaceExistingQueryEditor(
      editorStore,
      analytics,
      DATA_SPACE_PATH,
      CONTEXT,
      stub_RawLambda(),
      entities,
    );
  // the saved query is loaded completely, so nothing later resets the runtime
  await waitFor(() => expect(editorStore.initState.hasSucceeded).toBe(true));
  return {
    renderResult,
    queryBuilderState: guaranteeType(
      queryBuilderState,
      LegendQueryDataSpaceQueryBuilderState,
    ),
  };
};

const getSavedRuntime = (
  editorStore: QueryEditorStore,
  context: string,
): string | undefined =>
  LegendQueryUserDataHelper.getDataSpaceRuntimePreference(
    editorStore.applicationStore.userDataService,
    preferenceId(context),
  );

const saveRuntime = (
  editorStore: QueryEditorStore,
  context: string,
  runtimePath: string,
): void =>
  LegendQueryUserDataHelper.persistDataSpaceRuntimePreference(
    editorStore.applicationStore.userDataService,
    preferenceId(context),
    runtimePath,
  );

const pickRuntime = async (
  renderResult: RenderResult,
  runtimeName: string,
): Promise<void> => {
  const runtimeSelector = guaranteeNonNullable(
    renderResult.container.querySelector(
      '#query-builder__setup__runtime-selector',
    ),
  );
  fireEvent.keyDown(runtimeSelector, { key: 'ArrowDown' });
  // the selected runtime shows with the same label, so look among the options
  const option = await waitFor(() =>
    guaranteeNonNullable(
      Array.from(
        renderResult.baseElement.querySelectorAll<HTMLElement>(
          '.selector-input__option, .selector-input--dark__option',
        ),
      ).find(
        (element) =>
          element.querySelector('[class$="__name"]')?.textContent ===
          runtimeName,
      ),
      `Can't find runtime option '${runtimeName}'`,
    ),
  );
  fireEvent.click(option);
};

const switchContext = async (
  queryBuilderState: LegendQueryDataSpaceQueryBuilderState,
  context: string,
): Promise<void> => {
  const executionContext = guaranteeNonNullable(
    queryBuilderState.dataSpace.executionContexts?.find(
      (ec: DataSpaceExecutionContext) => ec.name === context,
    ),
  );
  await act(async () => {
    queryBuilderState.setExecutionContext(executionContext);
    await queryBuilderState.propagateExecutionContextChange(true);
  });
};

beforeEach(() => {
  // the application store reads saved user data when it is created
  window.localStorage.clear();
});

test(
  integrationTest(
    'Reopening a saved data space query uses the runtime the user picked for its context',
  ),
  async () => {
    const editorStore = provideEditorStore();
    saveRuntime(editorStore, CONTEXT, OTHER_RUNTIME);

    const { renderResult, queryBuilderState } =
      await openSavedQuery(editorStore);

    expect(queryBuilderState.currentRuntimePath).toBe(OTHER_RUNTIME);
    expect(queryBuilderState.savedRuntimePath).toBe(OTHER_RUNTIME);
    // never applied out of sight, and opening the query is not a change to it
    expect(queryBuilderState.showRuntimeSelector).toBe(true);
    expect(queryBuilderState.changeDetectionState.hasChanged).toBe(false);
    expect(
      renderResult.getByTitle(
        `Using the runtime you picked for this context. Use the context's default runtime '${DEFAULT_RUNTIME}' instead`,
      ),
    ).toBeDefined();
  },
);

test(
  integrationTest(
    'Picking a runtime saves it for the context, and picking the default forgets it',
  ),
  async () => {
    const editorStore = provideEditorStore();
    const { renderResult, queryBuilderState } =
      await openSavedQuery(editorStore);
    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(renderResult.queryByTitle(RESET_TITLE)).toBeNull();

    await act(async () => {
      fireEvent.click(renderResult.getByTitle('Show Settings...'));
    });
    await act(async () => {
      fireEvent.click(renderResult.getByText('Show Runtime Selector'));
    });

    await pickRuntime(renderResult, 'H2RuntimeAlt');
    expect(queryBuilderState.currentRuntimePath).toBe(OTHER_RUNTIME);
    expect(getSavedRuntime(editorStore, CONTEXT)).toBe(OTHER_RUNTIME);
    expect(getSavedRuntime(editorStore, OTHER_CONTEXT)).toBeUndefined();
    await waitFor(() => renderResult.getByTitle(RESET_TITLE));

    await pickRuntime(renderResult, 'H2Runtime');
    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(getSavedRuntime(editorStore, CONTEXT)).toBeUndefined();
    await waitFor(() =>
      expect(renderResult.queryByTitle(RESET_TITLE)).toBeNull(),
    );
  },
);

test(
  integrationTest(
    'Resetting goes back to the default runtime and forgets the saved one',
  ),
  async () => {
    const editorStore = provideEditorStore();
    saveRuntime(editorStore, CONTEXT, OTHER_RUNTIME);
    const { renderResult, queryBuilderState } =
      await openSavedQuery(editorStore);

    await act(async () => {
      fireEvent.click(renderResult.getByTitle(RESET_TITLE));
    });

    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(queryBuilderState.savedRuntimePath).toBeUndefined();
    expect(getSavedRuntime(editorStore, CONTEXT)).toBeUndefined();
    expect(renderResult.queryByTitle(RESET_TITLE)).toBeNull();
  },
);

test(
  integrationTest(
    'A saved runtime that can no longer run the context is forgotten',
  ),
  async () => {
    const editorStore = provideEditorStore();
    // e.g. removed from the project in a newer version
    saveRuntime(editorStore, CONTEXT, 'runtime::RemovedRuntime');

    const { queryBuilderState } = await openSavedQuery(editorStore);

    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(queryBuilderState.showRuntimeSelector).toBe(false);
    expect(getSavedRuntime(editorStore, CONTEXT)).toBeUndefined();
  },
);

test(
  integrationTest(
    'Switching execution context uses the runtime saved for the new context',
  ),
  async () => {
    const editorStore = provideEditorStore();
    saveRuntime(editorStore, OTHER_CONTEXT, OTHER_RUNTIME);
    const { queryBuilderState } = await openSavedQuery(editorStore);
    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);

    await switchContext(queryBuilderState, OTHER_CONTEXT);
    expect(queryBuilderState.currentRuntimePath).toBe(OTHER_RUNTIME);
    expect(queryBuilderState.savedRuntimePath).toBe(OTHER_RUNTIME);

    await switchContext(queryBuilderState, CONTEXT);
    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(queryBuilderState.savedRuntimePath).toBeUndefined();
    // the choice for the other context is kept
    expect(getSavedRuntime(editorStore, OTHER_CONTEXT)).toBe(OTHER_RUNTIME);
  },
);

test(
  integrationTest(
    'The Lakehouse runtime Query builds for a context is never saved as a choice',
  ),
  async () => {
    const editorStore = provideEditorStore();
    editorStore.resolveLakehouseEnvAndWarehouse = async () => ({
      env: 'TEST_ENV',
      warehouse: 'TEST_WH',
    });
    await TEST__setUpDataSpaceExistingQueryEditor(
      editorStore,
      TEST_DATA__DSL_DataSpace_LakehouseFallback_AnalyticsResult,
      DATA_SPACE_PATH,
      CONTEXT,
      stub_RawLambda(),
      TEST_DATA__DSL_DataSpace_MappingProvider_Entities,
    );
    await waitFor(() => expect(editorStore.initState.hasSucceeded).toBe(true));
    const queryBuilderState = guaranteeType(
      editorStore.queryBuilderState,
      LegendQueryDataSpaceQueryBuilderState,
    );
    expect(queryBuilderState.injectedLakehouseRuntime).toBeDefined();

    queryBuilderState.rememberRuntime(
      guaranteeNonNullable(
        queryBuilderState.executionContextState.runtimeValue,
      ),
    );

    expect(getSavedRuntime(editorStore, CONTEXT)).toBeUndefined();
    expect(queryBuilderState.savedRuntimePath).toBeUndefined();
  },
);

/**
 * Opens the data space in a new query, as the data space route does, with the
 * runtime of a link if any
 */
const setUpQueryCreator = async (): Promise<DataProductQueryCreatorStore> => {
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([
      new Core_LegendQueryApplicationPlugin(),
      new DSL_DataSpace_LegendApplicationPlugin(),
    ])
    .usePresets([new DSL_DataSpace_GraphManagerPreset()])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );
  const creatorStore = new DataProductQueryCreatorStore(
    applicationStore,
    new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    }),
    undefined,
  );
  const { entities, analytics } = buildFixtures();
  const graphManager = creatorStore.graphManagerState.graphManager;
  await graphManager.initialize({ env: 'test', tabSize: 2, clientConfig: {} });
  await creatorStore.graphManagerState.initializeSystem();
  createSpy(creatorStore.depotServerClient, 'getProject').mockResolvedValue({
    id: 'test-id',
    groupId: GROUP_ID,
    artifactId: ARTIFACT_ID,
    projectId: 'test-project-id',
    versions: ['0.0.0'],
    latestVersion: '0.0.0',
  });
  createSpy(creatorStore.depotServerClient, 'getEntities').mockResolvedValue(
    entities,
  );
  createSpy(
    creatorStore.depotServerClient,
    'getIndexedDependencyEntities',
  ).mockResolvedValue(new Map());
  createSpy(
    creatorStore.depotServerClient,
    'getGenerationContentByPath',
  ).mockResolvedValue(JSON.stringify(analytics));
  createSpy(
    creatorStore.depotServerClient,
    'getGenerationFilesByType',
  ).mockResolvedValue([]);
  const graphManagerExtension =
    DSL_DataSpace_getGraphManagerExtension(graphManager);
  createSpy(graphManagerExtension, 'analyzeDataSpace').mockResolvedValue(
    await graphManagerExtension.buildDataSpaceAnalytics(
      analytics,
      graphManager.pluginManager.getPureProtocolProcessorPlugins(),
    ),
  );
  return creatorStore;
};

const openDataSpace = async (
  creatorStore: DataProductQueryCreatorStore,
  linkRuntimePath?: string,
): Promise<LegendQueryDataSpaceQueryBuilderState> => {
  const dataSpace = new QueryableLegacyDataProduct(
    GROUP_ID,
    ARTIFACT_ID,
    '0.0.0',
    DATA_SPACE_PATH,
    CONTEXT,
    linkRuntimePath,
  );
  creatorStore.setQueryableElement(dataSpace);
  return guaranteeType(
    await creatorStore.initializeQueryBuilderStateWithQueryableDataSpace(
      dataSpace,
    ),
    LegendQueryDataSpaceQueryBuilderState,
  );
};

test(
  integrationTest(
    'Opening a data space uses the runtime the user picked for the context',
  ),
  async () => {
    const creatorStore = await setUpQueryCreator();
    saveRuntime(creatorStore, CONTEXT, OTHER_RUNTIME);

    const queryBuilderState = await openDataSpace(creatorStore);

    expect(queryBuilderState.currentRuntimePath).toBe(OTHER_RUNTIME);
    expect(queryBuilderState.showRuntimeSelector).toBe(true);
  },
);

test(
  integrationTest(
    "A link's runtime wins over the saved one, without replacing the saved one",
  ),
  async () => {
    const creatorStore = await setUpQueryCreator();
    saveRuntime(creatorStore, CONTEXT, OTHER_RUNTIME);

    const queryBuilderState = await openDataSpace(
      creatorStore,
      DEFAULT_RUNTIME,
    );

    expect(queryBuilderState.currentRuntimePath).toBe(DEFAULT_RUNTIME);
    expect(getSavedRuntime(creatorStore, CONTEXT)).toBe(OTHER_RUNTIME);
  },
);

test(
  integrationTest(
    "A link to a runtime that no longer exists opens with the user's runtime and a warning",
  ),
  async () => {
    const creatorStore = await setUpQueryCreator();
    saveRuntime(creatorStore, CONTEXT, OTHER_RUNTIME);
    const notifyWarning = createSpy(
      creatorStore.applicationStore.notificationService,
      'notifyWarning',
    );

    const queryBuilderState = await openDataSpace(
      creatorStore,
      'runtime::RemovedRuntime',
    );

    expect(queryBuilderState.currentRuntimePath).toBe(OTHER_RUNTIME);
    expect(notifyWarning).toHaveBeenCalledWith(
      `Can't find runtime 'runtime::RemovedRuntime' from the link: using runtime '${OTHER_RUNTIME}' instead`,
    );
  },
);
