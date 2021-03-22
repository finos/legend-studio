/**
 * Copyright Goldman Sachs
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

import { PRIMITIVE_TYPE } from '../../../../../../../MetaModelConst';
import {
  UnsupportedOperationError,
  deepClone,
  isString,
  isObject,
  getClass,
} from '@finos/legend-studio-shared';
import type { V1_StereotypePtr } from '../../../../model/packageableElements/domain/V1_StereotypePtr';
import type { V1_TaggedValue } from '../../../../model/packageableElements/domain/V1_TaggedValue';
import type { V1_Property } from '../../../../model/packageableElements/domain/V1_Property';
import type { V1_RawLambda } from '../../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_RawVariable } from '../../../../model/rawValueSpecification/V1_RawVariable';
import type { V1_EnumValueMapping } from '../../../../model/packageableElements/mapping/V1_EnumValueMapping';
import { V1_EnumValueMappingEnumSourceValue } from '../../../../model/packageableElements/mapping/V1_EnumValueMapping';
import type { V1_PropertyPointer } from '../../../../model/packageableElements/domain/V1_PropertyPointer';
import type {
  V1_ServiceTest,
  V1_TestContainer,
} from '../../../../model/packageableElements/service/V1_ServiceTest';
import {
  V1_SingleExecutionTest,
  V1_MultiExecutionTest,
} from '../../../../model/packageableElements/service/V1_ServiceTest';
import type { V1_ServiceExecution } from '../../../../model/packageableElements/service/V1_ServiceExecution';
import {
  V1_PureMultiExecution,
  V1_PureSingleExecution,
} from '../../../../model/packageableElements/service/V1_ServiceExecution';
import type { V1_MappingTest } from '../../../../model/packageableElements/mapping/V1_MappingTest';
import { V1_ObjectInputData } from '../../../../model/packageableElements/store/modelToModel/mapping/V1_ObjectInputData';
import type { V1_InputData } from '../../../../model/packageableElements/mapping/V1_InputData';
import type { V1_Runtime } from '../../../../model/packageableElements/runtime/V1_Runtime';
import {
  V1_RuntimePointer,
  V1_EngineRuntime,
} from '../../../../model/packageableElements/runtime/V1_Runtime';
import type { V1_ConnectionVisitor } from '../../../../model/packageableElements/connection/V1_Connection';
import { V1_FlatDataInputData } from '../../../../model/packageableElements/store/flatData/mapping/V1_FlatDataInputData';
import type { V1_PackageableElementPointer } from '../../../../model/packageableElements/V1_PackageableElement';
import type { V1_Unit } from '../../../../model/packageableElements/domain/V1_Measure';
import { ENTITY_PATH_DELIMITER } from '../../../../../../../sdlc/SDLCUtils';

export interface V1_DepdendencyProcessingContext {
  versionPrefix: string; // the version prefix/dependency key [format: <groupId>::<artifactId>::<versionId>] to be added if processing is needed
  allDependencyKeys: string[]; // dependency key of all project dependencies [format: <groupId>::<artifactId>::<versionId>]
  reservedPaths: string[]; // paths that we should not process (such as system, meta)
  projectEntityPaths: string[]; // all the entity paths of the project being processed
}

/**
 * Recursively update object path values given target object values to change
 */
export const V1_recursiveChangeObjectValues = (
  obj: Record<PropertyKey, unknown>,
  targetObjectValuesToProcess: string[],
  processFunc: (value: string) => string,
): Record<PropertyKey, unknown> => {
  const processedObj = deepClone(obj);
  const changeObjectValues = (_obj: Record<PropertyKey, unknown>): void => {
    // `for ... in` will traverse array as well
    for (const prop in _obj) {
      if (Object.prototype.hasOwnProperty.call(_obj, prop)) {
        const value = _obj[prop];
        if (isString(value) && targetObjectValuesToProcess.includes(value)) {
          _obj[prop] = processFunc(value);
        } else if (isObject(value)) {
          changeObjectValues(value as Record<PropertyKey, unknown>);
        }
      }
    }
  };
  changeObjectValues(processedObj);
  return processedObj;
};

// FIXME: DO NOT PROCESS WHEN THE PATH IS NOT FULL PATH! -> then we don't need to care about
/**
 * Here, we try to add versionPrefix (groupId::artifactId::version) to a dependable elements. We will SKIP if the path:
 *  - EITHER already has a version prefix (among all of the dependency keys)
 *  - OR it is a reserved path (right now just system paths)
 *  - OR it is a primitive type
 */
export const V1_processDependencyPath = (
  entityPathToProcess: string,
  context: V1_DepdendencyProcessingContext,
): string => {
  const isProcessed =
    context.allDependencyKeys.find((key) =>
      entityPathToProcess.startsWith(`${key}${ENTITY_PATH_DELIMITER}`),
    ) ??
    Object.values<string>(PRIMITIVE_TYPE)
      .concat(context.reservedPaths)
      .includes(entityPathToProcess);
  return isProcessed
    ? entityPathToProcess
    : `${context.versionPrefix}${ENTITY_PATH_DELIMITER}${entityPathToProcess}`;
};

export const V1_processDependableObject = (
  obj: Record<PropertyKey, unknown>,
  context: V1_DepdendencyProcessingContext,
): Record<PropertyKey, unknown> =>
  V1_recursiveChangeObjectValues(
    obj,
    context.projectEntityPaths,
    (keyValue: string): string => V1_processDependencyPath(keyValue, context),
  );

const processPackageableElementPointer = (
  pointer: V1_PackageableElementPointer,
  context: V1_DepdendencyProcessingContext,
): void => {
  pointer.path = V1_processDependencyPath(pointer.path, context);
};

export const V1_processDependableLambda = (
  lambda: V1_RawLambda,
  context: V1_DepdendencyProcessingContext,
): void => {
  lambda.body = lambda.body
    ? V1_processDependableObject(
        lambda.body as Record<PropertyKey, unknown>,
        context,
      )
    : undefined;
  lambda.parameters = lambda.parameters
    ? V1_processDependableObject(
        lambda.parameters as Record<PropertyKey, unknown>,
        context,
      )
    : undefined;
};

export const V1_processDependableStereotypePointer = (
  stereotypePtr: V1_StereotypePtr,
  context: V1_DepdendencyProcessingContext,
): void => {
  stereotypePtr.profile = V1_processDependencyPath(
    stereotypePtr.profile,
    context,
  );
};

export const V1_processDependableTaggedValue = (
  taggedValue: V1_TaggedValue,
  context: V1_DepdendencyProcessingContext,
): void => {
  taggedValue.tag.profile = V1_processDependencyPath(
    taggedValue.tag.profile,
    context,
  );
};

export const V1_processDependableUnit = (
  unit: V1_Unit,
  context: V1_DepdendencyProcessingContext,
): void => {
  unit.measure = V1_processDependencyPath(unit.measure, context);
  if (unit.conversionFunction) {
    V1_processDependableLambda(unit.conversionFunction, context);
  }
};

export const V1_processDependableProperty = (
  property: V1_Property,
  context: V1_DepdendencyProcessingContext,
): void => {
  property.type = V1_processDependencyPath(property.type, context);
  property.taggedValues.forEach((taggedValue) =>
    V1_processDependableTaggedValue(taggedValue, context),
  );
  property.stereotypes.forEach((stereotype) =>
    V1_processDependableStereotypePointer(stereotype, context),
  );
};

export const V1_processDependableVariable = (
  variable: V1_RawVariable,
  context: V1_DepdendencyProcessingContext,
): void => {
  variable.class = V1_processDependencyPath(variable.class, context);
};

export const V1_processDependableEnumValueMapping = (
  enumValueMapping: V1_EnumValueMapping,
  context: V1_DepdendencyProcessingContext,
): void => {
  enumValueMapping.sourceValues
    .filter(
      (sourceValue): sourceValue is V1_EnumValueMappingEnumSourceValue =>
        sourceValue instanceof V1_EnumValueMappingEnumSourceValue,
    )
    .forEach((souceValue) => {
      souceValue.enumeration = V1_processDependencyPath(
        souceValue.enumeration,
        context,
      );
    });
};

export const V1_processDependablePropertyPointer = (
  propertyPtr: V1_PropertyPointer,
  context: V1_DepdendencyProcessingContext,
): void => {
  propertyPtr.class = V1_processDependencyPath(propertyPtr.class, context);
};

const processDependableTestContainer = (
  testContainer: V1_TestContainer,
  context: V1_DepdendencyProcessingContext,
): void => {
  V1_processDependableLambda(testContainer.assert, context);
};

export const V1_processDependableServiceTest = (
  serviceTest: V1_ServiceTest,
  context: V1_DepdendencyProcessingContext,
): void => {
  if (serviceTest instanceof V1_SingleExecutionTest) {
    serviceTest.asserts.forEach((assert) =>
      processDependableTestContainer(assert, context),
    );
  } else if (serviceTest instanceof V1_MultiExecutionTest) {
    serviceTest.tests.forEach((test) =>
      test.asserts.forEach((assert) =>
        processDependableTestContainer(assert, context),
      ),
    );
  } else {
    throw new UnsupportedOperationError(
      `Can't disambiguate dependable service test of type '${
        getClass(serviceTest).name
      }'`,
    );
  }
};

export const V1_processDependableRuntime = (
  runtime: V1_Runtime,
  context: V1_DepdendencyProcessingContext,
  dependentConnectionVisitor: V1_ConnectionVisitor<void>,
): void => {
  if (runtime instanceof V1_RuntimePointer) {
    runtime.runtime = V1_processDependencyPath(runtime.runtime, context);
  } else if (runtime instanceof V1_EngineRuntime) {
    runtime.mappings.forEach((mappingPointer) =>
      processPackageableElementPointer(mappingPointer, context),
    );
    runtime.connections.forEach((storeConnections) => {
      processPackageableElementPointer(storeConnections.store, context);
      storeConnections.storeConnections.forEach((identifiedConnection) =>
        identifiedConnection.connection.accept_ConnectionVisitor(
          dependentConnectionVisitor,
        ),
      );
    });
  } else {
    throw new UnsupportedOperationError(
      `Can't disambiguate dependable runtime of type '${
        getClass(runtime).name
      }'`,
    );
  }
};

export const V1_processDependableServiceExecution = (
  serviceExecution: V1_ServiceExecution,
  context: V1_DepdendencyProcessingContext,
  dependentConnectionVisitor: V1_ConnectionVisitor<void>,
): void => {
  if (serviceExecution instanceof V1_PureSingleExecution) {
    V1_processDependableLambda(serviceExecution.func, context);
    serviceExecution.mapping = V1_processDependencyPath(
      serviceExecution.mapping,
      context,
    );
    V1_processDependableRuntime(
      serviceExecution.runtime,
      context,
      dependentConnectionVisitor,
    );
  } else if (serviceExecution instanceof V1_PureMultiExecution) {
    V1_processDependableLambda(serviceExecution.func, context);
    serviceExecution.executionParameters.forEach((executionParameter) => {
      executionParameter.mapping = V1_processDependencyPath(
        executionParameter.mapping,
        context,
      );
      V1_processDependableRuntime(
        executionParameter.runtime,
        context,
        dependentConnectionVisitor,
      );
    });
  } else {
    throw new UnsupportedOperationError(
      `Can't disambiguate dependable service execution of type '${
        getClass(serviceExecution).name
      }'`,
    );
  }
};

export const V1_processDependableMappingTestInputData = (
  inputData: V1_InputData,
  context: V1_DepdendencyProcessingContext,
): void => {
  if (inputData instanceof V1_ObjectInputData) {
    inputData.sourceClass = V1_processDependencyPath(
      inputData.sourceClass,
      context,
    );
  } else if (inputData instanceof V1_FlatDataInputData) {
    processPackageableElementPointer(inputData.sourceFlatData, context);
  } else {
    throw new UnsupportedOperationError(
      `Can't disambiguate dependable input data of type '${
        getClass(inputData).name
      }'`,
    );
  }
};

export const V1_processDependableMappingTest = (
  mappingTest: V1_MappingTest,
  context: V1_DepdendencyProcessingContext,
): void => {
  V1_processDependableLambda(mappingTest.query, context);
  mappingTest.inputData.forEach((inputData) =>
    V1_processDependableMappingTestInputData(inputData, context),
  );
};
