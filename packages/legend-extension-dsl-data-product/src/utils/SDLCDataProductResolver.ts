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
  type V1_DataProduct,
  type V1_EntitlementsDataProductDetails,
  type V1_PureGraphManager,
  extractElementNameFromPath,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
} from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { DepotServerClient } from '@finos/legend-server-depot';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { getDataProductFromDetails } from './DataProductIngestUtils.js';

export type ResolvedSDLCDataProduct = {
  details: V1_EntitlementsDataProductDetails;
  dataProduct: V1_DataProduct;
  deploymentId: number;
};

/**
 * Resolve the entitlements details + V1_DataProduct for a DataProduct given a
 * Lakehouse deployment id that was obtained out-of-band (e.g. from a DataSpace
 * analytics response's `dataSpaceReferencesMetadataInfo`).
 *
 * Throws an Error with a human-readable message when the resolution fails at
 * any step (no matching Lakehouse data product, more than one match, etc.).
 * Callers are expected to catch and surface the message.
 */
export async function resolveEntitlementsDataProductByDID(
  path: string,
  deploymentId: number,
  depotServerClient: DepotServerClient,
  lakehouseContractServerClient: LakehouseContractServerClient,
  graphManager: V1_PureGraphManager,
  tokenProvider?: (() => string | undefined) | undefined,
): Promise<ResolvedSDLCDataProduct> {
  const dataProductId = extractElementNameFromPath(path).toUpperCase();
  const rawResponse =
    await lakehouseContractServerClient.getDataProductByIdAndDID(
      dataProductId,
      deploymentId,
      tokenProvider?.(),
    );
  const fetchedDataProductDetails =
    V1_entitlementsDataProductDetailsResponseToDataProductDetails(rawResponse);
  if (fetchedDataProductDetails.length === 0) {
    throw new Error(
      `No Lakehouse Data Product found for id '${dataProductId}' and deployment id '${deploymentId}'.`,
    );
  }
  if (fetchedDataProductDetails.length > 1) {
    throw new Error(
      `Multiple Lakehouse Data Products found for id '${dataProductId}' and deployment id '${deploymentId}'.`,
    );
  }
  const details = guaranteeNonNullable(fetchedDataProductDetails[0]);
  const dataProduct = guaranteeNonNullable(
    await getDataProductFromDetails(details, graphManager, depotServerClient),
    `Unable to resolve V1_DataProduct from details for id: ${details.id}`,
  );
  return { details, dataProduct, deploymentId };
}
