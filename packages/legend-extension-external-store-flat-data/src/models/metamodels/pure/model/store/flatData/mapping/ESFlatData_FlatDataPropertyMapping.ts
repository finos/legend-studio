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
  type RawLambda,
  type PropertyMappingsImplementation,
  type PropertyReference,
  type PropertyMappingVisitor,
  EnumerationMappingReference,
  SetImplementationReference,
} from '@finos/legend-graph';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { FLAT_DATA_STORE_HASH_STRUCTURE } from '../../../../../../ESFlatData_ModelUtils.js';
import { AbstractFlatDataPropertyMapping } from './ESFlatData_AbstractFlatDataPropertyMapping.js';

export class FlatDataPropertyMapping
  extends AbstractFlatDataPropertyMapping
  implements Hashable
{
  transformer?: EnumerationMappingReference | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  transform: RawLambda;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    transform: RawLambda,
    source: SetImplementationReference,
    target: SetImplementationReference | undefined,
  ) {
    super(owner, property, source, target);
    this.transform = transform;
  }

  override get hashCode(): string {
    return hashArray([
      FLAT_DATA_STORE_HASH_STRUCTURE.FLAT_DATA_PROPERTY_MAPPING,
      super.hashCode,
      this.transformer?.valueForSerialization ?? '',
      this.transform,
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_PropertyMapping(this);
  }
}
