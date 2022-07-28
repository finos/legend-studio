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

import { InstanceSetImplementation } from '../InstanceSetImplementation.js';
import type { SetImplementationVisitor } from '../SetImplementation.js';
import type { InferableMappingElementIdValue } from '../InferableMappingElementId.js';
import type { Mapping } from '../Mapping.js';
import type { PackageableElementReference } from '../../PackageableElementReference.js';
import type { Class } from '../../domain/Class.js';
import type { InferableMappingElementRoot } from '../InferableMappingElementRoot.js';
import type { AggregateSetImplementationContainer } from './AggregateSetImplementationContainer.js';
import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';

export class AggregationAwareSetImplementation extends InstanceSetImplementation {
  aggregateSetImplementations: AggregateSetImplementationContainer[] = [];
  mainSetImplementation: InstanceSetImplementation;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    mainSetImplementation: InstanceSetImplementation,
  ) {
    super(id, parent, _class, root);
    this.mainSetImplementation = mainSetImplementation;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AGGREGATION_AWARE_MAPPING,
      super.hashCode,
      this.mainSetImplementation,
      hashArray(this.aggregateSetImplementations),
      hashArray(this.propertyMappings),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_AggregationAwareSetImplementation(this);
  }
}
