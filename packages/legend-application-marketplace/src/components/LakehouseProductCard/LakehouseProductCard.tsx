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
  clsx,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
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
import { type LegendMarketplaceApplicationStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';
import type { BaseProductCardState } from '../../stores/lakehouse/dataProducts/BaseProductCardState.js';
import { DataProductCardState } from '../../stores/lakehouse/dataProducts/DataProductCardState.js';

const MAX_DESCRIPTION_LENGTH = 250;

const LakehouseDataProductCardInfoPopover = observer(
  (props: {
    dataProductCardState: DataProductCardState;
    popoverAnchorEl: HTMLButtonElement | null;
    setPopoverAnchorEl: React.Dispatch<
      React.SetStateAction<HTMLButtonElement | null>
    >;
    applicationStore: LegendMarketplaceApplicationStore;
  }) => {
    const {
      dataProductCardState,
      popoverAnchorEl,
      setPopoverAnchorEl,
      applicationStore,
    } = props;

    const popoverOpen = Boolean(popoverAnchorEl);
    const popoverId = popoverOpen ? 'popover' : undefined;
    const origin = dataProductCardState.dataProductDetails.origin;

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
          {dataProductCardState.title}
        </Box>
        <Box className="marketplace-lakehouse-data-product-card__popover__content">
          <Box className="marketplace-lakehouse-data-product-card__popover__section">
            <Box className="marketplace-lakehouse-data-product-card__popover__section-header">
              Description
            </Box>
            <Box className="marketplace-lakehouse-data-product-card__popover__section-content">
              {dataProductCardState.description}
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
                      {dataProductCardState.dataProductDetails.id}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Deployment ID</b>
                    </TableCell>
                    <TableCell>
                      {dataProductCardState.dataProductDetails.deploymentId}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Producer Environment Name</b>
                    </TableCell>
                    <TableCell>
                      {dataProductCardState.dataProductDetails
                        .lakehouseEnvironment?.producerEnvironmentName ??
                        'Unknown'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <b>Producer Environment Type</b>
                    </TableCell>
                    <TableCell>
                      {dataProductCardState.dataProductDetails
                        .lakehouseEnvironment?.type ?? 'Unknown'}
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
                {dataProductCardState.enrichedState.isInProgress === true && (
                  <CircularProgress size={20} />
                )}
                {dataProductCardState.enrichedState.hasCompleted === true && (
                  <IconButton
                    className="marketplace-lakehouse-data-product-card__popover__project-link"
                    onClick={() =>
                      applicationStore.navigationService.navigator.visitAddress(
                        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                          applicationStore.config.studioApplicationUrl,
                          origin.group,
                          origin.artifact,
                          origin.version,
                          dataProductCardState.dataProductElement?.path,
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
                        {dataProductCardState.enrichedState.isInProgress ===
                        true ? (
                          <CircularProgress size={20} />
                        ) : (
                          (dataProductCardState.dataProductElement?.path ??
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

export const LakehouseProductCard = observer(
  (props: {
    productCardState: BaseProductCardState;
    onClick: (productCardState: BaseProductCardState) => void;
  }): React.ReactNode => {
    const { productCardState, onClick } = props;

    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);

    const truncatedDescription =
      productCardState.description &&
      productCardState.description.length > MAX_DESCRIPTION_LENGTH
        ? `${productCardState.description.substring(
            0,
            MAX_DESCRIPTION_LENGTH,
          )}...`
        : productCardState.description;

    const versionId = productCardState.versionId;
    const isSnapshot = versionId ? isSnapshotVersion(versionId) : undefined;

    const content = productCardState.initState.isInProgress ? (
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    ) : (
      <>
        <Box className="marketplace-lakehouse-data-product-card__container">
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
              {productCardState instanceof DataProductCardState && (
                <Chip
                  label={
                    productCardState.environmentClassification ??
                    'Unknown Environment'
                  }
                  size="small"
                  title="Environment Classification"
                  className={clsx(
                    'marketplace-lakehouse-data-product-card__environment-classification',
                    {
                      'marketplace-lakehouse-data-product-card__environment-classification--unknown':
                        productCardState.environmentClassification ===
                        undefined,
                      'marketplace-lakehouse-data-product-card__environment-classification--dev':
                        productCardState.environmentClassification ===
                        V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
                      'marketplace-lakehouse-data-product-card__environment-classification--prod-parallel':
                        productCardState.environmentClassification ===
                        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
                      'marketplace-lakehouse-data-product-card__environment-classification--prod':
                        productCardState.environmentClassification ===
                        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
                    },
                  )}
                />
              )}
            </Box>

            <Box className="marketplace-lakehouse-data-product-card__name">
              {productCardState.title}
            </Box>
          </Box>
        </Box>
      </>
    );

    const moreInfoContent = (
      <>
        <Box className="marketplace-lakehouse-data-product-card__name">
          {productCardState.title}
        </Box>
        <Box className="marketplace-lakehouse-data-product-card__description">
          {truncatedDescription}
        </Box>
        {productCardState instanceof DataProductCardState && (
          <>
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
              dataProductCardState={productCardState}
              popoverAnchorEl={popoverAnchorEl}
              setPopoverAnchorEl={setPopoverAnchorEl}
              applicationStore={
                productCardState.marketplaceBaseStore.applicationStore
              }
            />
          </>
        )}
      </>
    );

    return (
      <LegendMarketplaceCard
        size="large"
        content={content}
        onClick={() => onClick(productCardState)}
        className="marketplace-lakehouse-data-product-card"
        moreInfo={moreInfoContent}
        cardMedia={productCardState.displayImage}
      />
    );
  },
);
