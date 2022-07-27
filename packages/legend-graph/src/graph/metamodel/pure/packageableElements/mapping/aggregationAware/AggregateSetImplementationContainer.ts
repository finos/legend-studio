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

import type { InstanceSetImplementation } from '../InstanceSetImplementation.js';
import type { AggregateSpecification } from './AggregateSpecification.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';

export class AggregateSetImplementationContainer implements Hashable {
  index: number;
  aggregateSpecification: AggregateSpecification;
  setImplementation: InstanceSetImplementation;

  constructor(
    index: number,
    aggregateSpecification: AggregateSpecification,
    setImplementation: InstanceSetImplementation,
  ) {
    this.index = index;
    this.aggregateSpecification = aggregateSpecification;
    this.setImplementation = setImplementation;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AGGREGATION_AWARE_SET_IMPLEMENTATION_CONTAINER,
      this.index.toString(),
      this.setImplementation,
      this.aggregateSpecification,
    ]);
  }
}
