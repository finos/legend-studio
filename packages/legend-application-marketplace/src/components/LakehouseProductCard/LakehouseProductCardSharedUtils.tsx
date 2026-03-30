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

import { clsx } from '@finos/legend-art';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import { LakehouseDataProductSearchResultDetails } from '@finos/legend-server-marketplace';
import { Chip } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  DevelopmentLegendMarketplaceEnvState,
  ProdParallelLegendMarketplaceEnvState,
} from '../../stores/LegendMarketplaceEnvState.js';
import {
  getHumanReadableIngestEnvName,
  LakehouseDataProductOwnersTooltip,
} from '@finos/legend-extension-dsl-data-product';
import { useAuth } from 'react-oidc-context';
import { flowResult } from 'mobx';

export const DATA_PRODUCT_MARKDOWN_COMPONENTS: Record<
  string,
  | string
  | ((
      linkProps: React.AnchorHTMLAttributes<HTMLAnchorElement>,
    ) => React.ReactNode)
> = {
  h1: 'h2',
  h2: 'h3',
  h3: 'h4',
  a: (linkProps: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...linkProps}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    />
  ),
};

export const LakehouseProductTags = observer(
  (props: { productCardState: ProductCardState }): React.ReactNode => {
    const { productCardState } = props;
    const auth = useAuth();
    const [isOwnersTooltipOpen, setIsOwnersTooltipOpen] = useState(false);

    const versionId = productCardState.versionId;
    const isSnapshot = versionId ? isSnapshotVersion(versionId) : undefined;
    const isLakehouse =
      productCardState.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails;

    return (
      <>
        {isLakehouse && (
          <LakehouseDataProductOwnersTooltip
            open={isOwnersTooltipOpen}
            setIsOpen={setIsOwnersTooltipOpen}
            owners={productCardState.lakehouseOwners}
            fetchingOwnersState={productCardState.fetchingOwnersState}
            fetchOwners={async () => {
              await flowResult(
                productCardState.fetchOwners(auth.user?.access_token),
              );
            }}
            applicationStore={
              productCardState.marketplaceBaseStore.applicationStore
            }
            userSearchService={
              productCardState.marketplaceBaseStore.userSearchService
            }
          >
            <div>
              <Chip
                size="small"
                label={`Lakehouse${
                  productCardState.lakehouseEnvironment
                    ? ` - ${getHumanReadableIngestEnvName(productCardState.lakehouseEnvironment.environmentName, productCardState.marketplaceBaseStore.applicationStore.pluginManager.getApplicationPlugins())}`
                    : ''
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOwnersTooltipOpen((val) => !val);
                }}
                title="Click to view owners"
                className="marketplace-lakehouse-data-product-card__lakehouse-env-chip"
              />
            </div>
          </LakehouseDataProductOwnersTooltip>
        )}
        {isSnapshot && (
          <Chip
            size="small"
            label={versionId ?? 'Unknown Version'}
            className={clsx(
              'marketplace-lakehouse-data-product-card__version',
              {
                'marketplace-lakehouse-data-product-card__version--snapshot':
                  isSnapshot,
                'marketplace-lakehouse-data-product-card__version--release':
                  !isSnapshot,
              },
            )}
          />
        )}
        {(productCardState.marketplaceBaseStore.envState instanceof
          ProdParallelLegendMarketplaceEnvState ||
          productCardState.marketplaceBaseStore.envState instanceof
            DevelopmentLegendMarketplaceEnvState) &&
          productCardState.searchResult.dataProductDetails instanceof
            LakehouseDataProductSearchResultDetails && (
            <Chip
              label={
                productCardState.searchResult.dataProductDetails
                  .producerEnvironmentType ?? 'Unknown Environment'
              }
              size="small"
              title="Environment Classification"
              className={clsx(
                'marketplace-lakehouse-data-product-card__environment-classification',
                {
                  'marketplace-lakehouse-data-product-card__environment-classification--unknown':
                    productCardState.searchResult.dataProductDetails
                      .producerEnvironmentType === undefined,
                  'marketplace-lakehouse-data-product-card__environment-classification--dev':
                    productCardState.searchResult.dataProductDetails
                      .producerEnvironmentType ===
                    V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
                  'marketplace-lakehouse-data-product-card__environment-classification--prod-parallel':
                    productCardState.searchResult.dataProductDetails
                      .producerEnvironmentType ===
                    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
                  'marketplace-lakehouse-data-product-card__environment-classification--prod':
                    productCardState.searchResult.dataProductDetails
                      .producerEnvironmentType ===
                    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
                },
              )}
            />
          )}
        {productCardState.searchResult.dataProductSource === 'External' && (
          <Chip
            size="small"
            label={productCardState.searchResult.dataProductSource}
            title="Data Product Source"
            className="marketplace-lakehouse-data-product-card__data-product-source"
          />
        )}
        {productCardState.searchResult.licenseTo && (
          <Chip
            size="small"
            label={productCardState.searchResult.licenseTo}
            title="License To"
            className="marketplace-lakehouse-data-product-card__license-to"
          />
        )}
      </>
    );
  },
);
