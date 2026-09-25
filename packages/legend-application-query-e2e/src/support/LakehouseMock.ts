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

import type { Page, Route } from '@playwright/test';
import {
  COVID_DATA_PRODUCT_PATH,
  COVID_DATA_PRODUCT_TITLE,
} from './DepotMock.js';
import { TEST_DATA__CurrentUser } from './TEST_DATA__EngineResponses.js';

/**
 * The Lakehouse environment the mock contract server assigns the user,
 * which Lakehouse runtimes are created for.
 */
export const TEST_LAKEHOUSE_ENVIRONMENT = 'e2e-lakehouse-env';

const CORS_HEADERS = {
  'access-control-allow-origin': 'http://localhost:9001',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,accept,authorization',
};

/** Answer a CORS preflight, or else fulfill with `json`. */
const fulfillJson = (route: Route, json: unknown): Promise<void> =>
  route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: CORS_HEADERS })
    : route.fulfill({ headers: CORS_HEADERS, json });

/**
 * Answer the Lakehouse contract server's user environment lookup (the dev
 * config points the app at a contract server on port 6600): querying a data
 * product through a model access point group or a Lakehouse access point runs
 * on a Lakehouse runtime created for the user's environment.
 *
 * Pass `environment: undefined` for a user without one.
 */
export const mockLakehouseUserEnvironment = async (
  page: Page,
  { environment }: { environment: string | undefined } = {
    environment: TEST_LAKEHOUSE_ENVIRONMENT,
  },
): Promise<void> => {
  await page.route(
    /\/lakehouse\/api\/orgResolver\/[^/]+\/lakehouse\/environment$/,
    (route) =>
      fulfillJson(route, {
        total: environment === undefined ? 0 : 1,
        users:
          environment === undefined
            ? []
            : [
                {
                  name: TEST_DATA__CurrentUser,
                  userType: 'WORKFORCE',
                  lakehouseEnvironment: environment,
                },
              ],
      }),
  );
};

/**
 * Title of a data product listed on the second page of
 * {@link mockLiteDataProducts}. It is listing-only: it has no artifact.
 */
export const SECOND_PAGE_DATA_PRODUCT_TITLE = 'Hospital Data Product';

/**
 * Title of a data product listed by {@link mockLiteDataProducts} that was
 * deployed ad hoc rather than from a project, so it can't be queried.
 */
export const AD_HOC_DATA_PRODUCT_TITLE = 'Sandbox Data Product';

const liteDataProduct = (
  id: string,
  title: string,
  origin: Record<string, unknown>,
  fullPath?: string,
): Record<string, unknown> => ({
  id,
  deploymentId: 1,
  title,
  description: `${title}, for e2e tests`,
  origin,
  fullPath,
  lakehouseEnvironment: {
    producerEnvironmentName: 'production',
    type: 'Production',
  },
});

/**
 * List the data products deployed to Lakehouse, as the contract server does
 * for the data product dropdown: in pages, which the app follows until the
 * last. The first page lists {@link COVID_DATA_PRODUCT_PATH}, which is served
 * by `mockModelAccessDataProduct()`, and an ad hoc deployed data product;
 * the second, a data product of another project.
 */
export const mockLiteDataProducts = async (page: Page): Promise<void> => {
  const firstPage = [
    liteDataProduct(
      'COVID_DATA_PRODUCT',
      COVID_DATA_PRODUCT_TITLE,
      {
        type: 'SdlcDeployment',
        group: 'org.finos.legend.test',
        artifact: 'legend-query-test',
        version: '0.0.1',
      },
      COVID_DATA_PRODUCT_PATH,
    ),
    liteDataProduct('SANDBOX_DATA_PRODUCT', AD_HOC_DATA_PRODUCT_TITLE, {
      type: 'AdHocDeployment',
      definition: 'Dataproduct test::SandboxDataProduct {}',
    }),
  ];
  const secondPage = [
    liteDataProduct(
      'HOSPITAL_DATA_PRODUCT',
      SECOND_PAGE_DATA_PRODUCT_TITLE,
      {
        type: 'SdlcDeployment',
        group: 'org.finos.legend.test',
        artifact: 'hospital-data',
        version: '1.0.0',
      },
      'test::HospitalDataProduct',
    ),
  ];
  await page.route(
    /\/lakehouse\/api\/dataproducts\/lite\/paginated(?:\?.*)?$/,
    (route) => {
      // the app asks for the next page with the last data product it got
      const isFirstPage = !new URL(route.request().url()).searchParams.has(
        'lastDataProductId',
      );
      return fulfillJson(route, {
        liteDataProductsResponse: {
          dataProducts: isFirstPage ? firstPage : secondPage,
        },
        paginationMetadataRecord: isFirstPage
          ? {
              hasNextPage: true,
              lastValuesMap: { id: 'SANDBOX_DATA_PRODUCT', deployment_id: 1 },
            }
          : { hasNextPage: false },
      });
    },
  );
};
