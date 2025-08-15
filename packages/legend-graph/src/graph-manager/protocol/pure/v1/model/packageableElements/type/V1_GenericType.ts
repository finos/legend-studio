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

import { hashArray } from '@finos/legend-shared';
import type { V1_ValueSpecification } from '../../valueSpecification/V1_ValueSpecification.js';
import type { V1_Multiplicity } from '../domain/V1_Multiplicity.js';
import type { V1_Type } from './V1_Type.js';

export class V1_GenericType {
  rawType!: V1_Type;
  typeArguments: V1_GenericType[] = [];
  multiplicityArguments: V1_Multiplicity[] = [];
  typeVariableValues: V1_ValueSpecification[] = [];

  get hashCode(): string {
    return hashArray([
      this.rawType.hashCode,
      hashArray(this.typeArguments),
      hashArray(this.typeVariableValues),
    ]);
  }
}
