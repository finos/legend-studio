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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InputData } from '../../../../../model/packageableElements/mapping/InputData';
import type { FlatData } from '../../../../../model/packageableElements/store/flatData/model/FlatData';
import type { ValidationIssue } from '../../../../../action/validator/ValidationResult';
import { createValidationError } from '../../../../../action/validator/ValidationResult';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import {
  PACKAGEABLE_ELEMENT_POINTER_TYPE,
  getElementPointerHashCode,
} from '../../../../../model/packageableElements/PackageableElement';

export class FlatDataInputData extends InputData implements Hashable {
  sourceFlatData: PackageableElementReference<FlatData>;
  data: string;

  constructor(
    sourceFlatData: PackageableElementReference<FlatData>,
    data: string,
  ) {
    super();

    makeObservable(this, {
      data: observable,
      setData: action,
      validationResult: computed,
      hashCode: computed,
    });

    this.sourceFlatData = sourceFlatData;
    this.data = data;
  }

  setData(value: string): void {
    this.data = value;
  }

  get validationResult(): ValidationIssue | undefined {
    if (this.sourceFlatData.value.isStub) {
      return createValidationError([
        'Flat-data input data source flat-data store is missing',
      ]);
    }
    return undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      getElementPointerHashCode(
        PACKAGEABLE_ELEMENT_POINTER_TYPE.STORE,
        this.sourceFlatData.valueForSerialization,
      ),
      this.data,
    ]);
  }
}
