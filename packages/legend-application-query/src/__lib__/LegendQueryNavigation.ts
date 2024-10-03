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

import {
  generateExtensionUrlPattern,
  generatePath,
} from '@finos/legend-application/browser';
import {
  addQueryParametersToUrl,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum LEGEND_QUERY_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  QUERY_ID = 'queryId',
  MAPPING_PATH = 'mappingPath',
  RUNTIME_PATH = 'runtimePath',
  SERVICE_PATH = 'servicePath',
}

export const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  DEFAULT: '/',
  SETUP: '/setup',
  EDIT_EXISTING_QUERY_SETUP: '/setup/existing-query',
  CREATE_MAPPING_QUERY_SETUP: '/setup/manual',
  CLONE_SERVICE_QUERY_SETUP: '/setup/clone-service-query',
  QUERY_PRODUCTIONIZER_SETUP: '/setup/productionize-query',
  UPDATE_EXISTING_SERVICE_QUERY_SETUP: '/setup/update-existing-service-query',
  LOAD_PROJECT_SERVICE_QUERY_SETUP: '/setup/load-project-service-query',
  CREATE_FROM_MAPPING_QUERY: `/create/manual/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH}`,
  CREATE_FROM_SERVICE_QUERY: `/create-from-service/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH}`,
  EDIT_EXISTING_QUERY: `/edit/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID}`,
  DATA_CUBE_EXISTING_QUERY: `/edit/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID}/cube`,
});

export enum LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN {
  SHOW_ALL_GROUPS = 'showAllGroups',
  SHOW_ADVANCED_ACTIONS = 'showAdvancedActions',
  TAG = 'tag',
}

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_EXECUTION_KEY = 'executionKey',
}

export type QuerySetupQueryParams = {
  [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ALL_GROUPS]?: string | undefined;
  [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ADVANCED_ACTIONS]?:
    | string
    | undefined;
  [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.TAG]?: string | undefined;
};

export const generateQuerySetupRoute = (
  showAllGroups?: boolean | undefined,
  showAdvancedActions?: boolean | undefined,
  tag?: string | undefined,
): string =>
  addQueryParametersToUrl(
    generatePath(LEGEND_QUERY_ROUTE_PATTERN.SETUP, {}),
    stringifyQueryParams({
      [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ALL_GROUPS]: showAllGroups
        ? encodeURIComponent(showAllGroups)
        : showAllGroups,
      [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ADVANCED_ACTIONS]:
        showAdvancedActions
          ? encodeURIComponent(showAdvancedActions)
          : undefined,
      [LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.TAG]: tag
        ? encodeURIComponent(tag)
        : undefined,
    }),
  );

export const generateEditExistingQuerySetupRoute = (): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY_SETUP, {});
export const generateCreateMappingQuerySetupRoute = (): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_MAPPING_QUERY_SETUP, {});
export const generateCloneServiceQuerySetupRoute = (): string =>
  generateExtensionUrlPattern(
    generatePath(LEGEND_QUERY_ROUTE_PATTERN.CLONE_SERVICE_QUERY_SETUP, {}),
  );
export const generateQueryProductionizerSetupRoute = (): string =>
  generateExtensionUrlPattern(
    generatePath(LEGEND_QUERY_ROUTE_PATTERN.QUERY_PRODUCTIONIZER_SETUP, {}),
  );
export const generateUpdateExistingServiceQuerySetup = (): string =>
  generateExtensionUrlPattern(
    generatePath(
      LEGEND_QUERY_ROUTE_PATTERN.UPDATE_EXISTING_SERVICE_QUERY_SETUP,
      {},
    ),
  );
export const generateLoadProjectServiceQuerySetup = (): string =>
  generateExtensionUrlPattern(
    generatePath(
      LEGEND_QUERY_ROUTE_PATTERN.LOAD_PROJECT_SERVICE_QUERY_SETUP,
      {},
    ),
  );

export const generateMappingQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  mappingPath: string,
  runtimePath: string,
): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_MAPPING_QUERY, {
    [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV]: generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    ),
    [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH]: mappingPath,
    [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH]: runtimePath,
  });

export type MappingQueryCreatorPathParams = {
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.MAPPING_PATH]: string;
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.RUNTIME_PATH]: string;
};

export const generateServiceQueryCreatorRoute = (
  groupId: string,
  artifactId: string,
  versionId: string,
  servicePath: string,
  executionKey?: string | undefined,
): string =>
  addQueryParametersToUrl(
    generatePath(LEGEND_QUERY_ROUTE_PATTERN.CREATE_FROM_SERVICE_QUERY, {
      [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV]: generateGAVCoordinates(
        groupId,
        artifactId,
        versionId,
      ),
      [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH]: servicePath,
    }),
    stringifyQueryParams({
      [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]: executionKey
        ? encodeURIComponent(executionKey)
        : executionKey,
    }),
  );

export type ServiceQueryCreatorPathParams = {
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH]: string;
};

export type ServiceQueryCreatorQueryParams = {
  [LEGEND_QUERY_QUERY_PARAM_TOKEN.SERVICE_EXECUTION_KEY]?: string | undefined;
};

export const generateExistingQueryEditorRoute = (queryId: string): string =>
  generatePath(LEGEND_QUERY_ROUTE_PATTERN.EDIT_EXISTING_QUERY, {
    [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID]: queryId,
  });

export type ExistingQueryEditorPathParams = {
  [LEGEND_QUERY_ROUTE_PATTERN_TOKEN.QUERY_ID]: string;
};

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl = (
  studioApplicationUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  entityPath: string | undefined,
): string =>
  `${studioApplicationUrl}/view/archive/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}${entityPath ? `/entity/${entityPath}` : ''}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl =
  (
    studioApplicationUrl: string,
    projectId: string,
    versionId: string | undefined,
    entityPath: string | undefined,
  ): string =>
    `${studioApplicationUrl}/view/${projectId}${
      versionId ? `/version/${versionId}` : ''
    }${entityPath ? `/entity/${entityPath}` : ''}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateExistingServiceQueryUrl =
  (
    studioApplicationUrl: string,
    groupId: string,
    artifactId: string,
    servicePath: string,
  ): string =>
    `${studioApplicationUrl}/extensions/update-service-query/${servicePath}@${generateGAVCoordinates(
      groupId,
      artifactId,
      undefined,
    )}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioUpdateProjectServiceQueryUrl =
  (studioApplicationUrl: string, projectId: string): string =>
    `${studioApplicationUrl}/extensions/update-project-service-query/${projectId}`;

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl =
  (studioApplicationUrl: string, queryId: string): string =>
    `${studioApplicationUrl}/extensions/productionize-query/${queryId}`;

/**
 * @external_application_navigation This depends on Legend Taxonomy routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateTaxonomyDataspaceViewUrl =
  (
    taxonomyApplicationUrl: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataspacePath: string,
  ): string =>
    `${taxonomyApplicationUrl}/dataspace/${generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    )}/${dataspacePath}`;
