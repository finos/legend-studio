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
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  FormGroup,
  FormLabel,
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
  DataProductFilterType,
  DataProductSort,
  DeployType,
  type MarketplaceLakehouseStore,
} from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { generateLakehouseDataProductPath } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import { LegendMarketplaceCard } from '../../components/MarketplaceCard/LegendMarketplaceCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl } from '@finos/legend-application';
import { useAuth } from 'react-oidc-context';
import { type DataProductState } from '../../stores/lakehouse/dataProducts/DataProducts.js';
import type { LegendMarketplaceApplicationStore } from '../../stores/LegendMarketplaceBaseStore.js';
import {
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { isNullable } from '@finos/legend-shared';

const MAX_DESCRIPTION_LENGTH = 250;

const LakehouseDataProductCardInfoPopover = observer(
  (props: {
    dataProductState: DataProductState;
    popoverAnchorEl: HTMLButtonElement | null;
    setPopoverAnchorEl: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | null>
    >;
    applicationStore: LegendMarketplaceApplicationStore;
  }) => {
    const {
      dataProductState,
      popoverAnchorEl,
      setPopoverAnchorEl,
      applicationStore,
    } = props;

    const popoverOpen = Boolean(popoverAnchorEl);
    const popoverId = popoverOpen ? 'popover' : undefined;
    const origin = dataProductState.dataProductDetails.origin;

    return (
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
        <Box className="marketplace-lakehouse-data-product-card__popover__name">
          {dataProductState.title}
        </Box>
        <Box className="marketplace-lakehouse-data-product-card__popover__content">
          <Box className="marketplace-lakehouse-data-product-card__popover__section">
            <Box className="marketplace-lakehouse-data-product-card__popover__section-header">
              Description
            </Box>
            <Box className="marketplace-lakehouse-data-product-card__popover__section-content">
              {dataProductState.description}
            </Box>
          </Box>
          <Box className="marketplace-lakehouse-data-product-card__popover__section">
            <Box className="marketplace-lakehouse-data-product-card__popover__section-header">
              Deployment Details
            </Box>
            <TableContainer className="marketplace-lakehouse-data-product-card__popover__table">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <b>Data Product ID</b>
                    </TableCell>
                    <TableCell>
                      {dataProductState.dataProductDetails.id}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Deployment ID</b>
                    </TableCell>
                    <TableCell>
                      {dataProductState.dataProductDetails.deploymentId}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Producer Environment Name</b>
                    </TableCell>
                    <TableCell>
                      {dataProductState.dataProductDetails.lakehouseEnvironment
                        ?.producerEnvironmentName ?? 'Unknown'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Producer Environment Type</b>
                    </TableCell>
                    <TableCell>
                      {dataProductState.dataProductDetails.lakehouseEnvironment
                        ?.type ?? 'Unknown'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          {origin instanceof V1_SdlcDeploymentDataProductOrigin && (
            <Box className="marketplace-lakehouse-data-product-card__popover__section">
              <Box className="marketplace-lakehouse-data-product-card__popover__section-header">
                Data Product Project
                {dataProductState.enrichedState.isInProgress === true && (
                  <CircularProgress size={20} />
                )}
                {dataProductState.enrichedState.hasCompleted === true && (
                  <IconButton
                    className="marketplace-lakehouse-data-product-card__popover__project-link"
                    onClick={() =>
                      applicationStore.navigationService.navigator.visitAddress(
                        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                          applicationStore.config.studioServerUrl,
                          origin.group,
                          origin.artifact,
                          origin.version,
                          dataProductState.dataProductElement?.path,
                        ),
                      )
                    }
                  >
                    <OpenIcon />
                  </IconButton>
                )}
              </Box>
              <TableContainer className="marketplace-lakehouse-data-product-card__popover__table">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <b>Group</b>
                      </TableCell>
                      <TableCell>{origin.group}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Artifact</b>
                      </TableCell>
                      <TableCell>{origin.artifact}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Version</b>
                      </TableCell>
                      <TableCell>{origin.version}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Path</b>
                      </TableCell>
                      <TableCell>
                        {dataProductState.enrichedState.isInProgress ===
                        true ? (
                          <CircularProgress size={20} />
                        ) : (
                          (dataProductState.dataProductElement?.path ??
                          'Unknown')
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Popover>
    );
  },
);

export const LakehouseDataProductCard = observer(
  (props: {
    dataProductState: DataProductState;
    onClick: (dataProductState: DataProductState) => void;
  }): React.ReactNode => {
    const { dataProductState, onClick } = props;

    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);

    const truncatedDescription =
      dataProductState.description &&
      dataProductState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${dataProductState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : dataProductState.description;

    const versionId = dataProductState.versionId;
    const isSnapshot = versionId ? isSnapshotVersion(versionId) : undefined;
    const environmentClassification =
      dataProductState.environmentClassification;

    const content = dataProductState.initState.isInProgress ? (
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ) : (
      <>
        <Box className="marketplace-lakehouse-data-product-card__container">
          <Box className="marketplace-lakehouse-data-product-card__icon">
            {dataProductState.imageUrl ? (
              <img src={dataProductState.imageUrl} />
            ) : (
              deserializeIcon(dataProductState.icon)
            )}
          </Box>
          <Box className="marketplace-lakehouse-data-product-card__content">
            <Box className="marketplace-lakehouse-data-product-card__tags">
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
              <Chip
                label={environmentClassification ?? 'Unknown Environment'}
                size="small"
                title="Environment Classification"
                className={clsx(
                  'marketplace-lakehouse-data-product-card__environment-classification',
                  {
                    'marketplace-lakehouse-data-product-card__environment-classification--unknown':
                      environmentClassification === undefined,
                    'marketplace-lakehouse-data-product-card__environment-classification--dev':
                      environmentClassification ===
                      V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
                    'marketplace-lakehouse-data-product-card__environment-classification--prod-parallel':
                      environmentClassification ===
                      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
                    'marketplace-lakehouse-data-product-card__environment-classification--prod':
                      environmentClassification ===
                      V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
                  },
                )}
              />
            </Box>

            <Box className="marketplace-lakehouse-data-product-card__name">
              {dataProductState.title}
            </Box>
            <Box className="marketplace-lakehouse-data-product-card__description">
              {truncatedDescription}
            </Box>
          </Box>
          <IconButton
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              setPopoverAnchorEl(event.currentTarget);
            }}
            className={clsx(
              'marketplace-lakehouse-data-product-card__more-info-btn',
              {
                'marketplace-lakehouse-data-product-card__more-info-btn--selected':
                  Boolean(popoverAnchorEl),
              },
            )}
            title="More Info"
          >
            <InfoCircleIcon />
          </IconButton>
          <LakehouseDataProductCardInfoPopover
            dataProductState={dataProductState}
            popoverAnchorEl={popoverAnchorEl}
            setPopoverAnchorEl={setPopoverAnchorEl}
            applicationStore={dataProductState.lakehouseState.applicationStore}
          />
        </Box>
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
  },
);

const MarketplaceLakehouseHomeSortFilterPanel = observer(
  (props: { marketplaceStore: MarketplaceLakehouseStore }) => {
    const { marketplaceStore } = props;

    const [sortMenuAnchorEl, setSortMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isSortMenuOpen = Boolean(sortMenuAnchorEl);

    const showUnknownDeployTypeFilter = marketplaceStore.dataProductStates.some(
      (state) => isNullable(state.dataProductDetails.origin),
    );
    const showUnknownEnvironmentFilter =
      marketplaceStore.dataProductStates.some((state) =>
        isNullable(state.environmentClassification),
      );

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
              {marketplaceStore.sort}
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
                      marketplaceStore.setSort(sortValue);
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
          <Box>
            <FormLabel>Deploy Type</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketplaceStore.filter.sdlcDeployFilter}
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.DEPLOY_TYPE,
                        DeployType.SDLC,
                      )
                    }
                  />
                }
                label="SDLC Deployed"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketplaceStore.filter.sandboxDeployFilter}
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.DEPLOY_TYPE,
                        DeployType.SANDBOX,
                      )
                    }
                  />
                }
                label="Sandbox Deployed"
              />
              {showUnknownDeployTypeFilter === true && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={marketplaceStore.filter.unknownDeployFilter}
                      onChange={() =>
                        marketplaceStore.handleFilterChange(
                          DataProductFilterType.DEPLOY_TYPE,
                          DeployType.UNKNOWN,
                        )
                      }
                    />
                  }
                  label="Unknown"
                />
              )}
            </FormGroup>
          </Box>
          <hr />
          <Box>
            <FormLabel>Deploy Environment</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter
                        .prodEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.PROD,
                      )
                    }
                  />
                }
                label="Prod"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter
                        .prodParallelEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.PROD_PARALLEL,
                      )
                    }
                  />
                }
                label="Prod-Parallel"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      marketplaceStore.filter.devEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketplaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.DEV,
                      )
                    }
                  />
                }
                label="Dev"
              />
              {showUnknownEnvironmentFilter === true && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        marketplaceStore.filter
                          .unknownEnvironmentClassificationFilter
                      }
                      onChange={() =>
                        marketplaceStore.handleFilterChange(
                          DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                          'UNKNOWN',
                        )
                      }
                    />
                  }
                  label="Unknown"
                />
              )}
            </FormGroup>
          </Box>
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

    const isLoadingDataProducts =
      marketPlaceStore.loadingProductsState.isInProgress ||
      marketPlaceStore.loadingSandboxDataProductStates.isInProgress ||
      marketPlaceStore.loadingLakehouseEnvironmentsByDIDState.isInProgress;

    return (
      <LegendMarketplacePage className="marketplace-lakehouse-home">
        <Container className="marketplace-lakehouse-home__search-container">
          <Box className="marketplace-lakehouse-home__search-container__title">
            Legend Marketplace
          </Box>
          <LegendMarketplaceSearchBar
            onChange={onSearchChange}
            placeholder="Search Legend Marketplace"
            className="marketplace-lakehouse-home__search-bar"
          />
        </Container>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-home__results-container"
        >
          <MarketplaceLakehouseHomeSortFilterPanel
            marketplaceStore={marketPlaceStore}
          />
          <Grid
            container={true}
            spacing={{ xs: 2, sm: 3, xxl: 4 }}
            columns={{ xs: 1, sm: 2, xxl: 3 }}
            className="marketplace-lakehouse-home__data-product-cards"
          >
            {marketPlaceStore.filterSortProducts?.map((dataProductState) => (
              <Grid
                key={`${dataProductState.dataProductDetails.id}-${dataProductState.dataProductDetails.deploymentId}`}
                size={1}
              >
                <LakehouseDataProductCard
                  dataProductState={dataProductState}
                  onClick={(dpState: DataProductState) => {
                    marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                      generateLakehouseDataProductPath(
                        dataProductState.dataProductDetails.id,
                        dataProductState.dataProductDetails.deploymentId,
                      ),
                    );
                  }}
                />
              </Grid>
            ))}
            {isLoadingDataProducts && (
              <Grid size={1}>
                <CubesLoadingIndicator
                  isLoading={true}
                  className="marketplace-lakehouse-home__loading-data-products-indicator"
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
              </Grid>
            )}
          </Grid>
        </Container>
      </LegendMarketplacePage>
    );
  }),
);
