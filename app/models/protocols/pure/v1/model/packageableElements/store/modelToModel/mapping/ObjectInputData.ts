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

import { serializable } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { InputData, InputDataType } from 'V1/model/packageableElements/mapping/InputData';

export enum ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export class ObjectInputData extends InputData implements Hashable {
  @serializable _type!: InputDataType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable inputType = ObjectInputType.JSON; // default value for backward compatibility
  @serializable sourceClass!: string;
  @serializable data!: string;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass,
      this.inputType,
      this.data,
    ]);
  }
}
