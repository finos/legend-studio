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

import {
  Core_GraphManagerPreset,
  type GraphManagerState,
} from '@finos/legend-graph';
import {
  ENGINE_TEST_SUPPORT__getClassifierPathMapping,
  ENGINE_TEST_SUPPORT__getSubtypeInfo,
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import fs from 'fs';
import { resolve } from 'path';
import type { Entity } from '@finos/legend-storage';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text/graph';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence/graph';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store/graph';
import { LOG_LEVEL, LogService, WebConsole } from '@finos/legend-shared';

export const setUpPluginManager = (): TEST__GraphManagerPluginManager => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  const logger = new WebConsole();
  logger.setLevel(LOG_LEVEL.ERROR);

  // NOTE: This is temporary, when we split the test here and move them to their respective
  // extensions, this will be updated accordingly
  // See https://github.com/finos/legend-studio/issues/820
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new DSL_Text_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
      new DSL_DataSpace_GraphManagerPreset(),
      new DSL_Persistence_GraphManagerPreset(),
      new STO_ServiceStore_GraphManagerPreset(),
    ])
    .usePlugins([logger]);
  pluginManager.install();
  return pluginManager;
};

export const generateModelEntitesFromModelGrammar = async (
  fileDir: string,
  fileName: string,
  inputPluginManager: TEST__GraphManagerPluginManager | undefined,
): Promise<Entity[]> => {
  const pluginManager = inputPluginManager ?? setUpPluginManager();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  const modelFilePath = resolve(fileDir, fileName);
  const grammarText = fs.readFileSync(modelFilePath, { encoding: 'utf-8' });
  const transformGrammarToJsonResult =
    await ENGINE_TEST_SUPPORT__grammarToJSON_model(grammarText);
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult),
  );
  return entities;
};

export const createGraphManagerStateFromGrammar = async (
  fileDir: string,
  fileName: string,
): Promise<GraphManagerState> => {
  const pluginManager = setUpPluginManager();
  const log = new LogService();
  log.registerPlugins(pluginManager.getLoggerPlugins());
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager, log);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
    TEMPORARY__classifierPathMapping:
      await ENGINE_TEST_SUPPORT__getClassifierPathMapping(),
    TEMPORARY__subtypeInfo: await ENGINE_TEST_SUPPORT__getSubtypeInfo(),
  });

  const modelFilePath = resolve(fileDir, fileName);
  const grammarText = fs.readFileSync(modelFilePath, { encoding: 'utf-8' });
  const transformGrammarToJsonResult =
    await ENGINE_TEST_SUPPORT__grammarToJSON_model(grammarText);

  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult),
  );
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: true,
  });
  return graphManagerState;
};
