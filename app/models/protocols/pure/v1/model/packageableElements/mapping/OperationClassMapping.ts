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

import { serializable, list, primitive } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { ClassMapping, ClassMappingVisitor } from './ClassMapping';

export enum MappingOperationType {
  STORE_UNION = 'STORE_UNION',
  ROUTER_UNION = 'ROUTER_UNION',
  // INHERITANCE = 'INHERITANCE',
  // MERGE = 'MERGE',
}

export class OperationClassMapping extends ClassMapping implements Hashable {
  @serializable(list(primitive())) parameters: string[] = [];
  @serializable operation!: MappingOperationType;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(this.parameters)
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: ClassMappingVisitor<T>): T {
    return visitor.visit_OperationClassMapping(this);
  }
}
