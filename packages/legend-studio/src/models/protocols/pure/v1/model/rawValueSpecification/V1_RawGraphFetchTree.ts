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

import type { V1_RawValueSpecificationVisitor } from '../../model/rawValueSpecification/V1_RawValueSpecification';
import { V1_RawValueSpecification } from '../../model/rawValueSpecification/V1_RawValueSpecification';

export abstract class V1_RawGraphFetchTree extends V1_RawValueSpecification {
  subTrees: V1_RawGraphFetchTree[] = [];

  abstract override accept_RawValueSpecificationVisitor<T>(
    visitor: V1_RawValueSpecificationVisitor<T>,
  ): T;
}

export class V1_RawPropertyGraphFetchTree extends V1_RawGraphFetchTree {
  alias?: string;
  parameters: object[] = [];
  property!: string;
  subType?: string;

  accept_RawValueSpecificationVisitor<T>(
    visitor: V1_RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PropertyGraphFetchTree(this);
  }
}

export class V1_RawRootGraphFetchTree extends V1_RawGraphFetchTree {
  class!: string;

  accept_RawValueSpecificationVisitor<T>(
    visitor: V1_RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RootGraphFetchTree(this);
  }
}
