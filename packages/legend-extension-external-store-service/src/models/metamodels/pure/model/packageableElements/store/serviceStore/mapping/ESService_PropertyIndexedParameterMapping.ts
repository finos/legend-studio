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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_ModelUtils';
import { ServiceParameterMapping } from './ESService_ServiceParameterMapping';
import { action, computed, makeObservable, observable } from 'mobx';

export class PropertyIndexedParameterMapping
  extends ServiceParameterMapping
  implements Hashable
{
  property!: string;

  constructor() {
    super();

    makeObservable(this, {
      property: observable,
      setProperty: action,
      hashCode: computed,
    });
  }

  setProperty(value: string): void {
    this.property = value;
  }

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.PROPERTY_INDEXED_PARAMETER_MAPPING,
      this.serviceParameter.name,
      this.property,
    ]);
  }
}
