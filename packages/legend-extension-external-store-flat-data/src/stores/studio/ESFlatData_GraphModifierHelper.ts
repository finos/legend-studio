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
  EnumerationMappingReference,
  observe_EnumerationMappingReference,
} from '@finos/legend-graph';
import { action } from 'mobx';
import { observe_RootFlatDataRecordType } from '../../graphManager/action/changeDetection/ESFlatData_ObserverHelper.js';
import type { FlatDataConnection } from '../../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import type { FlatDataInputData } from '../../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import type { FlatDataInstanceSetImplementation } from '../../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInstanceSetImplementation.js';
import type { FlatDataPropertyMapping } from '../../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataPropertyMapping.js';
import type { RootFlatDataRecordType } from '../../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatDataDataType.js';

export const flatData_setSourceRootRecordType = action(
  (
    fl: FlatDataInstanceSetImplementation,
    value: RootFlatDataRecordType,
  ): void => {
    observe_RootFlatDataRecordType(value);
    fl.sourceRootRecordType.value = value;
  },
);

export const flatData_setData = action(
  (input: FlatDataInputData, value: string): void => {
    input.data = value;
  },
);

export const flatDataPropertyMapping_setTransformer = action(
  (
    val: FlatDataPropertyMapping,
    value: EnumerationMappingReference | undefined,
  ): void => {
    val.transformer = value
      ? observe_EnumerationMappingReference(value)
      : undefined;
  },
);

export const flatDataConnection_setUrl = action(
  (fD: FlatDataConnection, url: string): void => {
    fD.url = url;
  },
);
