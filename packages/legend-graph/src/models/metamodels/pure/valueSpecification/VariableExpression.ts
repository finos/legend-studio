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

import { makeObservable, observable, action } from 'mobx';
import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference';
import type { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';

export class VariableExpression extends ValueSpecification {
  name: string;

  constructor(
    name: string,
    multiplicity: Multiplicity,
    genericType?: GenericTypeReference | undefined,
  ) {
    super(multiplicity);
    makeObservable<VariableExpression>(this, {
      name: observable,
      genericType: observable,
      setName: action,
      setMultiplicity: action,
    });
    this.name = name;
    this.genericType = genericType;
  }

  setName(val: string): void {
    this.name = val;
  }

  setMultiplicity(val: Multiplicity): void {
    this.multiplicity = val;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_VariableExpression(this);
  }
}
