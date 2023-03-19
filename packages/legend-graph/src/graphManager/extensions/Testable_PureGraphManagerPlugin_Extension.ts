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

import type { AtomicTest } from '../../graph/metamodel/pure/test/Test.js';
import type { Testable } from '../../graph/metamodel/pure/test/Testable.js';
import type { PureModel } from '../../graph/PureModel.js';
import type { ObserverContext } from '../action/changeDetection/CoreObserverHelper.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';

export type AtomicTestObserver = (
  metamodel: AtomicTest,
  context: ObserverContext,
) => AtomicTest | undefined;

export type TestableIDBuilder = (
  testable: Testable,
  graph: PureModel,
) => string | undefined;

export type TestableFinder = (
  id: string,
  graph: PureModel,
) => Testable | undefined;

export interface Testable_PureGraphManagerPlugin_Extension
  extends PureGraphManagerPlugin {
  /**
   * Get the list of testable ID builders.
   */
  getExtraTestableIDBuilders?(): TestableIDBuilder[];

  /**
   * Get the list of testable finders.
   */
  getExtraTestableFinders?(): TestableFinder[];

  /**
   * Get the list of atomic test observers.
   */
  getExtraAtomicTestObservers?(): AtomicTestObserver[];
}
