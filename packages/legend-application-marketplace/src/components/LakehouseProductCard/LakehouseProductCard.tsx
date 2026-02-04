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
  clsx,
  InfoCircleIcon,
  MarkdownTextViewer,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import {
  Popover,
  Box,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Chip,
  Tooltip,
  ClickAwayListener,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { type LegendMarketplaceApplicationStore } from '../../stores/LegendMarketplaceBaseStore.js';
import { LegendMarketplaceCard } from '../MarketplaceCard/LegendMarketplaceCard.js';
import type { ProductCardState } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LakehouseDataProductSearchResultDetails,
  LakehouseSDLCDataProductSearchResultOrigin,
  LegacyDataProductSearchResultDetails,
} from '@finos/legend-server-marketplace';
import {
  DevelopmentLegendMarketplaceEnvState,
  ProdParallelLegendMarketplaceEnvState,
} from '../../stores/LegendMarketplaceEnvState.js';
import { UserRenderer } from '@finos/legend-extension-dsl-data-product';
import { useAuth } from 'react-oidc-context';

const MAX_DESCRIPTION_LENGTH = 250;

const LakehouseDataProductCardInfoPopover = observer(
  (props: {
    dataProductCardState: ProductCardState;
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
    const dataProductDetails =
      dataProductCardState.searchResult.dataProductDetails;

    const dataProductId =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails
        ? dataProductDetails.dataProductId
        : undefined;
    const deploymentId =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails
        ? dataProductDetails.deploymentId
        : undefined;
    const producerEnvironmentName =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails
        ? dataProductDetails.producerEnvironmentName
        : undefined;
    const producerEnvironmentType =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails
        ? dataProductDetails.producerEnvironmentType
        : undefined;

    const groupId =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails &&
      dataProductDetails.origin instanceof
        LakehouseSDLCDataProductSearchResultOrigin
        ? dataProductDetails.origin.groupId
        : dataProductDetails instanceof LegacyDataProductSearchResultDetails
          ? dataProductDetails.groupId
          : undefined;
    const artifactId =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails &&
      dataProductDetails.origin instanceof
        LakehouseSDLCDataProductSearchResultOrigin
        ? dataProductDetails.origin.artifactId
        : dataProductDetails instanceof LegacyDataProductSearchResultDetails
          ? dataProductDetails.artifactId
          : undefined;
    const versionId =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails &&
      dataProductDetails.origin instanceof
        LakehouseSDLCDataProductSearchResultOrigin
        ? dataProductDetails.origin.versionId
        : dataProductDetails instanceof LegacyDataProductSearchResultDetails
          ? dataProductDetails.versionId
          : undefined;
    const path =
      dataProductDetails instanceof LakehouseDataProductSearchResultDetails &&
      dataProductDetails.origin instanceof
        LakehouseSDLCDataProductSearchResultOrigin
        ? dataProductDetails.origin.path
        : dataProductDetails instanceof LegacyDataProductSearchResultDetails
          ? dataProductDetails.path
          : undefined;

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
              <MarkdownTextViewer
                className="marketplace-lakehouse-data-product-card__popover__section-content__markdown"
                value={{
                  value: dataProductCardState.description,
                }}
                components={{
                  h1: 'h2',
                  h2: 'h3',
                  h3: 'h4',
                }}
              />
            </Box>
          </Box>
          {dataProductId !== undefined ||
          deploymentId !== undefined ||
          producerEnvironmentName !== undefined ||
          producerEnvironmentType !== undefined ? (
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
                      <TableCell>{dataProductId ?? 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Deployment ID</b>
                      </TableCell>
                      <TableCell>{deploymentId ?? 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Producer Environment Name</b>
                      </TableCell>
                      <TableCell>
                        {producerEnvironmentName ?? 'Unknown'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Producer Environment Type</b>
                      </TableCell>
                      <TableCell>
                        {producerEnvironmentType ?? 'Unknown'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
          {groupId !== undefined ||
          artifactId !== undefined ||
          versionId !== undefined ||
          path !== undefined ? (
            <Box className="marketplace-lakehouse-data-product-card__popover__section">
              <Box className="marketplace-lakehouse-data-product-card__popover__section-header">
                Data Product Project
                {groupId && artifactId && versionId && path ? (
                  <IconButton
                    className="marketplace-lakehouse-data-product-card__popover__project-link"
                    onClick={() =>
                      applicationStore.navigationService.navigator.visitAddress(
                        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                          applicationStore.config.studioApplicationUrl,
                          groupId,
                          artifactId,
                          versionId,
                          path,
                        ),
                      )
                    }
                  >
                    <OpenIcon />
                  </IconButton>
                ) : null}
              </Box>
              <TableContainer className="marketplace-lakehouse-data-product-card__popover__table">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <b>Group</b>
                      </TableCell>
                      <TableCell>{groupId ?? 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Artifact</b>
                      </TableCell>
                      <TableCell>{artifactId ?? 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Version</b>
                      </TableCell>
                      <TableCell>{versionId ?? 'Unknown'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <b>Path</b>
                      </TableCell>
                      <TableCell>{path ?? 'Unknown'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </Box>
      </Popover>
    );
  },
);

const LakehouseDataProductOwnersTooltip = observer(
  (props: {
    productCardState: ProductCardState;
    token: string | undefined;
  }) => {
    const { productCardState, token } = props;

    useEffect(() => {
      if (productCardState.fetchingOwnersState.isInInitialState) {
        productCardState.fetchOwners(token);
      }
    }, [productCardState, token]);

    return (
      <Box className="marketplace-lakehouse-data-product-card__owners-tooltip">
        <Typography variant="subtitle2">Owners</Typography>
        {productCardState.fetchingOwnersState.isInInitialState ||
        productCardState.fetchingOwnersState.isInProgress ? (
          <CubesLoadingIndicator isLoading={true}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
        ) : (
          productCardState.lakehouseOwners.map((owner) => (
            <UserRenderer
              key={owner}
              userId={owner}
              applicationStore={
                productCardState.marketplaceBaseStore.applicationStore
              }
              userSearchService={
                productCardState.marketplaceBaseStore.userSearchService
              }
            />
          ))
        )}
      </Box>
    );
  },
);

export const LakehouseProductCard = observer(
  (props: {
    productCardState: ProductCardState;
    onClick: (productCardState: ProductCardState) => void;
    moreInfoPreview?: 'small' | 'large' | undefined;
    hideInfoPopover?: boolean;
    hideTags?: boolean;
  }): React.ReactNode => {
    const {
      productCardState,
      onClick,
      moreInfoPreview,
      hideInfoPopover,
      hideTags,
    } = props;

    const [popoverAnchorEl, setPopoverAnchorEl] =
      useState<HTMLButtonElement | null>(null);
    const [isOwnersTooltipOpen, setIsOwnersTooltipOpen] = useState(false);
    const auth = useAuth();

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
    const isLakehouse =
      productCardState.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails;

    const content = (
      <>
        <Box className="marketplace-lakehouse-data-product-card__container">
          <Box className="marketplace-lakehouse-data-product-card__content">
            {!hideTags && (
              <Box className="marketplace-lakehouse-data-product-card__tags">
                {isLakehouse && (
                  <ClickAwayListener
                    onClickAway={() => setIsOwnersTooltipOpen(false)}
                  >
                    <Tooltip
                      open={isOwnersTooltipOpen}
                      onClose={() => setIsOwnersTooltipOpen(false)}
                      disableFocusListener={true}
                      disableHoverListener={true}
                      disableTouchListener={true}
                      title={
                        <LakehouseDataProductOwnersTooltip
                          productCardState={productCardState}
                          token={auth.user?.access_token}
                        />
                      }
                      className="marketplace-lakehouse-data-product-card__owners-tooltip-wrapper"
                    >
                      <Chip
                        size="small"
                        label={`Lakehouse${
                          productCardState.lakehouseEnvironment
                            ? ` - ${productCardState.lakehouseEnvironment.environmentName}`
                            : ''
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsOwnersTooltipOpen((val) => !val);
                        }}
                        title="Click to view owners"
                        className={clsx(
                          'marketplace-lakehouse-data-product-card__lakehouse',
                        )}
                      />
                    </Tooltip>
                  </ClickAwayListener>
                )}
                {/* We only show version if it's a snapshot, because otherwise it's just the latest prod version */}
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
                {/* We only show environment classification in prod-par and dev env, because otherwise they're all production */}
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
                {productCardState.searchResult.dataProductSource ===
                  'External' && (
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
              </Box>
            )}
            {moreInfoPreview === undefined && (
              <Box className="marketplace-lakehouse-data-product-card__name">
                {productCardState.title}
              </Box>
            )}
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
          <MarkdownTextViewer
            className="marketplace-lakehouse-data-product-card__description__markdown"
            value={{
              value: truncatedDescription,
            }}
            components={{
              h1: 'h2',
              h2: 'h3',
              h3: 'h4',
            }}
          />
        </Box>
        {!hideInfoPopover && (
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
        moreInfoPreview={moreInfoPreview}
        cardMedia={productCardState.icon ?? productCardState.displayImage}
        loadingMedia={productCardState.initState.isInProgress}
      />
    );
  },
);
