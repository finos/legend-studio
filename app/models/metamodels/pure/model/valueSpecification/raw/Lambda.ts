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

import { computed, observable } from 'mobx';
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { serializable, raw } from 'serializr';
import { ValueSpecification, ValueSpecificationVisitor } from 'MM/model/valueSpecification/ValueSpecification';
import { Stubable } from 'MM/Stubable';

export class Lambda extends ValueSpecification implements Hashable, Stubable {
  // NOTE: arrange fields in order here so when we serialize we serialize properly
  // when we are able to process value specifications properly this can go to the transformer
  // but as of now this order of fields matter
  // FIXME: right now, this model schema is being used in `LambdaInput`. Once this is refactored properly in V1,
  // we will use V1 Lambda and can remove the @serializable stuff from here
  @serializable _type = 'lambda';
  @serializable(raw()) @observable body?: object;
  @serializable(raw()) @observable parameters?: object;

  constructor(parameters: object | undefined, body: object | undefined) {
    super();
    this.parameters = parameters;
    this.body = body;
  }

  static createStub = (): Lambda => new Lambda(undefined, undefined);
  @computed get isStub(): boolean { return !this.body && !this.parameters }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.LAMBDA,
      hashLambda(this.parameters, this.body)
    ]);
  }

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_Lambda(this);
  }
}
