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

import { computed, makeObservable, observable } from 'mobx';
import type { RawPrimitiveInstanceValue } from '../../../models/metamodels/pure/rawValueSpecification/RawPrimitiveInstanceValue.js';
import type { RawLambda } from '../../../models/metamodels/pure/rawValueSpecification/RawLambda.js';
import type {
  RawValueSpecification,
  RawValueSpecificationVisitor,
} from '../../../models/metamodels/pure/rawValueSpecification/RawValueSpecification.js';
import type { RawVariableExpression } from '../../../models/metamodels/pure/rawValueSpecification/RawVariableExpression.js';
import {
  observe_PackageableElementReference,
  observe_Multiplicity,
  skipObserved,
  skipObservedWithContext,
  type ObserverContext,
} from './CoreObserverHelper.js';

export const observe_RawPrimitiveInstanceValue = skipObserved(
  (metamodel: RawPrimitiveInstanceValue): RawPrimitiveInstanceValue => {
    makeObservable(metamodel, {
      multiplicity: observable,
      // NOTE: we're being defensive here, technically, since the values
      // are all of primitive types, it's safe to just use `observable`
      values: observable.shallow,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.type);
    observe_Multiplicity(metamodel.multiplicity);

    return metamodel;
  },
);

export const observe_RawLambda = skipObserved(
  (metamodel: RawLambda): RawLambda =>
    makeObservable(metamodel, {
      body: observable.ref, // only observe the reference, the object itself is not observed
      parameters: observable.ref, // only observe the reference, the object itself is not observed
      hashCode: computed,
    }),
);

export const observe_RawVariableExpression = skipObserved(
  (metamodel: RawVariableExpression): RawVariableExpression => {
    makeObservable(metamodel, {
      name: observable,
      multiplicity: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.type);
    observe_Multiplicity(metamodel.multiplicity);

    return metamodel;
  },
);

class RawValueSpecificationObserver
  implements RawValueSpecificationVisitor<void>
{
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_RawLambda(valueSpecification: RawLambda): void {
    observe_RawLambda(valueSpecification);
  }

  visit_RawVariableExpression(valueSpecification: RawVariableExpression): void {
    observe_RawVariableExpression(valueSpecification);
  }

  visit_RawPrimitiveInstanceValue(
    valueSpecification: RawPrimitiveInstanceValue,
  ): void {
    observe_RawPrimitiveInstanceValue(valueSpecification);
  }
}

export const observe_RawValueSpecification = skipObservedWithContext(
  (
    rawValueSpecification: RawValueSpecification,
    context: ObserverContext,
  ): RawValueSpecification => {
    rawValueSpecification.accept_RawValueSpecificationVisitor(
      new RawValueSpecificationObserver(context),
    );

    return rawValueSpecification;
  },
);
