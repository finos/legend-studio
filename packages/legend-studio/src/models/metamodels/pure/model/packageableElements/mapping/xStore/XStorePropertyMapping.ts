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

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { RawLambda } from '../../../rawValueSpecification/RawLambda';
import type { Stubable } from '../../../Stubable';
import type { PropertyMappingVisitor } from '../PropertyMapping';
import { PropertyMapping } from '../PropertyMapping';

export class XStorePropertyMapping
  extends PropertyMapping
  implements Hashable, Stubable
{
  crossExpression!: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.XSTORE_PROPERTY_MAPPING,
      super.hashCode,
      this.crossExpression,
    ]);
  }

  get isStub(): boolean {
    // TODO figure out isStub conditions
    return false;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_XStorePropertyMapping(this);
  }
}
