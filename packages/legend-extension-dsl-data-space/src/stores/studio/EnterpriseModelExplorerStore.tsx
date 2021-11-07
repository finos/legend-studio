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

import type { ApplicationStore } from '@finos/legend-application';
import type { GraphManagerState } from '@finos/legend-graph';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { StudioConfig, StudioPluginManager } from '@finos/legend-studio';

export enum ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN {
  TAXONOMY_PATH = 'taxonomyPath',
  GAV = 'gav',
  DATA_SPACE_PATH = 'dataSpacePath',
}

export const ENTERPRISE_MODEL_EXPLORER_ROUTE_PATTERN = Object.freeze({
  ENTERPRISE_VIEW: `/enterprise/`,
  ENTERPRISE_VIEW_BY_TAXONOMY_NODE: `/enterprise/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH}`,
  ENTERPRISE_VIEW_BY_DATA_SPACE: `/enterprise/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH}/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.GAV}/:${ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.DATA_SPACE_PATH}`,
});

export interface EnterpriseModelExplorerPathParams {
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.TAXONOMY_PATH]?: string;
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.GAV]?: string;
  [ENTERPRISE_MODEL_EXPLORER_PARAM_TOKEN.DATA_SPACE_PATH]?: string;
}

export class EnterpriseModelExplorerStore {
  applicationStore: ApplicationStore<StudioConfig>;
  depotServerClient: DepotServerClient;
  graphManagerState: GraphManagerState;
  pluginManager: StudioPluginManager;

  constructor(
    applicationStore: ApplicationStore<StudioConfig>,
    depotServerClient: DepotServerClient,
    graphManagerState: GraphManagerState,
    pluginManager: StudioPluginManager,
  ) {
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = graphManagerState;
    this.pluginManager = pluginManager;
  }
}
