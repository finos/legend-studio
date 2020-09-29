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

import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';
import { SetImplementation, SET_IMPLEMENTATION_TYPE } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { Mapping, MappingElement } from 'MM/model/packageableElements/mapping/Mapping';
import { Text } from 'MM/model/packageableElements/text/Text';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure, Unit } from 'MM/model/packageableElements/domain/Measure';
import { SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';

/**
 * NOTE: Notice how this utility draws resources from all of metamodels and uses `instanceof` to classify behavior/response.
 * As such, methods in this utility cannot be placed in place they should belong to.
 *
 * For example: `getSetImplemetnationType` cannot be placed in `SetImplementation` because of circular module dependency
 * So this utility is born for such purpose, to avoid circular module dependency, and it should just be used for only that
 * Other utilities that really should reside in the domain-specific meta model should be placed in the meta model module.
 */

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const getSetImplementationType = (setImplementation: SetImplementation): SET_IMPLEMENTATION_TYPE => {
  if (setImplementation instanceof PureInstanceSetImplementation) {
    return SET_IMPLEMENTATION_TYPE.PUREINSTANCE;
  } else if (setImplementation instanceof OperationSetImplementation) {
    return SET_IMPLEMENTATION_TYPE.OPERATION;
  }
  throw new UnsupportedOperationError(`Unsupported set implementation '${setImplementation.constructor.name}'`);
};

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export const isInstanceSetImplementation = (setImplementation: MappingElement): setImplementation is InstanceSetImplementation =>
  setImplementation instanceof InstanceSetImplementation;

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export const getPackageableElementType = (element: PackageableElement): PACKAGEABLE_ELEMENT_TYPE => {
  if (element instanceof PrimitiveType) {
    return PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE;
  } else if (element instanceof Package) {
    return PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
  } else if (element instanceof Class) {
    return PACKAGEABLE_ELEMENT_TYPE.CLASS;
  } else if (element instanceof Association) {
    return PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION;
  } else if (element instanceof Enumeration) {
    return PACKAGEABLE_ELEMENT_TYPE.ENUMERATION;
  } else if (element instanceof Measure) {
    return PACKAGEABLE_ELEMENT_TYPE.MEASURE;
  } else if (element instanceof Unit) {
    return PACKAGEABLE_ELEMENT_TYPE.UNIT;
  } else if (element instanceof Profile) {
    return PACKAGEABLE_ELEMENT_TYPE.PROFILE;
  } else if (element instanceof ConcreteFunctionDefinition) {
    return PACKAGEABLE_ELEMENT_TYPE.FUNCTION;
  } else if (element instanceof Mapping) {
    return PACKAGEABLE_ELEMENT_TYPE.MAPPING;
  } else if (element instanceof Diagram) {
    return PACKAGEABLE_ELEMENT_TYPE.DIAGRAM;
  } else if (element instanceof Text) {
    return PACKAGEABLE_ELEMENT_TYPE.TEXT;
  } else if (element instanceof PackageableConnection) {
    return PACKAGEABLE_ELEMENT_TYPE.CONNECTION;
  } else if (element instanceof PackageableRuntime) {
    return PACKAGEABLE_ELEMENT_TYPE.RUNTIME;
  } else if (element instanceof FileGeneration) {
    return PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION;
  } else if (element instanceof GenerationSpecification) {
    return PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION;
  } else if (element instanceof SectionIndex) {
    return PACKAGEABLE_ELEMENT_TYPE.SECTION_INDEX;
  }
  throw new UnsupportedOperationError(`Unsupported packageable element type '${element.constructor.name}'`);
};
