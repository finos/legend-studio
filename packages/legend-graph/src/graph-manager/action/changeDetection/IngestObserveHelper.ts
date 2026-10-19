/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { computed, makeObservable, observable, override } from 'mobx';
import type {
  IngestDefinition,
  IngestTestSuite,
} from '../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import {
  observe_INTERNAL__UnknownPackageableElement,
  type ObserverContext,
  skipObservedWithContext,
} from './CoreObserverHelper.js';
import { observe_AtomicTest } from './Testable_ObserverHelper.js';
import { observe_DataResolver } from './DSL_Data_ObserverHelper.js';

export const observe_IngestTestSuite = skipObservedWithContext(
  (metamodel: IngestTestSuite, context: ObserverContext): IngestTestSuite => {
    makeObservable(metamodel, {
      id: observable,
      tests: observable,
      testData: observable,
      hashCode: computed,
    });
    metamodel.tests.forEach((test) => observe_AtomicTest(test, context));
    metamodel.testData.forEach((testData) =>
      observe_DataResolver(testData, context),
    );
    return metamodel;
  },
);

export const observe_IngestDefinition = skipObservedWithContext(
  (metamodel: IngestDefinition, context: ObserverContext): IngestDefinition => {
    observe_INTERNAL__UnknownPackageableElement(metamodel);
    makeObservable<IngestDefinition, '_elementHashCode'>(metamodel, {
      tests: observable,
      // replaced when a materialized view is added, e.g. by Legend Cube in
      // Studio, so the editor's Lineage and View SQL follow it
      TEMPORARY_MATVIEW_FUNCTION_DATA_SETS: observable.ref,
      _elementHashCode: override,
    });
    metamodel.tests.forEach((suite) => observe_IngestTestSuite(suite, context));
    return metamodel;
  },
);
