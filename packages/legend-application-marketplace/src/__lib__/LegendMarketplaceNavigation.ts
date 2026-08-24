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
import type { DataProductAccessType } from '@finos/legend-graph';
import {
  addQueryParametersToUrl,
  stringifyQueryParams,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { MarketplaceSearchMode } from './LegendMarketplaceSearchMode.js';

export enum LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN {
  VENDOR_NAME = 'vendorName',
  GAV = 'gav',
  DATA_PRODUCT_PATH = 'path',
  DATA_PRODUCT_ID = 'dataProductId',
  DEPLOYMENT_ID = 'deploymentId',
  TERMINAL_ID = 'terminalId',
  DATA_CONTRACT_ID = 'dataContractId',
  DATA_CONTRACT_TASK_ID = 'dataContractTaskId',
  DATA_ACCESS_REQUEST_ID = 'dataAccessRequestId',
  MCP_SERVER_NAME = 'mcpServerName',
}

export enum LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  PROVIDER = 'provider',
  QUERY = 'query',
}

export enum LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  QUERY = 'query',
  USE_PRODUCER_SEARCH = 'useProducerSearch',
}

export enum LEGEND_MARKETPLACE_FIELD_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  QUERY = 'query',
}

export enum LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  QUERY = 'query',
}

export enum LEGEND_MARKETPLACE_ENTITLEMENTS_QUERY_PARAM_TOKEN {
  SELECTED_TAB = 'selectedTab',
}

export enum LEGEND_MARKETPLACE_DATA_APIS_QUERY_PARAM_TOKEN {
  QUERY = 'query',
}

export enum LEGEND_MARKETPLACE_INTELLIGENCE_QUERY_PARAM_TOKEN {
  QUERY = 'query',
}

export type LegendTerminalProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID]: string;
};

export type LakehouseDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID]: string;
};

export type LakehouseDataContractTaskPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_ID]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_TASK_ID]: string;
};

export type LakehouseSDLCDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export type LegacyDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export type WorkflowDataAccessRequestPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_ACCESS_REQUEST_ID]: string;
};

export type McpServerPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.MCP_SERVER_NAME]: string;
};

export const LEGEND_MARKETPLACE_ROUTE_PATTERN = Object.freeze({
  HOME_PAGE: '/',
  OAUTH_CALLBACK: '/callback',
  // PRODUCTS
  DATA_PRODUCTS: '/dataproducts',
  DATA_APIS: '/data-apis',
  AGENTS: '/agents',
  MCP_SERVER: `/agents/mcp/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.MCP_SERVER_NAME}`,
  SUBSCRIPTIONS: '/subscriptions',
  ORDERS: '/orders',
  TERMINAL_PRODUCT: `/terminal/terminalProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TERMINAL_ID}`,
  TERMINAL_ADD_ONS: `/terminals-and-addons`,
  // Data Products
  DATA_PRODUCT: `/dataProduct/deployed/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID}`,
  LEGACY_DATA_PRODUCT: `/dataProduct/legacy/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  SDLC_DATA_PRODUCT: `/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
  DATA_SPACE_SEARCH_RESULTS: '/dataSpace/results',
  FIELD_SEARCH_RESULTS: '/dataProduct/fields/results',
  LAKEHOUSE_ACCESS_SEARCH_RESULTS: '/lakehouseAccess/results',
  // Lakehouse
  LAKEHOUSE_ENTITLEMENTS: '/lakehouse/entitlements',
  LAKEHOUSE_ENTITLEMENTS_CONTRACT_TASK: `/lakehouse/entitlements/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_TASK_ID}`,
  LAKEHOUSE_ENTITLEMENTS_WORKFLOW_DATA_ACCESS_REQUEST: `/lakehouse/entitlements/workflowDataAccessRequest/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_ACCESS_REQUEST_ID}`,
  LAKEHOUSE_ENTITLEMENTS_PERMIT_DATA_ACCESS_REQUEST: `/lakehouse/entitlements/permitDataAccessRequest/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_ACCESS_REQUEST_ID}`,
  LAKEHOUSE_ADMIN: '/lakehouse/admin',
  // Deprecated
  DEPRECATED_LAKEHOUSE: '/lakehouse',
  DEPRECATED_LAKEHOUSE_SEARCH_RESULTS: '/lakehouse/results',
  DEPRECATED_LAKEHOUSE_PRODUCT: `/lakehouse/dataProduct/deployed/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_ID}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DEPLOYMENT_ID}`,
  DEPRECATED_LAKEHOUSE_SDLC_PRODUCT: `/lakehouse/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
});

export const generateMcpServerRoute = (mcpServerName: string): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.MCP_SERVER, {
    mcpServerName: encodeURIComponent(mcpServerName),
  });

export const generateLakehouseDataProductPath = (
  dataProductId: string,
  deploymentId: number,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_PRODUCT, {
    dataProductId,
    deploymentId: deploymentId.toString(),
  });

export const generateContractPagePath = (
  dataContractId: string,
  dataContractTaskId: string,
): string =>
  generatePath(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_CONTRACT_TASK,
    {
      dataContractId,
      dataContractTaskId,
    },
  );

export const generateWorkflowDataAccessRequestPagePath = (
  dataAccessRequestId: string,
): string =>
  generatePath(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_WORKFLOW_DATA_ACCESS_REQUEST,
    {
      dataAccessRequestId,
    },
  );

export const generatePermitDataAccessRequestPagePath = (
  dataAccessRequestId: string,
): string =>
  generatePath(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS_PERMIT_DATA_ACCESS_REQUEST,
    {
      dataAccessRequestId,
    },
  );

export const generateLegacyDataProductPath = (
  gav: string,
  path: string,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LEGACY_DATA_PRODUCT, {
    gav,
    path,
  });

export const generateSdlcDataProductPath = (
  gav: string,
  path: string,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.SDLC_DATA_PRODUCT, {
    gav,
    path,
  });

export const generateLakehouseSearchResultsRoute = (
  query: string | undefined,
  useProducerSearch: boolean,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_SPACE_SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]:
        query ? query : undefined,
      [LEGEND_MARKETPLACE_LAKEHOUSE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.USE_PRODUCER_SEARCH]:
        useProducerSearch ? useProducerSearch : undefined,
    }),
  );

export const generateSearchResultsRoute = (
  provider: string | undefined,
  query: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.DATA_SPACE_SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.PROVIDER]: provider
        ? provider
        : undefined,
      [LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]: query
        ? query
        : undefined,
    }),
  );

export const generateFieldSearchResultsRoute = (
  query: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.FIELD_SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_FIELD_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]: query,
    }),
  );

export const generateLakehouseAccessSearchResultsRoute = (
  query: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ACCESS_SEARCH_RESULTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_LAKEHOUSE_ACCESS_SEARCH_RESULTS_QUERY_PARAM_TOKEN.QUERY]:
        query,
    }),
  );

/**
 * Routes a search-bar submission to the results route for its mode. The `default`
 * case throws rather than falling back to the DataSpaces route, so a new
 * `MarketplaceSearchMode` value can't be silently routed to the wrong page.
 */
export const generateSearchResultsRouteForMode = (
  query: string,
  mode: MarketplaceSearchMode,
): string => {
  switch (mode) {
    case MarketplaceSearchMode.DATA_FIELDS:
      return generateFieldSearchResultsRoute(query);
    case MarketplaceSearchMode.LAKEHOUSE_ACCESS:
      return generateLakehouseAccessSearchResultsRoute(query);
    case MarketplaceSearchMode.PRODUCER:
      return generateLakehouseSearchResultsRoute(query, true);
    case MarketplaceSearchMode.DATA_SPACES:
      return generateLakehouseSearchResultsRoute(query, false);
    default:
      throw new UnsupportedOperationError(
        `Can't generate a search results route for search mode`,
        mode,
      );
  }
};

export const generateLakehouseEntitlementsRoute = (
  selectedTab: string | undefined,
): string =>
  addQueryParametersToUrl(
    LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_ENTITLEMENTS,
    stringifyQueryParams({
      [LEGEND_MARKETPLACE_ENTITLEMENTS_QUERY_PARAM_TOKEN.SELECTED_TAB]:
        selectedTab,
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

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateDataProductModelQueryUrl =
  (
    queryApplicationUrl: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    type: DataProductAccessType,
    dataProductPath: string,
    accessPointId: string,
  ): string =>
    `${queryApplicationUrl}/data-product/${type}/${generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    )}/${dataProductPath}/${accessPointId}`;

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateDataProductSampleQueryUrl =
  (
    queryApplicationUrl: string,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataProductPath: string,
    sampleQueryId: string,
  ): string =>
    `${queryApplicationUrl}/data-product/native/sample-query/${generateGAVCoordinates(
      groupId,
      artifactId,
      versionId,
    )}/${dataProductPath}/${sampleQueryId}`;

/**
 * @external_application_navigation This depends on Legend Query routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateIngestQueryUrl = (
  queryApplicationUrl: string,
  groupId: string,
  artifactId: string,
  versionId: string,
  ingestDefinitionPath: string,
  dataSet: string,
): string =>
  `${queryApplicationUrl}/ingest/${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}/${ingestDefinitionPath}/${dataSet}`;
