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

import { generateGAVCoordinates } from '@finos/legend-server-depot';
import { generatePath } from 'react-router';

export enum LEGEND_QUERY_PATH_PARAM_TOKEN {
  GAV = 'gav',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  CLASS_PATH = 'class',
  SERVICE_EXECUTION_KEY = 'executionKey',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: '/setup',
  CREATE_QUERY: `/create/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}`,
  SERVICE_QUERY: `/service/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH}`,
  EXISTING_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID}`,
});

export const generateCreateQueryEditorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  mappingPath: string,
  runtimePath: string,
): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    ),
    [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: mappingPath,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
  });

export interface CreateQueryPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: string;
}

export interface CreateQueryEditorQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.CLASS_PATH]?: string;
}

export const generateServiceQueryEditorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
  key?: string,
): string =>
  `${generatePath(LEGEND_QUERY_ROUTE_PATTERN.SERVICE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    ),
    [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: servicePath,
  })}${
    key ? `?${LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY}=${key}` : ''
  }`;

export interface ServiceQueryEditorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: string;
}

export interface ServiceQueryEditorQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]?: string;
}

export const generateExistingQueryEditorRoute = (queryId: string): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.EXISTING_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: queryId,
  });

export interface ExistingQueryEditorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: string;
}

export const generateStudioProjectViewUrl = (
  studioUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath: string | undefined,
): string =>
  `${studioUrl}/view/archive/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}${entityPath ? `/entity/${entityPath}` : ''}`;
