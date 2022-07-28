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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashRawLambda,
} from '../../../../../graph/Core_HashUtils.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Mapping } from './Mapping.js';
import type { Class } from '../domain/Class.js';
import type { InferableMappingElementIdValue } from './InferableMappingElementId.js';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot.js';
import {
  type OperationType,
  OperationSetImplementation,
} from './OperationSetImplementation.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { SetImplementationVisitor } from './SetImplementation.js';

export class MergeOperationSetImplementation
  extends OperationSetImplementation
  implements Hashable
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
    this.validationFunction = validationFunction;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(
        // TODO: use `isStubbed_SetImplementationContainer` when we refactor hashing
        this.parameters.map((param) => param.setImplementation.value.id.value),
      ),
      hashRawLambda(
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
