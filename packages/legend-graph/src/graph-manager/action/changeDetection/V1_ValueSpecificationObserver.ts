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
import { skipObserved } from './CoreObserverHelper.js';
import {
  type V1_ValueSpecification,
  type V1_ValueSpecificationVisitor,
} from '../../protocol/pure/v1/model/valueSpecification/V1_ValueSpecification.js';
import type { V1_Variable } from '../../protocol/pure/v1/model/valueSpecification/V1_Variable.js';
import type { V1_Lambda } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_Lambda.js';
import type { V1_EnumValue } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_EnumValue.js';
import type { V1_AppliedFunction } from '../../protocol/pure/v1/model/valueSpecification/application/V1_AppliedFunction.js';
import type { V1_Collection } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_Collection.js';
import type { V1_KeyExpression } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_KeyExpression.js';
import type { V1_AppliedProperty } from '../../protocol/pure/v1/model/valueSpecification/application/V1_AppliedProperty.js';
import type { V1_PackageableElementPtr } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_PackageableElementPtr.js';
import type { V1_INTERNAL__UnknownValueSpecification } from '../../protocol/pure/v1/model/valueSpecification/V1_INTERNAL__UnknownValueSpecfication.js';
import type { V1_GenericTypeInstance } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_GenericTypeInstance.js';
import type { V1_ClassInstance } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_ClassInstance.js';
import type { V1_CInteger } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CInteger.js';
import type { V1_CDecimal } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CDecimal.js';
import type { V1_CString } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CString.js';
import type { V1_CBoolean } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CBoolean.js';
import type { V1_CFloat } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CFloat.js';
import type { V1_CDateTime } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CDateTime.js';
import type { V1_CStrictDate } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CStrictDate.js';
import type { V1_CStrictTime } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CStrictTime.js';
import type { V1_CLatestDate } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CLatestDate.js';
import type { V1_CByteArray } from '../../protocol/pure/v1/model/valueSpecification/raw/V1_CByteArray.js';

const observe_Abstract_V1_ValueSpecification = (
  metamodel: V1_ValueSpecification,
): void => {
  makeObservable<V1_ValueSpecification>(metamodel, {
    // NOTE: V1_ValueSpecification doesn't have multiplicity as an observable property
    // since it's often defined as a readonly property in subclasses
  });
};

export const observe_V1_Variable = skipObserved(
  (metamodel: V1_Variable): V1_Variable => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_Variable>(metamodel, {
      name: observable,
      multiplicity: observable,
      genericType: observable,
    });

    return metamodel;
  },
);

export const observe_V1_Collection = skipObserved(
  (metamodel: V1_Collection): V1_Collection => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_Collection>(metamodel, {
      values: observable,
    });

    metamodel.values.forEach(observe_V1ValueSpecification);

    return metamodel;
  },
);

export const observe_V1_EnumValue = skipObserved(
  (metamodel: V1_EnumValue): V1_EnumValue => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_EnumValue>(metamodel, {
      fullPath: observable,
      value: observable,
    });

    return metamodel;
  },
);

export const observe_V1_AppliedFunction = skipObserved(
  (metamodel: V1_AppliedFunction): V1_AppliedFunction => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_AppliedFunction>(metamodel, {
      function: observable,
      fControl: observable,
      parameters: observable,
    });

    metamodel.parameters.forEach(observe_V1ValueSpecification);

    return metamodel;
  },
);

export const observe_V1_AppliedProperty = skipObserved(
  (metamodel: V1_AppliedProperty): V1_AppliedProperty => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_AppliedProperty>(metamodel, {
      property: observable,
      parameters: observable,
    });

    metamodel.parameters.forEach(observe_V1ValueSpecification);

    return metamodel;
  },
);

export const observe_V1_Lambda = skipObserved(
  (metamodel: V1_Lambda): V1_Lambda => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_Lambda>(metamodel, {
      body: observable,
      parameters: observable,
    });

    if (metamodel.body) {
      metamodel.body.forEach(observe_V1ValueSpecification);
    }

    metamodel.parameters.forEach(observe_V1_Variable);

    return metamodel;
  },
);

export const observe_V1_KeyExpression = skipObserved(
  (metamodel: V1_KeyExpression): V1_KeyExpression => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_KeyExpression>(metamodel, {
      key: observable,
      expression: observable,
    });

    if (metamodel.key) {
      observe_V1ValueSpecification(metamodel.key);
    }

    if (metamodel.expression) {
      observe_V1ValueSpecification(metamodel.expression);
    }

    return metamodel;
  },
);

export const observe_V1_PackageableElementPtr = skipObserved(
  (metamodel: V1_PackageableElementPtr): V1_PackageableElementPtr => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_PackageableElementPtr>(metamodel, {
      fullPath: observable,
    });

    return metamodel;
  },
);

export const observe_V1_GenericTypeInstance = skipObserved(
  (metamodel: V1_GenericTypeInstance): V1_GenericTypeInstance => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_GenericTypeInstance>(metamodel, {
      genericType: observable,
    });

    return metamodel;
  },
);

export const observe_V1_ClassInstance = skipObserved(
  (metamodel: V1_ClassInstance): V1_ClassInstance => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable<V1_ClassInstance>(metamodel, {
      type: observable,
      value: observable,
    });

    return metamodel;
  },
);

// Observer functions for primitive types
const observe_V1_PrimitiveType = skipObserved(
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
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable(metamodel, {
      value: observable,
    });

    return metamodel;
  },
);

export const observe_V1_INTERNAL__UnknownValueSpecification = skipObserved(
  (
    metamodel: V1_INTERNAL__UnknownValueSpecification,
  ): V1_INTERNAL__UnknownValueSpecification => {
    observe_Abstract_V1_ValueSpecification(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
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
    observe_V1_INTERNAL__UnknownValueSpecification(valueSpecification);
  }

  visit_Variable(valueSpecification: V1_Variable): void {
    observe_V1_Variable(valueSpecification);
  }

  visit_Lambda(valueSpecification: V1_Lambda): void {
    observe_V1_Lambda(valueSpecification);
  }

  visit_KeyExpression(valueSpecification: V1_KeyExpression): void {
    observe_V1_KeyExpression(valueSpecification);
  }

  visit_AppliedFunction(valueSpecification: V1_AppliedFunction): void {
    observe_V1_AppliedFunction(valueSpecification);
  }

  visit_AppliedProperty(valueSpecification: V1_AppliedProperty): void {
    observe_V1_AppliedProperty(valueSpecification);
  }

  visit_PackageableElementPtr(
    valueSpecification: V1_PackageableElementPtr,
  ): void {
    observe_V1_PackageableElementPtr(valueSpecification);
  }

  visit_GenericTypeInstance(valueSpecification: V1_GenericTypeInstance): void {
    observe_V1_GenericTypeInstance(valueSpecification);
  }

  visit_Collection(valueSpecification: V1_Collection): void {
    observe_V1_Collection(valueSpecification);
  }

  visit_EnumValue(valueSpecification: V1_EnumValue): void {
    observe_V1_EnumValue(valueSpecification);
  }

  visit_CInteger(valueSpecification: V1_CInteger): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CDecimal(valueSpecification: V1_CDecimal): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CString(valueSpecification: V1_CString): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CBoolean(valueSpecification: V1_CBoolean): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CByteArray(valueSpecification: V1_CByteArray): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CFloat(valueSpecification: V1_CFloat): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CDateTime(valueSpecification: V1_CDateTime): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CStrictDate(valueSpecification: V1_CStrictDate): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CStrictTime(valueSpecification: V1_CStrictTime): void {
    observe_V1_PrimitiveType(valueSpecification);
  }

  visit_CLatestDate(valueSpecification: V1_CLatestDate): void {
    observe_Abstract_V1_ValueSpecification(valueSpecification);
  }

  visit_ClassInstance(valueSpecification: V1_ClassInstance): void {
    observe_V1_ClassInstance(valueSpecification);
  }
}

/**
 * Make a V1_ValueSpecification observable
 *
 * @param valueSpecification - The V1_ValueSpecification to make observable
 * @returns The observed V1_ValueSpecification
 */
export const observe_V1ValueSpecification = skipObserved(
  (valueSpecification: V1_ValueSpecification): V1_ValueSpecification => {
    valueSpecification.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationObserver(),
    );
    return valueSpecification;
  },
);
