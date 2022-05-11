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
  UnsupportedOperationError,
  isValidJSONString,
  tryToMinifyLosslessJSONString,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InputData } from '../../../mapping/InputData';
import type { Class } from '../../../domain/Class';
import {
  type ValidationIssue,
  createValidationError,
} from '../../../../../../../helpers/ValidationHelper';
import type { PackageableElementReference } from '../../../PackageableElementReference';

export enum ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export const getObjectInputType = (type: string): ObjectInputType => {
  switch (type) {
    case ObjectInputType.JSON:
      return ObjectInputType.JSON;
    case ObjectInputType.XML:
      return ObjectInputType.XML;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported object input type '${type}'`,
      );
  }
};

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

  get validationResult(): ValidationIssue | undefined {
    // TODO: use `isStubbed_PackageableElement` when we refactor validation
    if (!this.sourceClass.value.package && !this.sourceClass.value.name) {
      return createValidationError([
        'Object input data source class is missing',
      ]);
    }
    if (this.inputType === ObjectInputType.JSON) {
      return !isValidJSONString(this.data)
        ? createValidationError([
            'JSON object input data is not a valid JSON string',
          ])
        : undefined;
    }
    return undefined;
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
