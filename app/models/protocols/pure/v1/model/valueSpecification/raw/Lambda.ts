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

import { serializable, raw } from 'serializr';
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { ValueSpecification, ValueSpecificationType, ValueSpecificationVisitor } from 'V1/model/valueSpecification/ValueSpecification';

export class Lambda extends ValueSpecification implements Hashable {
  @serializable _type!: ValueSpecificationType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  // NOTE: arrange fields in order here so when we serialize we serialize properly
  // when we are able to process value specifications properly this can go to the transformer
  // but as of now this order of fields matter
  @serializable(raw()) body?: object;
  @serializable(raw()) parameters?: object;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.LAMBDA,
      hashLambda(this.parameters, this.body)
    ]);
  }

  accept_ValueSpecificationVisitor<T>(visitor: ValueSpecificationVisitor<T>): T {
    return visitor.visit_Lambda(this);
  }
}
