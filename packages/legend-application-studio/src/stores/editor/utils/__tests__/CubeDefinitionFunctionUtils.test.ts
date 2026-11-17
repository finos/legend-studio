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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { ActionState, type PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { DependencyManager } from '@finos/legend-graph';
import { EntitiesWithOrigin, type Entity } from '@finos/legend-storage';
import { runInAction } from 'mobx';
import TEST_DATA from '../../../../components/editor/__test-utils__/TEST_DATA__CubeDefinitionFunctions.json' with { type: 'json' };
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../../EditorStore.js';
import { GraphEditFormModeState } from '../../GraphEditFormModeState.js';
import { GraphEditGrammarModeState } from '../../GraphEditGrammarModeState.js';
import { createGraphFunctionLoader } from '../CubeDefinitionFunctionUtils.js';

const OWN_FUNCTION = 'shop::orders::activeOrders';
const OWN_FUNCTION_PATH = 'shop::orders::activeOrders__Relation_1_';
const DEPENDENCY_FUNCTION = 'shop::common::onlyOpen';
const DEPENDENCY_FUNCTION_PATH =
  'shop::common::onlyOpen_Relation_1__Relation_1_';
const { dependency } = TEST_DATA;
const DEPENDENCY_GAV = `${dependency.groupId}:${dependency.artifactId}:${dependency.versionId}`;

/** The project's functions, without its data product and ingest definition */
const PROJECT_ENTITIES = (TEST_DATA.entities as Entity[]).filter(
  (entity) => entity.path === OWN_FUNCTION_PATH,
);

/** A project of one function, which depends on a project of another */
const setUp = async (): Promise<EditorStore> => {
  const editorStore = TEST__getTestEditorStore();
  const { graphManagerState } = editorStore;
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem();
  const dependencyManager = new DependencyManager([]);
  graphManagerState.graph.dependencyManager = dependencyManager;
  await graphManagerState.graphManager.buildDependencies(
    graphManagerState.coreModel,
    graphManagerState.systemModel,
    dependencyManager,
    new Map([
      [
        `${dependency.groupId}:${dependency.artifactId}`,
        new EntitiesWithOrigin(
          dependency.groupId,
          dependency.artifactId,
          dependency.versionId,
          dependency.entities as Entity[],
        ),
      ],
    ]),
    graphManagerState.dependenciesBuildState,
  );
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    PROJECT_ENTITIES,
    graphManagerState.graphBuildState,
  );
  expect(graphManagerState.graphBuildState.hasSucceeded).toBe(true);
  return editorStore;
};

/** A new graph of the project's entities, light as text mode builds it, or full */
const buildNewGraph = async (
  editorStore: EditorStore,
  light: boolean,
): Promise<void> => {
  const { graphManagerState } = editorStore;
  const graph = graphManagerState.createNewGraph();
  graph.dependencyManager = graphManagerState.graph.dependencyManager;
  const buildState = ActionState.create();
  await (light
    ? graphManagerState.graphManager.buildLightGraph(
        graph,
        PROJECT_ENTITIES,
        buildState,
      )
    : graphManagerState.graphManager.buildGraph(
        graph,
        PROJECT_ENTITIES,
        buildState,
      ));
  runInAction(() => {
    graphManagerState.graph = graph;
  });
};

/** Whether the promise settled, once what is pending has run */
const hasSettled = async (promise: Promise<unknown>): Promise<boolean> => {
  let settled = false;
  promise.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return settled;
};

/** The body of a function element's content */
const getBody = (content: PlainObject): unknown[] => content.body as unknown[];

afterEach(() => {
  jest.restoreAllMocks();
});

describe('The functions a definition calls, from the graph', () => {
  test(
    unitTest(
      "gives the project's own function with no project, and a dependency's with its project",
    ),
    async () => {
      const editorStore = await setUp();
      const elements = await createGraphFunctionLoader(editorStore)([
        OWN_FUNCTION,
        DEPENDENCY_FUNCTION,
      ]);
      expect(elements.map((element) => [element.path, element.origin])).toEqual(
        [
          [OWN_FUNCTION_PATH, undefined],
          [DEPENDENCY_FUNCTION_PATH, DEPENDENCY_GAV],
        ],
      );
      // each as the graph holds it, its body included
      const [own, fromDependency] = elements;
      expect(own?.content).toMatchObject({
        _type: 'function',
        package: 'shop::orders',
        name: 'activeOrders__Relation_1_',
      });
      expect(getBody(own?.content ?? {})).toHaveLength(1);
      expect(fromDependency?.content).toMatchObject({
        package: 'shop::common',
        parameters: [{ name: 'orders' }],
      });
      expect(getBody(fromDependency?.content ?? {})).toHaveLength(1);
    },
  );

  test(
    unitTest('gives only the functions of the names asked for'),
    async () => {
      const editorStore = await setUp();
      const load = createGraphFunctionLoader(editorStore);
      expect(
        (await load([DEPENDENCY_FUNCTION])).map((element) => element.path),
      ).toEqual([DEPENDENCY_FUNCTION_PATH]);
      // a name that only starts another's is no function's
      expect(await load(['shop::orders::active'])).toEqual([]);
      expect(await load(['shop::orders::missing'])).toEqual([]);
    },
  );

  test(
    unitTest(
      "doesn't read text mode's light graph, whose functions have no body, but the full graph built as Studio leaves it",
    ),
    async () => {
      const editorStore = await setUp();
      // text mode, its graph built light after a compile
      runInAction(() => {
        editorStore.graphEditorMode = new GraphEditGrammarModeState(
          editorStore,
        );
      });
      await buildNewGraph(editorStore, true);
      const elementToEntity = jest.spyOn(
        editorStore.graphManagerState.graphManager,
        'elementToEntity',
      );
      const loading = createGraphFunctionLoader(editorStore)([OWN_FUNCTION]);
      expect(await hasSettled(loading)).toBe(false);

      // leaving text mode: form mode, while the full graph is being built
      runInAction(() => {
        editorStore.graphEditorMode = new GraphEditFormModeState(editorStore);
        editorStore.graphState.isApplicationLeavingGraphEditMode = true;
        editorStore.graphState.isUpdatingGraph = true;
      });
      expect(await hasSettled(loading)).toBe(false);
      expect(elementToEntity).not.toHaveBeenCalled();

      // built
      await buildNewGraph(editorStore, false);
      runInAction(() => {
        editorStore.graphState.isUpdatingGraph = false;
        editorStore.graphState.isApplicationLeavingGraphEditMode = false;
      });
      const elements = await loading;
      expect(elements.map((element) => element.path)).toEqual([
        OWN_FUNCTION_PATH,
      ]);
      expect(getBody(elements[0]?.content ?? {})).toHaveLength(1);
      expect(elementToEntity).toHaveBeenCalledTimes(1);
    },
  );
});
