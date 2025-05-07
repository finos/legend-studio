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

import { observer } from 'mobx-react-lite';
import {
  useMarketplaceLakehouseStore,
  withMarketplaceLakehouseStore,
} from './MarketplaceLakehouseStoreProvider.js';
import { useEffect, type JSX } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
} from '@mui/material';
import type { DataProductState } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { generateLakehouseDataProduct } from '../../__lib__/LegendMarketplaceNavigation.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { DepotScope } from '@finos/legend-server-depot';
import { LegendMarketplaceCard } from '../../components/MarketplaceCard/LegendMarketplaceCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';

export const LegendDataProductVendorCard = (props: {
  dataAsset: DataProductState;
  onClick: (dataAsset: DataProductState) => void;
}): JSX.Element => {
  const { dataAsset, onClick } = props;

  const content = (
    <>
      <Chip
        label={dataAsset.productEntity.versionId}
        className={clsx('legend-marketplace-vendor-card__type')}
      />
      <div className="legend-marketplace-vendor-card__name">
        {dataAsset.productEntity.path.split('::').pop()}
      </div>
      <div className="legend-marketplace-vendor-card__description">
        {`${dataAsset.productEntity.groupId}:${dataAsset.productEntity.artifactId}`}
      </div>
    </>
  );

  const moreInfo = <div>{dataAsset.productEntity.path}</div>;

  return (
    <LegendMarketplaceCard
      size="large"
      content={content}
      onClick={() => onClick(dataAsset)}
      moreInfo={moreInfo}
    />
  );
};

export const MarketplaceLakehouseHome = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const onSearch = (
      provider: string | undefined,
      query: string | undefined,
    ) => {
      marketPlaceStore.handleSearch(query);
    };

    const onSearchChange = (query: string) => {
      if (query === '') {
        // use for clearing of search
        marketPlaceStore.handleSearch(query);
      }
    };

    useEffect(() => {
      marketPlaceStore.init();
    }, [marketPlaceStore]);

    return (
      <LegendMarketplacePage className="legend-marketplace-lakehouse-home">
        <CubesLoadingIndicator
          isLoading={marketPlaceStore.loadingProductsState.isInProgress}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        <div className="legend-marketplace-data-product-search__container">
          <LegendMarketplaceSearchBar
            onSearch={onSearch}
            onChange={onSearchChange}
          />
          <FormGroup row={true}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={marketPlaceStore.filter.releaseFilter}
                  onChange={() =>
                    marketPlaceStore.handleFilterChange(DepotScope.RELEASES)
                  }
                />
              }
              label="Releases"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={marketPlaceStore.filter.snapshotFilter}
                  onChange={() =>
                    marketPlaceStore.handleFilterChange(DepotScope.SNAPSHOT)
                  }
                />
              }
              label="Snapshots"
            />
          </FormGroup>
        </div>
        <div className="legend-marketplace-home__vendors-cards">
          <Grid
            container={true}
            spacing={{ xs: 2, md: 3, xl: 4 }}
            columns={{ xs: 1, sm: 2, xl: 3, xxl: 4, xxxl: 5, xxxxl: 6 }}
            sx={{ justifyContent: 'center' }}
          >
            {marketPlaceStore.filterProducts?.map((dpState) => (
              <Grid key={dpState.id} size={1}>
                <LegendDataProductVendorCard
                  dataAsset={dpState}
                  onClick={(dataAsset: DataProductState) => {
                    {
                      marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                        generateLakehouseDataProduct(
                          generateGAVCoordinates(
                            dpState.productEntity.groupId,
                            dpState.productEntity.artifactId,
                            dpState.productEntity.versionId,
                          ),
                          dpState.productEntity.path,
                        ),
                      );
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </div>
      </LegendMarketplacePage>
    );
  }),
);
