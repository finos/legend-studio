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

import { action, observable, computed, makeObservable } from 'mobx';
import {
  hashArray,
  IllegalStateError,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import { hashLambda } from '../../../../../MetaModelUtility';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import type { RawVariableExpression } from '../../../model/rawValueSpecification/RawVariableExpression';
import type { Type } from '../../../model/packageableElements/domain/Type';
import type { Multiplicity } from '../../../model/packageableElements/domain/Multiplicity';
import type { Stubable } from '../../../model/Stubable';
import type { StereotypeReference } from '../../../model/packageableElements/domain/StereotypeReference';
import type { TaggedValue } from '../../../model/packageableElements/domain/TaggedValue';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import { FunctionDefinition } from './Function';

export class ConcreteFunctionDefinition
  extends FunctionDefinition
  implements Hashable, Stubable
{
  returnType: PackageableElementReference<Type>;
  returnMultiplicity: Multiplicity;
  parameters: RawVariableExpression[] = []; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  body: object[] = []; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  constructor(
    name: string,
    returnType: PackageableElementReference<Type>,
    returnMultiplicity: Multiplicity,
  ) {
    super(name);

    makeObservable(this, {
      returnMultiplicity: observable,
      parameters: observable.shallow,
      body: observable.ref,
      stereotypes: observable,
      taggedValues: observable,
      deleteParameter: action,
      addParameter: action,
      setReturnType: action,
      setReturnMultiplicity: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      lambdaId: computed,
      hashCode: computed({ keepAlive: true }),
    });

    this.returnType = returnType;
    this.returnMultiplicity = returnMultiplicity;
  }

  deleteParameter(val: RawVariableExpression): void {
    deleteEntry(this.parameters, val);
  }
  addParameter(val: RawVariableExpression): void {
    addUniqueEntry(this.parameters, val);
  }
  setReturnType(val: Type): void {
    this.returnType.setValue(val);
  }
  setReturnMultiplicity(val: Multiplicity): void {
    this.returnMultiplicity = val;
  }
  deleteTaggedValue(val: TaggedValue): void {
    deleteEntry(this.taggedValues, val);
  }
  addTaggedValue(val: TaggedValue): void {
    addUniqueEntry(this.taggedValues, val);
  }
  deleteStereotype(val: StereotypeReference): void {
    deleteEntry(this.stereotypes, val);
  }
  changeStereotype(
    oldVal: StereotypeReference,
    newVal: StereotypeReference,
  ): void {
    changeEntry(this.stereotypes, oldVal, newVal);
  }
  addStereotype(val: StereotypeReference): void {
    addUniqueEntry(this.stereotypes, val);
  }

  get lambdaId(): string {
    return `${this.path}`;
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
      CORE_HASH_STRUCTURE.FUNCTION,
      super.hashCode,
      hashArray(this.parameters),
      this.returnType.valueForSerialization,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashLambda(undefined, this.body),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
