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

import type { PropertyMapping } from '../PropertyMapping';
import { InstanceSetImplementation } from '../InstanceSetImplementation';
import type { SetImplementationVisitor } from '../SetImplementation';
import type { InferableMappingElementIdValue } from '../InferableMappingElementId';
import type { Mapping } from '../Mapping';
import type { PackageableElementReference } from '../../PackageableElementReference';
import type { Class } from '../../domain/Class';
import type { InferableMappingElementRoot } from '../InferableMappingElementRoot';
import type { AggregateSetImplementationContainer } from './AggregateSetImplementationContainer';
import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../MetaModelConst';

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

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return [];
  }
  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): PropertyMapping | undefined {
    let properties = undefined;
    properties = this.propertyMappings.filter(
      (propertyMapping) => propertyMapping.property.value.name === propertyName,
    );
    if (targetId === undefined || properties.length === 1) {
      return properties[0];
    }
    return properties.find(
      (propertyMapping) =>
        propertyMapping.targetSetImplementation &&
        propertyMapping.targetSetImplementation.id.value === targetId,
    );
  }
  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_AggregationAwareSetImplementation(this);
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
}
