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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaretUpIcon,
  clsx,
  OpenIcon,
  SparkleStarsIcon,
} from '@finos/legend-art';
import {
  Avatar,
  AvatarGroup,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { isSnapshotVersion } from '@finos/legend-server-depot';
import { DataProductLegendAIIntegration } from './DataProduct/DataProductLegendAIIntegration.js';
import {
  type V1_Terminal,
  type V1_DataProduct,
  V1_AdHocDeploymentDataProductOrigin,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import type {
  TerminalProductLayoutState,
  DataProductLayoutState,
} from '../stores/BaseLayoutState.js';
import type { BaseViewerState } from '../stores/BaseViewerState.js';
import { DataProductViewerState } from '../stores/DataProduct/DataProductViewerState.js';
import { DSL_DATAPRODUCT_EVENT } from '../__lib__/DSL_DataProduct_Event.js';
import { ProductWiki } from './ProductWiki.js';
import { DataProductDataAccessState } from '../stores/DataProduct/DataProductDataAccessState.js';
import { TerminalProductViewerState } from '../stores/TerminalProduct/TerminalProductViewerState.js';
import type { TerminalProductDataAccessState } from '../stores/TerminalProduct/TerminalProductDataAccessState.js';
import { getHumanReadableIngestEnvName } from '../utils/LakehouseUtils.js';
import { LakehouseDataProductOwnersTooltip } from './DataProduct/LakehouseDataProductOwnersTooltip.js';

export const isDataProductViewerState = (
  state: BaseViewerState<SupportedProducts, SupportedLayoutStates>,
): state is DataProductViewerState => {
  return state instanceof DataProductViewerState;
};

export const isTerminalProductViewerState = (
  state: BaseViewerState<SupportedProducts, SupportedLayoutStates>,
): state is TerminalProductViewerState => {
  return state instanceof TerminalProductViewerState;
};

export type SupportedProducts = V1_Terminal | V1_DataProduct;
export type SupportedLayoutStates =
  | TerminalProductLayoutState
  | DataProductLayoutState;

export const TerminalNavigationSections = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
  }) => {
    const { productViewerState } = props;
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
      { id: 'overview', label: 'OVERVIEW' },
      { id: 'access', label: 'ACCESS' },
      { id: 'support', label: 'SUPPORT' },
    ];

    const handleTabClick = (tabId: string) => {
      setActiveTab(tabId);
      productViewerState.layoutState.setCurrentNavigationZone(tabId);
    };

    return (
      <div className="product-header-tabs">
        <div className="product-header-tabs__container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={clsx('product-header-tabs__tab', {
                'product-header-tabs__tab--active': activeTab === tab.id,
              })}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
);

const DataProductEnvironmentLabel = observer(
  (props: { dataAccessState: DataProductDataAccessState }) => {
    const { dataAccessState } = props;

    const environmentClassification =
      dataAccessState.entitlementsDataProductDetails.lakehouseEnvironment?.type;
    const environmentName = dataAccessState.lakehouseIngestEnv?.environmentName;
    const origin = dataAccessState.entitlementsDataProductDetails.origin;
    const [isOwnersTooltipOpen, setIsOwnersTooltipOpen] = useState(false);

    return (
      <div className="data-product__viewer__header__type">
        {origin instanceof V1_AdHocDeploymentDataProductOrigin && (
          <Button
            className={clsx('data-product__viewer__header__type__sandbox', {
              'data-product__viewer__header__type__sandbox--dev':
                environmentClassification ===
                V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
              'data-product__viewer__header__type__sandbox--prod-parallel':
                environmentClassification ===
                V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
              'data-product__viewer__header__type__sandbox--prod':
                environmentClassification ===
                V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
            })}
          >
            {environmentClassification ? `${environmentClassification} ` : ''}
            Sandbox Data Product
          </Button>
        )}
        {origin instanceof V1_SdlcDeploymentDataProductOrigin && (
          <Button
            onClick={() => {
              dataAccessState.dataProductViewerState.viewDataProductSource?.();
            }}
            title="View SDLC Project"
            className={clsx('data-product__viewer__header__type__version', {
              'data-product__viewer__header__type__version--snapshot':
                isSnapshotVersion(origin.version),
              'data-product__viewer__header__type__version--release':
                !isSnapshotVersion(origin.version),
            })}
          >
            Version: {origin.version}
            <OpenIcon />
          </Button>
        )}
        <Button variant="outlined">
          {`Lakehouse${environmentName ? ` - ${getHumanReadableIngestEnvName(environmentName, dataAccessState.applicationStore.pluginManager.getApplicationPlugins())}` : ''}`}
        </Button>
        <LakehouseDataProductOwnersTooltip
          open={isOwnersTooltipOpen}
          setIsOpen={setIsOwnersTooltipOpen}
          owners={dataAccessState.dataProductOwners}
          fetchingOwnersState={dataAccessState.fetchingDataProductOwnersState}
          applicationStore={dataAccessState.applicationStore}
          userSearchService={
            dataAccessState.dataProductViewerState.userSearchService
          }
        >
          <div
            className="data-product__viewer__header__type__owners"
            onClick={() => {
              setIsOwnersTooltipOpen((val) => !val);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsOwnersTooltipOpen((val) => !val);
              }
            }}
          >
            {dataAccessState.fetchingDataProductOwnersState.isInInitialState ||
            dataAccessState.fetchingDataProductOwnersState.isInProgress ? (
              <CircularProgress size={16} />
            ) : (
              <AvatarGroup
                max={3}
                className="data-product__viewer__header__type__owners__avatars"
              >
                {dataAccessState.dataProductOwners.map((owner) => {
                  const imgUrl =
                    dataAccessState.dataProductViewerState.userSearchService?.userProfileImageUrl?.replace(
                      '{userId}',
                      owner,
                    );
                  return (
                    <Avatar
                      key={owner}
                      {...(imgUrl ? { src: imgUrl } : {})}
                      alt={owner}
                    >
                      {owner.substring(0, 2).toUpperCase()}
                    </Avatar>
                  );
                })}
              </AvatarGroup>
            )}
            <Typography
              variant="caption"
              className="data-product__viewer__header__type__owners__label"
            >
              Owners
            </Typography>
          </div>
        </LakehouseDataProductOwnersTooltip>
      </div>
    );
  },
);

const ProductHeader = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
    dataAccessState:
      | DataProductDataAccessState
      | TerminalProductDataAccessState
      | undefined;
    showFullHeader: boolean;
  }) => {
    const { productViewerState, dataAccessState, showFullHeader } = props;
    const headerRef = useRef<HTMLDivElement>(null);

    const productTitle =
      productViewerState instanceof DataProductViewerState
        ? productViewerState.product.title
        : productViewerState instanceof TerminalProductViewerState
          ? productViewerState.product.productName
          : undefined;

    const productPath =
      productViewerState instanceof DataProductViewerState
        ? productViewerState.product.path
        : undefined;

    const productName =
      productViewerState instanceof DataProductViewerState
        ? productViewerState.product.name
        : undefined;

    useEffect(() => {
      if (headerRef.current) {
        productViewerState.layoutState.header = headerRef.current;
      }
    }, [productViewerState]);

    return (
      <div
        ref={headerRef}
        className={clsx('data-product__viewer__header', {
          'data-product__viewer__header--floating': showFullHeader,
        })}
      >
        <div
          className={clsx('data-product__viewer__header__content', {
            'data-product__viewer__header__content--expanded':
              productViewerState.layoutState.isExpandedModeEnabled,
          })}
        >
          <div className="data-product__viewer__header__main">
            <div
              className="data-product__viewer__header__title"
              title={`${productTitle} - ${productPath}`}
            >
              {productTitle ? productTitle : productName}
            </div>
          </div>

          {dataAccessState instanceof DataProductDataAccessState && (
            <DataProductEnvironmentLabel dataAccessState={dataAccessState} />
          )}
          {isTerminalProductViewerState(productViewerState) && (
            <div className="data-product__viewer__header__navigation">
              <TerminalNavigationSections
                productViewerState={productViewerState}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

export const ProductViewer = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
    productDataAccessState?:
      | DataProductDataAccessState
      | TerminalProductDataAccessState
      | undefined;
  }) => {
    const { productViewerState, productDataAccessState } = props;
    const frame = useRef<HTMLDivElement>(null);
    const [showFullHeader, setShowFullHeader] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [panelWidth, setPanelWidth] = useState(500);
    const isResizing = useRef(false);

    const isAIEnabled =
      isDataProductViewerState(productViewerState) &&
      productViewerState.legendAIConfig.enabled;

    const productTitle = isDataProductViewerState(productViewerState)
      ? (productViewerState.product.title ?? productViewerState.product.name)
      : undefined;

    const handleOpenAIChat = useCallback((): void => {
      setIsAIChatOpen(true);
      if (isDataProductViewerState(productViewerState)) {
        productViewerState.applicationStore.telemetryService.logEvent(
          DSL_DATAPRODUCT_EVENT.LEGEND_AI_ASSISTANT_OPENED,
          {
            context: 'data-product',
            data_product: productViewerState.product.path,
          },
        );
      }
    }, [productViewerState]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const onMouseMove = (ev: MouseEvent): void => {
        if (!isResizing.current) {
          return;
        }
        const newWidth = window.innerWidth - ev.clientX;
        setPanelWidth(
          Math.max(320, Math.min(newWidth, window.innerWidth * 0.6)),
        );
      };
      const onMouseUp = (): void => {
        isResizing.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }, []);

    const onScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
      const scrollTop = event.currentTarget.scrollTop;
      setShowFullHeader(scrollTop > 0);
      productViewerState.layoutState.setTopScrollerVisible(scrollTop > 0);
      setScrollPercentage(
        event.currentTarget.scrollHeight <= 0
          ? 100
          : Math.round(
              ((event.currentTarget.scrollTop +
                event.currentTarget.clientHeight) /
                event.currentTarget.scrollHeight) *
                100,
            ),
      );
    };

    const scrollToTop = (): void => {
      if (productViewerState.layoutState.frame) {
        productViewerState.layoutState.frame.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

    useEffect(() => {
      if (frame.current) {
        productViewerState.layoutState.setFrame(frame.current);
      }
    }, [productViewerState]);

    return (
      <div
        className={clsx('data-product__viewer', {
          'data-product__viewer--chat-open': isAIChatOpen,
        })}
        style={
          isAIChatOpen
            ? ({ '--ai-panel-width': `${panelWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        <div
          ref={frame}
          className="data-product__viewer__body"
          onScroll={onScroll}
        >
          <ProductHeader
            productViewerState={productViewerState}
            dataAccessState={productDataAccessState}
            showFullHeader={showFullHeader}
          />
          {productViewerState.layoutState.isTopScrollerVisible && (
            <div className="data-product__viewer__scroller">
              <button
                className="data-product__viewer__scroller__btn btn--dark"
                tabIndex={-1}
                title="Scroll to top"
                disabled={!productViewerState.layoutState.frame}
                onClick={scrollToTop}
              >
                <CaretUpIcon />
              </button>
              <div className="data-product__viewer__scroller__percentage">
                {scrollPercentage}%
              </div>
            </div>
          )}
          <div
            className={clsx(
              'data-product__viewer__frame data-product__viewer__frame--boundless',
              {
                'data-product__viewer__frame--expanded':
                  productViewerState.layoutState.isExpandedModeEnabled,
              },
            )}
          >
            <div className="data-product__viewer__content">
              <ProductWiki
                productViewerState={productViewerState}
                productDataAccessState={productDataAccessState}
              />
            </div>
          </div>
        </div>
        {isAIEnabled && isDataProductViewerState(productViewerState) && (
          <>
            <div
              className="data-product__viewer__ai-panel"
              style={{
                width: panelWidth,
                display: isAIChatOpen ? undefined : 'none',
              }}
            >
              <button
                type="button"
                className="data-product__viewer__ai-panel__resize-handle"
                aria-label="Resize AI panel"
                onMouseDown={handleResizeMouseDown}
                onKeyDown={(e): void => {
                  const step = 20;
                  if (e.key === 'ArrowLeft') {
                    setPanelWidth((w) =>
                      Math.min(w + step, window.innerWidth * 0.6),
                    );
                  } else if (e.key === 'ArrowRight') {
                    setPanelWidth((w) => Math.max(w - step, 320));
                  }
                }}
              />
              <DataProductLegendAIIntegration
                dataProductViewerState={productViewerState}
                config={productViewerState.legendAIConfig}
                {...(productDataAccessState instanceof
                DataProductDataAccessState
                  ? {
                      dataProductDataAccessState: productDataAccessState,
                    }
                  : {})}
                onClose={(): void => setIsAIChatOpen(false)}
                onMinimize={(): void => setIsAIChatOpen(false)}
              />
            </div>
            {!isAIChatOpen && (
              <button
                className="legend-ai-chat-toggle"
                onClick={handleOpenAIChat}
                title={`Ask ${productTitle ?? 'AI'}`}
              >
                <span className="legend-ai-chat-toggle__icon">
                  <SparkleStarsIcon />
                </span>
                <span className="legend-ai-chat-toggle__label">
                  Ask {productTitle ?? 'AI'}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    );
  },
);
