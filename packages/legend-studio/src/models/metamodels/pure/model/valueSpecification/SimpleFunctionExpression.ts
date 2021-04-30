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

import { observable, makeObservable } from 'mobx';
import type { GenericTypeReference } from '../../model/packageableElements/domain/GenericTypeReference';
import { GenericTypeExplicitReference } from '../../model/packageableElements/domain/GenericTypeReference';
import type { Multiplicity } from '../../model/packageableElements/domain/Multiplicity';
import type { PackageableElementReference } from '../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../model/packageableElements/PackageableElementReference';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';
import type { Function } from '../../model/packageableElements/domain/Function';
import type { AbstractProperty } from '../../model/packageableElements/domain/AbstractProperty';
import type { Class } from '../../model/packageableElements/domain/Class';
import { ClassInstanceValue } from '../../model/valueSpecification/InstanceValue';
import { GenericType } from '../../model/packageableElements/domain/GenericType';

export enum SUPPORTED_FUNCTIONS {
  FILTER = 'filter',
  PROJECT = 'project',
  GET_ALL = 'getAll',
  COL = 'col',
  TAKE = 'take',
  DISTINCT = 'distinct',
  SORT_FUNC = 'sort',
  SERIALIZE = 'serialize',
  GRAPH_FETCH_CHECKED = 'graphFetchChecked',
  EXISTS = 'exists',
  NOT = 'not',
}

export class Expression extends ValueSpecification {
  classifierGenericType?: GenericTypeReference;

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
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
    });
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_FunctionExpression(this);
  }
}

export class SimpleFunctionExpression extends FunctionExpression {
  func?: PackageableElementReference<Function>;

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_SimpleFunctionExpression(this);
  }
}

export class AbstractPropertyExpression extends FunctionExpression {
  func!: AbstractProperty;

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_AbstractPropertyExpression(this);
  }
}

export function getAllFunction(
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression {
  const _func = new SimpleFunctionExpression(
    SUPPORTED_FUNCTIONS.GET_ALL,
    multiplicity,
  );
  const classInstance = new ClassInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(_class)),
    multiplicity,
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
}
