/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, jest, test } from '@jest/globals';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { PlainObject } from '@finos/legend-shared';
import { CubeDataProductEnvironmentType } from '../../../../CubeDataProduct.js';
import {
  CubeAccessPointGroupAccess,
  CubeDataProductCandidate,
} from '../../../../CubeDataProductCatalog.js';
import { CubeEngineError } from '../../../../CubeEngine.js';
import {
  V1_TEST__ORDERS_ARTIFACT,
  V1_TEST__ORDERS_DEFINITION,
} from '../__test-utils__/V1_CubeDataProductFixtures.js';
import {
  type V1_CubeDataProductCatalogOptions,
  V1_LegendCubeDataProductCatalog,
} from '../V1_LegendCubeDataProductCatalog.js';

// The viewer's access to a product's groups, read from their contracts as
// the marketplace reads it. The contract rows follow legend-extension-dsl-
// data-product's DataProductViewer.test.tsx (getContractsForUser)

const { APPROVED, ENTERPRISE, NO_ACCESS } = CubeAccessPointGroupAccess;

const ENTERPRISE_STEREOTYPE = {
  profile: 'meta::pure::profiles::access',
  value: 'enterprise',
};

/** The orders product, its reference group marked open to everyone */
const DEFINITION: PlainObject = {
  ...V1_TEST__ORDERS_DEFINITION,
  accessPointGroups: (
    V1_TEST__ORDERS_DEFINITION.accessPointGroups as PlainObject[]
  ).map((group) =>
    group.id === 'reference'
      ? { ...group, stereotypes: [ENTERPRISE_STEREOTYPE] }
      : group,
  ),
};

const CANDIDATE = new CubeDataProductCandidate({
  id: 'ORDERS_PRODUCT',
  deploymentId: '1234',
  dataProductPath: 'sales::products::OrdersProduct',
  title: 'Orders Product',
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
});

/** One of the viewer's contracts, with its status */
const contract = (
  guid: string,
  status: string,
  fields: {
    accessPointGroup?: string;
    deploymentId?: number;
    resourceType?: string;
  } = {},
): PlainObject => ({
  contractResultLite: {
    description: `Contract ${guid}`,
    guid,
    version: 0,
    state: 'COMPLETED',
    members: [],
    consumer: {
      _type: 'AdHocTeam',
      users: [{ name: 'viewer', type: 'WORKFORCE_USER' }],
    },
    createdBy: 'viewer',
    createdAt: '2025-12-22T15:18:41.998+00:00',
    resourceId: 'ORDERS_PRODUCT',
    resourceType: fields.resourceType ?? 'ACCESS_POINT_GROUP',
    deploymentId: fields.deploymentId ?? 1234,
    accessPointGroup: fields.accessPointGroup ?? 'core',
  },
  status,
  user: 'viewer',
});

const CONTRACTS = [
  // a granted contract is never hidden behind a pending duplicate
  contract('approved', 'APPROVED'),
  contract('pending', 'PENDING_DATA_OWNER_APPROVAL'),
  // another deployment, and a contract for the whole product
  contract('other-deployment', 'APPROVED', {
    accessPointGroup: 'model',
    deploymentId: 9999,
  }),
  contract('whole-product', 'APPROVED', {
    accessPointGroup: 'model',
    resourceType: 'DATA_PRODUCT',
  }),
  // rows Cube can't read
  { contractResultLite: 'unreadable', status: 'APPROVED' },
  null,
];

const setUp = (
  options: V1_CubeDataProductCatalogOptions = {},
  getAccessToken: () => string | undefined = () => 'token',
): {
  catalog: V1_LegendCubeDataProductCatalog;
  contracts: jest.Mock;
} => {
  const contractClient = new LakehouseContractServerClient({
    baseUrl: 'http://lakehouse.test',
  });
  const depot = new DepotServerClient({ serverUrl: 'http://depot.test' });
  jest
    .spyOn(depot, 'getGenerationFilesByType')
    .mockImplementation((async () => [
      {
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        type: 'dataProduct',
        path: 'sales::products::OrdersProduct',
        file: {
          path: 'sales::products::OrdersProduct.json',
          content: JSON.stringify(V1_TEST__ORDERS_ARTIFACT),
        },
      },
    ]) as never);
  jest.spyOn(depot, 'getVersionEntity').mockImplementation((async () => ({
    path: 'sales::products::OrdersProduct',
    content: DEFINITION,
  })) as never);
  const contracts = jest
    .spyOn(contractClient, 'getContractsForUser')
    .mockImplementation((async () => CONTRACTS) as never);
  return {
    catalog: new V1_LegendCubeDataProductCatalog(
      contractClient,
      depot,
      getAccessToken,
      { getCurrentUser: () => 'viewer', ...options },
    ),
    contracts: contracts as unknown as jest.Mock,
  };
};

describe("The viewer's access to a data product's groups", () => {
  test('Gives each group the access the marketplace shows, from the contract furthest along for this deployment', async () => {
    const { catalog } = setUp({ enterpriseStereotype: ENTERPRISE_STEREOTYPE });
    expect([...(await catalog.getAccess(CANDIDATE))]).toEqual([
      ['core', APPROVED],
      ['reference', ENTERPRISE],
      // only another deployment's contract and the whole product's
      ['model', NO_ACCESS],
    ]);
  });

  test('Says nothing of a group with no contract when the host marks no group open to everyone', async () => {
    const { catalog } = setUp();
    expect([...(await catalog.getAccess(CANDIDATE))]).toEqual([
      ['core', APPROVED],
    ]);
  });

  test("Reads the viewer's contracts afresh each time, as the viewer, with the token of the moment", async () => {
    let token = 0;
    const { catalog, contracts } = setUp({}, () => `token-${++token}`);
    await catalog.getAccess(CANDIDATE);
    await catalog.getAccess(CANDIDATE);
    expect(contracts.mock.calls).toEqual([
      ['viewer', 'token-1'],
      ['viewer', 'token-2'],
    ]);
  });

  test("Fails, so no access shows, when the viewer's contracts can't be read", async () => {
    const { catalog, contracts } = setUp();
    contracts.mockImplementationOnce(async () => {
      throw new Error('Lakehouse unavailable');
    });
    const failure = await catalog
      .getAccess(CANDIDATE)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeEngineError);
    expect((failure as CubeEngineError).firstLine).toBe(
      "Cube couldn't read your data contracts",
    );
    contracts.mockImplementationOnce(async () => ({ error: 'Forbidden' }));
    await expect(catalog.getAccess(CANDIDATE)).rejects.toBeInstanceOf(
      CubeEngineError,
    );
  });

  test('Reads no contract for a deployment it can match none to, or without the viewer', async () => {
    const { catalog, contracts } = setUp();
    expect(
      (
        await catalog.getAccess(
          new CubeDataProductCandidate({ ...CANDIDATE, deploymentId: 'abc' }),
        )
      ).size,
    ).toBe(0);
    const withoutViewer = setUp({ getCurrentUser: undefined });
    expect((await withoutViewer.catalog.getAccess(CANDIDATE)).size).toBe(0);
    expect(contracts).not.toHaveBeenCalled();
    expect(withoutViewer.contracts).not.toHaveBeenCalled();
  });
});
