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

import { serializable, object, list, raw } from 'serializr';
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Multiplicity } from './Multiplicity';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';

export class DerivedProperty implements Hashable {
  @serializable name!: string;
  @serializable returnType!: string;
  @serializable(object(Multiplicity)) returnMultiplicity!: Multiplicity;
  @serializable(list(object(StereotypePtr))) stereotypes: StereotypePtr[] = [];
  @serializable(list(object(TaggedValue))) taggedValues: TaggedValue[] = [];
  @serializable(raw()) body?: object;
  @serializable(raw()) parameters?: object;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.DERIVED_PROPERTY,
      this.name,
      this.returnMultiplicity,
      this.returnType,
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
      hashLambda(this.parameters, this.body),
    ]);
  }
}
