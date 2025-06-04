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
  type AccessPointGroup,
  type DataProduct,
  observe_AccessPoint,
  observe_AccessPointGroup,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';

import { action } from 'mobx';

export const dataProduct_deleteAccessPoint = action(
  (group: AccessPointGroup, accessPoint: AccessPoint) => {
    deleteEntry(group.accessPoints, accessPoint);
  },
);

export const dataProduct_addAccessPoint = action(
  (product: AccessPointGroup, accessPoint: AccessPoint) => {
    addUniqueEntry(product.accessPoints, observe_AccessPoint(accessPoint));
  },
);

export const accessPointGroup_setDescription = action(
  (product: AccessPointGroup, description: string) => {
    product.description = description;
  },
);

export const dataProduct_addAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    addUniqueEntry(
      product.accessPointGroups,
      observe_AccessPointGroup(accessPointGroup),
    );
  },
);

export const dataProduct_deleteAccessPointGroup = action(
  (product: DataProduct, accessPointGroup: AccessPointGroup) => {
    deleteEntry(product.accessPointGroups, accessPointGroup);
  },
);

export const dataProduct_setTitle = action(
  (product: DataProduct, title: string) => {
    product.title = title;
  },
);

export const dataProduct_setDescription = action(
  (product: DataProduct, description: string) => {
    product.description = description;
  },
);
