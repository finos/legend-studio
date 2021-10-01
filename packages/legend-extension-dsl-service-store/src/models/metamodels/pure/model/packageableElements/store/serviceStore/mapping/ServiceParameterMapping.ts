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

import { observable, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import type { RawLambda } from '@finos/legend-graph';
import type { ServiceParameter } from '../model/ServiceParameter';

export class ServiceParameterMapping implements Hashable {
  type!: string;
  serviceParameter!: ServiceParameter;
  transform!: RawLambda;

  constructor() {
    makeObservable(this, {
      type: observable,
      serviceParameter: observable,
      transform: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_PARAMETER_MAPPING,
      this.type,
      this.serviceParameter,
      this.transform,
    ]);
  }
}
