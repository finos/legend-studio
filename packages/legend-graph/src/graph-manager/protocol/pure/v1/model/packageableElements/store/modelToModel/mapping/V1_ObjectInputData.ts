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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { V1_InputData } from '../../../../../model/packageableElements/mapping/V1_InputData.js';

export enum V1_ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export class V1_ObjectInputData extends V1_InputData implements Hashable {
  /**
   * Value is set by default for backward compatibility
   * @backwardCompatibility
   */
  inputType = V1_ObjectInputType.JSON;
  sourceClass!: string;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass,
      this.inputType,
      this.data,
    ]);
  }
}
