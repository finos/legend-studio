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

import { hashArray, type Hashable } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashRawLambda,
} from '../../../../graph/Core_HashUtils.js';
import {
  type RawValueSpecificationVisitor,
  RawValueSpecification,
} from './RawValueSpecification.js';

export class RawLambda extends RawValueSpecification implements Hashable {
  body?: object | undefined;
  parameters?: object | undefined;

  constructor(parameters: object | undefined, body: object | undefined) {
    super();
    this.parameters = parameters;
    this.body = body;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_LAMBDA,
      hashRawLambda(this.parameters, this.body),
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawLambda(this);
  }
}
