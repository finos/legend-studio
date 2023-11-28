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
import { MappingTest } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
import { MappingTestSuite } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingTestSuite.js';
import { ServiceTest } from '../../../graph/metamodel/pure/packageableElements/service/ServiceTest.js';
import { ServiceTestSuite } from '../../../graph/metamodel/pure/packageableElements/service/ServiceTestSuite.js';
import { EqualTo } from '../../../graph/metamodel/pure/test/assertion/EqualTo.js';
import { EqualToJson } from '../../../graph/metamodel/pure/test/assertion/EqualToJson.js';
import { EqualToTDS } from '../../../graph/metamodel/pure/test/assertion/EqualToTDS.js';
import type { TestAssertion } from '../../../graph/metamodel/pure/test/assertion/TestAssertion.js';
import type {
  AtomicTest,
  TestSuite,
} from '../../../graph/metamodel/pure/test/Test.js';
import type { Testable_PureGraphManagerPlugin_Extension } from '../../extensions/Testable_PureGraphManagerPlugin_Extension.js';
import { type ObserverContext, skipObserved } from './CoreObserverHelper.js';
import { observe_ExternalFormatData } from './DSL_Data_ObserverHelper.js';
import {
  observe_MappingTest,
  observe_MappingTestSuite,
} from './DSL_Mapping_ObserverHelper.js';
import {
  observe_ServiceTest,
  observe_ServiceTestSuite,
} from './DSL_Service_ObserverHelper.js';
import { FunctionTest } from '../../../graph/metamodel/pure/packageableElements/function/test/FunctionTest.js';
import { observe_FunctionTest } from './DomainObserverHelper.js';

export const observe_EqualTo = skipObserved((metamodel: EqualTo): EqualTo => {
  makeObservable(metamodel, {
    id: observable,
    expected: observable,
    hashCode: computed,
  });

  return metamodel;
});

export const observe_EqualToTDS = skipObserved(
  (metamodel: EqualToTDS): EqualToTDS => {
    makeObservable(metamodel, {
      id: observable,
      expected: observable,
      hashCode: computed,
    });
    observe_ExternalFormatData(metamodel.expected);
    return metamodel;
  },
);

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

export function observe_AtomicTest(
  metamodel: AtomicTest,
  context: ObserverContext,
): AtomicTest {
  if (metamodel instanceof ServiceTest) {
    return observe_ServiceTest(metamodel);
  } else if (metamodel instanceof MappingTest) {
    return observe_MappingTest(metamodel, context);
  } else if (metamodel instanceof FunctionTest) {
    return observe_FunctionTest(metamodel);
  }
  const extraAtomicTestBuilder = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as Testable_PureGraphManagerPlugin_Extension
      ).getExtraAtomicTestObservers?.() ?? [],
  );

  for (const builder of extraAtomicTestBuilder) {
    const atomicTestBuilder = builder(metamodel, context);
    if (atomicTestBuilder) {
      return atomicTestBuilder;
    }
  }

  return metamodel;
}

export function observe_TestAssertion(metamodel: TestAssertion): TestAssertion {
  if (metamodel instanceof EqualTo) {
    return observe_EqualTo(metamodel);
  } else if (metamodel instanceof EqualToJson) {
    return observe_EqualToJson(metamodel);
  } else if (metamodel instanceof EqualToTDS) {
    return observe_EqualToTDS(metamodel);
  }
  return metamodel;
}

export function observe_TestSuite(
  metamodel: TestSuite,
  context: ObserverContext,
): TestSuite {
  if (metamodel instanceof ServiceTestSuite) {
    return observe_ServiceTestSuite(metamodel, context);
  } else if (metamodel instanceof MappingTestSuite) {
    return observe_MappingTestSuite(metamodel, context);
  }
  return metamodel;
}
