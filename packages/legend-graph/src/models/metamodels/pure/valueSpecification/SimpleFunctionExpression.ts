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

import { observable, makeObservable, action } from 'mobx';
import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference';
import type { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';
import type { Function } from '../packageableElements/domain/Function';
import type { AbstractProperty } from '../packageableElements/domain/AbstractProperty';
import { UnsupportedOperationError } from '@finos/legend-shared';

export class Expression extends ValueSpecification {
  classifierGenericType?: GenericTypeReference | undefined;

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

export class FunctionExpression extends Expression {
  functionName: string;
  parametersValues: ValueSpecification[] = [];

  constructor(functionName: string, multiplicity: Multiplicity) {
    super(multiplicity, undefined);
    this.functionName = functionName;

    makeObservable(this, {
      functionName: observable,
      parametersValues: observable,
      classifierGenericType: observable,
      setParametersValues: action,
    });
  }

  setParametersValues(val: ValueSpecification[]): void {
    this.parametersValues = val;
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_FunctionExpression(this);
  }
}

export class SimpleFunctionExpression extends FunctionExpression {
  // eslint-disable-next-line @typescript-eslint/ban-types
  func?: PackageableElementReference<Function> | undefined;

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_SimpleFunctionExpression(this);
  }
}

export class AbstractPropertyExpression extends FunctionExpression {
  func!: AbstractProperty;

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_AbstractPropertyExpression(this);
  }
}
