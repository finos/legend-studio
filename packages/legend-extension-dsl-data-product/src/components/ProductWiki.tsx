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
import { useEffect, useRef } from 'react';
import { MarkdownTextViewer } from '@finos/legend-art';
import {
  type SupportedProducts,
  type SupportedLayoutStates,
  isTerminalProductViewerState,
  isDataProductViewerState,
} from './ProductViewer.js';
import type { BaseViewerState } from '../stores/BaseViewerState.js';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  TERMINAL_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../stores/ProductViewerNavigation.js';
import { DataProducteDataAccess } from './DataProduct/DataProductDataAccess.js';
import { DataProductSupportInfo } from './DataProduct/DataProductSupportInfo.js';
import { DataProductDataAccessState } from '../stores/DataProduct/DataProductDataAccessState.js';
import { TerminalProductDataAccessState } from '../stores/TerminalProduct/TerminalProductDataAccessState.js';
import {
  TerminalAccessAndTable,
  TerminalProductPrice,
} from './TerminalProductAccess.js';

export const ProductWikiPlaceholder: React.FC<{ message: string }> = (
  props,
) => (
  <div className="data-product__viewer__wiki__placeholder">{props.message}</div>
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

    const section = isDataProductViewerState(productViewerState)
      ? DATA_PRODUCT_VIEWER_SECTION.DESCRIPTION
      : isTerminalProductViewerState(productViewerState)
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
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__content">
          {productViewerState.product.description !== undefined ? (
            <div className="data-product__viewer__description">
              <div className="data-product__viewer__description__content">
                <MarkdownTextViewer
                  className="data-product__viewer__markdown-text-viewer"
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
export const ProductWiki = observer(
  (props: {
    productViewerState: BaseViewerState<
      SupportedProducts,
      SupportedLayoutStates
    >;
    productDataAccessState:
      | DataProductDataAccessState
      | TerminalProductDataAccessState
      | undefined;
  }) => {
    const { productViewerState, productDataAccessState } = props;

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
      <div className="data-product__viewer__wiki">
        {isTerminalProductViewerState(productViewerState) && (
          <TerminalProductPrice
            terminalProductViewerState={productViewerState}
          />
        )}
        <ProductDescription productViewerState={productViewerState} />
        {isDataProductViewerState(productViewerState) &&
          (productDataAccessState instanceof DataProductDataAccessState || productDataAccessState === undefined) && (
            <>
              <DataProducteDataAccess
                dataProductViewerState={productViewerState}
                dataProductDataAccessState={productDataAccessState}
              />
              <DataProductSupportInfo
                dataProductViewerState={productViewerState}
              />
            </>
          )}
        {isTerminalProductViewerState(productViewerState) &&
          productDataAccessState instanceof TerminalProductDataAccessState && (
            <TerminalAccessAndTable
              terminalProductViewerState={productViewerState}
              terminalProductDataAccessState={productDataAccessState}
            />
          )}
      </div>
    );
  },
);
