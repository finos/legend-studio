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

import { computed, makeObservable, observable } from 'mobx';
import { ServiceTest } from '../../../DSLService_Exports';
import { ServiceTestSuite } from '../../../models/metamodels/pure/packageableElements/service/ServiceTestSuite';
import { EqualTo } from '../../../models/metamodels/pure/test/assertion/EqualTo';
import { EqualToJson } from '../../../models/metamodels/pure/test/assertion/EqualToJson';
import { AssertFail } from '../../../models/metamodels/pure/test/assertion/status/AssertFail';
import type { AssertionStatus } from '../../../models/metamodels/pure/test/assertion/status/AssertionStatus';
import { AssertPass } from '../../../models/metamodels/pure/test/assertion/status/AssertPass';
import { EqualToJsonAssertFail } from '../../../models/metamodels/pure/test/assertion/status/EqualToJsonAssertFail';
import type { TestAssertion } from '../../../models/metamodels/pure/test/assertion/TestAssertion';
import type { AtomicTestId } from '../../../models/metamodels/pure/test/result/AtomicTestId';
import type { TestError } from '../../../models/metamodels/pure/test/result/TestError';
import type { TestFailed } from '../../../models/metamodels/pure/test/result/TestFailed';
import type { TestPassed } from '../../../models/metamodels/pure/test/result/TestPassed';
import type { TestResult } from '../../../models/metamodels/pure/test/result/TestResult';
import type {
  AtomicTest,
  TestSuite,
} from '../../../models/metamodels/pure/test/Test';
import { type ObserverContext, skipObserved } from './CoreObserverHelper';
import { observe_ExternalFormatData } from './Data_ObserverHelper';
import {
  observe_ServiceTest,
  observe_ServiceTestSuite,
} from './DSLService_ObserverHelper';

export const observe_AtomicTestId = skipObserved(
  (metamodel: AtomicTestId): AtomicTestId => {
    makeObservable(metamodel, {
      testSuiteId: observable,
      atomicTestId: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_AssertFail = skipObserved(
  (metamodel: AssertFail): AssertFail => {
    makeObservable(metamodel, {
      id: observable,
      message: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_AssertPass = skipObserved(
  (metamodel: AssertPass): AssertPass => {
    makeObservable(metamodel, {
      id: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_EqualToJsonAssertFail = skipObserved(
  (metamodel: EqualToJsonAssertFail): EqualToJsonAssertFail => {
    makeObservable(metamodel, {
      id: observable,
      message: observable,
      actual: observable,
      expected: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

function observe_AssertionStatus(metamodel: AssertionStatus): AssertionStatus {
  if (metamodel instanceof EqualToJsonAssertFail) {
    return observe_EqualToJsonAssertFail(metamodel);
  } else if (metamodel instanceof AssertFail) {
    return observe_AssertFail(metamodel);
  } else if (metamodel instanceof AssertPass) {
    return observe_AssertPass(metamodel);
  }
  return metamodel;
}

export const observe_EqualTo = skipObserved((metamodel: EqualTo): EqualTo => {
  makeObservable(metamodel, {
    id: observable,
    expected: observable,
    hashCode: computed,
  });

  return metamodel;
});

export const observe_EqualToJson = skipObserved(
  (metamodel: EqualToJson): EqualToJson => {
    makeObservable(metamodel, {
      id: observable,
      expected: observable,
      hashCode: computed,
    });

    observe_ExternalFormatData(metamodel.expected);

    return metamodel;
  },
);

export const observe_TestError = skipObserved(
  (metamodel: TestError): TestError => {
    makeObservable(metamodel, {
      testable: observable,
      atomicTestId: observable,
      error: observable,
      hashCode: computed,
    });

    observe_AtomicTestId(metamodel.atomicTestId);

    return metamodel;
  },
);

export const observe_TestFailed = skipObserved(
  (metamodel: TestFailed): TestFailed => {
    makeObservable(metamodel, {
      testable: observable,
      atomicTestId: observable,
      assertStatuses: observable,
      hashCode: computed,
    });

    metamodel.assertStatuses.forEach(observe_AssertionStatus);
    observe_AtomicTestId(metamodel.atomicTestId);

    return metamodel;
  },
);

export const observe_TestPassed = skipObserved(
  (metamodel: TestPassed): TestPassed => {
    makeObservable(metamodel, {
      testable: observable,
      atomicTestId: observable,
      hashCode: computed,
    });

    observe_AtomicTestId(metamodel.atomicTestId);

    return metamodel;
  },
);

export const observe_TestResult = skipObserved(
  (metamodel: TestResult): TestResult => {
    makeObservable(metamodel, {
      testable: observable,
      atomicTestId: observable,
      hashCode: computed,
    });

    observe_AtomicTestId(metamodel.atomicTestId);

    return metamodel;
  },
);

export function observe_AtomicTest(metamodel: AtomicTest): AtomicTest {
  if (metamodel instanceof ServiceTest) {
    return observe_ServiceTest(metamodel);
  }
  return metamodel;
}

export function observe_TestAssertion(metamodel: TestAssertion): TestAssertion {
  if (metamodel instanceof EqualTo) {
    return observe_EqualTo(metamodel);
  } else if (metamodel instanceof EqualToJson) {
    return observe_EqualToJson(metamodel);
  }
  return metamodel;
}

export function observe_TestSuite(
  metamodel: TestSuite,
  context: ObserverContext,
): TestSuite {
  if (metamodel instanceof ServiceTestSuite) {
    return observe_ServiceTestSuite(metamodel, context);
  }
  return metamodel;
}
