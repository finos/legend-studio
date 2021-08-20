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
export * from './models/metamodels/pure/packageableElements/PackageableElement';
export * from './models/metamodels/pure/packageableElements/PackageableElementReference';
export { Multiplicity } from './models/metamodels/pure/packageableElements/domain/Multiplicity';
export { Type } from './models/metamodels/pure/packageableElements/domain/Type';
export { PrimitiveType } from './models/metamodels/pure/packageableElements/domain/PrimitiveType';
export { GenericTypeExplicitReference } from './models/metamodels/pure/packageableElements/domain/GenericTypeReference';
export { GenericType } from './models/metamodels/pure/packageableElements/domain/GenericType';
export {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './models/metamodels/pure/packageableElements/domain/Class';
export { Enumeration } from './models/metamodels/pure/packageableElements/domain/Enumeration';
export { Enum } from './models/metamodels/pure/packageableElements/domain/Enum';
export * from './models/metamodels/pure/packageableElements/domain/EnumValueReference';
export type { AbstractProperty } from './models/metamodels/pure/packageableElements/domain/AbstractProperty';
export { DerivedProperty } from './models/metamodels/pure/packageableElements/domain/DerivedProperty';
export { Property } from './models/metamodels/pure/packageableElements/domain/Property';
export { RawLambda } from './models/metamodels/pure/rawValueSpecification/RawLambda';
export { INTERNAL__UnknownValueSpecification } from './models/metamodels/pure/valueSpecification/INTERNAL__UnknownValueSpecification';
export { VariableExpression } from './models/metamodels/pure/valueSpecification/VariableExpression';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  FunctionExpression,
} from './models/metamodels/pure/valueSpecification/SimpleFunctionExpression';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './models/metamodels/pure/valueSpecification/LambdaFunction';
export { AlloySerializationConfigInstanceValue } from './models/metamodels/pure/valueSpecification/AlloySerializationConfig';
export {
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from './models/metamodels/pure/valueSpecification/InstanceValue';
export { ValueSpecification } from './models/metamodels/pure/valueSpecification/ValueSpecification';
export type { ValueSpecificationVisitor } from './models/metamodels/pure/valueSpecification/ValueSpecification';
export type { RawExecutionPlan } from './models/metamodels/pure/executionPlan/ExecutionPlan';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './models/metamodels/pure/valueSpecification/GraphFetchTree';
export * from './models/metamodels/pure/packageableElements/domain/PropertyReference';

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
