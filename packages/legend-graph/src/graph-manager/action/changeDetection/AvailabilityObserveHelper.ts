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

import { computed, makeObservable, observable } from 'mobx';
import { skipObserved } from './CoreObserverHelper.js';
import type { Availability } from '../../../graph/metamodel/pure/packageableElements/availability/Availability.js';
import type { AvailabilityTestSuite } from '../../../graph/metamodel/pure/packageableElements/availability/AvailabilityTestSuite.js';
import type { AvailabilityBarrierTest } from '../../../graph/metamodel/pure/packageableElements/availability/AvailabilityBarrierTest.js';
import { observe_RelationElement } from './DSL_Data_ObserverHelper.js';

export const observe_AvailabilityBarrierTest = skipObserved(
  (metamodel: AvailabilityBarrierTest): AvailabilityBarrierTest => {
    makeObservable(metamodel, {
      id: observable,
      doc: observable,
      watermarkSerializationFormat: observable,
      assertions: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_AvailabilityTestSuite = skipObserved(
  (metamodel: AvailabilityTestSuite): AvailabilityTestSuite => {
    makeObservable(metamodel, {
      id: observable,
      doc: observable,
      tests: observable,
      testData: observable,
      hashCode: computed,
    });
    metamodel.tests.forEach((test) =>
      observe_AvailabilityBarrierTest(test as AvailabilityBarrierTest),
    );
    if (metamodel.testData) {
      observe_RelationElement(metamodel.testData);
    }
    return metamodel;
  },
);

export const observe_Availability = skipObserved(
  (metamodel: Availability): Availability => {
    makeObservable(metamodel, {
      tests: observable,
      hashCode: computed,
    });
    metamodel.tests.forEach(observe_AvailabilityTestSuite);
    return metamodel;
  },
);
