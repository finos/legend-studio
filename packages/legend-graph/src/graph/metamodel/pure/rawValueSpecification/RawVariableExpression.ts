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

import { hashArray, uuid, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../graph/Core_HashUtils.js';
import type { Type } from '../packageableElements/domain/Type.js';
import type { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import {
  type RawValueSpecificationVisitor,
  RawValueSpecification,
} from './RawValueSpecification.js';
import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference.js';
import { RelationType } from '../packageableElements/relation/RelationType.js';

export class RawVariableExpression
  extends RawValueSpecification
  implements Hashable
{
  readonly _UUID = uuid();

  name: string;
  type: PackageableElementReference<Type>;
  multiplicity: Multiplicity;

  typeArguments: GenericTypeReference[] | undefined;

  constructor(
    name: string,
    multiplicity: Multiplicity,
    type: PackageableElementReference<Type>,
    typeArguments?: GenericTypeReference[] | undefined,
  ) {
    super();
    this.name = name;
    this.multiplicity = multiplicity;
    this.type = type;
    this.typeArguments = typeArguments;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_VARIABLE,
      this.type.valueForSerialization ?? '',
      this.name,
      this.multiplicity,
      hashArray(
        this.typeArguments?.map((t) => {
          const rawType = t.value.rawType;
          return rawType instanceof RelationType ? undefined : rawType.path;
        }) ?? [],
      ),
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawVariableExpression(this);
  }
}
