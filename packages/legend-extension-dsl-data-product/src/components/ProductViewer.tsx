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
import { useEffect, useRef, useState } from 'react';
import { CaretUpIcon, clsx, OpenIcon } from '@finos/legend-art';
import { Button } from '@mui/material';
import { isSnapshotVersion } from '@finos/legend-server-depot';
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
import { ProductWiki } from './ProductWiki.js';
import { DataProductDataAccessState } from '../stores/DataProduct/DataProductDataAccessState.js';
import { TerminalProductViewerState } from '../stores/TerminalProduct/TerminalProductViewerState.js';
import type { TerminalProductDataAccessState } from '../stores/TerminalProduct/TerminalProductDataAccessState.js';

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
    const origin = dataAccessState.entitlementsDataProductDetails.origin;

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
      <div className="data-product__viewer">
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
      </div>
    );
  },
);
