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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  hashArray,
  guaranteeNonNullable,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import type { SetImplementationVisitor } from '../../../model/packageableElements/mapping/SetImplementation';
import { SetImplementation } from '../../../model/packageableElements/mapping/SetImplementation';
import type { SetImplementationContainer } from '../../../model/packageableElements/mapping/SetImplementationContainer';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { Class } from '../../../model/packageableElements/domain/Class';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';
import type { InferableMappingElementIdValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot';

export enum OperationType {
  STORE_UNION = 'STORE_UNION',
  ROUTER_UNION = 'ROUTER_UNION',
  // INHERITANCE = 'INHERITANCE',
  // MERGE = 'MERGE',
}

export const getClassMappingOperationType = (value: string): OperationType =>
  guaranteeNonNullable(
    Object.values(OperationType).find((type) => type === value),
    `Encountered unsupproted class mapping operation type '${value}'`,
  );

export class OperationSetImplementation
  extends SetImplementation
  implements Hashable, Stubable
{
  parameters: SetImplementationContainer[] = [];
  operation: OperationType;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    pureClass: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    operation: OperationType,
  ) {
    super(id, parent, pureClass, root);

    makeObservable(this, {
      parameters: observable,
      operation: observable,
      setOperation: action,
      setParameters: action,
      addParameter: action,
      changeParameter: action,
      deleteParameter: action,
      isStub: computed,
      hashCode: computed,
    });

    this.operation = operation;
  }

  setOperation(value: OperationType): void {
    this.operation = value;
  }
  setParameters(value: SetImplementationContainer[]): void {
    this.parameters = value;
  }
  addParameter(value: SetImplementationContainer): void {
    addUniqueEntry(this.parameters, value);
  }
  changeParameter(
    oldValue: SetImplementationContainer,
    newValue: SetImplementationContainer,
  ): void {
    changeEntry(this.parameters, oldValue, newValue);
  }
  deleteParameter(value: SetImplementationContainer): void {
    deleteEntry(this.parameters, value);
  }

  get leafSetImplementations(): SetImplementation[] {
    switch (this.operation) {
      case OperationType.STORE_UNION:
        return this.parameters
          .map((parameter) => {
            const setImp = parameter.setImplementation.value;
            if (setImp instanceof OperationSetImplementation) {
              return setImp.leafSetImplementations;
            }
            return setImp;
          })
          .flat();
      default:
        return [];
    }
  }

  get isStub(): boolean {
    return super.isStub && isStubArray(this.parameters);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(
        this.parameters.map((param) => param.setImplementation.value.id.value),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_OperationSetImplementation(this);
  }
}
