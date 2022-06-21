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

import {
  InstanceSetImplementation,
  type RawLambda,
  type InferableMappingElementIdValue,
  type Mapping,
  type PackageableElementReference,
  type Class,
  type InferableMappingElementRoot,
  type SetImplementationVisitor,
} from '@finos/legend-graph';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { FLAT_DATA_STORE_HASH_STRUCTURE } from '../../../../../../ESFlatData_ModelUtils.js';
import type { RootFlatDataRecordTypeReference } from '../model/ESFlatData_RootFlatDataRecordTypeReference.js';
import type { AbstractFlatDataPropertyMapping } from './ESFlatData_AbstractFlatDataPropertyMapping.js';
import { FlatDataPropertyMapping } from './ESFlatData_FlatDataPropertyMapping.js';

export class FlatDataInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  sourceRootRecordType: RootFlatDataRecordTypeReference;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  filter?: RawLambda | undefined;
  declare propertyMappings: AbstractFlatDataPropertyMapping[];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
    sourceRootRecordType: RootFlatDataRecordTypeReference,
  ) {
    super(id, parent, _class, root);
    this.sourceRootRecordType = sourceRootRecordType;
  }

  override get hashCode(): string {
    return hashArray([
      FLAT_DATA_STORE_HASH_STRUCTURE.FLAT_DATA_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.sourceRootRecordType.ownerReference.valueForSerialization ?? '',
      this.sourceRootRecordType.value._OWNER.name,
      this.filter ?? '',
      hashArray(
        this.propertyMappings.filter(
          // TODO: we should also handle of other property mapping types
          // using some form of extension mechanism
          // This is a rather optimistic check as we make assumption on the type of property mapping included here
          (propertyMapping) => {
            if (propertyMapping instanceof FlatDataPropertyMapping) {
              // TODO: use `isStubbed_RawLambda` when we move this out of the metamodel
              return (
                Boolean(propertyMapping.transform.parameters) ||
                Boolean(propertyMapping.transform.body)
              );
            }
            return true;
          },
        ),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_SetImplementation(this);
  }
}
