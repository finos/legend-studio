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
import type { TaskManager } from './services/DataCubeTaskService.js';

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

  /**
   * Provides a task manager that can be used by DataCube task service.
   *
   * This is useful when creating a seamless integration between DataCube and
   * the application.
   */
  taskManager?: TaskManager | undefined;
  /**
   * DataCube has initialized and is ready for most API calls, but may not be fully rendered yet.
   */
  onInitialized?: ((event: DataCubeInitializedEvent) => void) | undefined;
  /**
   * DataCube main view has initialized, and is ready for most API calls, but may not be fully rendered yet.
   * The query source has been fully resolved and analyzed, grid view is to be rendered right after.
   */
  onViewInitialized?:
    | ((event: DataCubeViewInitializedEvent) => void)
    | undefined;

  // ------------------------------ GRID ------------------------------

  /**
   * License key for the grid client (i.e. ag-grid) as DataCube makes use of
   * fair number of advanced/enterprise features.
   */
  gridClientLicense?: string | undefined;

  // ------------------------------ LAYOUT ------------------------------

  /**
   * Provides a layout manager that can be used by DataCube layout service.
   *
   * This is useful when creating a seamless integration between DataCube and
   * the application.
   */
  layoutManager?: LayoutManager | undefined;
  /**
   * The name of the DataCube main view is updated.
   */
  onNameChanged?: ((event: DataCubeNameChangedEvent) => void) | undefined;
  /**
   * Custom renderer for the inner header area, next to the title.
   */
  innerHeaderRenderer?:
    | ((params: DataCubeInnerHeaderComponentParams) => React.ReactNode)
    | undefined;

  // ------------------------------ SETTINGS ------------------------------

  /**
   * DataCube settings values (retrieved externally), which would be set as initial values,
   * and extra setting configurations that would be rendered in the settings panel.
   */
  settingsData?: DataCubeSettingsData | undefined;
  /**
   * Settings are changed and saved.
   *
   * This is useful when the application needs to persist the new settings values.
   */
  onSettingsChanged?:
    | ((event: DataCubeSettingsChangedEvent) => void)
    | undefined;

  // ------------------------------ DOCUMENTATION ------------------------------

  /**
   * URL to the documentation website.
   */
  documentationUrl?: string | undefined;
};
