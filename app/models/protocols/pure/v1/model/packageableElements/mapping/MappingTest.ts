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

import { serializable, object, custom, SKIP, deserialize, list } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { ObjectInputData } from 'V1/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { Lambda } from 'V1/model/valueSpecification/raw/Lambda';
import { MappingTestAssert, MappingTestAssertType } from './MappingTestAssert';
import { ExpectedOutputMappingTestAssert } from './ExpectedOutputMappingTestAssert';
import { InputData, InputDataType } from './InputData';

export class MappingTest implements Hashable {
  @serializable name!: string;
  @serializable(object(Lambda)) query!: Lambda;
  @serializable(list(custom(
    () => SKIP,
    value => {
      switch (value._type) {
        case InputDataType.OBJECT: return deserialize(ObjectInputData, value);
        default: return SKIP;
      }
    },
  )))
  @serializable inputData: InputData[] = [];
  @serializable(custom(
    () => SKIP,
    value => {
      switch (value._type) {
        case MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT: return deserialize(ExpectedOutputMappingTestAssert, value);
        default: return SKIP;
      }
    },
  ))
  assert!: MappingTestAssert;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.MAPPING_TEST,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}
