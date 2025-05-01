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

export enum LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN {
  VENDOR_NAME = 'vendorName',
  GAV = 'gav',
  DATA_PRODUCT_PATH = 'path',
}

export enum LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  PROVIDER = 'provider',
  QUERY = 'query',
}

export type LakehouseDataProductPathParams = {
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV]: string;
  [LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH]: string;
};

export const LEGEND_MARKETPLACE_ROUTE_PATTERN = Object.freeze({
  DEFAULT: '/',
  SEARCH_RESULTS: '/results',
  VENDOR_DATA: '/vendordata',
  VENDOR_DETAILS: `/vendor/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.VENDOR_NAME}`,
  LAKEHOUSE: '/lakehouse',
  LAKEHOUSE_PRODUCT: `/lakehouse/dataProduct/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.GAV}/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_PRODUCT_PATH}`,
});

export const generateLakehouseDataProduct = (
  gav: string,
  path: string,
): string =>
  generatePath(LEGEND_MARKETPLACE_ROUTE_PATTERN.LAKEHOUSE_PRODUCT, {
    gav,
    path,
  });

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
