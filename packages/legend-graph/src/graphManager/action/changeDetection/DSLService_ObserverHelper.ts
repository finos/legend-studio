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

import { computed, makeObservable, observable, override } from 'mobx';
import type { Service } from '../../../models/metamodels/pure/packageableElements/service/Service.js';
import {
  type KeyedExecutionParameter,
  type PureExecution,
  type ServiceExecution,
  PureMultiExecution,
  PureSingleExecution,
} from '../../../models/metamodels/pure/packageableElements/service/ServiceExecution.js';
import type { ServiceTest } from '../../../models/metamodels/pure/packageableElements/service/ServiceTest.js';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
  type ObserverContext,
} from './CoreObserverHelper.js';
import {
  observe_StereotypeReference,
  observe_TaggedValue,
} from './DomainObserverHelper.js';
import { observe_RawLambda } from './RawValueSpecificationObserver.js';
import { observe_Runtime } from './DSLMapping_ObserverHelper.js';
import type { ConnectionTestData } from '../../../models/metamodels/pure/packageableElements/service/ConnectionTestData.js';
import { observe_EmbeddedData } from './DSLData_ObserverHelper.js';
import type { ParameterValue } from '../../../models/metamodels/pure/packageableElements/service/ParameterValue.js';
import {
  type DEPRECATED__ServiceTest,
  type DEPRECATED__KeyedSingleExecutionTest,
  type DEPRECATED__TestContainer,
  DEPRECATED__MultiExecutionTest,
  DEPRECATED__SingleExecutionTest,
} from '../../../models/metamodels/pure/packageableElements/service/DEPRECATED__ServiceTest.js';
import type { ServiceTestSuite } from '../../../models/metamodels/pure/packageableElements/service/ServiceTestSuite.js';
import type { TestData } from '../../../models/metamodels/pure/packageableElements/service/ServiceTestData.js';
import {
  observe_AtomicTest,
  observe_TestAssertion,
} from './Testable_ObserverHelper.js';

export const observe_ConnectionTestData = skipObservedWithContext(
  (
    metamodel: ConnectionTestData,
    context: ObserverContext,
  ): ConnectionTestData => {
    makeObservable(metamodel, {
      connectionId: observable,
      testData: observable,
      hashCode: computed,
    });

    observe_EmbeddedData(metamodel.testData, context);

    return metamodel;
  },
);

export const observe_ParameterValue = skipObserved(
  (metamodel: ParameterValue): ParameterValue => {
    makeObservable(metamodel, {
      name: observable,
      value: observable.ref,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_TestData = skipObservedWithContext(
  (metamodel: TestData, context: ObserverContext): TestData => {
    makeObservable(metamodel, {
      connectionsTestData: observable,
      hashCode: computed,
    });

    metamodel.connectionsTestData.forEach((connectionTestData) =>
      observe_ConnectionTestData(connectionTestData, context),
    );

    return metamodel;
  },
);

export const observe_ServiceTest = skipObserved(
  (metamodel: ServiceTest): ServiceTest => {
    makeObservable(metamodel, {
      id: observable,
      serializationFormat: observable,
      assertions: observable,
      parameters: observable,
      hashCode: computed,
    });

    metamodel.parameters.forEach(observe_ParameterValue);
    metamodel.assertions.forEach(observe_TestAssertion);

    return metamodel;
  },
);

export const observe_ServiceTestSuite = skipObservedWithContext(
  (metamodel: ServiceTestSuite, context: ObserverContext): ServiceTestSuite => {
    makeObservable(metamodel, {
      id: observable,
      tests: observable,
      testData: observable,
      hashCode: computed,
    });

    metamodel.tests.forEach(observe_AtomicTest);
    observe_TestData(metamodel.testData, context);

    return metamodel;
  },
);

export const observe_TestContainer = skipObserved(
  (metamodel: DEPRECATED__TestContainer): DEPRECATED__TestContainer => {
    makeObservable(metamodel, {
      parametersValues: observable,
      assert: observable,
      singleExecutionTestParent: observable,
      hashCode: computed,
    });

    observe_RawLambda(metamodel.assert);

    return metamodel;
  },
);

export const observe_SingleExecutionTest = skipObserved(
  (
    metamodel: DEPRECATED__SingleExecutionTest,
  ): DEPRECATED__SingleExecutionTest => {
    makeObservable(metamodel, {
      data: observable,
      asserts: observable,
      hashCode: computed,
    });

    metamodel.asserts.forEach(observe_TestContainer);

    return metamodel;
  },
);

export const observe_KeyedSingleExecutionTest = skipObserved(
  (
    metamodel: DEPRECATED__KeyedSingleExecutionTest,
  ): DEPRECATED__KeyedSingleExecutionTest => {
    observe_SingleExecutionTest(metamodel);

    makeObservable(metamodel, {
      key: observable,
    });

    return metamodel;
  },
);

export const observe_MultiExecutionTest = skipObserved(
  (
    metamodel: DEPRECATED__MultiExecutionTest,
  ): DEPRECATED__MultiExecutionTest => {
    makeObservable(metamodel, {
      tests: observable,
      hashCode: computed,
    });

    metamodel.tests.forEach(observe_KeyedSingleExecutionTest);

    return metamodel;
  },
);

export const observe_ServiceTest_Legacy = (
  metamodel: DEPRECATED__ServiceTest,
): DEPRECATED__ServiceTest => {
  if (metamodel instanceof DEPRECATED__SingleExecutionTest) {
    return observe_SingleExecutionTest(metamodel);
  } else if (metamodel instanceof DEPRECATED__MultiExecutionTest) {
    return observe_MultiExecutionTest(metamodel);
  }
  return metamodel;
};

const observe_Abstract_PureExecution = (metamodel: PureExecution): void => {
  makeObservable(metamodel, {
    func: observable,
  });

  observe_RawLambda(metamodel.func);
};

export const observe_PureSingleExecution = skipObservedWithContext(
  (metamodel: PureSingleExecution, context): PureSingleExecution => {
    observe_Abstract_PureExecution(metamodel);

    makeObservable(metamodel, {
      runtime: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.mapping);
    observe_Runtime(metamodel.runtime, context);

    return metamodel;
  },
);

export const observe_KeyedExecutionParameter = skipObservedWithContext(
  (metamodel: KeyedExecutionParameter, context): KeyedExecutionParameter => {
    makeObservable(metamodel, {
      key: observable,
      runtime: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.mapping);
    observe_Runtime(metamodel.runtime, context);

    return metamodel;
  },
);

export const observe_PureMultiExecution = skipObservedWithContext(
  (metamodel: PureMultiExecution, context): PureMultiExecution => {
    observe_Abstract_PureExecution(metamodel);

    makeObservable(metamodel, {
      executionKey: observable,
      executionParameters: observable,
      hashCode: computed,
    });

    metamodel.executionParameters.forEach((parameter) =>
      observe_KeyedExecutionParameter(parameter, context),
    );

    return metamodel;
  },
);

export const observe_ServiceExecution = (
  metamodel: ServiceExecution,
  context: ObserverContext,
): ServiceExecution => {
  if (metamodel instanceof PureSingleExecution) {
    return observe_PureSingleExecution(metamodel, context);
  } else if (metamodel instanceof PureMultiExecution) {
    return observe_PureMultiExecution(metamodel, context);
  }
  return metamodel;
};

export const observe_Service = skipObservedWithContext(
  (metamodel: Service, context): Service => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Service, '_elementHashCode'>(metamodel, {
      pattern: observable,
      owners: observable,
      documentation: observable,
      autoActivateUpdates: observable,
      execution: observable,
      test: observable,
      tests: observable,
      patternParameters: computed,
      _elementHashCode: override,
    });

    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);
    observe_ServiceExecution(metamodel.execution, context);
    if (metamodel.test) {
      observe_ServiceTest_Legacy(metamodel.test);
    }
    metamodel.tests.forEach((m) => observe_ServiceTestSuite(m, context));
    return metamodel;
  },
);
