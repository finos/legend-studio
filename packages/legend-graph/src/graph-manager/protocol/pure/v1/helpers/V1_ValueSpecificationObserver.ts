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

import { makeObservable, observable } from 'mobx';
import {
  type V1_ValueSpecification,
  type V1_ValueSpecificationVisitor,
} from '../model/valueSpecification/V1_ValueSpecification.js';
import type { V1_Variable } from '../model/valueSpecification/V1_Variable.js';
import type { V1_Lambda } from '../model/valueSpecification/raw/V1_Lambda.js';
import type { V1_EnumValue } from '../model/valueSpecification/raw/V1_EnumValue.js';
import type { V1_AppliedFunction } from '../model/valueSpecification/application/V1_AppliedFunction.js';
import type { V1_Collection } from '../model/valueSpecification/raw/V1_Collection.js';
import type { V1_KeyExpression } from '../model/valueSpecification/raw/V1_KeyExpression.js';
import type { V1_AppliedProperty } from '../model/valueSpecification/application/V1_AppliedProperty.js';
import type { V1_PackageableElementPtr } from '../model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import type { V1_GenericTypeInstance } from '../model/valueSpecification/raw/V1_GenericTypeInstance.js';
import type { V1_ClassInstance } from '../model/valueSpecification/raw/V1_ClassInstance.js';
import type { V1_CInteger } from '../model/valueSpecification/raw/V1_CInteger.js';
import type { V1_CDecimal } from '../model/valueSpecification/raw/V1_CDecimal.js';
import type { V1_CString } from '../model/valueSpecification/raw/V1_CString.js';
import type { V1_CBoolean } from '../model/valueSpecification/raw/V1_CBoolean.js';
import type { V1_CFloat } from '../model/valueSpecification/raw/V1_CFloat.js';
import type { V1_CDateTime } from '../model/valueSpecification/raw/V1_CDateTime.js';
import type { V1_CStrictDate } from '../model/valueSpecification/raw/V1_CStrictDate.js';
import type { V1_CStrictTime } from '../model/valueSpecification/raw/V1_CStrictTime.js';
import type { V1_CLatestDate } from '../model/valueSpecification/raw/V1_CLatestDate.js';
import type { V1_CByteArray } from '../model/valueSpecification/raw/V1_CByteArray.js';
import { skipObserved } from '../../../../action/changeDetection/CoreObserverHelper.js';
import { V1_observe_GenericType } from './V1_DomainObserverHelper.js';
import type { V1_AbstractAppliedFunction } from '../model/valueSpecification/raw/V1_AbstractAppliedFunction.js';
import type { V1_ColSpec } from '../model/valueSpecification/raw/classInstance/relation/V1_ColSpec.js';
import type { V1_ColSpecArray } from '../model/valueSpecification/raw/classInstance/relation/V1_ColSpecArray.js';

const V1_observe_Abstract_ValueSpecification = (
  metamodel: V1_ValueSpecification,
): void => {
  makeObservable<V1_ValueSpecification>(metamodel, {});
};

export const V1_observe_Variable = skipObserved(
  (metamodel: V1_Variable): V1_Variable => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable<V1_Variable>(metamodel, {
      name: observable,
      multiplicity: observable,
      genericType: observable,
    });

    if (metamodel.genericType) {
      V1_observe_GenericType(metamodel.genericType);
    }

    return metamodel;
  },
);

export const V1_observe_AppliedFunction = skipObserved(
  _V1_observe_AppliedFunction,
);

export const V1_observe_AppliedProperty = skipObserved(
  _V1_observe_AppliedProperty,
);

// Observer functions for primitive types
const V1_observe_PrimitiveType = skipObserved(
  (
    metamodel:
      | V1_CInteger
      | V1_CDecimal
      | V1_CString
      | V1_CBoolean
      | V1_CFloat
      | V1_CDateTime
      | V1_CStrictDate
      | V1_CStrictTime
      | V1_CByteArray,
  ) => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable(metamodel, {
      value: observable,
    });

    return metamodel;
  },
);

export const V1_observe_EnumValue = skipObserved(
  (metamodel: V1_EnumValue): V1_EnumValue => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable<V1_EnumValue>(metamodel, {
      fullPath: observable,
      value: observable,
    });

    return metamodel;
  },
);

export const V1_observe_Collection = skipObserved(_V1_observe_Collection);

export const V1_observe_KeyExpression = skipObserved(_V1_observe_KeyExpression);

export const V1_observe_ColSpec = skipObserved(_V1_observe_ColSpec);

export const V1_observe_ColSpecArray = skipObserved(
  (metamodel: V1_ColSpecArray): V1_ColSpecArray => {
    makeObservable(metamodel, {
      colSpecs: observable,
    });

    metamodel.colSpecs.forEach(V1_observe_ColSpec);

    return metamodel;
  },
);

export const V1_observe_Lambda = skipObserved(_V1_observe_Lambda);

const V1_observe_INTERNAL__UnknownValueSpecification = skipObserved(
  (
    metamodel: V1_INTERNAL__UnknownValueSpecification,
  ): V1_INTERNAL__UnknownValueSpecification => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

export const V1_observe_PackageableElementPtr = skipObserved(
  (metamodel: V1_PackageableElementPtr): V1_PackageableElementPtr => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable<V1_PackageableElementPtr>(metamodel, {
      multiplicity: observable,
      fullPath: observable,
    });

    return metamodel;
  },
);

export const V1_observe_GenericTypeInstance = skipObserved(
  (metamodel: V1_GenericTypeInstance): V1_GenericTypeInstance => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable<V1_GenericTypeInstance>(metamodel, {
      multiplicity: observable,
      genericType: observable,
    });

    V1_observe_GenericType(metamodel.genericType);

    return metamodel;
  },
);

export const V1_observe_ClassInstance = skipObserved(
  (metamodel: V1_ClassInstance): V1_ClassInstance => {
    V1_observe_Abstract_ValueSpecification(metamodel);

    makeObservable<V1_ClassInstance>(metamodel, {
      multiplicity: observable,
      type: observable,
      value: observable,
    });

    return metamodel;
  },
);

class V1_ValueSpecificationObserver
  implements V1_ValueSpecificationVisitor<void>
{
  visit_INTERNAL__UnknownValueSpecfication(
    valueSpecification: V1_INTERNAL__UnknownValueSpecification,
  ): void {
    V1_observe_INTERNAL__UnknownValueSpecification(valueSpecification);
  }

  visit_AppliedFunction(valueSpecification: V1_AppliedFunction): void {
    V1_observe_AppliedFunction(valueSpecification);
  }

  visit_Variable(valueSpecification: V1_Variable): void {
    V1_observe_Variable(valueSpecification);
  }

  visit_Lambda(valueSpecification: V1_Lambda): void {
    V1_observe_Lambda(valueSpecification);
  }

  visit_KeyExpression(valueSpecification: V1_KeyExpression): void {
    V1_observe_KeyExpression(valueSpecification);
  }

  visit_AppliedProperty(valueSpecification: V1_AppliedProperty): void {
    V1_observe_AppliedProperty(valueSpecification);
  }

  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): void {
    V1_observe_PackageableElementPtr(valueSpecification);
  }

  visit_GenericTypeInstance(valueSpecification: V1_GenericTypeInstance): void {
    V1_observe_GenericTypeInstance(valueSpecification);
  }

  visit_Collection(valueSpecification: V1_Collection): void {
    V1_observe_Collection(valueSpecification);
  }

  visit_EnumValue(valueSpecification: V1_EnumValue): void {
    V1_observe_EnumValue(valueSpecification);
  }

  visit_CInteger(valueSpecification: V1_CInteger): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CDecimal(valueSpecification: V1_CDecimal): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CString(valueSpecification: V1_CString): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CBoolean(valueSpecification: V1_CBoolean): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CByteArray(valueSpecification: V1_CByteArray): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CFloat(valueSpecification: V1_CFloat): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CDateTime(valueSpecification: V1_CDateTime): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CStrictDate(valueSpecification: V1_CStrictDate): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CStrictTime(valueSpecification: V1_CStrictTime): void {
    V1_observe_PrimitiveType(valueSpecification);
  }

  visit_CLatestDate(valueSpecification: V1_CLatestDate): void {
    V1_observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_ClassInstance(valueSpecification: V1_ClassInstance): void {
    V1_observe_ClassInstance(valueSpecification);
  }
}

/**
 * Make a V1_ValueSpecification observable
 *
 * @param valueSpecification - The V1_ValueSpecification to make observable
 * @returns The observed V1_ValueSpecification
 */
export const V1_observe_ValueSpecification = skipObserved(
  (valueSpecification: V1_ValueSpecification): V1_ValueSpecification => {
    valueSpecification.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationObserver(),
    );
    return valueSpecification;
  },
);

function V1_observe_Abstract_AppliedFunction(
  metamodel: V1_AbstractAppliedFunction,
): V1_AbstractAppliedFunction {
  V1_observe_Abstract_ValueSpecification(metamodel);

  makeObservable(metamodel, {
    multiplicity: observable,
  });

  return metamodel;
}

function _V1_observe_AppliedFunction(
  metamodel: V1_AppliedFunction,
): V1_AppliedFunction {
  V1_observe_Abstract_AppliedFunction(metamodel);

  makeObservable(metamodel, {
    function: observable,
    fControl: observable,
    parameters: observable,
  });

  metamodel.parameters.forEach(V1_observe_ValueSpecification);

  return metamodel;
}

function _V1_observe_AppliedProperty(
  metamodel: V1_AppliedProperty,
): V1_AppliedProperty {
  V1_observe_Abstract_AppliedFunction(metamodel);

  makeObservable<V1_AppliedProperty>(metamodel, {
    class: observable,
    property: observable,
    parameters: observable,
  });

  metamodel.parameters.forEach(V1_observe_ValueSpecification);

  return metamodel;
}

function _V1_observe_Collection(metamodel: V1_Collection): V1_Collection {
  V1_observe_Abstract_ValueSpecification(metamodel);

  makeObservable<V1_Collection>(metamodel, {
    multiplicity: observable,
    values: observable,
  });

  metamodel.values.forEach(V1_observe_ValueSpecification);

  return metamodel;
}

function _V1_observe_KeyExpression(
  metamodel: V1_KeyExpression,
): V1_KeyExpression {
  V1_observe_Abstract_ValueSpecification(metamodel);

  makeObservable<V1_KeyExpression>(metamodel, {
    add: observable,
    expression: observable,
    key: observable,
  });

  V1_observe_ValueSpecification(metamodel.key);
  V1_observe_ValueSpecification(metamodel.expression);

  return metamodel;
}

function _V1_observe_ColSpec(metamodel: V1_ColSpec): V1_ColSpec {
  makeObservable<V1_ColSpec>(metamodel, {
    name: observable,
    type: observable,
    function1: observable,
    function2: observable,
  });

  if (metamodel.function1) {
    V1_observe_Lambda(metamodel.function1);
  }
  if (metamodel.function2) {
    V1_observe_Lambda(metamodel.function2);
  }

  return metamodel;
}

function _V1_observe_Lambda(metamodel: V1_Lambda): V1_Lambda {
  V1_observe_Abstract_ValueSpecification(metamodel);

  makeObservable<V1_Lambda>(metamodel, {
    body: observable,
    parameters: observable,
  });

  metamodel.body.forEach(V1_observe_ValueSpecification);
  metamodel.parameters.forEach(V1_observe_Variable);

  return metamodel;
}
