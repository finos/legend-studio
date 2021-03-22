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

import type { RawVariableExpression } from '../../model/rawValueSpecification/RawVariableExpression';
import type { RawLambda } from '../../model/rawValueSpecification/RawLambda';
import type {
  RawRootGraphFetchTree,
  RawPropertyGraphFetchTree,
} from '../../model/rawValueSpecification/RawGraphFetchTree';

export interface RawValueSpecificationVisitor<T> {
  visit_RawLambda(valueSpecification: RawLambda): T;
  visit_RawVariable(valueSpecification: RawVariableExpression): T;
  visit_RawRootGraphFetchTree(valueSpecification: RawRootGraphFetchTree): T;
  visit_RawPropertyGraphFetchTree(
    valueSpecification: RawPropertyGraphFetchTree,
  ): T;
}

export abstract class RawValueSpecification {
  abstract accept_ValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T;
}
