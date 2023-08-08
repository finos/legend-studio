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

import type { Persistence } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  observe_AtomicTest,
  observe_EmbeddedData,
  observe_TestAssertion,
  skipObservedWithContext,
} from '@finos/legend-graph';
import { makeObservable, observable, override, computed } from 'mobx';
import type { PersistenceTest } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTest.js';
import type { PersistenceTestBatch } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestBatch.js';
import type { PersistenceTestData } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTestData.js';
import type { ConnectionTestData } from '../../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_ConnectionTestData.js';

export const observe_Persistence = skipObservedWithContext(
  (metamodel: Persistence, context: ObserverContext): Persistence => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Persistence, '_elementHashCode'>(metamodel, {
      documentation: observable,
      trigger: observable,
      service: observable,
      persister: observable,
      notifier: observable,
      tests: observable,
      _elementHashCode: override,
    });

    metamodel.tests.forEach((test) => observe_AtomicTest(test, context));

    return metamodel;
  },
);

export const observe_ConnectionTestData = skipObservedWithContext(
  (
    metamodel: ConnectionTestData,
    context: ObserverContext,
  ): ConnectionTestData => {
    makeObservable(metamodel, {
      data: observable,
      hashCode: computed,
    });

    observe_EmbeddedData(metamodel.data, context);

    return metamodel;
  },
);

export const observe_TestData = skipObservedWithContext(
  (
    metamodel: PersistenceTestData,
    context: ObserverContext,
  ): PersistenceTestData => {
    makeObservable(metamodel, {
      connection: observable,
      hashCode: computed,
    });

    observe_ConnectionTestData(metamodel.connection, context);

    return metamodel;
  },
);

export const observe_PersistenceTestBatch = skipObservedWithContext(
  (
    metamodel: PersistenceTestBatch,
    context: ObserverContext,
  ): PersistenceTestBatch => {
    makeObservable(metamodel, {
      id: observable,
      batchId: observable,
      assertions: observable,
      testData: observable,
      hashCode: computed,
    });

    observe_TestData(metamodel.testData, context);
    metamodel.assertions.forEach((assertion) =>
      observe_TestAssertion(assertion),
    );

    return metamodel;
  },
);

export const observe_PersistenceTest = skipObservedWithContext(
  (metamodel: PersistenceTest, context: ObserverContext): PersistenceTest => {
    makeObservable(metamodel, {
      id: observable,
      graphFetchPath: observable,
      testBatches: observable,
      isTestDataFromServiceOutput: observable,
      hashCode: computed,
    });

    metamodel.testBatches.forEach((testBatch) =>
      observe_PersistenceTestBatch(testBatch, context),
    );

    return metamodel;
  },
);
