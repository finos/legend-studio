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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { Service } from '../../../../../../metamodels/pure/packageableElements/service/Service.js';
import type { ServiceTest } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTest.js';
import {
  type KeyedExecutionParameter,
  type ServiceExecution,
  PureSingleExecution,
  PureMultiExecution,
} from '../../../../../../metamodels/pure/packageableElements/service/ServiceExecution.js';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper.js';
import { V1_Service } from '../../../model/packageableElements/service/V1_Service.js';
import {
  type V1_ServiceExecution,
  V1_PureSingleExecution,
  V1_PureMultiExecution,
  V1_KeyedExecutionParameter,
} from '../../../model/packageableElements/service/V1_ServiceExecution.js';
import { V1_ServiceTest } from '../../../model/packageableElements/service/V1_ServiceTest.js';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer.js';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_transformRuntime } from './V1_RuntimeTransformer.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer.js';
import {
  type DEPRECATED__ServiceTest,
  type DEPRECATED__KeyedSingleExecutionTest,
  type DEPRECATED__TestContainer,
  DEPRECATED__MultiExecutionTest,
  DEPRECATED__SingleExecutionTest,
} from '../../../../../../metamodels/pure/packageableElements/service/DEPRECATED__ServiceTest.js';
import {
  type V1_DEPRECATED__ServiceTest,
  V1_DEPRECATED__KeyedSingleExecutionTest,
  V1_DEPRECATED__MultiExecutionTest,
  V1_DEPRECATED__SingleExecutionTest,
  V1_DEPRECATED__TestContainer,
} from '../../../model/packageableElements/service/V1_DEPRECATED__ServiceTest.js';
import type { ConnectionTestData } from '../../../../../../metamodels/pure/packageableElements/service/ConnectionTestData.js';
import { V1_ConnectionTestData } from '../../../model/packageableElements/service/V1_ConnectionTestData.js';
import { V1_transformEmbeddedData } from './V1_DataElementTransformer.js';
import { V1_ParameterValue } from '../../../model/packageableElements/service/V1_ParameterValue.js';
import type { ParameterValue } from '../../../../../../metamodels/pure/packageableElements/service/ParameterValue.js';
import type { TestData } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTestData.js';
import { V1_TestData } from '../../../model/packageableElements/service/V1_TestData.js';
import { V1_ServiceTestSuite } from '../../../model/packageableElements/service/V1_ServiceTestSuite.js';
import type { ServiceTestSuite } from '../../../../../../metamodels/pure/packageableElements/service/ServiceTestSuite.js';
import {
  V1_transformAtomicTest,
  V1_transformTestAssertion,
  V1_transformTestSuite,
} from './V1_TestTransformer.js';

const transformConnectionTestData = (
  element: ConnectionTestData,
  context: V1_GraphTransformerContext,
): V1_ConnectionTestData => {
  const connectionTestData = new V1_ConnectionTestData();
  connectionTestData.id = element.connectionId;
  connectionTestData.data = V1_transformEmbeddedData(element.testData, context);
  return connectionTestData;
};

const transformParameterValue = (
  element: ParameterValue,
): V1_ParameterValue => {
  const parameterValue = new V1_ParameterValue();
  parameterValue.name = element.name;
  parameterValue.value = element.value;
  return parameterValue;
};

const transformTestData = (
  element: TestData,
  context: V1_GraphTransformerContext,
): V1_TestData => {
  const testData = new V1_TestData();
  testData.connectionsTestData = element.connectionsTestData.map(
    (connectionTestData) =>
      transformConnectionTestData(connectionTestData, context),
  );
  return testData;
};

export const V1_transformServiceTest = (
  element: ServiceTest,
): V1_ServiceTest => {
  const serviceTest = new V1_ServiceTest();
  serviceTest.id = element.id;
  serviceTest.parameters = element.parameters.map((parameter) =>
    transformParameterValue(parameter),
  );
  serviceTest.assertions = element.assertions.map((assertion) =>
    V1_transformTestAssertion(assertion),
  );
  return serviceTest;
};

export const V1_transformServiceTestSuite = (
  element: ServiceTestSuite,
  context: V1_GraphTransformerContext,
): V1_ServiceTestSuite => {
  const serviceTestSuite = new V1_ServiceTestSuite();
  serviceTestSuite.id = element.id;
  serviceTestSuite.testData = transformTestData(element.testData, context);
  serviceTestSuite.tests = element.tests.map((test) =>
    V1_transformAtomicTest(test),
  );
  return serviceTestSuite;
};

const transformSingleExecution = (
  element: PureSingleExecution,
  context: V1_GraphTransformerContext,
): V1_PureSingleExecution => {
  const execution = new V1_PureSingleExecution();
  execution.func = element.func.accept_RawValueSpecificationVisitor(
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
  execution.func = element.func.accept_RawValueSpecificationVisitor(
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
  element: DEPRECATED__TestContainer,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__TestContainer => {
  const container = new V1_DEPRECATED__TestContainer();
  container.assert = element.assert.accept_RawValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  container.parametersValues = element.parametersValues;
  return container;
};

const transformSingleExecutionTest = (
  element: DEPRECATED__SingleExecutionTest,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__SingleExecutionTest => {
  const single = new V1_DEPRECATED__SingleExecutionTest();
  single.asserts = element.asserts
    .filter((testContainer) => testContainer.assert.body !== undefined)
    .map((testContainer) => transformTestContainer(testContainer, context));
  single.data = element.data;
  return single;
};

const transformKeyedSingleExecutionTest = (
  element: DEPRECATED__KeyedSingleExecutionTest,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__KeyedSingleExecutionTest => {
  const keyedTest = new V1_DEPRECATED__KeyedSingleExecutionTest();
  keyedTest.asserts = element.asserts
    .filter((testContainer) => testContainer.assert.body !== undefined)
    .map((testContainer) => transformTestContainer(testContainer, context));
  keyedTest.data = element.data;
  keyedTest.key = element.key;
  return keyedTest;
};

const transformMultiExecutiontest = (
  element: DEPRECATED__MultiExecutionTest,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__MultiExecutionTest => {
  const multi = new V1_DEPRECATED__MultiExecutionTest();
  multi.tests = element.tests.map((test) =>
    transformKeyedSingleExecutionTest(test, context),
  );
  return multi;
};

const transformLegacyServiceTest = (
  value: DEPRECATED__ServiceTest,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__ServiceTest => {
  if (value instanceof DEPRECATED__SingleExecutionTest) {
    return transformSingleExecutionTest(value, context);
  } else if (value instanceof DEPRECATED__MultiExecutionTest) {
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
  service.stereotypes = element.stereotypes.map(V1_transformStereotype);
  service.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  service.autoActivateUpdates = element.autoActivateUpdates;
  service.documentation = element.documentation;
  service.execution = transformServiceExecution(element.execution, context);
  service.owners = element.owners;
  service.pattern = element.pattern;
  if (element.test) {
    service.test = transformLegacyServiceTest(element.test, context);
  }
  service.testSuites = element.tests.map((testSuite) =>
    V1_transformTestSuite(testSuite, context),
  );
  return service;
};
