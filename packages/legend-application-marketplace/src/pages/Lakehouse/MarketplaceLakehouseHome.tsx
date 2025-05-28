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
import React, { useEffect, useState, type MouseEvent } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  deserializeIcon,
  ExpandMoreIcon,
  InfoCircleIcon,
  OpenIcon,
} from '@finos/legend-art';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  Grid2 as Grid,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import {
  DataProductSort,
  type DataProductEntity,
  type DataProductState,
  type MarketplaceLakehouseStore,
} from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { generateLakehouseDataProduct } from '../../__lib__/LegendMarketplaceNavigation.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { DepotScope, isSnapshotVersion } from '@finos/legend-server-depot';
import { LegendMarketplaceCard } from '../../components/MarketplaceCard/LegendMarketplaceCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl } from '@finos/legend-application';
import { useAuth } from 'react-oidc-context';

const MAX_DESCRIPTION_LENGTH = 250;

export const LakehouseDataProductCard = observer(
  (props: {
    dataProductState: DataProductState;
    onClick: (dataProductEntity: DataProductEntity) => void;
  }): React.ReactNode => {
    const { dataProductState, onClick } = props;

    const currentDataProductEntity = dataProductState.currentProductEntity;

    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);
    const [versionMenuAnchorEl, setVersionMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isVersionMenuOpen = Boolean(versionMenuAnchorEl);

    if (currentDataProductEntity === undefined) {
      return null;
    }

    const truncatedDescription =
      currentDataProductEntity.product?.description &&
      currentDataProductEntity.product.description.length >
        MAX_DESCRIPTION_LENGTH
        ? `${currentDataProductEntity.product.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : currentDataProductEntity.product?.description;

    const popoverOpen = Boolean(popoverAnchorEl);
    const popoverId = popoverOpen ? 'popover' : undefined;
    const isSnapshot = isSnapshotVersion(currentDataProductEntity.versionId);
    const isLoading = dataProductState.isLoading;

    const content = isLoading ? (
      <CubesLoadingIndicator isLoading={isLoading}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ) : (
      <>
        <Box className="marketplace-lakehouse-data-product-card__container">
          <Box className="marketplace-lakehouse-data-product-card__icon">
            {deserializeIcon(currentDataProductEntity.product?.icon)}
          </Box>
          <Box className="marketplace-lakehouse-data-product-card__content">
            <Button
              size="small"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                setVersionMenuAnchorEl(event.currentTarget);
              }}
              className={clsx(
                'marketplace-lakehouse-data-product-card__version',
                {
                  'marketplace-lakehouse-data-product-card__version--snapshot':
                    isSnapshot,
                  'marketplace-lakehouse-data-product-card__version--release':
                    !isSnapshot,
                },
              )}
            >
              {currentDataProductEntity.versionId}
              <ExpandMoreIcon />
            </Button>
            <Menu
              anchorEl={versionMenuAnchorEl}
              open={isVersionMenuOpen}
              onClose={() => setVersionMenuAnchorEl(null)}
              slotProps={{
                backdrop: {
                  onClick: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  },
                },
              }}
              anchorOrigin={{
                horizontal: 'right',
                vertical: 'bottom',
              }}
              transformOrigin={{
                horizontal: 'right',
                vertical: 'top',
              }}
            >
              {Array.from(
                dataProductState.productEntityMap
                  .values()
                  .map((dataProductEntity) => {
                    return (
                      <MenuItem
                        key={dataProductEntity.versionId}
                        onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                          event.preventDefault();
                          event.stopPropagation();
                          dataProductState.setCurrentProductEntity(
                            dataProductEntity,
                          );
                          setVersionMenuAnchorEl(null);
                        }}
                      >
                        {dataProductEntity.versionId}
                      </MenuItem>
                    );
                  }),
              )}
            </Menu>
            <Box className="marketplace-lakehouse-data-product-card__name">
              {currentDataProductEntity.product?.title ??
                currentDataProductEntity.path.split('::').pop()}
            </Box>
            <Box className="marketplace-lakehouse-data-product-card__description">
              {truncatedDescription}
            </Box>
          </Box>
          <IconButton
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
          </IconButton>
        </Box>
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
            {currentDataProductEntity.product?.title ??
              currentDataProductEntity.path.split('::').pop()}
          </div>
          <div className="marketplace-lakehouse-data-product-card__popover__description-label">
            Description
          </div>
          <div className="marketplace-lakehouse-data-product-card__popover__description">
            {currentDataProductEntity.product?.description}
          </div>
          <hr />
          <div className="marketplace-lakehouse-data-product-card__popover__project-table-header">
            Data Product Project
            <IconButton
              className="marketplace-lakehouse-data-product-card__popover__project-link"
              onClick={() =>
                dataProductState.state.applicationStore.navigationService.navigator.visitAddress(
                  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                    dataProductState.state.applicationStore.config
                      .studioServerUrl,
                    currentDataProductEntity.groupId,
                    currentDataProductEntity.artifactId,
                    currentDataProductEntity.versionId,
                    currentDataProductEntity.path,
                  ),
                )
              }
            >
              <OpenIcon />
            </IconButton>
          </div>
          <TableContainer className="marketplace-lakehouse-data-product-card__popover__project-table">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <b>Group</b>
                  </TableCell>
                  <TableCell>{currentDataProductEntity.groupId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <b>Artifact</b>
                  </TableCell>
                  <TableCell>{currentDataProductEntity.artifactId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <b>Version</b>
                  </TableCell>
                  <TableCell>{currentDataProductEntity.versionId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <b>Path</b>
                  </TableCell>
                  <TableCell>{currentDataProductEntity.path}</TableCell>
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
        onClick={() => onClick(currentDataProductEntity)}
        className="marketplace-lakehouse-data-product-card"
      />
    );
  },
);

const MarketplaceLakehouseHomeSortFilterPanel = observer(
  (props: { marketPlaceStore: MarketplaceLakehouseStore }) => {
    const { marketPlaceStore } = props;

    const [sortMenuAnchorEl, setSortMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isSortMenuOpen = Boolean(sortMenuAnchorEl);

    return (
      <Box className="marketplace-lakehouse-home__sort-filters">
        <Box className="marketplace-lakehouse-home__sort-filters__sort">
          Sort By
          <Box>
            <Button
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                setSortMenuAnchorEl(event.currentTarget);
              }}
              className="marketplace-lakehouse-home__sort-filters__sort__btn"
            >
              {marketPlaceStore.sort}
              <ExpandMoreIcon />
            </Button>
            <Menu
              anchorEl={sortMenuAnchorEl}
              open={isSortMenuOpen}
              onClose={() => setSortMenuAnchorEl(null)}
              anchorOrigin={{
                horizontal: 'left',
                vertical: 'bottom',
              }}
              transformOrigin={{
                horizontal: 'left',
                vertical: 'top',
              }}
            >
              {Object.values(DataProductSort).map((sortValue) => {
                return (
                  <MenuItem
                    key={sortValue}
                    onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                      marketPlaceStore.setSort(sortValue);
                      setSortMenuAnchorEl(null);
                    }}
                  >
                    {sortValue}
                  </MenuItem>
                );
              })}
            </Menu>
          </Box>
        </Box>
        <Box className="marketplace-lakehouse-home__sort-filters__filter">
          Filter By
          <FormGroup>
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
      </Box>
    );
  },
);

export const MarketplaceLakehouseHome = withMarketplaceLakehouseStore(
  observer(() => {
    const marketPlaceStore = useMarketplaceLakehouseStore();
    const auth = useAuth();

    const onSearchChange = (query: string) => {
      marketPlaceStore.handleSearch(query);
    };

    useEffect(() => {
      marketPlaceStore.init(auth);
    }, [marketPlaceStore, auth]);

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-home">
        <Container className="marketplace-lakehouse-home__search-container">
          <Box className="marketplace-lakehouse-home__search-container__title">
            Lakehouse Marketplace
          </Box>
          <LegendMarketplaceSearchBar
            onChange={onSearchChange}
            placeholder="Search Lakehouse Marketplace"
            className="marketplace-lakehouse-home__search-bar"
          />
        </Container>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-home__results-container"
        >
          <MarketplaceLakehouseHomeSortFilterPanel
            marketPlaceStore={marketPlaceStore}
          />
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, xxl: 4 }}
            columns={{ xs: 1, sm: 2, xxl: 3 }}
            className="marketplace-lakehouse-home__data-product-cards"
          >
            {marketPlaceStore.filterSortProducts?.map((dpState) => (
              <Grid key={dpState.id} size={1}>
                <LakehouseDataProductCard
                  dataProductState={dpState}
                  onClick={(dataProductEntity: DataProductEntity) => {
                    {
                      marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                        generateLakehouseDataProduct(
                          generateGAVCoordinates(
                            dataProductEntity.groupId,
                            dataProductEntity.artifactId,
                            dataProductEntity.versionId,
                          ),
                          dataProductEntity.path,
                        ),
                      );
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
