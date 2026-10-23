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
import { RawLambda } from '@finos/legend-graph';
import {
  DepotServerClient,
  type StoredEntity,
} from '@finos/legend-server-depot';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { CUBE_DATA_SPACE_QUERY_PROBLEM } from '../LegendAnalyticsCubeDataSpaceQuery.js';
import type { LegendAnalyticsCubeQueryBuilderState } from '../LegendAnalyticsCubeQueryBuilderState.js';
import {
  getCubeDataSpaceNoAnalyticsMessage,
  LegendAnalyticsDataSpaceEditor,
  readCubeDataSpaceDescription,
  readCubeDataSpaceSummaries,
} from '../LegendAnalyticsDataSpaceEditor.js';
import {
  TEST__COVID_ARTIFACTS,
  TEST__COVID_DATA,
  TEST__COVID_DATA_SPACE,
  TEST__COVID_PROJECT,
  TEST__covidQuery,
  TEST__createAnalyticsApplicationStore,
  TEST__createDataSpaceEditor,
  TEST__openSession,
  TEST__project,
  TEST__withSecondMapping,
} from './LegendAnalyticsDataSpaceTestUtils.js';

/** The paths of the classes the graph builds itself, its own: not the system's */
const ownClasses = (state: LegendAnalyticsCubeQueryBuilderState): string[] =>
  state.graphManagerState.graph.ownClasses.map((each) => each.path).sort();

/** Switches the query builder's execution context, as its setup panel does */
const switchContext = async (
  state: LegendAnalyticsCubeQueryBuilderState,
  name: string,
): Promise<void> => {
  state.setExecutionContext(
    guaranteeNonNullable(
      (state.dataSpace.executionContexts ?? []).find(
        (context) => context.name === name,
      ),
    ),
  );
  await state.propagateExecutionContextChange();
};

describe("Legend Analytics' data space editor", () => {
  test("Opens the query builder on the light graph of the source's execution context, never reading the project's entities or dependencies", async () => {
    const { editor, depot } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor);
    expect(session.loadError).toBeUndefined();
    const state = guaranteeNonNullable(session.queryBuilderState);
    expect(depot.getGenerationFilesByType).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'test.group' }),
      '0.0.0',
      'dataSpace-analytics',
      TEST__COVID_DATA_SPACE,
    );
    expect(depot.getEntities).not.toHaveBeenCalled();
    expect(depot.getIndexedDependencyEntities).not.toHaveBeenCalled();
    // the classes the context's mapping covers, and no other
    expect(ownClasses(state)).toEqual([
      'domain::COVIDData',
      'domain::Demographics',
    ]);
    expect(state.isLightGraphEnabled).toBe(true);
    expect(state.restrictToCurrentDataSpace).toBe(true);
    expect(state.isResultPanelHidden).toBe(true);
    expect(state.executionContext.name).toBe('dummyContext');
    expect(state.executionContextState.mapping?.path).toBe(
      'mapping::CovidDataMapping',
    );
    expect(state.explorerState.mappingModelCoverageAnalysisResult).toBe(
      state.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
        'mapping::CovidDataMapping',
      ),
    );
    expect(state.sourceClass).toBeDefined();
    expect(session.hasChanges).toBe(false);
    expect(session.edit).toBeUndefined();
    expect(session.editProblem).toBe(CUBE_DATA_SPACE_QUERY_PROBLEM.NO_COLUMN);
  });

  test('Builds the source again as the query changes, and stops when it is disposed', async () => {
    const { editor } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor);
    const query = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['cases', 'Cases']]),
    );
    session.queryBuilderState?.initializeWithQuery(
      new RawLambda(query.parameters as object, query.body as object),
    );
    expect(session.hasChanges).toBe(true);
    expect(session.editProblem).toBeUndefined();
    expect(session.edit?.coordinates.entity).toBe('domain::COVIDData');
    expect(session.edit?.coordinates.executionContext).toBe('dummyContext');
    expect(session.edit?.mapping).toBe('mapping::CovidDataMapping');
    expect(session.edit?.runtime).toBe('runtime::H2Runtime');
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
    const { editor } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor);
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
    const { editor } = TEST__createDataSpaceEditor();
    const saved = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['cases', 'Cases']]),
    );
    const session = await TEST__openSession(editor, {
      query: { _type: 'lambda', ...saved },
    });
    expect(session.loadError).toBeUndefined();
    expect(session.hasChanges).toBe(false);
    expect(session.edit?.coordinates.entity).toBe('domain::COVIDData');
  });

  test('Keeps the graph when the context changes to one of the same mapping', async () => {
    const { editor } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor);
    const state = guaranteeNonNullable(session.queryBuilderState);
    const query = TEST__covidQuery(
      TEST__project(TEST__COVID_DATA, [['cases', 'Cases']]),
    );
    state.initializeWithQuery(
      new RawLambda(query.parameters as object, query.body as object),
    );
    const graph = state.graphManagerState.graph;
    await switchContext(state, 'dummyContext2');
    expect(state.graphManagerState.graph === graph).toBe(true);
    // the query goes on, in the other context
    expect(session.edit?.coordinates.executionContext).toBe('dummyContext2');
    expect(session.edit?.coordinates.entity).toBe('domain::COVIDData');
  });

  test("Builds another mapping's light graph when the context changes to it, and starts the query on one of its classes", async () => {
    const { editor, depot } = TEST__createDataSpaceEditor(
      TEST__withSecondMapping(TEST__COVID_ARTIFACTS),
    );
    const session = await TEST__openSession(editor);
    expect(session.loadError).toBeUndefined();
    const state = guaranteeNonNullable(session.queryBuilderState);
    const graph = state.graphManagerState.graph;
    await switchContext(state, 'dummyContext2');
    expect(state.graphManagerState.graph === graph).toBe(false);
    expect(ownClasses(state)).toEqual(['domain::Demographics']);
    expect(state.executionContextState.mapping?.path).toBe(
      'mapping::CovidDataMapping2',
    );
    expect(state.sourceClass?.path).toBe('domain::Demographics');
    // from the analytics read once
    expect(depot.getGenerationFilesByType).toHaveBeenCalledTimes(1);
  });

  test('Refuses a data space whose release has no analytics, or none of a mapping, building no other graph', async () => {
    const message = getCubeDataSpaceNoAnalyticsMessage(
      TEST__COVID_PROJECT,
      TEST__COVID_DATA_SPACE,
    );
    const none = TEST__createDataSpaceEditor([]);
    const session = await TEST__openSession(none.editor);
    expect(session.isLoading).toBe(false);
    expect(session.loadError).toBe(message);
    expect(session.queryBuilderState).toBeUndefined();
    expect(none.depot.getEntities).not.toHaveBeenCalled();
    // the analysis, but not its mapping's classes
    const partial = TEST__createDataSpaceEditor(
      TEST__COVID_ARTIFACTS.filter(
        (artifact) =>
          !(artifact.file as { path: string }).path.endsWith(
            'MappingModel_1.json',
          ),
      ),
    );
    expect((await TEST__openSession(partial.editor)).loadError).toBe(message);
  });

  test('Says why when depot cannot be read, and reads the analytics again on the next session', async () => {
    const { editor, depot } = TEST__createDataSpaceEditor();
    depot.getGenerationFilesByType.mockRejectedValueOnce(
      new Error('Depot is down'),
    );
    expect((await TEST__openSession(editor)).loadError).toBe('Depot is down');
    expect((await TEST__openSession(editor)).loadError).toBeUndefined();
    // and once read, kept for the visit
    expect((await TEST__openSession(editor)).loadError).toBeUndefined();
    expect(depot.getGenerationFilesByType).toHaveBeenCalledTimes(2);
  });

  test('Says why when the source names a context the analytics have not', async () => {
    const { editor } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor, {
      executionContext: 'retired',
    });
    expect(session.loadError).toBe(
      'The analytics of data space "domain::COVIDDatapace" at test.group:test-artifact:0.0.0 have no execution context "retired"',
    );
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
