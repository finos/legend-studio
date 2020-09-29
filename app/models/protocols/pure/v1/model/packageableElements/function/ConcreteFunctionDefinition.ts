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

import { serializable, list, object, raw } from 'serializr';
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Variable } from 'V1/model/valueSpecification/Variable';
import { Multiplicity } from 'V1/model/packageableElements/domain/Multiplicity';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';

export class ConcreteFunctionDefinition extends PackageableElement {
  @serializable(list(object(Variable))) parameters: Variable[] = [];
  @serializable returnType!: string;
  @serializable(object(Multiplicity)) returnMultiplicity!: Multiplicity
  @serializable(list(object(TaggedValue))) taggedValues: TaggedValue[] = [];
  @serializable(list(object(StereotypePtr))) stereotypes: StereotypePtr[] = [];
  @serializable(list(raw())) body: object[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.FUNCTION,
      super.hashCode,
      hashArray(this.parameters),
      this.returnType,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes),
      hashLambda(undefined, this.body)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
