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

import { serializable, object, list } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { EnumValue } from './EnumValue';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';

export class Enumeration extends PackageableElement implements Hashable {
  @serializable(list(object(EnumValue))) values: EnumValue[] = [];
  @serializable(list(object(StereotypePtr))) stereotypes: StereotypePtr[] = [];
  @serializable(list(object(TaggedValue))) taggedValues: TaggedValue[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUMERATION,
      super.hashCode,
      hashArray(this.values),
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Enumeration(this);
  }
}
