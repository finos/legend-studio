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

import type { Hashable } from '@finos/legend-shared';
import type { AtomicTest } from '../Test.js';
import type { EqualTo } from './EqualTo.js';
import type { EqualToJson } from './EqualToJson.js';
import type { EqualToTDS } from './EqualToTDS.js';

export abstract class TestAssertion implements Hashable {
  id!: string;
  parentTest: AtomicTest | undefined;

  abstract get hashCode(): string;
  abstract accept_TestAssertionVisitor<T>(visitor: TestAssertionVisitor<T>): T;
}

export interface TestAssertionVisitor<T> {
  visit_TestAssertion(testAssertion: TestAssertion): T;
  visit_EqualTo(equal: EqualTo): T;
  visit_EqualToJSON(equal: EqualToJson): T;
  visit_EqualToTDS(equal: EqualToTDS): T;
}
