/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { SetImplementationVisitor } from 'MM/model/packageableElements/mapping/SetImplementation';
import { Stubable, isStubArray } from 'MM/Stubable';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { PackageableElementReference, OptionalPackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { InferableMappingElementIdValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';

export class PureInstanceSetImplementation extends InstanceSetImplementation implements Hashable, Stubable {
  srcClass: OptionalPackageableElementReference<Class>;
  @observable filter?: Lambda;
  @observable propertyMappings: PurePropertyMapping[] = [];

  constructor(id: InferableMappingElementIdValue, parent: Mapping, _class: PackageableElementReference<Class>, root: boolean, srcClass: OptionalPackageableElementReference<Class>) {
    super(id, parent, _class, root);
    this.srcClass = srcClass;
  }

  @action setPropertyMappings(value: PurePropertyMapping[]): void { this.propertyMappings = value }
  @action setSrcClass(value: Class | undefined): void { this.srcClass.setValue(value) }

  findPropertyMapping(propertyName: string, targetId: string | undefined): PurePropertyMapping | undefined {
    let properties = undefined;
    properties = this.propertyMappings.filter(propertyMapping => propertyMapping.property.value.name === propertyName);
    if (targetId === undefined || properties.length === 1) {
      return properties[0];
    }
    return properties.find(propertyMapping => propertyMapping.targetSetImplementation && propertyMapping.targetSetImplementation.id.value === targetId);
  }

  @computed get isStub(): boolean { return super.isStub && isStubArray(this.propertyMappings) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PURE_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.srcClass.valueForSerialization ?? '',
      this.filter ?? '',
      hashArray(this.propertyMappings.filter(propertyMapping => !propertyMapping.isStub)),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_PureInstanceSetImplementation(this);
  }

  getEmbeddedSetImplmentations(): InstanceSetImplementation[] {
    return [];
  }
}
