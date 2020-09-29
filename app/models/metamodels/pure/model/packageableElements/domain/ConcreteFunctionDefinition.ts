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

import { action, observable, computed } from 'mobx';
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { IllegalStateError, addUniqueEntry, deleteEntry, changeEntry } from 'Utilities/GeneralUtil';
import { PackageableElement, PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { VariableExpression } from 'MM/model/valueSpecification/VariableExpression';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Multiplicity } from 'MM/model/packageableElements/domain/Multiplicity';
import { Stubable } from 'MM/Stubable';
import { StereotypeReference } from 'MM/model/packageableElements/domain/StereotypeReference';
import { TaggedValue } from 'MM/model/packageableElements/domain/TaggedValue';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

export class ConcreteFunctionDefinition extends PackageableElement implements Hashable, Stubable {
  returnType: PackageableElementReference<Type>;
  @observable returnMultiplicity: Multiplicity
  @observable parameters: VariableExpression[] = [];
  @observable body: object[] = [];
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];

  constructor(name: string, returnType: PackageableElementReference<Type>, returnMultiplicity: Multiplicity) {
    super(name);
    this.returnType = returnType;
    this.returnMultiplicity = returnMultiplicity;
  }

  @action deleteParameter(val: VariableExpression): void { deleteEntry(this.parameters, val) }
  @action addParameter(val: VariableExpression): void { addUniqueEntry(this.parameters, val) }
  @action setReturnType(val: Type): void { this.returnType.setValue(val) }
  @action setReturnMultiplicity(val: Multiplicity): void { this.returnMultiplicity = val }
  @action deleteTaggedValue(val: TaggedValue): void { deleteEntry(this.taggedValues, val) }
  @action addTaggedValue(val: TaggedValue): void { addUniqueEntry(this.taggedValues, val) }
  @action deleteStereotype(val: StereotypeReference): void { deleteEntry(this.stereotypes, val) }
  @action changeStereotype(oldVal: StereotypeReference, newVal: StereotypeReference): void { changeEntry(this.stereotypes, oldVal, newVal) }
  @action addStereotype(val: StereotypeReference): void { addUniqueEntry(this.stereotypes, val) }

  @computed get lambdaId(): string { return `${this.path}` }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.FUNCTION,
      super.hashCode,
      hashArray(this.parameters),
      this.returnType.valueForSerialization,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map(val => val.pointerHashCode)),
      hashLambda(undefined, this.body)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
