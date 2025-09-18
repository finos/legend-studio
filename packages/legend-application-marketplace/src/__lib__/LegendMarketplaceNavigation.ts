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

import { generatePath } from '@finos/legend-application/browser';
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
  HOME_PAGE: '/',
  OAUTH_CALLBACK: '/callback',
  SEARCH_RESULTS: '/results',
  // PRODUCTS
  DATA_PRODUCTS: '/dataproducts',
  DATA_APIS: '/dataapis',
  AGENTS: '/agents',
  INVENTORY: '/inventory',
  SUBSCRIPTIONS: '/subscriptions',
  ORDERS: '/orders',
  TERMINAL_PRODUCT: `/terminal/terminalProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID}`,
  VENDOR_DETAILS: `/vendor/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.VENDOR_NAME}`,
  // Data Products
  DATA_PRODUCT: `/dataProduct/deployed/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID}`,
  LEGACY_DATA_PRODUCT: `/dataProduct/legacy/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  SDLC_DATA_PRODUCT: `/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  // Lakehouse
  LAKEHOUSE_ENTITLEMENTS: '/lakehouse/entitlements',
  LAKEHOUSE_ADMIN: '/lakehouse/admin',
  // Deprecated
  DEPRECATED_LAKEHOUSE: '/lakehouse',
  DEPRECATED_LAKEHOUSE_SEARCH_RESULTS: '/lakehouse/results',
  DEPRECATED_LAKEHOUSE_PRODUCT: `/lakehouse/dataProduct/deployed/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID}`,
  DEPRECATED_LAKEHOUSE_SDLC_PRODUCT: `/lakehouse/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
});

export const generateLakehouseDataProductPath = (
  dataProductId: string,
  deploymentId: number,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT, {
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
    LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS,
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
