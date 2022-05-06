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

import type { V1_AssertionStatus } from '../assertion/status/V1_AssertionStatus';
import type { V1_AtomicTestId } from '../V1_AtomicTestId';

export abstract class V1_TestResult {
  testable!: string;
  atomicTestId!: V1_AtomicTestId;
}

export class V1_TestError extends V1_TestResult {
  error!: string;
}

export class V1_TestPassed extends V1_TestResult {}
export class V1_TestFailed extends V1_TestResult {
  assertStatuses: V1_AssertionStatus[] = [];
}
