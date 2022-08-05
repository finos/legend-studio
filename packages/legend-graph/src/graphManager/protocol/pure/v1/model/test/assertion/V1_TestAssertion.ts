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
import type { V1_EqualTo } from './V1_EqualTo.js';
import type { V1_EqualToJson } from './V1_EqualToJson.js';
import type { V1_EqualToTDS } from './V1_EqualToTDS.js';

export interface V1_TestAssertionVisitor<T> {
  visit_TestAssertion(testAssertion: V1_TestAssertion): T;
  visit_EqualToTDS(testAssertion: V1_EqualToTDS): T;
  visit_EqualTo(testAssertion: V1_EqualTo): T;
  visit_EqualToJSON(testAssertion: V1_EqualToJson): T;
}

export abstract class V1_TestAssertion implements Hashable {
  id!: string;

  abstract get hashCode(): string;

  abstract accept_TestAssertionVisitor<T>(
    visitor: V1_TestAssertionVisitor<T>,
  ): T;
}
