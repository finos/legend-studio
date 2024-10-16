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

import type { DataCubeInitialInput } from './core/DataCubeEngine.js';
import type { DataCubeSource } from './core/models/DataCubeSource.js';

export type DataCubeOptions = {
  enableDebugMode?: boolean | undefined;
  gridClientRowBuffer?: number | undefined;
  gridClientPurgeClosedRowNodes?: boolean | undefined;
  gridClientSuppressLargeDatasetWarning?: boolean | undefined;
  initialInput?: DataCubeInitialInput | undefined;

  onNameChanged?: ((name: string, source: DataCubeSource) => void) | undefined;
  onSettingChanged?:
    | ((
        key: string,
        value: string | number | boolean | object | undefined,
      ) => void)
    | undefined;
};
