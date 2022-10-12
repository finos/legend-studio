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

import { generatePath } from '@finos/legend-application';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum LEGEND_QUERY_PATH_PARAM_TOKEN {
  GAV = 'gav',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_EXECUTION_KEY = 'executionKey',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  SETUP: '/setup',
  CREATE_FROM_MAPPING_QUERY: `/create/manual/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH}`,
  CREATE_FROM_SERVICE_QUERY: `/create-from-service/:${LEGEND_QUERY_PATH_PARAM_TOKEN.GAV}/:${LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH}`,
  EDIT_EXISTING_QUERY: `/edit/:${LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID}`,
});

export const generateMappingQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  mappingPath: string,
  runtimePath: string,
): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_MAPPING_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    ),
    [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: mappingPath,
    [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: runtimePath,
  });

export interface MappingQueryCreatorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.RUNTIME_PATH]: string;
}

export const generateServiceQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
  key?: string,
): string =>
  `${generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    ),
    [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: servicePath,
  })}${
    key ? `?${LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY}=${key}` : ''
  }`;

export interface ServiceQueryCreatorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.GAV]: string;
  [LEGEND_QUERY_PATH_PARAM_TOKEN.SERVICE_PATH]: string;
}

export interface ServiceQueryCreatorQueryParams {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]?: string;
}

export const generateExistingQueryEditorRoute = (queryId: string): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY, {
    [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: queryId,
  });

export interface ExistingQueryEditorPathParams {
  [LEGEND_QUERY_PATH_PARAM_TOKEN.QUERY_ID]: string;
}

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl = (
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

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl =
  (
    studioUrl: string,
    groupId: string,
    artifactId: string,
    servicePath: string,
  ): string =>
    `${studioUrl}/extensions/update-service-query/${servicePath}@${generateGAVCoordinates(
      groupId,
      artifactId,
      undefined,
    )}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl =
  (studioUrl: string, projectId: string): string =>
    `${studioUrl}/extensions/update-project-service-query/${projectId}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl =
  (studioUrl: string, queryId: string): string =>
    `${studioUrl}/extensions/productionize-query/${queryId}`;
