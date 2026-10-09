/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { UserDataService } from '@finos/legend-application';
import { LEGEND_CUBE_USER_DATA_KEY } from '../__lib__/LegendCubeLabels.js';

// The warehouse the viewer last picked for a data product cube (PLAN §6.8,
// DP-2): a cube without its own runs on it, and a new cube starts on it

export const getCubeRememberedWarehouse = (
  userDataService: UserDataService,
): string | undefined => {
  const warehouse = userDataService.getStringValue(
    LEGEND_CUBE_USER_DATA_KEY.DATA_PRODUCT_WAREHOUSE,
  );
  // an empty value is none
  return warehouse?.length ? warehouse : undefined;
};

export const rememberCubeWarehouse = (
  userDataService: UserDataService,
  warehouse: string,
): void =>
  userDataService.persistValue(
    LEGEND_CUBE_USER_DATA_KEY.DATA_PRODUCT_WAREHOUSE,
    warehouse,
  );
