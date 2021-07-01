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

import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import type { Service } from '../../../../../../metamodels/pure/model/packageableElements/service/Service';
import type {
  KeyedSingleExecutionTest,
  ServiceTest,
  TestContainer,
} from '../../../../../../metamodels/pure/model/packageableElements/service/ServiceTest';
import {
  MultiExecutionTest,
  SingleExecutionTest,
} from '../../../../../../metamodels/pure/model/packageableElements/service/ServiceTest';
import type {
  KeyedExecutionParameter,
  ServiceExecution,
} from '../../../../../../metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  PureSingleExecution,
  PureMultiExecution,
} from '../../../../../../metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import { V1_Service } from '../../../model/packageableElements/service/V1_Service';
import type { V1_ServiceExecution } from '../../../model/packageableElements/service/V1_ServiceExecution';
import {
  V1_PureSingleExecution,
  V1_PureMultiExecution,
  V1_KeyedExecutionParameter,
} from '../../../model/packageableElements/service/V1_ServiceExecution';
import type { V1_ServiceTest } from '../../../model/packageableElements/service/V1_ServiceTest';
import {
  V1_MultiExecutionTest,
  V1_TestContainer,
  V1_SingleExecutionTest,
  V1_KeyedSingleExecutionTest,
} from '../../../model/packageableElements/service/V1_ServiceTest';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import { V1_transformRuntime } from './V1_RuntimeTransformer';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';

const transformSingleExecution = (
  element: PureSingleExecution,
  context: V1_GraphTransformerContext,
): V1_PureSingleExecution => {
  const execution = new V1_PureSingleExecution();
  execution.func = element.func.accept_ValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  execution.mapping = V1_transformElementReference(element.mapping);
  execution.runtime = V1_transformRuntime(element.runtime, context);
  return execution;
};

const transformKeyedParameter = (
  element: KeyedExecutionParameter,
  context: V1_GraphTransformerContext,
): V1_KeyedExecutionParameter => {
  const parameter = new V1_KeyedExecutionParameter();
  parameter.key = element.key;
  parameter.mapping = V1_transformElementReference(element.mapping);
  parameter.runtime = V1_transformRuntime(element.runtime, context);
  return parameter;
};

const transformMultiExecution = (
  element: PureMultiExecution,
  context: V1_GraphTransformerContext,
): V1_PureMultiExecution => {
  const execution = new V1_PureMultiExecution();
  execution.executionKey = element.executionKey;
  execution.func = element.func.accept_ValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  execution.executionParameters = element.executionParameters.map((param) =>
    transformKeyedParameter(param, context),
  );
  return execution;
};

const transformServiceExecution = (
  metamodel: ServiceExecution,
  context: V1_GraphTransformerContext,
): V1_ServiceExecution => {
  if (metamodel instanceof PureSingleExecution) {
    return transformSingleExecution(metamodel, context);
  } else if (metamodel instanceof PureMultiExecution) {
    return transformMultiExecution(metamodel, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform service execution`,
    metamodel,
  );
};

const transformTestContainer = (
  element: TestContainer,
  context: V1_GraphTransformerContext,
): V1_TestContainer => {
  const container = new V1_TestContainer();
  container.assert = element.assert.accept_ValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  container.parameterValues = element.parameterValues;
  return container;
};

const transformSingleExecutionTest = (
  element: SingleExecutionTest,
  context: V1_GraphTransformerContext,
): V1_SingleExecutionTest => {
  const single = new V1_SingleExecutionTest();
  single.asserts = element.asserts
    .filter((testContainer) => testContainer.assert.body !== undefined)
    .map((testContainer) => transformTestContainer(testContainer, context));
  single.data = element.data;
  return single;
};

const transformKeyedSingleExecutionTest = (
  element: KeyedSingleExecutionTest,
  context: V1_GraphTransformerContext,
): V1_KeyedSingleExecutionTest => {
  const keyedTest = new V1_KeyedSingleExecutionTest();
  keyedTest.asserts = element.asserts
    .filter((testContainer) => testContainer.assert.body !== undefined)
    .map((testContainer) => transformTestContainer(testContainer, context));
  keyedTest.data = element.data;
  keyedTest.key = element.key;
  return keyedTest;
};

const transformMultiExecutiontest = (
  element: MultiExecutionTest,
  context: V1_GraphTransformerContext,
): V1_MultiExecutionTest => {
  const multi = new V1_MultiExecutionTest();
  multi.tests = element.tests.map((test) =>
    transformKeyedSingleExecutionTest(test, context),
  );
  return multi;
};

const transformServiceTest = (
  value: ServiceTest,
  context: V1_GraphTransformerContext,
): V1_ServiceTest => {
  if (value instanceof SingleExecutionTest) {
    return transformSingleExecutionTest(value, context);
  } else if (value instanceof MultiExecutionTest) {
    return transformMultiExecutiontest(value, context);
  }
  throw new UnsupportedOperationError(`Can't transform service test`, value);
};

export const V1_transformService = (
  element: Service,
  context: V1_GraphTransformerContext,
): V1_Service => {
  const service = new V1_Service();
  V1_initPackageableElement(service, element);
  service.autoActivateUpdates = element.autoActivateUpdates;
  service.documentation = element.documentation;
  service.execution = transformServiceExecution(element.execution, context);
  service.owners = element.owners;
  service.pattern = element.pattern;
  service.test = transformServiceTest(element.test, context);
  return service;
};
