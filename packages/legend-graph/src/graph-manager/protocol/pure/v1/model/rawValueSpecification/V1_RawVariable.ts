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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';
import {
  type V1_RawValueSpecificationVisitor,
  V1_RawValueSpecification,
} from '../../model/rawValueSpecification/V1_RawValueSpecification.js';
import type { V1_Multiplicity } from '../../model/packageableElements/domain/V1_Multiplicity.js';

export class V1_RawRawType {
  fullPath!: string;
}

export class V1_RawRelationType extends V1_RawRawType {
  columns: V1_RawRelationColumn[] = [];
}

export class V1_RawRelationColumn {
  name!: string;
  genericType!: V1_RawGenericType;
  multiplicity: V1_Multiplicity | undefined;
}

export class V1_RawGenericType {
  rawType!: V1_RawRawType;
  multiplicityArguments: V1_Multiplicity[] = [];
  typeArguments: V1_RawGenericType[] = [];
  typeVariableValues: unknown[] = [];
}

export class V1_RawVariable
  extends V1_RawValueSpecification
  implements Hashable
{
  genericType!: V1_RawGenericType;
  name!: string;
  multiplicity!: V1_Multiplicity;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_VARIABLE,
      this.genericType.rawType.fullPath,
      this.name,
      this.multiplicity,
      hashArray(this.genericType.typeArguments.map((t) => t.rawType.fullPath)),
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: V1_RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_Variable(this);
  }
}
