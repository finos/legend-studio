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
import { CORE_HASH_STRUCTURE } from '../../../../MetaModelConst';
import type { Type } from '../packageableElements/domain/Type';
import { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { Stubable } from '../../../../helpers/Stubable';
import {
  type PackageableElementReference,
  PackageableElementExplicitReference,
} from '../packageableElements/PackageableElementReference';
import {
  type RawValueSpecificationVisitor,
  RawValueSpecification,
} from './RawValueSpecification';

export class RawVariableExpression
  extends RawValueSpecification
  implements Hashable, Stubable
{
  uuid = uuid();
  name: string;
  type: PackageableElementReference<Type>;
  multiplicity: Multiplicity;

  constructor(
    name: string,
    multiplicity: Multiplicity,
    type: PackageableElementReference<Type>,
  ) {
    super();
    this.name = name;
    this.multiplicity = multiplicity;
    this.type = type;
  }

  static createStub = (type: Type): RawVariableExpression =>
    new RawVariableExpression(
      '',
      new Multiplicity(1, 1),
      PackageableElementExplicitReference.create(type),
    );
  get isStub(): boolean {
    return !this.name;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_VARIABLE,
      this.type.hashValue,
      this.name,
      this.multiplicity,
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawVariableExpression(this);
  }
}
