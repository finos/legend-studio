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

export enum DataCubeEvent {
  SETTINGS__FAILURE__FOUND_UNREGISTERED_SETTING = 'data-cube.settings.failure.found-unregistered-setting',
  SETTINGS__FAILURE__ASSIGN_INCOMPATIBLE_VALUE = 'data-cube.settings.failure.assign-incompatible-value',
  SETTINGS__FAILURE__RETRIEVE_INCOMPATIBLE_VALUE = 'data-cube.settings.failure.retrieve-incompatible-value',
  EMAIL_DATACUBE = 'data-cube.email-data-cube',
  EXPORT_DATACUBE = 'data-cube.export-data-cube',
  CACHING_ENABLE__SUCCESS = 'data-cube.enable-caching.success',
  CACHING_DISABLE__SUCCESS = 'data-cube.disable-caching.success',
  SELECT_ACTION_CACHE_LOAD_ALERT = 'data-cube.select-action-caching-load-alert',
  PAGINATION_ENABLE__SUCCESS = 'data-cube.enable-pagination.success',
  PAGINATION_DISABLE__SUCCESS = 'data-cube.disable-pagination.success',
  SELECT_ACTION_PAGINATION_ALERT = 'data-cube.select-action-pagination-alert',
  APPLY_CHANGES_PROPERTIES = 'data-cube.apply-changes-properties',
  APPLY_CHANGES_FILTER = 'data-cube.apply-changes-filter',
  SELECT_ITEM_TITLE_BAR = 'data-cube.select-item-title-bar',
  SELECT_ITEM_GRIDMENU = 'data-cube.select-item-gridMenu',
  OPEN_EDITOR_FILTER = 'data-cube.open-editor-filter',
  OPEN_EDITOR_PROPERTIES = 'data-cube.open-editor-properties',
  ADD_NEW_COLUMN = 'data-cube.add-new-column',
}
