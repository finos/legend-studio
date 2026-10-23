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

import { jest } from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import type { JsonObject } from '@finos/legend-cube';
import type { CubeProjectCoordinates } from '@finos/legend-cube-builder';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { Core_GraphManagerPreset } from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { DepotServerClient } from '@finos/legend-server-depot';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import type { StoredFileGeneration } from '@finos/legend-storage';
import { LegendAnalyticsPluginManager } from '../../../application/LegendAnalyticsPluginManager.js';
import { TEST__getTestLegendAnalyticsApplicationConfig } from '../../../application/__test-utils__/LegendAnalyticsApplicationTestUtils.js';
import type { LegendAnalyticsApplicationStore } from '../../LegendAnalyticsBaseStore.js';
import type { LegendAnalyticsCubeQueryBuilderState } from '../LegendAnalyticsCubeQueryBuilderState.js';
import {
  LegendAnalyticsDataSpaceEditor,
  type LegendAnalyticsDataSpaceEditorSession,
} from '../LegendAnalyticsDataSpaceEditor.js';
import TEST_DATA__CubeDataSpace_Artifacts from './TEST_DATA__CubeDataSpace_Artifacts.json' with { type: 'json' };

// A data space of COVID data (from Legend Query's tests): two classes on an
// H2 database, in two execution contexts of one mapping, and the analytics
// a release of its project generates, from which the editor builds its
// light graph

export const TEST__COVID_DATA_SPACE = 'domain::COVIDDatapace';

/** The data space's project, at the version its analytics were generated for */
export const TEST__COVID_PROJECT: CubeProjectCoordinates = {
  groupId: 'test.group',
  artifactId: 'test-artifact',
  versionId: '0.0.0',
};

/** The data space's analytics, as depot serves them */
export const TEST__COVID_ARTIFACTS =
  TEST_DATA__CubeDataSpace_Artifacts as unknown as PlainObject<StoredFileGeneration>[];

const COVID_MAPPING = 'mapping::CovidDataMapping';
const SECOND_MAPPING = 'mapping::CovidDataMapping2';

/** A file of the analytics, its content rewritten */
const rewriteFile = (
  artifact: PlainObject<StoredFileGeneration>,
  rewrite: (content: JsonObject) => JsonObject,
  path?: string,
): PlainObject<StoredFileGeneration> => {
  const file = artifact.file as { path: string; content: string };
  return {
    ...artifact,
    file: {
      path: path ?? file.path,
      content: JSON.stringify(rewrite(JSON.parse(file.content) as JsonObject)),
    },
  };
};

/** Whether a mapped entity, or a model element, is the Demographics class */
const isDemographics = (value: JsonObject): boolean =>
  value.path === 'domain::Demographics' ||
  (value.package === 'domain' && value.name === 'Demographics');

/**
 * The analytics with the second context on a mapping of its own, which
 * covers only Demographics: a context switch needs that mapping's graph
 */
export const TEST__withSecondMapping = (
  artifacts: readonly PlainObject<StoredFileGeneration>[],
): PlainObject<StoredFileGeneration>[] => {
  const pathOf = (artifact: PlainObject<StoredFileGeneration>): string =>
    (artifact.file as { path: string }).path;
  const [analysis, mappingAnalysis, mappingModel] = [
    'AnalyticsResult.json',
    'MappingAnalysis_1.json',
    'MappingModel_1.json',
  ].map((name) =>
    guaranteeNonNullable(
      artifacts.find((artifact) => pathOf(artifact).endsWith(name)),
    ),
  ) as [
    PlainObject<StoredFileGeneration>,
    PlainObject<StoredFileGeneration>,
    PlainObject<StoredFileGeneration>,
  ];
  return [
    rewriteFile(analysis, (content) => {
      const coverage = content.mappingToMappingCoverageResult as Record<
        string,
        JsonObject
      >;
      const covid = guaranteeNonNullable(coverage[COVID_MAPPING]);
      return {
        ...content,
        executionContexts: (content.executionContexts as JsonObject[]).map(
          (context) =>
            context.name === 'dummyContext2'
              ? { ...context, mapping: SECOND_MAPPING }
              : context,
        ),
        mappingToMappingCoverageResult: {
          ...coverage,
          [SECOND_MAPPING]: {
            ...covid,
            mappedEntities: (covid.mappedEntities as JsonObject[]).filter(
              isDemographics,
            ),
          },
        },
      };
    }),
    mappingAnalysis,
    mappingModel,
    rewriteFile(
      mappingAnalysis,
      (content) => {
        const result = content.analysisResult as JsonObject;
        return {
          ...content,
          mapping: SECOND_MAPPING,
          analysisResult: {
            ...result,
            mappedEntities: (result.mappedEntities as JsonObject[]).filter(
              isDemographics,
            ),
          },
        };
      },
      pathOf(mappingAnalysis).replace('_1.json', '_2.json'),
    ),
    rewriteFile(
      mappingModel,
      (content) => {
        const model = content.model as JsonObject;
        return {
          ...content,
          mapping: SECOND_MAPPING,
          model: {
            ...model,
            elements: (model.elements as JsonObject[]).filter(isDemographics),
          },
        };
      },
      pathOf(mappingModel).replace('_1.json', '_2.json'),
    ),
  ];
};

/** Legend Analytics' application store, with its base graph presets: core, query builder and data space */
export const TEST__createAnalyticsApplicationStore =
  (): LegendAnalyticsApplicationStore => {
    const pluginManager = LegendAnalyticsPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
        new DSL_DataSpace_GraphManagerPreset(),
      ])
      .install();
    return new ApplicationStore(
      TEST__getTestLegendAnalyticsApplicationConfig(),
      pluginManager,
    );
  };

/**
 * The data space editor on a stand-in depot, which serves the data space's
 * project and analytics; its full entities and dependencies are spied on,
 * to show they are never read
 */
export const TEST__createDataSpaceEditor = (
  artifacts: readonly PlainObject<StoredFileGeneration>[] = TEST__COVID_ARTIFACTS,
) => {
  const depotServerClient = new DepotServerClient({
    serverUrl: 'https://depot.test',
  });
  const depot = {
    getProject: jest.spyOn(depotServerClient, 'getProject').mockResolvedValue({
      projectId: 'PROD-1',
      groupId: TEST__COVID_PROJECT.groupId,
      artifactId: TEST__COVID_PROJECT.artifactId,
    }),
    getGenerationFilesByType: jest
      .spyOn(depotServerClient, 'getGenerationFilesByType')
      .mockResolvedValue([...artifacts]),
    getEntities: jest.spyOn(depotServerClient, 'getEntities'),
    getIndexedDependencyEntities: jest.spyOn(
      depotServerClient,
      'getIndexedDependencyEntities',
    ),
  };
  const editor = new LegendAnalyticsDataSpaceEditor(
    TEST__createAnalyticsApplicationStore(),
    depotServerClient,
  );
  return { editor, depot };
};

/** Lets the flows an action started finish */
export const TEST__settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** A session of the editor on the COVID data space, loaded */
export const TEST__openSession = async (
  editor: LegendAnalyticsDataSpaceEditor,
  options: { executionContext?: string; query?: JsonObject } = {},
): Promise<LegendAnalyticsDataSpaceEditorSession> => {
  const session = editor.openSession({
    project: TEST__COVID_PROJECT,
    dataSpace: TEST__COVID_DATA_SPACE,
    executionContext: options.executionContext ?? 'dummyContext',
    query: options.query,
  });
  await TEST__settle();
  return session;
};

/** The query builder of a Cube data space source on the COVID data space's light graph, its first context's class picked */
export const TEST__setUpCubeQueryBuilder =
  async (): Promise<LegendAnalyticsCubeQueryBuilderState> => {
    const { editor } = TEST__createDataSpaceEditor();
    const session = await TEST__openSession(editor);
    if (session.loadError !== undefined) {
      throw new Error(session.loadError);
    }
    return guaranteeNonNullable(session.queryBuilderState);
  };

export const TEST__func = (
  name: string,
  parameters: readonly unknown[],
): JsonObject => ({
  _type: 'func',
  function: name,
  parameters: parameters as JsonObject[],
});

const x: JsonObject = { _type: 'var', name: 'x' };

const property = (name: string): JsonObject => ({
  _type: 'property',
  property: name,
  parameters: [x],
});

/** `domain::COVIDData.all()` */
export const TEST__COVID_DATA: JsonObject = TEST__func('getAll', [
  { _type: 'packageableElementPtr', fullPath: 'domain::COVIDData' },
]);

/** `<rows>->filter(x|$x.<property> == '<value>')` */
export const TEST__filter = (
  rows: JsonObject,
  name: string,
  value: string,
): JsonObject =>
  TEST__func('filter', [
    rows,
    {
      _type: 'lambda',
      parameters: [x],
      body: [TEST__func('equal', [property(name), { _type: 'string', value }])],
    },
  ]);

/** `<rows>->project([x|$x.<property>, …], ['<alias>', …])`, as the query builder writes a TDS */
export const TEST__project = (
  rows: JsonObject,
  columns: readonly [string, string][],
): JsonObject =>
  TEST__func('project', [
    rows,
    {
      _type: 'collection',
      multiplicity: { lowerBound: columns.length, upperBound: columns.length },
      values: columns.map(([name]) => ({
        _type: 'lambda',
        parameters: [x],
        body: [property(name)],
      })),
    },
    {
      _type: 'collection',
      multiplicity: { lowerBound: columns.length, upperBound: columns.length },
      values: columns.map(([, alias]) => ({ _type: 'string', value: alias })),
    },
  ]);

/** A lambda of the expression, with no parameters */
export const TEST__covidQuery = (
  body: JsonObject,
): { parameters: JsonObject[]; body: JsonObject[] } => ({
  parameters: [],
  body: [body],
});
