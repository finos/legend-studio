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

/**
 * The anchor Legend Marketplace's data product viewer gives an access point
 * group, which it reads from the URL hash on load: as Legend Query writes it
 * (`EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl`)
 *
 * @external_application_navigation This depends on Legend Marketplace routing and is hardcoded so it's potentially brittle
 */
const EXTERNAL_APPLICATION_NAVIGATION__generateCubeAccessPointGroupAnchor = (
  accessPointGroupId: string,
): string =>
  encodeURIComponent(
    `apg-${accessPointGroupId}`.trim().toLowerCase().replace(/\s+/gu, '-'),
  );

/**
 * A deployed data product's page in Legend Marketplace, at its access point
 * group when one is given, as Legend Query links to it (PLAN §11.18)
 *
 * @external_application_navigation This depends on Legend Marketplace routing and is hardcoded so it's potentially brittle
 */
export const EXTERNAL_APPLICATION_NAVIGATION__generateCubeMarketplaceDataProductUrl =
  (
    marketplaceApplicationUrl: string,
    dataProductId: string,
    deploymentId: string,
    accessPointGroupId?: string | undefined,
  ): string =>
    `${marketplaceApplicationUrl}/dataProduct/deployed/${dataProductId}/${deploymentId}${
      accessPointGroupId
        ? `#${EXTERNAL_APPLICATION_NAVIGATION__generateCubeAccessPointGroupAnchor(accessPointGroupId)}`
        : ''
    }`;
