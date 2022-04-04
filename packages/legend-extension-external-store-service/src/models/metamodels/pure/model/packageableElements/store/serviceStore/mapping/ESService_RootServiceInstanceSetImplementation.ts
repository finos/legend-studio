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

import { observable, makeObservable, computed } from 'mobx';
import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  InstanceSetImplementation,
  type Class,
  type InferableMappingElementIdValue,
  type InferableMappingElementRoot,
  type Mapping,
  type PackageableElementReference,
  type PropertyMapping,
  type SetImplementationVisitor,
} from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_ModelUtils';
import type { LocalMappingProperty } from './ESService_LocalMappingProperty';
import type { ServiceMapping } from './ESService_ServiceMapping';

export class RootServiceInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  localMappingProperties: LocalMappingProperty[] = [];
  servicesMapping: ServiceMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      localMappingProperties: observable,
      servicesMapping: observable,
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.ROOT_SERVICE_STORE_CLASS_MAPPING,
      this.id.valueForSerialization ?? '',
      this.class.hashValue,
      this.root.valueForSerialization.toString(),
      hashArray(this.localMappingProperties),
      hashArray(this.servicesMapping),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_SetImplementation(this);
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
}
