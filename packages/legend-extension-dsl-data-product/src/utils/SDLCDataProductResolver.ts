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
import {
  type DepotServerClient,
  resolveVersion,
  StoreProjectData,
} from '@finos/legend-server-depot';
import type {
  ProjectGAVCoordinates,
  StoredFileGeneration,
} from '@finos/legend-storage';
import { type PlainObject, guaranteeNonNullable } from '@finos/legend-shared';
import { getDataProductFromDetails } from './DataProductIngestUtils.js';

const ARTIFACT_GENERATION_DATA_PRODUCT_KEY = 'dataProduct';

export type ResolvedSDLCDataProduct = {
  details: V1_EntitlementsDataProductDetails;
  dataProduct: V1_DataProduct;
  deploymentId: number;
};

/**
 * Resolve the entitlements details and V1_DataProduct for a DataProduct
 * identified by its SDLC GAV + path.
 *
 * The deployment id is read from the depot's data-product artifact generation
 * output (which is what the marketplace uses to route the legacy SDLC data
 * product URL to the newer id+DID route). Assumes the DataProduct is deployed
 * from the given GAV.
 *
 * Throws an Error with a human-readable message when the resolution fails at
 * any step (no generation artifact, no deploymentId, no matching Lakehouse
 * data product, etc.). Callers are expected to catch and surface the message.
 */
export async function resolveEntitlementsDataProductFromSDLC(
  gav: ProjectGAVCoordinates,
  path: string,
  depotServerClient: DepotServerClient,
  lakehouseContractServerClient: LakehouseContractServerClient,
  graphManager: V1_PureGraphManager,
  tokenProvider?: (() => string | undefined) | undefined,
): Promise<ResolvedSDLCDataProduct> {
  const storeProject = new StoreProjectData();
  storeProject.groupId = gav.groupId;
  storeProject.artifactId = gav.artifactId;
  const files = (await depotServerClient.getGenerationFilesByType(
    storeProject,
    resolveVersion(gav.versionId),
    ARTIFACT_GENERATION_DATA_PRODUCT_KEY,
  )) as unknown as StoredFileGeneration[];
  const fileGen = files.find((e) => e.path === path)?.file.content;
  if (!fileGen) {
    throw new Error(
      `No 'dataProduct' artifact generation was found for '${path}' at ${gav.groupId}:${gav.artifactId}:${gav.versionId}. The Data Product may not have been deployed from this project.`,
    );
  }
  const content: PlainObject = JSON.parse(fileGen) as PlainObject;
  const dataProductInfo = content.dataProduct as
    | { deploymentId?: string }
    | undefined;
  if (!dataProductInfo?.deploymentId) {
    throw new Error(
      `Data Product '${path}' has no 'deploymentId' in its artifact generation. It may not yet be deployed to Lakehouse.`,
    );
  }
  const deploymentId = Number(dataProductInfo.deploymentId);
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
