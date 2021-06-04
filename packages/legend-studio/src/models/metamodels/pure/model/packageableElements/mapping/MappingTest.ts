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
import { uuid, hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { MappingTestAssert } from './MappingTestAssert';
import type { InputData } from './InputData';
import type { RawLambda } from '../../../model/rawValueSpecification/RawLambda';
import type { ValidationIssue } from '../../../action/validator/ValidationResult';
import { createValidationError } from '../../../action/validator/ValidationResult';

export class MappingTest implements Hashable {
  uuid = uuid();
  name: string;
  query: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  inputData: InputData[] = [];
  assert: MappingTestAssert;

  constructor(
    name: string,
    query: RawLambda,
    inputData: InputData[],
    assert: MappingTestAssert,
  ) {
    makeObservable(this, {
      name: observable,
      query: observable,
      inputData: observable,
      assert: observable,
      setName: action,
      setInputData: action,
      setQuery: action,
      setAssert: action,
      validationResult: computed,
      hashCode: computed,
    });

    this.name = name;
    this.query = query;
    this.inputData = inputData;
    this.assert = assert;
  }

  setName(value: string): void {
    this.name = value;
  }

  setInputData(value: InputData[]): void {
    this.inputData = value;
  }

  setQuery(value: RawLambda): void {
    this.query = value;
  }

  setAssert(value: MappingTestAssert): void {
    this.assert = value;
  }

  get validationResult(): ValidationIssue[] | undefined {
    let problems: ValidationIssue[] = [];
    // query
    if (this.query.isStub) {
      problems.push(
        createValidationError(['Mapping test query cannot be empty']),
      );
    }
    // input data
    problems = problems.concat(
      this.inputData.flatMap((i) => i.validationResult ?? []),
    );
    // assertion
    if (this.assert.validationResult) {
      problems.push(this.assert.validationResult);
    }
    return problems.length ? problems : undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}
