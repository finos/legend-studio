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

import { hashObjectWithoutSourceInformation } from '@finos/legend-graph';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../ESService_ModelUtils';
import type { V1_ServiceStoreServicePtr } from '../model/V1_ESService_ServiceStoreServicePtr';
import type { V1_ServiceParameterMapping } from './V1_ESService_ServiceParameterMapping';

export class V1_ServiceMapping implements Hashable {
  service!: V1_ServiceStoreServicePtr;
  parameterMappings: V1_ServiceParameterMapping[] = [];
  pathOffset: object | undefined; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_MAPPING,
      this.service.service,
      hashArray(this.parameterMappings),
      this.pathOffset
        ? hashObjectWithoutSourceInformation(this.pathOffset)
        : '',
    ]);
  }
}
