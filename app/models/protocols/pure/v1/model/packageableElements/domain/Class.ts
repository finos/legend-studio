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

import { serializable, object, list, primitive, alias } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Property } from 'V1/model/packageableElements/domain/Property';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';
import { Constraint } from 'V1/model/packageableElements/domain/Constraint';
import { DerivedProperty } from './DerivedProperty';

export class Class extends PackageableElement implements Hashable {
  @serializable(list(primitive())) superTypes: string[] = [];
  @serializable(list(object(Property))) properties: Property[] = [];
  @serializable(alias('qualifiedProperties', list(object(DerivedProperty)))) derivedProperties: DerivedProperty[] = []; // we used to call derived properties qualified properties
  @serializable(list(object(StereotypePtr))) stereotypes: StereotypePtr[] = [];
  @serializable(list(object(TaggedValue))) taggedValues: TaggedValue[] = [];
  @serializable(list(object(Constraint))) constraints: Constraint[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CLASS,
      super.hashCode,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(this.superTypes),
      hashArray(this.constraints),
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Class(this);
  }
}
