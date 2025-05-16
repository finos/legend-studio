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
import { useEffect, useState, type JSX, type MouseEvent } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import type { DataProductState } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { generateLakehouseDataProduct } from '../../__lib__/LegendMarketplaceNavigation.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { DepotScope, isSnapshotVersion } from '@finos/legend-server-depot';
import { LegendMarketplaceCard } from '../../components/MarketplaceCard/LegendMarketplaceCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';

const MAX_DESCRIPTION_LENGTH = 250;

export const LakehouseDataProductCard = (props: {
  dataProductState: DataProductState;
  onClick: (dataProductState: DataProductState) => void;
}): JSX.Element => {
  const { dataProductState, onClick } = props;

  const [popoverAnchorEl, setPopoverAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  const truncatedDescription =
    dataProductState.productEntity.product?.description &&
    dataProductState.productEntity.product.description.length >
      MAX_DESCRIPTION_LENGTH
      ? `${dataProductState.productEntity.product.description.substring(
          0,
          MAX_DESCRIPTION_LENGTH,
        )}...`
      : dataProductState.productEntity.product?.description;

  const popoverOpen = Boolean(popoverAnchorEl);
  const popoverId = popoverOpen ? 'popover' : undefined;
  const isSnapshot = isSnapshotVersion(
    dataProductState.productEntity.versionId,
  );

  const content = (
    <>
      <div className="marketplace-lakehouse-data-product-card__name">
        {dataProductState.productEntity.product?.title ??
          dataProductState.productEntity.path.split('::').pop()}
        <Chip
          label={isSnapshot ? 'SNAPSHOT' : 'RELEASE'}
          className={clsx('marketplace-lakehouse-data-product-card__version', {
            'marketplace-lakehouse-data-product-card__version--snapshot':
              isSnapshot,
            'marketplace-lakehouse-data-product-card__version--release':
              !isSnapshot,
          })}
        />
      </div>
      <div className="marketplace-lakehouse-data-product-card__description">
        {truncatedDescription}
      </div>
      <Button
        aria-describedby={popoverId}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          setPopoverAnchorEl(event.currentTarget);
        }}
        className={clsx(
          'marketplace-lakehouse-data-product-card__more-info-btn',
          {
            'marketplace-lakehouse-data-product-card__more-info-btn--selected':
              popoverOpen,
          },
        )}
      >
        <InfoCircleIcon />
      </Button>
      <Popover
        id={popoverId}
        open={popoverOpen}
        anchorEl={popoverAnchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        onClose={() => setPopoverAnchorEl(null)}
        slotProps={{
          paper: {
            className: 'marketplace-lakehouse-data-product-card__popover',
            onClick: (event) => [
              event.preventDefault(),
              event.stopPropagation(),
            ],
          },
          backdrop: {
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
            },
          },
        }}
      >
        <div className="marketplace-lakehouse-data-product-card__popover__name">
          {dataProductState.productEntity.product?.title ??
            dataProductState.productEntity.path.split('::').pop()}
        </div>
        <div className="marketplace-lakehouse-data-product-card__popover__description-label">
          Description
        </div>
        <div className="marketplace-lakehouse-data-product-card__popover__description">
          {dataProductState.productEntity.product?.description}
        </div>
        <hr />
        <div className="marketplace-lakehouse-data-product-card__popover__project-table-header">
          Data Product Project
        </div>
        <TableContainer className="marketplace-lakehouse-data-product-card__popover__project-table">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <b>Group</b>
                </TableCell>
                <TableCell>{dataProductState.productEntity.groupId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Artifact</b>
                </TableCell>
                <TableCell>
                  {dataProductState.productEntity.artifactId}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Version</b>
                </TableCell>
                <TableCell>
                  {dataProductState.productEntity.versionId}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Path</b>
                </TableCell>
                <TableCell>{dataProductState.productEntity.path}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Popover>
    </>
  );

  return (
    <LegendMarketplaceCard
      size="large"
      content={content}
      onClick={() => onClick(dataProductState)}
      className="marketplace-lakehouse-data-product-card"
    />
  );
};

export const MarketplaceLakehouseHome = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();

    const onSearchChange = (query: string) => {
      marketPlaceStore.handleSearch(query);
    };

    useEffect(() => {
      marketPlaceStore.init();
    }, [marketPlaceStore]);

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-home">
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-home__container"
        >
          <CubesLoadingIndicator
            isLoading={marketPlaceStore.loadingProductsState.isInProgress}
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          <Box className="marketplace-lakehouse-home__search-bar">
            <LegendMarketplaceSearchBar onChange={onSearchChange} />
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
          </Box>
          <div className="marketplace-home__data-product-cards">
            <Grid
              container={true}
              spacing={{ xs: 2, md: 3, xl: 4 }}
              columns={{ xs: 1, sm: 2, xl: 3, xxl: 4, xxxl: 5, xxxxl: 6 }}
              sx={{ justifyContent: 'center' }}
            >
              {marketPlaceStore.filterProducts?.map((dpState) => (
                <Grid key={dpState.id} size={1}>
                  <LakehouseDataProductCard
                    dataProductState={dpState}
                    onClick={(dataProductState: DataProductState) => {
                      {
                        marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                          generateLakehouseDataProduct(
                            generateGAVCoordinates(
                              dataProductState.productEntity.groupId,
                              dataProductState.productEntity.artifactId,
                              dataProductState.productEntity.versionId,
                            ),
                            dataProductState.productEntity.path,
                          ),
                        );
                      }
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </div>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
