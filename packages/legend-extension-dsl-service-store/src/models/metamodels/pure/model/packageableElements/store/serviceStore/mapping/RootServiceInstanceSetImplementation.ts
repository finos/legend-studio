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

import { observable, action, makeObservable, computed } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { hashArray, addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import type {
  Class,
  InferableMappingElementIdValue,
  InferableMappingElementRoot,
  Mapping,
  PackageableElementReference,
  PurePropertyMapping,
  SetImplementationVisitor,
} from '@finos/legend-graph';
import { InstanceSetImplementation } from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import type { LocalMappingProperty } from './LocalMappingProperty';
import type { ServiceMapping } from './ServiceMapping';

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
      addLocalMappingProperty: action,
      deleteLocalMappingProperty: action,
      addServiceMapping: action,
      deleteServiceMapping: action,
      hashCode: computed,
    });
  }

  addLocalMappingProperty(value: LocalMappingProperty): void {
    addUniqueEntry(this.localMappingProperties, value);
  }

  deleteLocalMappingProperty(value: LocalMappingProperty): void {
    deleteEntry(this.localMappingProperties, value);
  }

  addServiceMapping(value: ServiceMapping): void {
    addUniqueEntry(this.servicesMapping, value);
  }

  deleteServiceMapping(value: ServiceMapping): void {
    deleteEntry(this.servicesMapping, value);
  }

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.ROOT_SERVICE_STORE_CLASS_MAPPING,
      //super.hashCode,
      hashArray(this.localMappingProperties),
      hashArray(this.servicesMapping),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_InstanceSetImplementation(this);
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return [];
  }

  findPropertyMapping(
    propertyName: string,
    targetId: string | undefined,
  ): PurePropertyMapping | undefined {
    return undefined;
  }
}
