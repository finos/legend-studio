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

import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import type { Connection, Runtime } from '@finos/legend-graph';

export type ServiceTestRuntimeConnectionBuilder = (
  sourceConnection: Connection,
  runtime: Runtime,
  testData: string,
) => Connection | undefined;

export interface DSL_Service_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  /**
   * Get the list of service test runtime connection builder for a provided connection and test data.
   */
  getExtraServiceTestRuntimeConnectionBuilders?(): ServiceTestRuntimeConnectionBuilder[];
}
