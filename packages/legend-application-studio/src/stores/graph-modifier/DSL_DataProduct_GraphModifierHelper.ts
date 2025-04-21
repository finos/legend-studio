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
  type AccessPoint,
  type DataProduct,
  observe_AccessPoint,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';

import { action } from 'mobx';

export const dataProduct_deleteAccessPoint = action(
  (product: DataProduct, accessPoint: AccessPoint) => {
    deleteEntry(product.accessPoints, accessPoint);
  },
);

export const dataProduct_addAccessPoint = action(
  (product: DataProduct, accessPoint: AccessPoint) => {
    addUniqueEntry(product.accessPoints, observe_AccessPoint(accessPoint));
  },
);
