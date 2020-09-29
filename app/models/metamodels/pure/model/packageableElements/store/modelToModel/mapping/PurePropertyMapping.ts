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
import { HASH_STRUCTURE, SOURCR_ID_LABEL } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { PropertyMapping, PropertyMappingVisitor } from 'MM/model/packageableElements/mapping/PropertyMapping';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { PropertyReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PropertyMappingsImplementation } from 'MM/model/packageableElements/mapping/PropertyMappingsImplementation';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Stubable } from 'MM/Stubable';

export class PurePropertyMapping extends PropertyMapping implements Hashable, Stubable {
  @observable transformer?: EnumerationMapping;
  @observable transform: Lambda;
  @observable explodeProperty?: boolean;

  constructor(owner: PropertyMappingsImplementation, property: PropertyReference, transform: Lambda, source: SetImplementation, target?: SetImplementation, explodeProperty?: boolean) {
    super(owner, property, source, target);
    this.transform = transform;
    this.explodeProperty = explodeProperty;
  }

  @action setTransformer(value: EnumerationMapping | undefined): void { this.transformer = value }

  @computed get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.parent.path}-${SOURCR_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING}-${this.owner.id.value}-${this.property.value.name}-${this.targetSetImplementation ? `-${this.targetSetImplementation.id.value}` : ''}-${this.owner.propertyMappings.indexOf(this)}`;
  }

  @computed get isStub(): boolean { return this.transform.isStub }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PURE_PROPERTY_MAPPING,
      super.hashCode,
      this.transformer?.id.value ?? '',
      this.transform,
      this.explodeProperty?.toString() ?? ''
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_PurePropertyMapping(this);
  }
}
