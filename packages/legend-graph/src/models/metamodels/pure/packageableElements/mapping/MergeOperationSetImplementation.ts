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

import { observable, action, makeObservable } from 'mobx';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementReference } from '../PackageableElementReference';
import type { Mapping } from './Mapping';
import type { Class } from '../domain/Class';
import type { InferableMappingElementIdValue } from './InferableMappingElementId';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot';
import {
  type OperationType,
  OperationSetImplementation,
} from './OperationSetImplementation';
import type { Stubable } from '../../../../../helpers/Stubable';
import type { RawLambda } from '../../rawValueSpecification/RawLambda';
import type { SetImplementationVisitor } from './SetImplementation';
import { hashLambda } from '../../../../../MetaModelUtils';

export class MergeOperationSetImplementation
  extends OperationSetImplementation
  implements Hashable, Stubable
{
  validationFunction: RawLambda;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    pureClass: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    operation: OperationType,
    validationFunction: RawLambda,
  ) {
    super(id, parent, pureClass, root, operation);

    makeObservable(this, {
      validationFunction: observable,
      setValidationFunction: action,
    });

    this.validationFunction = validationFunction;
  }

  setValidationFunction(value: RawLambda): void {
    this.validationFunction = value;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(
        this.parameters.map((param) => param.setImplementation.value.id.value),
      ),
      hashLambda(
        this.validationFunction.parameters,
        this.validationFunction.body,
      ),
    ]);
  }

  override accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T {
    return visitor.visit_MergeOperationSetImplementation(this);
  }
}
