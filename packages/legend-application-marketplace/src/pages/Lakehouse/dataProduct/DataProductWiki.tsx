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
import { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
  TERMINAL_PRODUCT_VIEWER_SECTION,
} from '../../../stores/lakehouse/ProductViewerNavigation.js';
import { MarkdownTextViewer } from '@finos/legend-art';
import { DataProducteDataAccess } from './DataProductDataAccess.js';
import type { BaseViewerState } from '../../../stores/lakehouse/BaseViewerState.js';
import { TerminalProductViewerState } from '../../../stores/lakehouse/TerminalProductViewerState.js';
import type {
  SupportedProducts,
  SupportedLayoutStates,
} from './ProductViewer.js';
import { DataProductSupportInfo } from './DataProductSupportInfo.js';

export const ProductWikiPlaceholder: React.FC<{ message: string }> = (
  props,
) => (
  <div className="data-space__viewer__wiki__placeholder">{props.message}</div>
);

export const TerminalProductPrice = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;
    const [isAnnual, setIsAnnual] = useState(true);

    const availablePrice =
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      terminal.price || terminal.tieredPrice || terminal.totalFirmPrice;

    if (!availablePrice) {
      return (
        <ProductWikiPlaceholder message="No price information available." />
      );
    }

    const getDisplayPrice = () => {
      const price = Number(availablePrice);
      return isAnnual ? Number(price).toFixed(2) : (price / 12).toFixed(2);
    };

    const handlePricingToggle = () => {
      setIsAnnual((prev) => !prev);
    };

    return (
      <button
        className="data-space__viewer__wiki__section__pricing"
        onClick={handlePricingToggle}
      >
        ${getDisplayPrice()} {isAnnual ? 'ANNUALLY' : 'MONTHLY'} PER LICENSE
      </button>
    );
  },
);

export const ProductDescription = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
  }) => {
    const { productViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const isDataProductViewerState =
      productViewerState instanceof DataProductViewerState;
    const isTerminalProductViewerState =
      productViewerState instanceof TerminalProductViewerState;

    const section = isDataProductViewerState
      ? DATA_PRODUCT_VIEWER_SECTION.DESCRIPTION
      : isTerminalProductViewerState
        ? TERMINAL_PRODUCT_VIEWER_SECTION.DESCRIPTION
        : undefined;
    const anchor = section ? generateAnchorForSection(section) : '';

    useEffect(() => {
      if (sectionRef.current) {
        productViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => productViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [productViewerState, anchor]);

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__content">
          {productViewerState.product.description !== undefined ? (
            <div className="data-space__viewer__description">
              <div className="data-space__viewer__description__content">
                <MarkdownTextViewer
                  className="data-space__viewer__markdown-text-viewer"
                  value={{
                    value: productViewerState.product.description,
                  }}
                  components={{
                    h1: 'h2',
                    h2: 'h3',
                    h3: 'h4',
                  }}
                />
              </div>
            </div>
          ) : (
            <ProductWikiPlaceholder message="(description not specified)" />
          )}
        </div>
      </div>
    );
  },
);
export const DataProductWiki = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
  }) => {
    const { productViewerState } = props;
    const isDataProductViewerState =
      productViewerState instanceof DataProductViewerState;
    const isTerminalProductViewerState =
      productViewerState instanceof TerminalProductViewerState;

    useEffect(() => {
      if (
        productViewerState.layoutState.wikiPageNavigationCommand &&
        productViewerState.layoutState.isWikiPageFullyRendered
      ) {
        productViewerState.layoutState.navigateWikiPageAnchor();
      }
    }, [
      productViewerState,
      productViewerState.layoutState.wikiPageNavigationCommand,
      productViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    useEffect(() => {
      if (productViewerState.layoutState.isWikiPageFullyRendered) {
        productViewerState.layoutState.registerWikiPageScrollObserver();
      }
      return () =>
        productViewerState.layoutState.unregisterWikiPageScrollObserver();
    }, [
      productViewerState,
      productViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <ProductDescription productViewerState={productViewerState} />
        {isTerminalProductViewerState && (
          <TerminalProductPrice
            terminalProductViewerState={productViewerState}
          />
        )}
        {isDataProductViewerState && (
          <>
            <DataProducteDataAccess
              dataProductViewerState={productViewerState}
            />
            <DataProductSupportInfo
              dataProductViewerState={productViewerState}
            />
          </>
        )}
      </div>
    );
  },
);
