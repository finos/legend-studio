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
import { UnsupportedOperationError, addUniqueEntry, deleteEntry, changeEntry } from 'Utilities/GeneralUtil';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';
import { SetImplementation, SetImplementationVisitor } from 'MM/model/packageableElements/mapping/SetImplementation';
import { SetImplementationContainer } from 'MM/model/packageableElements/mapping/SetImplementationContainer';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Stubable, isStubArray } from 'MM/Stubable';
import { InferableMappingElementIdValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';

export enum OPERATION_TYPE {
  STORE_UNION = 'STORE_UNION',
  ROUTER_UNION = 'ROUTER_UNION',
  // INHERITANCE = 'INHERITANCE',
  // MERGE = 'MERGE',
}

export const getClassMappingOperationType = (type: string): OPERATION_TYPE => {
  switch (type) {
    case OPERATION_TYPE.STORE_UNION: return OPERATION_TYPE.STORE_UNION;
    case OPERATION_TYPE.ROUTER_UNION: return OPERATION_TYPE.ROUTER_UNION;
    default: throw new UnsupportedOperationError(`Unsupported class mapping operation type '${type}'`);
  }
};

export class OperationSetImplementation extends SetImplementation implements Hashable, Stubable {
  @observable parameters: SetImplementationContainer[] = [];
  @observable operation: OPERATION_TYPE;

  constructor(id: InferableMappingElementIdValue, parent: Mapping, pureClass: PackageableElementReference<Class>, root: boolean, operation: OPERATION_TYPE) {
    super(id, parent, pureClass, root);
    this.operation = operation;
  }

  @action setOperation(value: OPERATION_TYPE): void { this.operation = value }
  @action setParameters(value: SetImplementationContainer[]): void { this.parameters = value }
  @action addParameter(value: SetImplementationContainer): void { addUniqueEntry(this.parameters, value) }
  @action changeParameter(oldValue: SetImplementationContainer, newValue: SetImplementationContainer): void { changeEntry(this.parameters, oldValue, newValue) }
  @action deleteParameter(value: SetImplementationContainer): void { deleteEntry(this.parameters, value) }

  get leafSetImplementations(): SetImplementation[] {
    switch (this.operation) {
      case OPERATION_TYPE.STORE_UNION:
        return this.parameters.map(parameter => {
          const setImp = parameter.setImplementation.value;
          if (setImp instanceof OperationSetImplementation) {
            return setImp.leafSetImplementations;
          }
          return setImp;
        }).flat();
      default:
        return [];
    }
  }

  @computed get isStub(): boolean { return super.isStub && isStubArray(this.parameters) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(this.parameters.map(param => param.setImplementation.value.id.value))
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_OperationSetImplementation(this);
  }
}
