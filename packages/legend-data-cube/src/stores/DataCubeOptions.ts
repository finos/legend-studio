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
import type { DataCubeAPI } from './DataCubeAPI.js';
import type { LayoutManager } from './services/DataCubeLayoutService.js';

type DataCubeOptionsBaseEvent = {
  api: DataCubeAPI;
};
export type DataCubeInitializedEvent = DataCubeOptionsBaseEvent;
export type DataCubeViewInitializedEvent = DataCubeOptionsBaseEvent & {
  source: DataCubeSource;
};
export type DataCubeNameChangedEvent = DataCubeOptionsBaseEvent & {
  name: string;
  source: DataCubeSource;
};
export type DataCubeSettingsChangedEvent = DataCubeOptionsBaseEvent & {
  values: DataCubeSettingValues;
};

type DataCubeSettingsData = {
  configurations?: DataCubeSetting[] | undefined;
  values?: DataCubeSettingValues | undefined;
};

export type DataCubeMenuItem = {
  label: string;
  disabled?: boolean | undefined;
  action: () => void;
};

type DataCubeOptionsBaseParams = {
  api: DataCubeAPI;
};
export type DataCubeInnerHeaderComponentParams = DataCubeOptionsBaseParams;

export type DataCubeOptions = {
  // -------------------------- INFRASTRUCTURE ------------------------------

  onInitialized?: ((event: DataCubeInitializedEvent) => void) | undefined;
  onViewInitialized?:
    | ((event: DataCubeViewInitializedEvent) => void)
    | undefined;

  // ------------------------------ GRID ------------------------------

  layoutManager?: LayoutManager | undefined;
  gridClientLicense?: string | undefined;

  // ------------------------------ LAYOUT ------------------------------

  onNameChanged?: ((event: DataCubeNameChangedEvent) => void) | undefined;
  innerHeaderRenderer?:
    | ((params: DataCubeInnerHeaderComponentParams) => React.ReactNode)
    | undefined;

  // ------------------------------ SETTINGS ------------------------------

  settingsData?: DataCubeSettingsData | undefined;
  onSettingsChanged?:
    | ((event: DataCubeSettingsChangedEvent) => void)
    | undefined;

  // ------------------------------ DOCUMENTATION ------------------------------

  documentationUrl?: string | undefined;
};
