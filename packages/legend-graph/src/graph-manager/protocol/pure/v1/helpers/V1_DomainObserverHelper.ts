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
import type { V1_GenericType } from '../model/packageableElements/type/V1_GenericType.js';
import { skipObserved } from '../../../../action/changeDetection/CoreObserverHelper.js';
import { V1_observe_ValueSpecification } from './V1_ValueSpecificationObserver.js';
import type { V1_ParameterValue } from '../model/packageableElements/service/V1_ParameterValue.js';
import { V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';

export const V1_observe_GenericType = skipObserved(
  (metamodel: V1_GenericType): V1_GenericType => {
    makeObservable(metamodel, {
      rawType: observable,
      multiplicityArguments: observable,
      hashCode: computed,
    });

    metamodel.typeArguments.forEach(V1_observe_GenericType);
    metamodel.typeVariableValues.forEach(V1_observe_ValueSpecification);

    return metamodel;
  },
);

export const V1_observe_ParameterValue = skipObserved(
  (metamodel: V1_ParameterValue): V1_ParameterValue => {
    makeObservable(metamodel, {
      name: observable,
      value: observable,
      hashCode: computed,
    });

    if (metamodel.value instanceof V1_ValueSpecification) {
      V1_observe_ValueSpecification(metamodel.value);
    }

    return metamodel;
  },
);
