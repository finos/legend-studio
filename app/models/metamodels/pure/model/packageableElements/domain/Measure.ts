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
import { IllegalStateError, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Type } from './Type';
import { DataType } from './DataType';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';

export class Unit extends DataType implements Hashable {
  @observable measure: Measure;
  @observable conversionFunction: Lambda;

  constructor(name: string, measure: Measure, conversionFunction: Lambda) {
    super(name);
    this.measure = measure;
    this.conversionFunction = conversionFunction;
  }

  isSuperType(type: Type): boolean { return false }
  isSubType(type: Type): boolean { return this.measure === type }

  @action setConversionFunction(lambda: Lambda): void { this.conversionFunction = lambda }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.UNIT,
      this.measure.path,
      this.conversionFunction,
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    throw new UnsupportedOperationError();
  }
}

export class Measure extends Type implements Hashable {
  @observable canonicalUnit!: Unit;
  @observable nonCanonicalUnits: Unit[] = [];

  @action setCanonicalUnit(unit: Unit): void { this.canonicalUnit = unit }

  isSubType(type: Type): boolean { return false }
  isSuperType(type: Type): boolean { return (type instanceof Unit) && type.measure === this }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.MEASURE,
      super.hashCode,
      this.canonicalUnit,
      hashArray(this.nonCanonicalUnits),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Measure(this);
  }
}
