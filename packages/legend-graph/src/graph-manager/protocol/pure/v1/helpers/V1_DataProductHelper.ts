/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import type { V1_DataProduct } from '../model/packageableElements/dataProduct/V1_DataProduct.js';

export const V1_dataProductHasTitleAndDescription = (
  dataProduct: V1_DataProduct,
): boolean =>
  Boolean(
    dataProduct.title?.trim().length && dataProduct.description?.trim().length,
  );

export const V1_dataProductAcessPointGroupsHasTitleAndDescription = (
  dataProduct: V1_DataProduct,
): boolean => {
  if (dataProduct.accessPointGroups.length > 1) {
    return dataProduct.accessPointGroups.every((apg) =>
      Boolean(apg.title?.trim().length && apg.description?.trim().length),
    );
  }
  return true;
};

export const V1_dataProductAccessPointsHaveTitleAndDescription = (
  dataProduct: V1_DataProduct,
): boolean =>
  dataProduct.accessPointGroups
    .map((apg) => apg.accessPoints)
    .flat()
    .every((ap) =>
      Boolean(ap.title?.trim().length && ap.description?.trim().length),
    );
