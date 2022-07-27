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

import type { V1_ClassMapping } from '../../../../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_AggregateSpecification } from './V1_AggregateSpecification.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../../graph/Core_HashUtils.js';

export class V1_AggregateSetImplementationContainer implements Hashable {
  index!: number;
  setImplementation!: V1_ClassMapping;
  aggregateSpecification!: V1_AggregateSpecification;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AGGREGATION_AWARE_SET_IMPLEMENTATION_CONTAINER,
      this.index.toString(),
      this.setImplementation,
      this.aggregateSpecification,
    ]);
  }
}
