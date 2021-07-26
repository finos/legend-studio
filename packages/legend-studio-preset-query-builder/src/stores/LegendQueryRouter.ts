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

export enum LEGEND_QUERY_PATH_PARAM_TOKEN {
  PROJECT_ID = 'projectId',
  VERSION_ID = 'versionId',
  QUERY_ID = 'queryId',
  SERVICE_PATH = 'servicePath',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_KEY = 'key',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  LOAD_SERVICE_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/service/:${LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH}`,
  CREATE_NEW_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/new`,
  EDIT_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID}`,
  SETUP: '/setup',
});

export interface EditServiceQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: string;
}

export interface EditServiceQueryQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_KEY]?: string;
}

export interface EditQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: string;
}

export interface CreateNewQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
}

export interface CreateNewQueryQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.RUNTIME_PATH]?: string;
}
