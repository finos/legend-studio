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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray, uuid } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../MetaModelConst';
import type { Type } from '../packageableElements/domain/Type';
import { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { Stubable } from '../../helpers/Stubable';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../packageableElements/PackageableElementReference';
import type { RawValueSpecificationVisitor } from './RawValueSpecification';
import { RawValueSpecification } from './RawValueSpecification';

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

    makeObservable(this, {
      name: observable,
      multiplicity: observable,
      setName: action,
      setType: action,
      setMultiplicity: action,
      isStub: computed,
      hashCode: computed,
    });

    this.name = name;
    this.multiplicity = multiplicity;
    this.type = type;
  }

  setName(value: string): void {
    this.name = value;
  }
  setType(value: Type): void {
    this.type.setValue(value);
  }
  setMultiplicity(value: Multiplicity): void {
    this.multiplicity = value;
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
    return visitor.visit_RawVariable(this);
  }
}
