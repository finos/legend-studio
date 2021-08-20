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
import { hashArray, UnsupportedOperationError } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { InputData } from '../../../mapping/InputData';
import type { ValidationIssue } from '../../../../../../../helpers/ValidationHelper';
import { createValidationError } from '../../../../../../../helpers/ValidationHelper';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { Database } from '../model/Database';

export enum RelationalInputType {
  SQL = 'SQL',
  CSV = 'CSV',
}

export const getRelationalInputType = (type: string): RelationalInputType => {
  switch (type) {
    case RelationalInputType.SQL:
      return RelationalInputType.SQL;
    case RelationalInputType.CSV:
      return RelationalInputType.CSV;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported relational input type '${type}'`,
      );
  }
};

export class RelationalInputData extends InputData implements Hashable {
  database: PackageableElementReference<Database>;
  data: string;
  inputType: RelationalInputType;

  constructor(
    database: PackageableElementReference<Database>,
    data: string,
    inputType: RelationalInputType,
  ) {
    super();

    makeObservable(this, {
      data: observable,
      inputType: observable,
      setData: action,
      validationResult: computed,
      hashCode: computed,
    });

    this.database = database;
    this.data = data;
    this.inputType = inputType;
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
      CORE_HASH_STRUCTURE.RELATIONAL_INPUT_DATA,
      this.database.hashValue,
      this.data,
      this.inputType,
    ]);
  }
}
