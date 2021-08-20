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
import type { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference';
import type { Type } from '../packageableElements/domain/Type';
import type { RawValueSpecificationVisitor } from './RawValueSpecification';
import { RawValueSpecification } from './RawValueSpecification';
import { computed, makeObservable, observable } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../MetaModelConst';

export class RawInstanceValue
  extends RawValueSpecification
  implements Hashable
{
  type: PackageableElementReference<Type>;
  multiplicity: Multiplicity;
  values?: (string | number)[];

  constructor(
    type: PackageableElementReference<Type>,
    multiplicity: Multiplicity,
    values: (string | number)[] | undefined,
  ) {
    super();

    makeObservable(this, {
      multiplicity: observable,
      hashCode: computed,
    });

    this.type = type;
    this.multiplicity = multiplicity;
    this.values = values;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_INSTANCE_VALUE,
      this.type.hashValue,
      this.multiplicity,
      this.values
        ? hashArray(this.values.map((value) => value.toString()))
        : '',
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawInstanceValue(this);
  }
}
