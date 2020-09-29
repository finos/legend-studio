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
import { Hashable, fromElementPathToMappingElementId } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PropertyOwnerImplementation } from 'MM/model/packageableElements/mapping/PropertyOwnerImplementation';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Mapping, MappingElementLabel } from 'MM/model/packageableElements/mapping/Mapping';
import { Stubable } from 'MM/Stubable';
import { OperationSetImplementation } from './OperationSetImplementation';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { InferableMappingElementIdValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';

export interface SetImplementationVisitor<T> {
  visit_OperationSetImplementation(setImplementation: OperationSetImplementation): T;
  visit_PureInstanceSetImplementation(setImplementation: PureInstanceSetImplementation): T;
}

export abstract class SetImplementation implements PropertyOwnerImplementation, Hashable, Stubable {
  isEmbedded = false;
  id: InferableMappingElementIdValue;
  class: PackageableElementReference<Class>;
  @observable root: boolean;
  @observable parent: Mapping;

  constructor(id: InferableMappingElementIdValue, parent: Mapping, _class: PackageableElementReference<Class>, root: boolean) {
    this.id = id;
    this.parent = parent;
    this.class = _class;
    this.root = root;
  }

  @action setId(value: string): void { this.id.setValue(value) }
  @action setRoot(value: boolean): void { this.root = value }

  @computed get label(): MappingElementLabel {
    return {
      value: `${(fromElementPathToMappingElementId(this.class.value.path) === this.id.value)
        ? this.root
          ? this.class.value.name
          : `${this.class.value.name} [default]`
        : `${this.class.value.name} [${this.id.value}]`}`,
      root: this.root,
      tooltip: this.class.value.path,
    };
  }

  get isStub(): boolean { return !this.id.value }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id.valueForSerialization ?? '',
      this.class.valueForSerialization,
      this.root.toString()
    ]);
  }

  abstract accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T
}

export enum BASIC_SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  INSTANCE = 'instance',
}

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export enum SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  PUREINSTANCE = 'pureInstance'
}
