/**
 * Copyright 2020 Goldman Sachs
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

import { observable, computed, makeObservable } from 'mobx';
import {
  hashArray,
  UnsupportedOperationError,
  isValidJSONString,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InputData } from '../../../../../model/packageableElements/mapping/InputData';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { ValidationIssue } from '../../../../../action/validator/ValidationResult';
import { createValidationError } from '../../../../../action/validator/ValidationResult';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';

export enum OBJECT_INPUT_TYPE {
  JSON = 'JSON',
  XML = 'XML',
}

export const getObjectInputType = (type: string): OBJECT_INPUT_TYPE => {
  switch (type) {
    case OBJECT_INPUT_TYPE.JSON:
      return OBJECT_INPUT_TYPE.JSON;
    case OBJECT_INPUT_TYPE.XML:
      return OBJECT_INPUT_TYPE.XML;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported object input type '${type}'`,
      );
  }
};

export class ObjectInputData extends InputData implements Hashable {
  sourceClass: PackageableElementReference<Class>;
  inputType: OBJECT_INPUT_TYPE;
  data: string;

  constructor(
    sourceClass: PackageableElementReference<Class>,
    inputType: OBJECT_INPUT_TYPE,
    data: string,
  ) {
    super();

    makeObservable(this, {
      inputType: observable,
      data: observable,
      validationResult: computed,
      hashCode: computed,
    });

    this.sourceClass = sourceClass;
    this.inputType = inputType;
    this.data = data;
  }

  get validationResult(): ValidationIssue | undefined {
    if (this.sourceClass.value.isStub) {
      return createValidationError([
        'Object input data source class is missing',
      ]);
    }
    if (this.inputType === OBJECT_INPUT_TYPE.JSON) {
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
      this.sourceClass.valueForSerialization,
      this.inputType,
      this.data,
    ]);
  }
}
