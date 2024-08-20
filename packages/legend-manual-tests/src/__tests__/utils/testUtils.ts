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

import { Core_GraphManagerPreset } from '@finos/legend-graph';
import {
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import fs from 'fs';
import { resolve } from 'path';
import type { Entity } from '@finos/legend-storage';

export const generateModelEntitesFromModelGrammar = async (
  fileDir: string,
  fileName: string,
): Promise<Entity[]> => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager.usePresets([new Core_GraphManagerPreset()]).install();
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
