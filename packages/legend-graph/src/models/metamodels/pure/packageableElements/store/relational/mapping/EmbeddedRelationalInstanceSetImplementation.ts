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

import {
  UnsupportedOperationError,
  hashArray,
  type Hashable,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { RelationalOperationElement } from '../model/RelationalOperationElement';
import type { EmbeddedSetImplementation } from '../../../mapping/EmbeddedSetImplementation';
import type { Class } from '../../../domain/Class';
import type { Mapping, MappingElementLabel } from '../../../mapping/Mapping';
import type {
  SetImplementationVisitor,
  SetImplementation,
} from '../../../mapping/SetImplementation';
import type { PropertyMappingsImplementation } from '../../../mapping/PropertyMappingsImplementation';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../../../mapping/PropertyMapping';
import type { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from './RootRelationalInstanceSetImplementation';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { PropertyReference } from '../../../domain/PropertyReference';
import type { RelationalInstanceSetImplementation } from './RelationalInstanceSetImplementation';
import { InferableMappingElementRootExplicitValue } from '../../../mapping/InferableMappingElementRoot';
import type { MappingClass } from '../../../mapping/MappingClass';

export class EmbeddedRelationalInstanceSetImplementation
  extends PropertyMapping
  implements
    EmbeddedSetImplementation,
    RelationalInstanceSetImplementation,
    Hashable
{
  root = InferableMappingElementRootExplicitValue.create(false);
  override readonly isEmbedded = true;
  id: InferableMappingElementIdValue;
  propertyMappings: PropertyMapping[] = [];
  class: PackageableElementReference<Class>;
  rootInstanceSetImplementation: RootRelationalInstanceSetImplementation; // in Pure we call this `setMappingOwner`
  parent: Mapping;
  primaryKey: RelationalOperationElement[] = [];
  mappingClass?: MappingClass | undefined;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: RootRelationalInstanceSetImplementation,
    source: SetImplementation,
    _class: PackageableElementReference<Class>,
    id: InferableMappingElementIdValue,
    target?: SetImplementation,
  ) {
    super(owner, property, source, target);
    this.class = _class;
    this.id = id;
    this.rootInstanceSetImplementation = rootInstanceSetImplementation;
    this.parent = rootInstanceSetImplementation.parent;
  }

  setRoot(value: boolean): void {
    throw new UnsupportedOperationError();
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    throw new UnsupportedOperationError();
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

  get label(): MappingElementLabel {
    throw new UnsupportedOperationError();
  }

  override get isStub(): boolean {
    return false;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_EmbeddedRelationalPropertyMapping(this);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_REALTIONAL_PROPERTY_MAPPING,
      super.hashCode,
      this.class.hashValue,
      hashArray(this.primaryKey),
      //skip `root` since we disregard it in embedded property mappings
      hashArray(
        this.propertyMappings.filter(
          (propertyMapping) => !propertyMapping.isStub,
        ),
      ),
    ]);
  }
}
