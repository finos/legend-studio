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

import { describe, expect, jest, test } from '@jest/globals';
import type { CubeProjectCoordinates } from '@finos/legend-cube-builder';
import { RawLambda } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  DepotServerClient,
  type StoredEntity,
} from '@finos/legend-server-depot';
import { CUBE_DATA_SPACE_QUERY_PROBLEM } from '../LegendAnalyticsCubeDataSpaceQuery.js';
import {
  LegendAnalyticsDataSpaceEditor,
  type LegendAnalyticsDataSpaceEditorSession,
  readCubeDataSpaceDescription,
  readCubeDataSpaceSummaries,
} from '../LegendAnalyticsDataSpaceEditor.js';
import {
  TEST__buildCovidGraph,
  TEST__COVID_DATA,
  TEST__COVID_DATA_SPACE,
  TEST__covidQuery,
  TEST__createAnalyticsApplicationStore,
  TEST__project,
} from './LegendAnalyticsDataSpaceTestUtils.js';

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const PROJECT: CubeProjectCoordinates = {
  groupId: 'com.example',
  artifactId: 'covid',
  versionId: '1.0.0',
};

const setUp = async (): Promise<{
  editor: LegendAnalyticsDataSpaceEditor;
  loadGraph: jest.SpiedFunction<LegendAnalyticsDataSpaceEditor['loadGraph']>;
}> => {
  const applicationStore = TEST__createAnalyticsApplicationStore();
  const graphManagerState = await TEST__buildCovidGraph(applicationStore);
  const editor = new LegendAnalyticsDataSpaceEditor(
    applicationStore,
    new DepotServerClient({ serverUrl: 'https://depot.test' }),
  );
  const loadGraph = jest
    .spyOn(editor, 'loadGraph')
    .mockResolvedValue(graphManagerState);
  return { editor, loadGraph };
};

const openSession = async (
  editor: LegendAnalyticsDataSpaceEditor,
  query?: ReturnType<typeof TEST__covidQuery>,
): Promise<LegendAnalyticsDataSpaceEditorSession> => {
  const session = editor.openSession({
    project: PROJECT,
    dataSpace: TEST__COVID_DATA_SPACE,
    executionContext: 'dummyContext2',
    query,
  });
  expect(session.isLoading).toBe(true);
  await settle();
  expect(session.isLoading).toBe(false);
  expect(session.loadError).toBeUndefined();
  return session;
};

describe("Legend Analytics' data space editor", () => {
  test("Opens the query builder on the source's execution context, its class picked, and nothing to apply yet", async () => {
    const { editor, loadGraph } = await setUp();
    const session = await openSession(editor);
    expect(loadGraph).toHaveBeenCalledWith(PROJECT);
    const state = session.queryBuilderState;
    expect(state?.executionContext.name).toBe('dummyContext2');
    expect(state?.restrictToCurrentDataSpace).toBe(true);
    expect(state?.isResultPanelHidden).toBe(true);
    // the mapping's first class
    expect(state?.sourceClass?.path).toBe('domain::Demographics');
    expect(state?.executionContextState.mapping?.path).toBe(
      'mapping::CovidDataMapping',
    );
    expect(session.hasChanges).toBe(false);
    expect(session.edit).toBeUndefined();
    expect(session.editProblem).toBe(CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN);
  });

  test('Builds the source again as the query changes, and stops when it is disposed', async () => {
    const { editor } = await setUp();
    const session = await openSession(editor);
    const query = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['cases', 'Cases']]),
    );
    session.queryBuilderState?.initializeWithQuery(
      new RawLambda(query.parameters as object, query.body as object),
    );
    expect(session.hasChanges).toBe(true);
    expect(session.editProblem).toBeUndefined();
    expect(session.edit?.coordinates.entity).toBe('domain::COVIDData');
    expect(session.edit?.coordinates.executionContext).toBe('dummyContext2');
    session.dispose();
    const other = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['id', 'Id']]),
    );
    session.queryBuilderState?.initializeWithQuery(
      new RawLambda(other.parameters as object, other.body as object),
    );
    // as it was when it was disposed
    expect(JSON.stringify(session.edit?.coordinates.relation)).toContain(
      '"Cases"',
    );
  });

  test("Undoes and redoes the query builder's changes, as its buttons do", async () => {
    const { editor } = await setUp();
    const session = await openSession(editor);
    const state = guaranteeNonNullable(session.queryBuilderState);
    const queries = [
      [['cases', 'Cases']],
      [
        ['cases', 'Cases'],
        ['id', 'Id'],
      ],
    ].map((columns) =>
      TEST__covidQuery(
        TEST__project(TEST__COVID_DATA, columns as [string, string][]),
      ),
    );
    // the user's changes, each cached as the query builder's view does
    state.changeHistoryState.cacheNewQuery(state.buildQuery());
    queries.forEach((query) => {
      state.rebuildWithQuery(
        new RawLambda(query.parameters as object, query.body as object),
      );
      state.changeHistoryState.cacheNewQuery(state.buildQuery());
    });
    const columns = (): string =>
      JSON.stringify(session.edit?.coordinates.relation);
    expect(columns()).toContain('"Id"');
    session.undo();
    expect(columns()).not.toContain('"Id"');
    expect(columns()).toContain('"Cases"');
    session.redo();
    expect(columns()).toContain('"Id"');
  });

  test('Opens on the query a source saved, with no change until the query does', async () => {
    const { editor } = await setUp();
    const saved = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['cases', 'Cases']]),
    );
    const session = await openSession(editor, saved);
    expect(session.hasChanges).toBe(false);
    expect(session.edit?.coordinates.entity).toBe('domain::COVIDData');
  });

  test('Says why when the data space cannot be loaded', async () => {
    const { editor, loadGraph } = await setUp();
    loadGraph.mockRejectedValueOnce(new Error('Depot has no project covid'));
    const session = editor.openSession({
      project: PROJECT,
      dataSpace: TEST__COVID_DATA_SPACE,
      executionContext: 'dummyContext',
    });
    await settle();
    expect(session.isLoading).toBe(false);
    expect(session.loadError).toBe('Depot has no project covid');
  });

  test("Builds a project version's graph once, shared, and again only after it failed", async () => {
    const applicationStore = TEST__createAnalyticsApplicationStore();
    const editor = new LegendAnalyticsDataSpaceEditor(
      applicationStore,
      new DepotServerClient({ serverUrl: 'https://depot.test' }),
    );
    const graphManagerState = await TEST__buildCovidGraph(applicationStore);
    const buildGraph = jest
      .spyOn(
        editor as unknown as {
          buildGraph: LegendAnalyticsDataSpaceEditor['loadGraph'];
        },
        'buildGraph',
      )
      .mockRejectedValueOnce(new Error('Depot is down'))
      .mockResolvedValue(graphManagerState);
    await expect(editor.loadGraph(PROJECT)).rejects.toThrow('Depot is down');
    // built again, and kept
    const built = editor.loadGraph(PROJECT);
    expect(await built).toBe(graphManagerState);
    expect(editor.loadGraph(PROJECT)).toBe(built);
    expect(editor.loadGraph({ ...PROJECT, versionId: '1.1.0' })).not.toBe(
      built,
    );
    expect(buildGraph).toHaveBeenCalledTimes(3);
  });
});

describe("Depot's data spaces, through the editor", () => {
  test('Are described from the content the list read at the version listed, and from depot at another', async () => {
    const editor = new LegendAnalyticsDataSpaceEditor(
      TEST__createAnalyticsApplicationStore(),
      new DepotServerClient({ serverUrl: 'https://depot.test' }),
    );
    const content = {
      executionContexts: [
        {
          name: 'prod',
          mapping: { path: 'trading::Mapping' },
          defaultRuntime: { path: 'trading::Runtime' },
        },
      ],
      defaultExecutionContext: 'prod',
    };
    jest
      .spyOn(editor.depotServerClient, 'getEntitiesByClassifier')
      .mockResolvedValue([
        {
          groupId: 'com.example',
          artifactId: 'trading',
          versionId: '2.3.0',
          entity: { path: 'trading::Trades', classifierPath: 'x', content },
        },
      ]);
    const getVersionEntity = jest
      .spyOn(editor.depotServerClient, 'getVersionEntity')
      .mockResolvedValue({ path: 'trading::Trades', content });
    const [summary] = await editor.listDataSpaces();
    expect(summary?.project.versionId).toBe('2.3.0');
    const project = {
      groupId: 'com.example',
      artifactId: 'trading',
      versionId: '2.3.0',
    };
    expect(
      (await editor.describeDataSpace(project, 'trading::Trades'))
        .defaultExecutionContext,
    ).toBe('prod');
    expect(getVersionEntity).not.toHaveBeenCalled();
    await editor.describeDataSpace(
      { ...project, versionId: '2.2.0' },
      'trading::Trades',
    );
    expect(getVersionEntity).toHaveBeenCalledWith(
      'com.example',
      'trading',
      '2.2.0',
      'trading::Trades',
    );
  });
});

describe("Depot's data spaces", () => {
  const stored = (
    artifactId: string,
    versionId: string,
    path: string,
    content: Record<string, unknown>,
  ): StoredEntity =>
    ({
      groupId: 'com.example',
      artifactId,
      versionId,
      entity: { path, classifierPath: 'dataSpace', content },
    }) as unknown as StoredEntity;

  test('Are listed once per project and path, by title, with their description', () => {
    expect(
      readCubeDataSpaceSummaries([
        stored('trading', '2.3.0', 'trading::Trades', {
          title: 'Trades',
          description: 'Every trade',
        }),
        stored('trading', '2.3.0', 'trading::Trades', { title: 'Trades' }),
        stored('risk', '1.0.0', 'risk::Exposure', {}),
      ]),
    ).toEqual([
      {
        path: 'risk::Exposure',
        title: undefined,
        description: undefined,
        project: {
          groupId: 'com.example',
          artifactId: 'risk',
          versionId: '1.0.0',
        },
      },
      {
        path: 'trading::Trades',
        title: 'Trades',
        description: 'Every trade',
        project: {
          groupId: 'com.example',
          artifactId: 'trading',
          versionId: '2.3.0',
        },
      },
    ]);
  });

  test('Are described with their execution contexts that have a mapping and a runtime, a context from a data product left out', () => {
    const context = (name: string, withMapping = true): unknown => ({
      name,
      ...(withMapping
        ? { mapping: { type: 'MAPPING', path: `${name}::Mapping` } }
        : { mappingProvider: { path: 'products::Trades' } }),
      defaultRuntime: { type: 'RUNTIME', path: `${name}::Runtime` },
    });
    expect(
      readCubeDataSpaceDescription('trading::Trades', {
        title: 'Trades',
        executionContexts: [
          context('prod'),
          context('product', false),
          context('uat'),
        ],
        defaultExecutionContext: 'product',
      }),
    ).toEqual({
      path: 'trading::Trades',
      title: 'Trades',
      executionContexts: [
        {
          name: 'prod',
          title: undefined,
          mapping: 'prod::Mapping',
          runtime: 'prod::Runtime',
        },
        {
          name: 'uat',
          title: undefined,
          mapping: 'uat::Mapping',
          runtime: 'uat::Runtime',
        },
      ],
      // its default can't run: the first that can
      defaultExecutionContext: 'prod',
    });
    expect(() =>
      readCubeDataSpaceDescription('trading::Trades', {
        executionContexts: [context('product', false)],
      }),
    ).toThrow(
      'Data space "trading::Trades" has no execution context with a mapping and a runtime, which a cube runs with',
    );
  });
});
