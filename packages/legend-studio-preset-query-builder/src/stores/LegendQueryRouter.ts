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

import { generatePath } from 'react-router-dom';

export enum LEGEND_QUERY_PATH_PARAM_TOKEN {
  PROJECT_ID = 'projectId',
  VERSION_ID = 'versionId',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_KEY = 'key',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: '/setup',
  LOAD_SERVICE_QUERY: `/service/:${LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH}`,
  CREATE_NEW_QUERY: `/create/:${LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}`,
  LOAD_EXISTING_QUERY: `/load/:${LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID}`,
});

export const generateLoadServiceQueryRoute = (
  projectId: string,
  versionId: string,
  servicePath: string,
  key?: string,
): string =>
  `${generatePath(LEGEND_QUERY_ROUTE_PATTERN.LOAD_SERVICE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: projectId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: versionId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: servicePath,
  })}${key ? `?${LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_KEY}=${key}` : ''}`;

export const generateCreateNewQueryRoute = (
  projectId: string,
  versionId: string,
  mappingPath: string,
  runtimePath: string,
): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_NEW_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: projectId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: versionId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: mappingPath,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
  });

export const generateLoadExistingQueryRoute = (queryId: string): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.LOAD_EXISTING_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: queryId,
  });

export interface LoadServiceQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: string;
}

export interface LoadServiceQueryQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_KEY]?: string;
}

export interface LoadExistingQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: string;
}

export interface CreateNewQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.PROJECT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: string;
}
