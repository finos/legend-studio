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
import {
  generateLakehouseDataProductPath,
  generateLakehouseSandboxDataProductPath,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import { LegendMarketplaceCard } from '../../components/MarketplaceCard/LegendMarketplaceCard.js';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl } from '@finos/legend-application';
import { useAuth } from 'react-oidc-context';
import {
  DataProductState,
  SandboxDataProductState,
  type BaseDataProductState,
  type DataProductEntity,
} from '../../stores/lakehouse/dataProducts/DataProducts.js';
import type { LegendMarketplaceApplicationStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  ELEMENT_PATH_DELIMITER,
  V1_IngestEnvironmentClassification,
} from '@finos/legend-graph';

const MAX_DESCRIPTION_LENGTH = 250;

const LakehouseDataProductCardInfoPopover = observer(
  (props: {
    dataProductEntity: DataProductEntity;
    popoverAnchorEl: HTMLButtonElement | null;
    setPopoverAnchorEl: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | null>
    >;
    applicationStore: LegendMarketplaceApplicationStore;
  }) => {
    const {
      dataProductEntity,
      popoverAnchorEl,
      setPopoverAnchorEl,
      applicationStore,
    } = props;

    const popoverOpen = Boolean(popoverAnchorEl);
    const popoverId = popoverOpen ? 'popover' : undefined;

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
        <div className="marketplace-lakehouse-data-product-card__popover__name">
          {dataProductEntity.product?.title ??
            dataProductEntity.path.split(ELEMENT_PATH_DELIMITER).pop()}
        </div>
        <div className="marketplace-lakehouse-data-product-card__popover__description-label">
          Description
        </div>
        <div className="marketplace-lakehouse-data-product-card__popover__description">
          {dataProductEntity.product?.description}
        </div>
        <hr />
        <div className="marketplace-lakehouse-data-product-card__popover__project-table-header">
          Data Product Project
          <IconButton
            className="marketplace-lakehouse-data-product-card__popover__project-link"
            onClick={() =>
              applicationStore.navigationService.navigator.visitAddress(
                EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                  applicationStore.config.studioServerUrl,
                  dataProductEntity.groupId,
                  dataProductEntity.artifactId,
                  dataProductEntity.versionId,
                  dataProductEntity.path,
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
                <TableCell>{dataProductEntity.groupId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Artifact</b>
                </TableCell>
                <TableCell>{dataProductEntity.artifactId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Version</b>
                </TableCell>
                <TableCell>{dataProductEntity.versionId}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <b>Path</b>
                </TableCell>
                <TableCell>{dataProductEntity.path}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Popover>
    );
  },
);

export const LakehouseDataProductCard = observer(
  (props: {
    dataProductState: BaseDataProductState;
    onClick: (dataProductState: BaseDataProductState) => void;
  }): React.ReactNode => {
    const { dataProductState, onClick } = props;

    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);
    const [versionMenuAnchorEl, setVersionMenuAnchorEl] =
      useState<HTMLElement | null>(null);
    const isVersionMenuOpen = Boolean(versionMenuAnchorEl);

    if (!dataProductState.isInitialized) {
      return null;
    }

    const truncatedDescription =
      dataProductState.description &&
      dataProductState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${dataProductState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : dataProductState.description;

    const versionId =
      dataProductState instanceof DataProductState
        ? dataProductState.versionId
        : undefined;
    const isSnapshot = versionId ? isSnapshotVersion(versionId) : undefined;
    const environmentClassification =
      dataProductState instanceof SandboxDataProductState &&
      dataProductState.dataProductArtifact?.dataProduct.deploymentId
        ? dataProductState.state.lakehouseIngestEnvironmentsByDID.get(
            dataProductState.dataProductArtifact.dataProduct.deploymentId,
          )?.environmentClassification
        : undefined;
    const isLoading = dataProductState.isLoading;

    const content = isLoading ? (
      <CubesLoadingIndicator isLoading={isLoading}>
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
            {versionId !== undefined && versionId !== '' && (
              <>
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
                  {versionId}
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
                    dataProductState.versionOptions.map((versionOption) => {
                      return (
                        <MenuItem
                          key={versionOption}
                          onClick={(event: React.MouseEvent<HTMLLIElement>) => {
                            event.preventDefault();
                            event.stopPropagation();
                            dataProductState.setSelectedVersion(versionOption);
                            setVersionMenuAnchorEl(null);
                          }}
                        >
                          {versionOption}
                        </MenuItem>
                      );
                    }),
                  )}
                </Menu>
              </>
            )}
            {dataProductState instanceof SandboxDataProductState && (
              <Chip
                label={environmentClassification ?? 'unknown'}
                size="small"
                title="Environment Classification"
                className={clsx(
                  'marketplace-lakehouse-data-product-card__environment-classification',
                  {
                    'marketplace-lakehouse-data-product-card__environment-classification--unknown':
                      environmentClassification === undefined,
                    'marketplace-lakehouse-data-product-card__environment-classification--dev':
                      environmentClassification ===
                      V1_IngestEnvironmentClassification.DEV,
                    'marketplace-lakehouse-data-product-card__environment-classification--prod-parallel':
                      environmentClassification ===
                      V1_IngestEnvironmentClassification.PROD_PARALLEL,
                    'marketplace-lakehouse-data-product-card__environment-classification--prod':
                      environmentClassification ===
                      V1_IngestEnvironmentClassification.PROD,
                  },
                )}
              />
            )}
            <Box className="marketplace-lakehouse-data-product-card__name">
              {dataProductState.title}
            </Box>
            <Box className="marketplace-lakehouse-data-product-card__description">
              {truncatedDescription}
            </Box>
          </Box>
          {dataProductState instanceof DataProductState && (
            <>
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
              >
                <InfoCircleIcon />
              </IconButton>
              <LakehouseDataProductCardInfoPopover
                dataProductEntity={guaranteeNonNullable(
                  dataProductState.currentProductEntity,
                )}
                popoverAnchorEl={popoverAnchorEl}
                setPopoverAnchorEl={setPopoverAnchorEl}
                applicationStore={dataProductState.state.applicationStore}
              />
            </>
          )}
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
          <Box>
            <FormLabel>Deploy Type</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketPlaceStore.filter.sdlcDeployFilter}
                    onChange={() =>
                      marketPlaceStore.handleFilterChange(
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
                    checked={marketPlaceStore.filter.sandboxDeployFilter}
                    onChange={() =>
                      marketPlaceStore.handleFilterChange(
                        DataProductFilterType.DEPLOY_TYPE,
                        DeployType.SANDBOX,
                      )
                    }
                  />
                }
                label="Sandbox Deployed"
              />
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
                      marketPlaceStore.filter
                        .prodEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketPlaceStore.handleFilterChange(
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
                      marketPlaceStore.filter
                        .prodParallelEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketPlaceStore.handleFilterChange(
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
                      marketPlaceStore.filter.devEnvironmentClassificationFilter
                    }
                    onChange={() =>
                      marketPlaceStore.handleFilterChange(
                        DataProductFilterType.ENVIRONMENT_CLASSIFICATION,
                        V1_IngestEnvironmentClassification.DEV,
                      )
                    }
                  />
                }
                label="Dev"
              />
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
                  onClick={(dataProductState: BaseDataProductState) => {
                    if (
                      dataProductState instanceof DataProductState &&
                      dataProductState.currentProductEntity
                    ) {
                      marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                        generateLakehouseDataProductPath(
                          generateGAVCoordinates(
                            dataProductState.currentProductEntity.groupId,
                            dataProductState.currentProductEntity.artifactId,
                            dataProductState.currentProductEntity.versionId,
                          ),
                          dataProductState.currentProductEntity.path,
                        ),
                      );
                    } else if (
                      dataProductState instanceof SandboxDataProductState
                    ) {
                      marketPlaceStore.applicationStore.navigationService.navigator.goToLocation(
                        generateLakehouseSandboxDataProductPath(
                          encodeURIComponent(
                            dataProductState.ingestEnvironmentUrn,
                          ),
                          encodeURIComponent(
                            dataProductState.dataProductArtifact?.dataProduct
                              .path ?? '',
                          ),
                        ),
                      );
                    }
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
