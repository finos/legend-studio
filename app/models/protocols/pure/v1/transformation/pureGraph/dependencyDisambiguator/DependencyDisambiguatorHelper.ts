/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PRIMITIVE_TYPE, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { UnsupportedOperationError, deepClone, isString, isObject } from 'Utilities/GeneralUtil';
import { StereotypePtr } from 'V1/model/packageableElements/domain/StereotypePtr';
import { TaggedValue } from 'V1/model/packageableElements/domain/TaggedValue';
import { Property } from 'V1/model/packageableElements/domain/Property';
import { Lambda } from 'V1/model/valueSpecification/raw/Lambda';
import { Variable } from 'V1/model/valueSpecification/Variable';
import { EnumValueMapping, EnumValueMappingEnumSourceValue } from 'V1/model/packageableElements/mapping/EnumValueMapping';
import { PropertyPointer } from 'V1/model/packageableElements/domain/PropertyPointer';
import { MappingTest } from 'V1/model/packageableElements/mapping/MappingTest';
import { ObjectInputData } from 'V1/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { InputData } from 'V1/model/packageableElements/mapping/InputData';
import { RuntimePointer, EngineRuntime, Runtime } from 'V1/model/packageableElements/runtime/Runtime';
import { ConnectionVisitor } from 'V1/model/packageableElements/connection/Connection';
import { PackageableElementPointer } from 'V1/model/packageableElements/PackageableElement';
import { Unit } from 'V1/model/packageableElements/domain/Measure';

export interface DepdendencyProcessingContext {
  versionPrefix: string; // the version prefix/dependency key [format: <groupId>::<artifactId>::<versionId>] to be added if processing is needed
  allDependencyKeys: string[]; // dependency key of all project dependencies [format: <groupId>::<artifactId>::<versionId>]
  reservedPaths: string[]; // paths that we should not process (such as system, meta)
  projectEntityPaths: string[]; // all the entity paths of the project being processed
}

/**
 * Recursively update object path values given target object values to change
 */
export const recursiveChangeObjectValues = (obj: Record<PropertyKey, unknown>, targetObjectValuesToProcess: string[], processFunc: (value: string) => string): Record<PropertyKey, unknown> => {
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

// FIXME: Do not process when the path is not full path.
/**
 * Here, we try to add versionPrefix (groupId::artifactId::version) to a dependable elements. We will SKIP if the path:
 *  - EITHER already has a version prefix (among all of the dependency keys)
 *  - OR it is a reserved path (right now just system paths)
 *  - OR it is a primitive type
 */
export const processDependencyPath = (entityPathToProcess: string, context: DepdendencyProcessingContext): string => {
  const isProcessed = context.allDependencyKeys.find(key => entityPathToProcess.startsWith(`${key}${ENTITY_PATH_DELIMITER}`))
    ?? (Object.values<string>(PRIMITIVE_TYPE)).concat(context.reservedPaths).includes(entityPathToProcess);
  return isProcessed ? entityPathToProcess : `${context.versionPrefix}${ENTITY_PATH_DELIMITER}${entityPathToProcess}`;
};

export const processDependableObject = (obj: Record<PropertyKey, unknown>, context: DepdendencyProcessingContext): Record<PropertyKey, unknown> =>
  recursiveChangeObjectValues(obj, context.projectEntityPaths, (keyValue: string): string => processDependencyPath(keyValue, context));

const processPackageableElementPointer = (pointer: PackageableElementPointer, context: DepdendencyProcessingContext): void => {
  pointer.path = processDependencyPath(pointer.path, context);
};

export const processDependableLambda = (lambda: Lambda, context: DepdendencyProcessingContext): void => {
  lambda.body = lambda.body ? processDependableObject(lambda.body as Record<PropertyKey, unknown>, context) : undefined;
  lambda.parameters = lambda.parameters ? processDependableObject(lambda.parameters as Record<PropertyKey, unknown>, context) : undefined;
};

export const processDependableStereotypePointer = (stereotypePtr: StereotypePtr, context: DepdendencyProcessingContext): void => {
  stereotypePtr.profile = processDependencyPath(stereotypePtr.profile, context);
};

export const processDependableTaggedValue = (taggedValue: TaggedValue, context: DepdendencyProcessingContext): void => {
  taggedValue.tag.profile = processDependencyPath(taggedValue.tag.profile, context);
};

export const processDependableUnit = (unit: Unit, context: DepdendencyProcessingContext): void => {
  unit.measure = processDependencyPath(unit.measure, context);
  processDependableLambda(unit.conversionFunction, context);
};

export const processDependableProperty = (property: Property, context: DepdendencyProcessingContext): void => {
  property.type = processDependencyPath(property.type, context);
  property.taggedValues.forEach(taggedValue => processDependableTaggedValue(taggedValue, context));
  property.stereotypes.forEach(stereotype => processDependableStereotypePointer(stereotype, context));
};

export const processDependableVariable = (variable: Variable, context: DepdendencyProcessingContext): void => {
  variable.class = processDependencyPath(variable.class, context);
};

export const processDependableEnumValueMapping = (enumValueMapping: EnumValueMapping, context: DepdendencyProcessingContext): void => {
  enumValueMapping.sourceValues
    .filter((sourceValue): sourceValue is EnumValueMappingEnumSourceValue => sourceValue instanceof EnumValueMappingEnumSourceValue)
    .forEach(souceValue => { souceValue.enumeration = processDependencyPath(souceValue.enumeration, context) });
};

export const processDependablePropertyPointer = (propertyPtr: PropertyPointer, context: DepdendencyProcessingContext): void => {
  propertyPtr.class = processDependencyPath(propertyPtr.class, context);
};

export const processDependableRuntime = (runtime: Runtime, context: DepdendencyProcessingContext, dependentConnectionVisitor: ConnectionVisitor<void>): void => {
  if (runtime instanceof RuntimePointer) {
    runtime.runtime = processDependencyPath(runtime.runtime, context);
  } else if (runtime instanceof EngineRuntime) {
    runtime.mappings.forEach(mappingPointer => processPackageableElementPointer(mappingPointer, context));
    runtime.connections.forEach(storeConnections => {
      processPackageableElementPointer(storeConnections.store, context);
      storeConnections.storeConnections.forEach(identifiedConnection => identifiedConnection.connection.accept_ConnectionVisitor(dependentConnectionVisitor));
    });
  } else {
    throw new UnsupportedOperationError(`Can't process unsupported dependable runtime type '${runtime.constructor.name}'`);
  }
};

export const processDependableMappingTestInputData = (inputData: InputData, context: DepdendencyProcessingContext): void => {
  if (inputData instanceof ObjectInputData) {
    inputData.sourceClass = processDependencyPath(inputData.sourceClass, context);
  } else {
    throw new UnsupportedOperationError(`Can't process unsupported dependable input data type '${inputData.constructor.name}'`);
  }
};

export const processDependableMappingTest = (mappingTest: MappingTest, context: DepdendencyProcessingContext): void => {
  processDependableLambda(mappingTest.query, context);
  mappingTest.inputData.forEach(inputData => processDependableMappingTestInputData(inputData, context));
};
