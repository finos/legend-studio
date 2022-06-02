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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import {
  type SetImplementationVisitor,
  SetImplementation,
} from './SetImplementation.js';
import type { SetImplementationContainer } from './SetImplementationContainer.js';
import type { Mapping } from './Mapping.js';
import type { Class } from '../domain/Class.js';
import type { InferableMappingElementIdValue } from './InferableMappingElementId.js';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot.js';

export enum OperationType {
  STORE_UNION = 'STORE_UNION',
  ROUTER_UNION = 'ROUTER_UNION',
  INHERITANCE = 'INHERITANCE',
  MERGE = 'MERGE',
}

export class OperationSetImplementation
  extends SetImplementation
  implements Hashable
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
    this.operation = operation;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(
        // TODO: use `isStubbed_SetImplementationContainer` when we refactor hashing
        this.parameters.map((param) => param.setImplementation.value.id.value),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_OperationSetImplementation(this);
  }
}
