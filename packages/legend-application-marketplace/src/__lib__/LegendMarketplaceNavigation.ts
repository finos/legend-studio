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
  TASK_ID = 'taskId',
  CONTRACT_ID = 'contractId',
}

export enum LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  PROVIDER = 'provider',
  QUERY = 'query',
}

export type LakehouseDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export type LakehouseEntitlementsTasksParam = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID]: string | undefined;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID]: string | undefined;
};

export const LEGEND_MARKETPLACE_ROUTE_PATTERN = Object.freeze({
  DEFAULT: '/',
  SEARCH_RESULTS: '/results',
  VENDOR_DATA: '/vendordata',
  VENDOR_DETAILS: `/vendor/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.VENDOR_NAME}`,
  LAKEHOUSE: '/lakehouse',
  LAKEHOUSE_ENTITLEMENTS: '/lakehouse/entitlements',
  LAKEHOUSE_ENTITLEMENTS_TASKS: `/lakehouse/entitlements/tasks/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID}`,
  LAKEHOUSE_ENTITLEMENTS_CONTRACTS: `/lakehouse/entitlements/contracts/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID}`,
  LAKEHOUSE_PRODUCT: `/lakehouse/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  SUBSCRIPTIONS: '/subscriptions',
  ORDERS: '/orders',
  LAKEHOUSE_SUBSCRIPTIONS: '/lakehouse/subscriptions',
});

export const LAKEHOUSE_ROUTES = Object.freeze([
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_TASKS,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_CONTRACTS,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT,
  LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_SUBSCRIPTIONS,
]);

export const isLakehouseRoute = (pathName: string): boolean =>
  LAKEHOUSE_ROUTES.some(
    (route) => matchPath(route as string, pathName) !== null,
  );

export const generateLakehouseDataProduct = (
  gav: string,
  path: string,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT, {
    gav,
    path,
  });

export const generateLakehouseTaskPath = (taskId: string): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_TASKS, {
    taskId,
  });

export const generateLakehouseContractPath = (contractId: string): string =>
  generatePath(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_CONTRACTS,
    {
      contractId,
    },
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
    versionId: string | undefined,
    entityPath: string | undefined,
  ): string =>
    `${studioApplicationUrl}/view/${projectId}${
      versionId ? `/version/${versionId}` : ''
    }${entityPath ? `/entity/${entityPath}` : ''}`;

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
