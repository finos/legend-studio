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

import { CubeDataProductEnvironmentType } from '../graph-manager/CubeDataProduct.js';

// The text of data product sources (PLAN §6.8): the source dialog's Data
// product tab and a data product source's panel

/** The deployment classes' labels, as Data Cube shows them */
export const CUBE_DATA_PRODUCT_ENVIRONMENT_LABELS: Readonly<
  Record<CubeDataProductEnvironmentType, string>
> = {
  [CubeDataProductEnvironmentType.PRODUCTION]: 'Production',
  [CubeDataProductEnvironmentType.PRODUCTION_PARALLEL]: 'Production (parallel)',
};

/** Said of a project deployed from a SNAPSHOT version */
export const CUBE_SNAPSHOT_VERSION_LABEL =
  'A SNAPSHOT version: its data and columns may change';

export const CUBE_WAREHOUSE_APPLY_TITLE =
  "Run the cube on this warehouse; it's remembered for your next cubes";
