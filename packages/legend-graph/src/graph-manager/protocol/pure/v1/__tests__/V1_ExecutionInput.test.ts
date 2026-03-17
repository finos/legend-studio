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

import { test, expect, describe, beforeEach } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { V1_PureModelContextData } from '../model/context/V1_PureModelContextData.js';
import { V1_PureModelContextPointer } from '../model/context/V1_PureModelContextPointer.js';
import { V1_PureModelContextCombination } from '../model/context/V1_PureModelContextCombination.js';
import type { V1_PureGraphManager } from '../V1_PureGraphManager.js';
import { RawLambda } from '../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { LegendSDLC } from '../../../../../graph/GraphDataOrigin.js';
import {
  TEST__GraphManagerPluginManager,
  TEST__getTestGraphManagerState,
} from '../../../../__test-utils__/GraphManagerTestUtils.js';
import type { GraphManagerState } from '../../../../GraphManagerState.js';
import { Class } from '../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';

let graphManagerState: GraphManagerState;
let v1Manager: V1_PureGraphManager;

const dummyLambda = new RawLambda([], [{ _type: 'string', value: '' }]);
const floatingClass = new Class('MyFloatingClass');

beforeEach(async () => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem();
  v1Manager = graphManagerState.graphManager as V1_PureGraphManager;
});

describe(unitTest('createExecutionInput model context type'), () => {
  test('without origin produces V1_PureModelContextData', async () => {
    const graph = graphManagerState.graph;
    // graph has no origin set, so should produce V1_PureModelContextData
    const input = await v1Manager.createExecutionInput(
      graph,
      undefined,
      dummyLambda,
      undefined,
      undefined,
    );
    expect(input.model).toBeInstanceOf(V1_PureModelContextData);
  });

  test('with origin produces V1_PureModelContextPointer', async () => {
    const graph = graphManagerState.graph;
    graph.setOrigin(new LegendSDLC('com.example', 'test-artifact', '1.0.0'));
    const input = await v1Manager.createExecutionInput(
      graph,
      undefined,
      dummyLambda,
      undefined,
      undefined,
    );
    expect(input.model).toBeInstanceOf(V1_PureModelContextPointer);
  });

  test('without origin and with floating elements produces V1_PureModelContextCombination wrapping V1_PureModelContextData', async () => {
    const graph = graphManagerState.graph;
    const input = await v1Manager.createExecutionInput(
      graph,
      undefined,
      dummyLambda,
      undefined,
      undefined,
      {
        floatingExecutionElements: [floatingClass],
      },
    );
    expect(input.model).toBeInstanceOf(V1_PureModelContextCombination);
    const combination = input.model as V1_PureModelContextCombination;
    expect(combination.contexts).toHaveLength(2);
    // first context is the graph data (V1_PureModelContextData)
    expect(combination.contexts[0]).toBeInstanceOf(V1_PureModelContextData);
    // second context is the floating elements (V1_PureModelContextData)
    expect(combination.contexts[1]).toBeInstanceOf(V1_PureModelContextData);
    const floatingData = combination.contexts[1] as V1_PureModelContextData;
    expect(floatingData.elements).toHaveLength(1);
  });

  test('with origin and with floating elements produces V1_PureModelContextCombination wrapping V1_PureModelContextPointer', async () => {
    const graph = graphManagerState.graph;
    graph.setOrigin(new LegendSDLC('com.example', 'test-artifact', '1.0.0'));
    const input = await v1Manager.createExecutionInput(
      graph,
      undefined,
      dummyLambda,
      undefined,
      undefined,
      {
        floatingExecutionElements: [floatingClass],
      },
    );
    expect(input.model).toBeInstanceOf(V1_PureModelContextCombination);
    const combination = input.model as V1_PureModelContextCombination;
    expect(combination.contexts).toHaveLength(2);
    // first context is the SDLC pointer (V1_PureModelContextPointer)
    expect(combination.contexts[0]).toBeInstanceOf(V1_PureModelContextPointer);
    // second context is the floating elements (V1_PureModelContextData)
    expect(combination.contexts[1]).toBeInstanceOf(V1_PureModelContextData);
  });

  test('with empty floating elements array does not produce V1_PureModelContextCombination', async () => {
    const graph = graphManagerState.graph;
    const input = await v1Manager.createExecutionInput(
      graph,
      undefined,
      dummyLambda,
      undefined,
      undefined,
      {
        floatingExecutionElements: [],
      },
    );
    // empty array should be treated as no floating elements
    expect(input.model).toBeInstanceOf(V1_PureModelContextData);
    expect(input.model).not.toBeInstanceOf(V1_PureModelContextCombination);
  });
});
