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

import { uuid, hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { MappingTestAssert } from './MappingTestAssert';
import type { InputData } from './InputData';
import type { RawLambda } from '../../rawValueSpecification/RawLambda';
import {
  type ValidationIssue,
  createValidationError,
} from '../../../../../helpers/ValidationHelper';

export class MappingTest implements Hashable {
  readonly _UUID = uuid();

  name: string;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query: RawLambda;
  inputData: InputData[] = [];
  assert: MappingTestAssert;

  constructor(
    name: string,
    query: RawLambda,
    inputData: InputData[],
    assert: MappingTestAssert,
  ) {
    this.name = name;
    this.query = query;
    this.inputData = inputData;
    this.assert = assert;
  }

  get validationResult(): ValidationIssue[] | undefined {
    let problems: ValidationIssue[] = [];
    // query
    // TODO: use `isStubbed_RawLambda` when we refactor validation
    if (!this.query.parameters && !this.query.body) {
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
