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
import type { Service } from '../../../models/metamodels/pure/packageableElements/service/Service';
import {
  type KeyedExecutionParameter,
  type PureExecution,
  type ServiceExecution,
  PureMultiExecution,
  PureSingleExecution,
} from '../../../models/metamodels/pure/packageableElements/service/ServiceExecution';
import {
  type ServiceTest,
  type KeyedSingleExecutionTest,
  type TestContainer,
  MultiExecutionTest,
  SingleExecutionTest,
} from '../../../models/metamodels/pure/packageableElements/service/ServiceTest';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
  type ObserverContext,
} from './CoreObserverHelper';
import {
  observe_StereotypeReference,
  observe_TaggedValue,
} from './DomainObserverHelper';
import { observe_RawLambda } from './RawValueSpecificationObserver';
import { observe_Runtime } from './DSLMapping_ObserverHelper';

export const observe_TestContainer = skipObserved(
  (metamodel: TestContainer): TestContainer => {
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
  (metamodel: SingleExecutionTest): SingleExecutionTest => {
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
  (metamodel: KeyedSingleExecutionTest): KeyedSingleExecutionTest => {
    observe_SingleExecutionTest(metamodel);

    makeObservable(metamodel, {
      key: observable,
    });

    return metamodel;
  },
);

export const observe_MultiExecutionTest = skipObserved(
  (metamodel: MultiExecutionTest): MultiExecutionTest => {
    makeObservable(metamodel, {
      tests: observable,
      hashCode: computed,
    });

    metamodel.tests.forEach(observe_KeyedSingleExecutionTest);

    return metamodel;
  },
);

export const observe_ServiceTest = (metamodel: ServiceTest): ServiceTest => {
  if (metamodel instanceof SingleExecutionTest) {
    return observe_SingleExecutionTest(metamodel);
  } else if (metamodel instanceof MultiExecutionTest) {
    return observe_MultiExecutionTest(metamodel);
  }
  return metamodel;
};

const observe_Abstract_PureExecution = (metamodel: PureExecution): void => {
  makeObservable(metamodel, {
    func: observable,
    queryValidationResult: computed,
  });

  observe_RawLambda(metamodel.func);
};

export const observe_PureSingleExecution = skipObservedWithContext(
  (metamodel: PureSingleExecution, context): PureSingleExecution => {
    observe_Abstract_PureExecution(metamodel);

    makeObservable(metamodel, {
      runtime: observable,
      mappingValidationResult: computed,
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
      mappingValidationResult: computed,
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
      patternParameters: computed,
      _elementHashCode: override,
    });

    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);
    observe_ServiceExecution(metamodel.execution, context);
    observe_ServiceTest(metamodel.test);

    return metamodel;
  },
);
