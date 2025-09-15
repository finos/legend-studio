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

import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl } from '@finos/legend-application';
import {
  OpenIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  deserializeIcon,
  clsx,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  V1_DataProductEmbeddedImageIcon,
  V1_DataProductLibraryIcon,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import {
  Popover,
  Box,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { type DataProductState } from '../../stores/lakehouse/dataProducts/DataProducts.js';
import { type LegendMarketplaceApplicationStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';

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
            {dataProductState.icon instanceof
            V1_DataProductEmbeddedImageIcon ? (
              <img src={dataProductState.icon.imageUrl} />
            ) : dataProductState.icon instanceof V1_DataProductLibraryIcon ? (
              deserializeIcon(
                dataProductState.icon.libraryId,
                dataProductState.icon.iconId,
              )
            ) : null}
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
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
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
            applicationStore={
              dataProductState.marketplaceBaseStore.applicationStore
            }
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
