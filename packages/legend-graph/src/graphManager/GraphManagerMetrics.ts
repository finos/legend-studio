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

import { GRAPH_MANAGER_EVENT } from './GraphManagerEvent.js';

export class BasicGraphOperationStatistics {
  timings: {
    total: number;
    [key: string]: number;
  } = { total: 0 };
  elementCount: {
    total: number;
    [key: string]: number;
  } = {
    total: 0,
  };
}

export class GraphOperationStatistics extends BasicGraphOperationStatistics {
  dependencies = 0;
}

export class GraphBuilderReport extends BasicGraphOperationStatistics {
  override timings: {
    /**
     * @deprecated
     */
    [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: number;
    total: number;
    [key: string]: number;
  } = { total: 0, [GRAPH_MANAGER_EVENT.GRAPH_BUILDER_COMPLETED]: 0 };
}
