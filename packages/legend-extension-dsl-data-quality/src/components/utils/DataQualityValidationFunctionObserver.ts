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
  type DataQualityValidationPropertyGuarantee,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterFunction,
} from '../utils/DataQualityValidationFunction.js';
import {
  skipObserved,
  type CollectionInstanceValue,
  type PrimitiveInstanceValue,
} from '@finos/legend-graph';

export const observe_values = (
  values: (PrimitiveInstanceValue | CollectionInstanceValue)[],
) => {
  values.forEach((param) => {
    if (!isObservableObject(param)) {
      makeObservable(param, {
        values: observable,
      });
    }
  });
};

const observe_FilterConditionParameters = skipObserved(
  (func: DataQualityValidationFilterCondition) => {
    makeObservable(func.parameters, {
      otherParams: observable,
      property: observable,
    });
    return func;
  },
);

const observe_FilterConditionFunc = skipObserved(
  (func: DataQualityValidationFilterCondition) => {
    makeObservable(func, {
      parameters: observable,
      name: observable,
    });
    return func;
  },
);

export const observe_DataQualityValidationFilterCondition = skipObserved(
  (func: DataQualityValidationFilterCondition) => {
    observe_values(func.parameters.otherParams);
    observe_FilterConditionParameters(func);
    observe_FilterConditionFunc(func);

    return func;
  },
);

const observe_PropertyGuaranteeParameters = skipObserved(
  (func: DataQualityValidationPropertyGuarantee) => {
    makeObservable(func.parameters, {
      property: observable,
    });
    return func;
  },
);

const observe_PropertyGuaranteeFunc = skipObserved(
  (func: DataQualityValidationPropertyGuarantee) => {
    makeObservable(func, {
      parameters: observable,
      name: observable,
    });
    return func;
  },
);

export const observe_DataQualityValidationPropertyGuarantee = skipObserved(
  (func: DataQualityValidationPropertyGuarantee) => {
    observe_PropertyGuaranteeParameters(func);
    observe_PropertyGuaranteeFunc(func);

    return func;
  },
);

const observe_LogicalGroupParameters = skipObserved(
  (func: DataQualityValidationLogicalGroupFunction) => {
    makeObservable(func.parameters, {
      left: observable,
      right: observable,
    });
    return func;
  },
);

const observe_LogicalGroupFunc = skipObserved(
  (func: DataQualityValidationLogicalGroupFunction) => {
    makeObservable(func, {
      parameters: observable,
      name: observable,
      changeName: action,
    });
    return func;
  },
);

export const observe_DataQualityValidationLogicalGroupFunction = skipObserved(
  (func: DataQualityValidationLogicalGroupFunction) => {
    observe_LogicalGroupParameters(func);
    observe_LogicalGroupFunc(func);

    return func;
  },
);

const observe_AssertionParameters = skipObserved(
  (assertFunc: DataQualityValidationAssertionFunction) => {
    makeObservable(assertFunc.parameters, {
      columns: observable,
      otherParam: observable,
    });
    return assertFunc;
  },
);

const observe_AssertionFunc = skipObserved(
  (assertFunc: DataQualityValidationAssertionFunction) => {
    makeObservable(assertFunc, {
      parameters: observable,
    });
    return assertFunc;
  },
);

export const observe_AssertionFunction = skipObserved(
  (assertFunc: DataQualityValidationAssertionFunction) => {
    observe_AssertionParameters(assertFunc);
    observe_AssertionFunc(assertFunc);

    return assertFunc;
  },
);

const observe_FilterFunctionLambda = skipObserved(
  (func: DataQualityValidationFilterFunction) => {
    makeObservable(func.parameters.lambda, {
      body: observable,
    });
    return func;
  },
);

const observe_FilterFunctionParameters = skipObserved(
  (func: DataQualityValidationFilterFunction) => {
    makeObservable(func.parameters, {
      lambda: observable,
    });
    return func;
  },
);

const observe_FilterFunctionFunc = skipObserved(
  (func: DataQualityValidationFilterFunction) => {
    makeObservable(func, {
      parameters: observable,
    });
    return func;
  },
);

export const observe_DataQualityValidationFilterFunction = skipObserved(
  (func: DataQualityValidationFilterFunction) => {
    observe_FilterFunctionLambda(func);
    observe_FilterFunctionParameters(func);
    observe_FilterFunctionFunc(func);

    return func;
  },
);

const observe_CustomHelperParameters = skipObserved(
  (func: DataQualityValidationCustomHelperFunction) => {
    makeObservable(func.parameters, {
      column: observable,
      otherParams: observable,
    });
    return func;
  },
);

const observe_CustomHelperFunc = skipObserved(
  (func: DataQualityValidationCustomHelperFunction) => {
    makeObservable(func, {
      parameters: observable,
    });
    return func;
  },
);

export const observe_DataQualityValidationCustomHelperFunction = skipObserved(
  (func: DataQualityValidationCustomHelperFunction) => {
    observe_values(func.parameters.otherParams);
    observe_CustomHelperParameters(func);
    observe_CustomHelperFunc(func);

    return func;
  },
);

export const observe_FilterFunction = skipObserved(
  (
    func:
      | DataQualityValidationCustomHelperFunction
      | DataQualityValidationFilterFunction,
  ) => {
    if (func instanceof DataQualityValidationCustomHelperFunction) {
      observe_DataQualityValidationCustomHelperFunction(func);
    }

    if (func instanceof DataQualityValidationFilterFunction) {
      observe_DataQualityValidationFilterFunction(func);
    }

    return func;
  },
);
