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
import { integrationTest, unitTest } from '@finos/legend-shared/test';
import { ActionState, type PlainObject } from '@finos/legend-shared';
import { EntitiesWithOrigin, type Entity } from '@finos/legend-storage';
import {
  type V1_DataSpaceAnalysisResult,
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  DSL_DataSpace_getGraphManagerExtension,
} from '../../graph-manager/index.js';
import {
  findDataSpaceEntity,
  previewDataSpace,
  previewDataSpaceFromEntities,
} from '../DataSpacePreviewFromEntities.js';
import { TEST__getDataSpaceGraphManagerState } from '../../components/__test-utils__/DataSpaceViewerTestUtils.js';
import TEST_DATA__noExecutionContexts from '../../components/__tests__/TEST_DATA__DataSpaceViewer__NoExecutionContexts.json' with { type: 'json' };

const CLASS_PATH = 'meta::pure::metamodel::type::Class';
const classEntity = (pkg: string, name: string): Entity => ({
  path: `${pkg}::${name}`,
  classifierPath: CLASS_PATH,
  content: {
    _type: 'class',
    package: pkg,
    name,
    properties: [],
    constraints: [],
    originalMilestonedProperties: [],
    qualifiedProperties: [],
    stereotypes: [],
    superTypes: [],
    taggedValues: [],
  },
});
const dataSpaceEntity = (path: string): Entity => ({
  path,
  classifierPath: DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  content: {},
});

describe(unitTest('findDataSpaceEntity'), () => {
  const entities = [
    classEntity('model', 'A'),
    dataSpaceEntity('model::DS1'),
    dataSpaceEntity('model::DS2'),
  ];

  test('the one asked for, among several', () => {
    expect(findDataSpaceEntity(entities, 'model::DS2').path).toBe('model::DS2');
  });

  test('none asked for: the only one the model has', () => {
    expect(
      findDataSpaceEntity([classEntity('model', 'A'), dataSpaceEntity('x::DS')])
        .path,
    ).toBe('x::DS');
  });

  test('one asked for that is not there is refused, not replaced by another', () => {
    // even when the model has just one: the caller asked for a different one
    expect(() =>
      findDataSpaceEntity([dataSpaceEntity('x::DS')], 'model::Gone'),
    ).toThrow('No data product model::Gone to preview; the model has: x::DS');
    expect(() => findDataSpaceEntity(entities, 'model::Gone')).toThrow(
      'the model has: model::DS1, model::DS2',
    );
  });

  test('none asked for, and none or several there, is refused', () => {
    expect(() => findDataSpaceEntity([classEntity('model', 'A')])).toThrow(
      'No data product to preview',
    );
    expect(() => findDataSpaceEntity(entities)).toThrow(
      'the model has: model::DS1, model::DS2',
    );
  });
});

const NO_ACTIONS = {
  queryDataSpace: () => undefined,
  viewProject: () => undefined,
  viewSDLCProject: async () => undefined,
  queryClass: () => undefined,
  openServiceQuery: () => undefined,
};

describe(integrationTest('previewDataSpace'), () => {
  test("views the graph it is given, as Studio's editor preview does, reporting to the caller's action state", async () => {
    const { applicationStore, graphManagerState } =
      await TEST__getDataSpaceGraphManagerState();
    const extension = DSL_DataSpace_getGraphManagerExtension(
      graphManagerState.graphManager,
    );
    const analysis = await extension.buildDataSpaceAnalytics(
      TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
    );
    const calls: [string, string[], ActionState | undefined][] = [];
    jest
      .spyOn(extension, 'analyzeDataSpace')
      .mockImplementation(async (path, retrieve, _cache, state) => {
        calls.push([path, (await retrieve()).map((e) => e.path), state]);
        return analysis;
      });
    const buildGraph = jest.spyOn(graphManagerState.graphManager, 'buildGraph');
    const progress = ActionState.create();

    const viewer = await previewDataSpace(
      applicationStore,
      graphManagerState,
      'model::DS',
      () => Promise.resolve([classEntity('model', 'Trade')]),
      { groupId: 'g', artifactId: 'a', versionId: 'LOCAL' },
      undefined,
      NO_ACTIONS,
      progress,
    );

    expect(calls).toEqual([['model::DS', ['model::Trade'], progress]]);
    expect(buildGraph).not.toHaveBeenCalled();
    expect(viewer.versionId).toBe('LOCAL');
    expect(viewer.retrieveGraphData()).toBeDefined();
  });
});

describe(integrationTest('previewDataSpaceFromEntities'), () => {
  test('builds the graph from the entities and analyses them with their dependencies', async () => {
    const { applicationStore, graphManagerState } =
      await TEST__getDataSpaceGraphManagerState();
    const extension = DSL_DataSpace_getGraphManagerExtension(
      graphManagerState.graphManager,
    );
    const analysis = await extension.buildDataSpaceAnalytics(
      TEST_DATA__noExecutionContexts as PlainObject<V1_DataSpaceAnalysisResult>,
      graphManagerState.pluginManager.getPureProtocolProcessorPlugins(),
    );
    const analyzed: Entity[][] = [];
    jest
      .spyOn(extension, 'analyzeDataSpace')
      .mockImplementation(async (_path, retrieve) => {
        analyzed.push(await retrieve());
        return analysis;
      });
    const own = [classEntity('model', 'Trade')];
    const dependency = classEntity('ref', 'Party');

    const viewer = await previewDataSpaceFromEntities(
      applicationStore,
      graphManagerState,
      own,
      new Map([
        [
          'org.ref:ref',
          new EntitiesWithOrigin('org.ref', 'ref', '1.0.0', [dependency]),
        ],
      ]),
      'model::DS',
      { groupId: 'onboarding', artifactId: 'run', versionId: 'LOCAL' },
      undefined,
      NO_ACTIONS,
    );

    expect(
      graphManagerState.graph.getNullableClass('model::Trade'),
    ).toBeDefined();
    expect(
      graphManagerState.graph.dependencyManager.allOwnElements.map(
        (element) => element.path,
      ),
    ).toContain('ref::Party');
    expect(analyzed.map((entities) => entities.map((e) => e.path))).toEqual([
      ['model::Trade', 'ref::Party'],
    ]);
    expect(viewer.groupId).toBe('onboarding');
    expect(viewer.retrieveGraphData()).toBeDefined();
  });
});
