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

import { observable, action, computed } from 'mobx';
import { uuid } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { MappingTestAssert } from './MappingTestAssert';
import { InputData } from './InputData';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { ValidationIssue, createValidationError } from 'MM/validator/ValidationResult';

export class MappingTest implements Hashable {
  uuid = uuid();
  @observable name: string;
  @observable query: Lambda;
  @observable inputData: InputData[] = [];
  @observable assert: MappingTestAssert;

  constructor(name: string, query: Lambda, inputData: InputData[], assert: MappingTestAssert) {
    this.name = name;
    this.query = query;
    this.inputData = inputData;
    this.assert = assert;
  }

  @action setName(value: string): void { this.name = value }
  @action setInputData(value: InputData[]): void { this.inputData = value }
  @action setQuery(value: Lambda): void { this.query = value }
  @action setAssert(value: MappingTestAssert): void { this.assert = value }

  @computed get validationResult(): ValidationIssue | undefined {
    if (this.query.isStub) {
      return createValidationError(['Mapping test query cannot be empty']);
    }
    // TODO: put this logic back when we properly process lambda - we can't pass the graph manager here to check this
    // else if (isGetAllLambda(this.query)) {
    //   return createValidationError(['Non-empty graph fetch tree is required']);
    // }
    return undefined;
  }

  @computed get hasInvalidInputData(): ValidationIssue[] | undefined {
    const validationResults = this.inputData.flatMap(i => {
      const inputDataValidationResult = i.validationResult;
      return inputDataValidationResult ?? [];
    });
    return validationResults.length ? validationResults : undefined;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.MAPPING_TEST,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}
