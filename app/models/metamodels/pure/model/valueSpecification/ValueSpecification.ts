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

import { VariableExpression } from 'MM/model/valueSpecification/VariableExpression';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { RootGraphFetchTree, PropertyGraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';

export interface ValueSpecificationVisitor<T> {
  visit_Lambda(valueSpecification: Lambda): T;
  visit_Variable(valueSpecification: VariableExpression): T;
  visit_RootGraphFetchTree(valueSpecification: RootGraphFetchTree): T;
  visit_PropertyGraphFetchTree(valueSpecification: PropertyGraphFetchTree): T;
}

export abstract class ValueSpecification {
  abstract accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T
}
