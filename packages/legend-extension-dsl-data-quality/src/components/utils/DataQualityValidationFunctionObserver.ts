/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { action, isObservableObject, makeObservable, observable } from 'mobx';
import {
  type DataQualityValidationFilterCondition,
  type DataQualityValidationLogicalGroupFunction,
  type DataQualityValidationAssertionFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterFunction,
} from '../utils/DataQualityValidationFunction.js';
import type {
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from '@finos/legend-graph';

export function observe_values(
  values: (PrimitiveInstanceValue | CollectionInstanceValue)[],
) {
  values.forEach((param) => {
    if (!isObservableObject(param)) {
      makeObservable(param, {
        values: observable,
      });
    }
  });
}

export function observe_DataQualityValidationFilterCondition(
  func: DataQualityValidationFilterCondition,
) {
  observe_values(func.parameters.otherParams);

  makeObservable(func.parameters, {
    otherParams: observable,
    property: observable,
  });

  makeObservable(func, {
    parameters: observable,
    name: observable,
  });

  return func;
}

export function observe_DataQualityValidationLogicalGroupFunction(
  func: DataQualityValidationLogicalGroupFunction,
) {
  makeObservable(func.parameters, {
    left: observable,
    right: observable,
  });

  makeObservable(func, {
    parameters: observable,
    name: observable,
    changeName: action,
  });

  return func;
}

export function observe_AssertionFunction(
  assertFunc: DataQualityValidationAssertionFunction,
) {
  makeObservable(assertFunc.parameters, {
    columns: observable,
    otherParam: observable,
  });

  makeObservable(assertFunc, {
    parameters: observable,
  });

  return assertFunc;
}

export function observe_DataQualityValidationFilterFunction(
  func: DataQualityValidationFilterFunction,
) {
  makeObservable(func.parameters.lambda, {
    body: observable,
  });

  makeObservable(func.parameters, {
    lambda: observable,
  });

  makeObservable(func, {
    parameters: observable,
  });

  return func;
}

export function observe_DataQualityValidationCustomHelperFunction(
  func: DataQualityValidationCustomHelperFunction,
) {
  observe_values(func.parameters.otherParams);

  makeObservable(func.parameters, {
    column: observable,
    otherParams: observable,
  });

  makeObservable(func, {
    parameters: observable,
  });

  return func;
}

export function observe_FilterFunction(
  func:
    | DataQualityValidationCustomHelperFunction
    | DataQualityValidationFilterFunction,
) {
  if (func instanceof DataQualityValidationCustomHelperFunction) {
    observe_DataQualityValidationCustomHelperFunction(func);
  }

  if (func instanceof DataQualityValidationFilterFunction) {
    observe_DataQualityValidationFilterFunction(func);
  }

  return func;
}
