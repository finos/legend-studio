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

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { uuid } from 'Utilities/GeneralUtil';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Multiplicity } from 'MM/model/packageableElements/domain/Multiplicity';
import { Stubable } from 'MM/Stubable';
import { PackageableElementReference, PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { ValueSpecificationVisitor, ValueSpecification } from 'MM/model/valueSpecification/ValueSpecification';

export class VariableExpression extends ValueSpecification implements Hashable, Stubable {
  uuid = uuid();
  @observable name: string;
  type: PackageableElementReference<Type>;
  @observable multiplicity: Multiplicity;

  constructor(name: string, multiplicity: Multiplicity, type: PackageableElementReference<Type>) {
    super();
    this.name = name;
    this.multiplicity = multiplicity;
    this.type = type;
  }

  @action setName(value: string): void { this.name = value }
  @action setType(value: Type): void { this.type.setValue(value) }
  @action setMultiplicity(value: Multiplicity): void { this.multiplicity = value }

  static createStub = (type: Type): VariableExpression => new VariableExpression('', new Multiplicity(1, 1), PackageableElementExplicitReference.create(type));
  @computed get isStub(): boolean { return !this.name }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.VARIABLE,
      this.type.valueForSerialization,
      this.name,
      this.multiplicity
    ]);
  }

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_Variable(this);
  }
}
