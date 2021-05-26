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
import type { ValidationIssue } from '../../../../../action/validator/ValidationResult';
import { createValidationError } from '../../../../../action/validator/ValidationResult';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import {
  PACKAGEABLE_ELEMENT_POINTER_TYPE,
  getElementPointerHashCode,
} from '../../../../../model/packageableElements/PackageableElement';
import type { Database } from '../model/Database';

export class RelationalInputData extends InputData implements Hashable {
  database: PackageableElementReference<Database>;
  data: string;

  constructor(
    sourceDatabase: PackageableElementReference<Database>,
    data: string,
  ) {
    super();

    makeObservable(this, {
      data: observable,
      setSourceDatabase: action,
      setData: action,
      validationResult: computed,
      hashCode: computed,
    });

    this.database = sourceDatabase;
    this.data = data;
  }

  setSourceDatabase(value: Database): void {
    this.database.setValue(value);
  }
  setData(value: string): void {
    this.data = value;
  }

  get validationResult(): ValidationIssue | undefined {
    if (this.database.value.isStub) {
      return createValidationError([
        'Relational input data source database store is missing',
      ]);
    }
    return undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      getElementPointerHashCode(
        PACKAGEABLE_ELEMENT_POINTER_TYPE.STORE,
        this.database.valueForSerialization,
      ),
      this.data,
    ]);
  }
}
