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
import type { TestAssertion } from './assertion/TestAssertion.js';
import type { Testable } from './Testable.js';

export abstract class Test implements Hashable {
  id!: string;

  abstract get hashCode(): string;
}

export abstract class AtomicTest extends Test implements Hashable {
  __parent!: TestSuite | Testable;
  doc: string | undefined;
  assertions: TestAssertion[] = [];

  abstract override get hashCode(): string;
}

export abstract class TestSuite extends Test implements Hashable {
  __parent!: Testable;
  doc: string | undefined;
  tests: AtomicTest[] = [];
  skip: boolean | undefined;

  abstract override get hashCode(): string;
}
