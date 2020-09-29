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

import { serializable } from 'serializr';
import { RootGraphFetchTree, PropertyGraphFetchTree } from 'V1/model/valueSpecification/raw/GraphFetchTree';
import { Variable } from 'V1/model/valueSpecification/Variable';
import { Lambda } from 'V1/model/valueSpecification/raw/Lambda';

export enum ValueSpecificationType {
  LAMBDA = 'lambda',
  VARIABLE = 'var',
  ROOT_GRAPH_FETCH_TREE = 'rootGraphFetchTree',
  PROPERTY_GRAPH_FETCH_TREE = 'propertyGraphFetchTree',
  CLASS = 'class',
  FUNCTION = 'func',
}

export interface ValueSpecificationVisitor<T> {
  visit_Lambda(valueSpecification: Lambda): T;
  visit_Variable(valueSpecification: Variable): T;
  visit_RootGraphFetchTree(valueSpecification: RootGraphFetchTree): T;
  visit_PropertyGraphFetchTree(valueSpecification: PropertyGraphFetchTree): T;
}

// NOTE: `ValueSpecificationType` should be in V1 instead of metamodel, but since we do not process
// value specification properly, we will leave that in metamodel for now. And then we can
// potentially do visitor pattern for ValueSpecification
export abstract class ValueSpecification {
  @serializable _type!: ValueSpecificationType;

  abstract accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T
}

// TODO: when we start poking into value specification, these can go away
export interface FunctionValueSpecification extends ValueSpecification {
  function: string;
  parameters: object[];
}

export interface ClassValueSpecification extends ValueSpecification {
  fullPath: string;
}

export interface GraphFetchValueSpecification extends ValueSpecification {
  class: string;
}

export interface StringValueSpecification extends ValueSpecification {
  values: string[];
}
