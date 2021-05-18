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
import {
  hashArray,
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import { Type } from './Type';
import { DataType } from './DataType';
import type { RawLambda } from '../../../model/rawValueSpecification/RawLambda';

export class Unit extends DataType implements Hashable {
  measure: Measure;
  conversionFunction?: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  constructor(
    name: string,
    measure: Measure,
    conversionFunction: RawLambda | undefined,
  ) {
    super(name);

    makeObservable(this, {
      measure: observable,
      conversionFunction: observable,
      setConversionFunction: action,
      hashCode: computed,
    });

    this.measure = measure;
    this.conversionFunction = conversionFunction;
  }

  isSuperType(type: Type): boolean {
    return false;
  }
  isSubType(type: Type): boolean {
    return this.measure === type;
  }

  setConversionFunction(lambda: RawLambda): void {
    this.conversionFunction = lambda;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.UNIT,
      this.measure.path,
      this.conversionFunction ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

export class Measure extends Type implements Hashable {
  canonicalUnit?: Unit;
  nonCanonicalUnits: Unit[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      canonicalUnit: observable,
      nonCanonicalUnits: observable,
      setCanonicalUnit: action,
      hashCode: computed({ keepAlive: true }),
    });
  }

  setCanonicalUnit(unit: Unit): void {
    this.canonicalUnit = unit;
  }

  isSubType(type: Type): boolean {
    return false;
  }
  isSuperType(type: Type): boolean {
    return type instanceof Unit && type.measure === this;
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.MEASURE,
      super.hashCode,
      this.canonicalUnit ?? '',
      hashArray(this.nonCanonicalUnits),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Measure(this);
  }
}
