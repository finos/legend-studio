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
}

export enum LEGEND_MARKETPLACE_SEARCH_RESULTS_QUERY_PARAM_TOKEN {
  PROVIDER = 'provider',
  QUERY = 'query',
}

export const LEGEND_MARKETPLACE_ROUTE_PATTERN = Object.freeze({
  DEFAULT: '/',
  SEARCH_RESULTS: '/results',
  VENDOR_DETAILS: `/vendor/:${LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.VENDOR_NAME}`,
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
