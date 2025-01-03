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

import type {
  DataCubeSetting,
  DataCubeSettingValues,
} from './services/DataCubeSettingService.js';
import type { DataCubeSource } from './core/model/DataCubeSource.js';
import type { DataCubeState } from './DataCubeState.js';

export type DataCubeOptions = {
  // infra
  onInitialized?: ((dataCube: DataCubeState) => void) | undefined;

  // grid
  gridClientLicense?: string | undefined;

  // rendering
  onNameChanged?: ((name: string, source: DataCubeSource) => void) | undefined;
  innerHeaderComponent?:
    | ((dataCube: DataCubeState) => React.ReactNode)
    | undefined;

  // settings
  getSettingItems?: (() => DataCubeSetting[]) | undefined;
  settingValues?: DataCubeSettingValues | undefined;
  onSettingValuesChanged?:
    | ((values: DataCubeSettingValues) => void)
    | undefined;

  // documentation
  documentationUrl?: string | undefined;
};
