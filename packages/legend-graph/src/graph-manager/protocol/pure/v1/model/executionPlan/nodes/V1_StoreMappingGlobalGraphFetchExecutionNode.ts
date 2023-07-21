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

import { V1_GlobalGraphFetchExecutionNode } from './V1_GlobalGraphFetchExecutionNode.js';
import type { V1_XStorePropertyFetchDetails } from '../../packageableElements/mapping/xStore/V1_XStorePropertyFetchDetails.js';
import { type PlainObject } from '@finos/legend-shared';

export class V1_StoreMappingGlobalGraphFetchExecutionNode extends V1_GlobalGraphFetchExecutionNode {
  store!: string;
  xStorePropertyMapping?: PlainObject | undefined;
  xStorePropertyFetchDetails?: V1_XStorePropertyFetchDetails | undefined;
}
