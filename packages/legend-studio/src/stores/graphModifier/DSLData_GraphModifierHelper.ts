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
  type DataElement,
  type EmbeddedData,
  type ObserverContext,
  type ExternalFormatData,
  type ModelStoreData,
  type Class,
  observe_EmbeddedData,
} from '@finos/legend-graph';
import { action } from 'mobx';

export const dataElement_setEmbeddedData = action(
  (
    dataElement: DataElement,
    value: EmbeddedData,
    context: ObserverContext,
  ): void => {
    dataElement.data = observe_EmbeddedData(value, context);
  },
);

export const externalFormatData_setContentType = action(
  (externalFormatData: ExternalFormatData, value: string): void => {
    externalFormatData.contentType = value;
  },
);

export const externalFormatData_setData = action(
  (externalFormatData: ExternalFormatData, value: string): void => {
    externalFormatData.data = value;
  },
);

export const modelStoreData_setInstance = action(
  (modelStoreData: ModelStoreData, value: Map<Class, object>): void => {
    modelStoreData.instances = value;
  },
);
