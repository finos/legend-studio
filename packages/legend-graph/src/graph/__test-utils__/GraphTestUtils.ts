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

import type { Entity } from '@finos/legend-storage';
// NOTE: technically, this is not a good thing to do since we're depending on graph manager in the graph module
// however, this makes it more convenient to test since we can quickly setup the graph from entities test data
// so we will leave this here for now
// eslint-disable-next-line @finos/legend/enforce-module-import-hierarchy
import { TEST__getTestGraphManagerState } from '../../graph-manager/__test-utils__/GraphManagerTestUtils.js';
import type { PureModel } from '../PureModel.js';

export const TEST__getTestGraph = async (
  entities: Entity[],
): Promise<PureModel> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem({});
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    graphManagerState.graphBuildState,
    {},
  );
  return graphManagerState.graph;
};
