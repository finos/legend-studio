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
import {
  type Multiplicity,
  type RawVariableExpression,
  type Type,
  observe_Type,
} from '@finos/legend-graph';
import { action } from 'mobx';

export const rawVariableExpression_setName = action(
  (target: RawVariableExpression, value: string): void => {
    target.name = value;
  },
);
export const rawVariableExpression_setType = action(
  (target: RawVariableExpression, value: Type): void => {
    target.type.value = observe_Type(value);
  },
);
export const rawVariableExpression_setMultiplicity = action(
  (target: RawVariableExpression, value: Multiplicity): void => {
    target.multiplicity = value;
  },
);
