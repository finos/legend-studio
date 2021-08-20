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

export * from './MetaModelUtils';
export {
  PRIMITIVE_TYPE,
  CORE_ELEMENT_PATH,
  TYPICAL_MULTIPLICITY_TYPE,
  MULTIPLICITY_INFINITE,
  LAMBDA_PIPE,
} from './MetaModelConst';

export { DependencyManager } from './graph/DependencyManager';
export { BasicModel } from './graph/BasicModel';
export { PureModel } from './graph/PureModel';
export * from './graph/PureGraphExtension';

export * from './helpers/Stubable'; // TODO: to be removed
export * from './models/packageableElements/PackageableElement';
export * from './models/packageableElements/PackageableElementReference';
export { Multiplicity } from './models/packageableElements/domain/Multiplicity';
export { Type } from './models/packageableElements/domain/Type';
export { PrimitiveType } from './models/packageableElements/domain/PrimitiveType';
export { GenericTypeExplicitReference } from './models/packageableElements/domain/GenericTypeReference';
export { GenericType } from './models/packageableElements/domain/GenericType';
export {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './models/packageableElements/domain/Class';
export { Enumeration } from './models/packageableElements/domain/Enumeration';
export { Enum } from './models/packageableElements/domain/Enum';
export * from './models/packageableElements/domain/EnumValueReference';
export type { AbstractProperty } from './models/packageableElements/domain/AbstractProperty';
export { DerivedProperty } from './models/packageableElements/domain/DerivedProperty';
export { Property } from './models/packageableElements/domain/Property';
export { RawLambda } from './models/rawValueSpecification/RawLambda';
export { INTERNAL__UnknownValueSpecification } from './models/valueSpecification/INTERNAL__UnknownValueSpecification';
export { VariableExpression } from './models/valueSpecification/VariableExpression';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  FunctionExpression,
} from './models/valueSpecification/SimpleFunctionExpression';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './models/valueSpecification/LambdaFunction';
export { AlloySerializationConfigInstanceValue } from './models/valueSpecification/AlloySerializationConfig';
export {
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from './models/valueSpecification/InstanceValue';
export { ValueSpecification } from './models/valueSpecification/ValueSpecification';
export type { ValueSpecificationVisitor } from './models/valueSpecification/ValueSpecification';
export type { RawExecutionPlan } from './models/executionPlan/ExecutionPlan';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './models/valueSpecification/GraphFetchTree';
export * from './models/packageableElements/domain/PropertyReference';

export * from './helpers/DiagramHelper';
export * from './helpers/DatabaseHelper';
export * from './helpers/MappingHelper';
export * from './helpers/MappingResolutionHelper';
export * from './helpers/ValidationHelper';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export * from './DSLMapping_Exports';
export * from './DSLService_Exports';
export * from './DSLGenerationSpecification_Exports';
export * from './StoreFlatData_Exports';
export * from './StoreRelational_Exports';
