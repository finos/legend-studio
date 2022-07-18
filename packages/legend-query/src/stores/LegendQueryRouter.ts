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
  GROUP_ID = 'groupId',
  ARTIFACT_ID = 'artifactId',
  VERSION_ID = 'versionId',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  CLASS_PATH = 'classPath',
  SERVICE_EXECUTION_KEY = 'executionKey',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: '/setup',
  CREATE_QUERY: `/create/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}`,
  SERVICE_QUERY: `/service/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH}`,
  EXISTING_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID}`,
});

export const generateCreateQueryRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  mappingPath: string,
  runtimePath: string,
): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID]: groupId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID]: artifactId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: versionId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: mappingPath,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
  });

export interface CreateQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: string;
}

export interface CreateQueryQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.CLASS_PATH]?: string;
}

export const generateServiceQueryRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
  key?: string,
): string =>
  `${generatePath(LEGEND_QUERY_ROUTE_PATTERN.SERVICE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID]: groupId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID]: artifactId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: versionId,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: servicePath,
  })}${
    key ? `?${LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY}=${key}` : ''
  }`;

export interface ServiceQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GROUP_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.ARTIFACT_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.VERSION_ID]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: string;
}

export interface ServiceQueryQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]?: string;
}

export const generateExistingQueryRoute = (queryId: string): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.EXISTING_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: queryId,
  });

export interface ExistingQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: string;
}
