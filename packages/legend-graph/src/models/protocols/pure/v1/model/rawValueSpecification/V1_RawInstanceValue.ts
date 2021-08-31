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

import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_RawValueSpecificationVisitor } from '../../model/rawValueSpecification/V1_RawValueSpecification';
import { V1_RawValueSpecification } from '../../model/rawValueSpecification/V1_RawValueSpecification';
import type { V1_Multiplicity } from '../../model/packageableElements/domain/V1_Multiplicity';

export class V1_RawInstanceValue
  extends V1_RawValueSpecification
  implements Hashable
{
  type!: string;
  multiplicity!: V1_Multiplicity;
  values?: (string | number)[] | undefined; // to be revised?

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_INSTANCE_VALUE,
      this.type,
      this.multiplicity,
      this.values
        ? hashArray(this.values.map((value) => value.toString()))
        : '',
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: V1_RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_InstanceValue(this);
  }
}
