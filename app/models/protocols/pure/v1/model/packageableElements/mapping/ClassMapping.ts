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

import { serializable, object } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { MappingClass } from './MappingClass';
import { OperationClassMapping } from './OperationClassMapping';
import { PureInstanceClassMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PureInstanceClassMapping';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export enum ClassMappingType {
  OPERATION = 'operation',
  PUREINSTANCE = 'pureInstance'
}

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export interface ClassMappingVisitor<T> {
  visit_OperationClassMapping(classMapping: OperationClassMapping): T;
  visit_PureInstanceClassMapping(classMapping: PureInstanceClassMapping): T;
}

export abstract class ClassMapping implements Hashable {
  @serializable _type!: ClassMappingType;
  @serializable id?: string;
  @serializable class!: string;
  @serializable root!: boolean;
  @serializable(object(MappingClass)) mappingClass?: MappingClass;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id ?? '',
      this.class,
      this.root.toString()
    ]);
  }

  abstract accept_ClassMappingVisitor<T>(visitor: ClassMappingVisitor<T>): T
}
