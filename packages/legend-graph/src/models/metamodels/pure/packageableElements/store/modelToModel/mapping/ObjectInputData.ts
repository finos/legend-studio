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

import {
  type Hashable,
  hashArray,
  tryToMinifyLosslessJSONString,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InputData } from '../../../mapping/InputData';
import type { Class } from '../../../domain/Class';
import type { PackageableElementReference } from '../../../PackageableElementReference';

export enum ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export class ObjectInputData extends InputData implements Hashable {
  sourceClass: PackageableElementReference<Class>;
  inputType: ObjectInputType;
  data: string;

  constructor(
    sourceClass: PackageableElementReference<Class>,
    inputType: ObjectInputType,
    data: string,
  ) {
    super();
    this.sourceClass = sourceClass;
    this.inputType = inputType;
    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    this.data =
      inputType === ObjectInputType.JSON
        ? tryToMinifyLosslessJSONString(data)
        : data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass.hashValue,
      this.inputType,
      this.data,
    ]);
  }
}
