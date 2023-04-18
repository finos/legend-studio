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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type ExecutionResult,
  JsonExecutionResult,
  TDSExecutionResult,
  ClassExecutionResult,
  INTERNAL__UnknownExecutionResult,
} from './ExecutionResult.js';

// Execution Results often wrap the result values with additional metadata.
// This method extracts the actual values from the execution result
export const extractExecutionResultValues = (
  executionResult: ExecutionResult,
): object => {
  if (executionResult instanceof JsonExecutionResult) {
    return executionResult.values;
  } else if (executionResult instanceof TDSExecutionResult) {
    // Note we need the result values in object format to run test results
    return executionResult.result.rows.map((v) => ({ values: v.values }));
  } else if (executionResult instanceof ClassExecutionResult) {
    return executionResult.objects;
  } else if (executionResult instanceof INTERNAL__UnknownExecutionResult) {
    return executionResult.content;
  }
  throw new UnsupportedOperationError(
    `Can't extract values from execution result`,
    executionResult,
  );
};
