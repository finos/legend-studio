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

import { observable, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { isValidJSONString } from 'Utilities/ValidatorUtil';
import { InputData } from 'MM/model/packageableElements/mapping/InputData';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { ValidationIssue, createValidationError } from 'MM/validator/ValidationResult';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

export enum OBJECT_INPUT_TYPE {
  JSON = 'JSON',
  XML = 'XML',
}

export const getObjectInputType = (type: string): OBJECT_INPUT_TYPE => {
  switch (type) {
    case OBJECT_INPUT_TYPE.JSON: return OBJECT_INPUT_TYPE.JSON;
    case OBJECT_INPUT_TYPE.XML: return OBJECT_INPUT_TYPE.XML;
    default: throw new UnsupportedOperationError(`Unsupported object input type '${type}'`);
  }
};

export class ObjectInputData extends InputData implements Hashable {
  sourceClass: PackageableElementReference<Class>;
  @observable inputType: OBJECT_INPUT_TYPE;
  @observable data: string

  constructor(sourceClass: PackageableElementReference<Class>, inputType: OBJECT_INPUT_TYPE, data: string) {
    super();
    this.sourceClass = sourceClass;
    this.inputType = inputType;
    this.data = data;
  }

  @computed get validationResult(): ValidationIssue | undefined {
    if (this.sourceClass.value.isStub) {
      return createValidationError(['Object input data source class is missing']);
    }
    if (this.inputType === OBJECT_INPUT_TYPE.JSON) {
      return !isValidJSONString(this.data) ? createValidationError(['JSON object input data is not a valid JSON string']) : undefined;
    }
    return undefined;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass.valueForSerialization,
      this.inputType,
      this.data,
    ]);
  }
}
