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

import { generatePath, matchPath } from '@finos/legend-application/browser';
import {
  addQueryParametersToUrl,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';

export enum LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN {
  VENDOR_NAME = 'vendorName',
  GAV = 'gav',
  DATA_PRODUCT_PATH = 'path',
  DATA_PRODUCT_ID = 'dataProductId',
  DEPLOYMENT_ID = 'deploymentId',
  TERMINAL_ID = 'terminalId',
}

export enum LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  PROVIDER = 'provider',
  QUERY = 'query',
}

export enum LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  QUERY = 'query',
}
export type LegendTerminalProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID]: string;
};

export type LakehouseDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID]: string;
};

export type LakehouseSDLCDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export type LegacyDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export const LEGEND_MARKETPLACE_ROUTE_PATTERN = Object.freeze({
  DEFAULT: '/',
  OAUTH_CALLBACK: '/callback',
  SEARCH_RESULTS: '/results',
  VENDOR_DATA: '/vendordata',
  VENDOR_DETAILS: `/vendor/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.VENDOR_NAME}`,
  LAKEHOUSE: '/lakehouse',
  LAKEHOUSE_SEARCH_RESULTS: '/lakehouse/results',
  LAKEHOUSE_ENTITLEMENTS: '/lakehouse/entitlements',
  LAKEHOUSE_PRODUCT: `/lakehouse/dataProduct/deployed/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID}`,
  LEGACY_DATA_PRODUCT: `/lakehouse/dataProduct/legacy/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  TERMINAL_PRODUCT: `/terminal/terminalProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID}`,
  LAKEHOUSE_SDLC_PRODUCT: `/lakehouse/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  SUBSCRIPTIONS: '/subscriptions',
  ORDERS: '/orders',
  LAKEHOUSE_ADMIN: '/lakehouse/admin',
});

export const LAKEHOUSE_ROUTES = Object.freeze([
  LEGEND_MARKETPLACE_ROUTE_PATTERN.DEFAULT,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SEARCH_RESULTS,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SDLC_PRODUCT,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ADMIN,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.TERMINAL_PRODUCT,
]);

export const isLakehouseRoute = (pathName: string): boolean =>
  LAKEHOUSE_ROUTES.some(
    (route) => matchPath(route as string, pathName) !== null,
  );

export const generateLakehouseDataProductPath = (
  dataProductId: string,
  deploymentId: number,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT, {
    dataProductId,
    deploymentId: deploymentId.toString(),
  });

export const generateLegacyDataProductPath = (
  gav: string,
  path: string,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LEGACY_DATA_PRODUCT, {
    gav,
    path,
  });

export const generateLakehouseTaskPath = (taskId: string): string =>
  `${LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS}?selectedTasks=${taskId}`;

export const generateLakehouseSearchResultsRoute = (
  query: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]:
        query ? query : undefined,
    }),
  );

export const generateSearchResultsRoute = (
  provider: string | undefined,
  query: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.PROVIDER]: provider
        ? provider
        : undefined,
      [LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]: query
        ? query
        : undefined,
    }),
  );

export const generateVendorDetailsRoute = (vendorName: string): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.VENDOR_DETAILS, {
    vendorName,
  });

/**
 * @external_application_navigation This depends on Legend Studio routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl =
  (
    studioApplicationUrl: string,
    projectId: string,
    entityPath: string | undefined,
  ): string =>
    `${studioApplicationUrl}/view/${projectId}${
      entityPath ? `/entity/${entityPath}` : ''
    }`;

/**
 * @external_application_navigation This depends on Ingest Environment swagger URL and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateIngestEnvironemntUrl = (
  baseUrl: string,
): string => `${baseUrl}/data-product/swagger-ui`;

enum LEGEND_QUERY_ROUTE_PATTERN_TOKEN {
  GAV = 'gav',
  SERVICE_PATH = 'servicePath',
}

const LEGEND_QUERY_ROUTE_PATTERN = Object.freeze({
  CREATE_FROM_SERVICE_QUERY: `/create-from-service/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_QUERY_ROUTE_PATTERN_TOKEN.SERVICE_PATH}`,
});

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl =
  (
    queryApplicationUrl: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    classPath: string | undefined,
  ): string =>
    `${queryApplicationUrl}/extensions/dataspace/${generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    )}/${dataSpacePath}/${executionContext}/${
      runtimePath ? `/${runtimePath}` : ''
    }${classPath ? `?class=${classPath}` : ''}`;

export enum LEGEND_QUERY_QUERY_PARAM_TOKEN {
  SERVICE_EXECUTION_KEY = 'executionKey',
}

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorRoute =
  (
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
