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

import { computed, observable, makeObservable } from 'mobx';
import { hashLambda } from '../../../../MetaModelUtils';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../MetaModelConst';
import {
  type RawValueSpecificationVisitor,
  RawValueSpecification,
} from './RawValueSpecification';
import type { Stubable } from '../../../../helpers/Stubable';

export class RawLambda
  extends RawValueSpecification
  implements Hashable, Stubable
{
  body?: object | undefined;
  parameters?: object | undefined;

  constructor(parameters: object | undefined, body: object | undefined) {
    super();

    makeObservable(this, {
      body: observable.ref,
      parameters: observable.ref,
      isStub: computed,
      hashCode: computed,
    });

    this.parameters = parameters;
    this.body = body;
  }

  static createStub = (): RawLambda => new RawLambda(undefined, undefined);
  get isStub(): boolean {
    return !this.body && !this.parameters;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RAW_LAMBDA,
      hashLambda(this.parameters, this.body),
    ]);
  }

  accept_RawValueSpecificationVisitor<T>(
    visitor: RawValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RawLambda(this);
  }
}
