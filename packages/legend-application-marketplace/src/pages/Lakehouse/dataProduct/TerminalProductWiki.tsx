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
import React, { useEffect, useRef } from 'react';
import {
  TERMINAL_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import { AnchorLinkIcon, MarkdownTextViewer } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { DataproducteWikiPlaceholder } from './DataProductWiki.js';
import type { TerminalProductViewerState } from '../../../stores/lakehouse/TerminalProductViewerState.js';
import { listItemSecondaryActionClasses } from '@mui/material';

export const TerminalProductWikiPlaceHolder = observer(
  (props: {
    terminalProductViewerState: TerminalProductViewerState;
    section: TERMINAL_PRODUCT_VIEWER_SECTION;
  }) => {
    const { terminalProductViewerState, section } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(section);
    useEffect(() => {
      if (sectionRef.current) {
        terminalProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        terminalProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [terminalProductViewerState, anchor]);
    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            {prettyCONSTName(section)}
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() =>
                terminalProductViewerState.changeZone(anchor, true)
              }
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          <DataproducteWikiPlaceholder message="No wiki content available." />
        </div>
      </div>
    );
  },
);

export const TerminalProductDescription = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(
      TERMINAL_PRODUCT_VIEWER_SECTION.DESCRIPTION,
    );

    useEffect(() => {
      if (sectionRef.current) {
        terminalProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        terminalProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [terminalProductViewerState, anchor]);

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            {prettyCONSTName(TERMINAL_PRODUCT_VIEWER_SECTION.DESCRIPTION)}
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() =>
                terminalProductViewerState.changeZone(anchor, true)
              }
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {terminalProductViewerState.product.description !== undefined ? (
            <div className="data-space__viewer__description">
              <div className="data-space__viewer__description__content">
                <MarkdownTextViewer
                  className="data-space__viewer__markdown-text-viewer"
                  value={{
                    value: terminalProductViewerState.product.description,
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
            <DataproducteWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);

export const TerminalProductPrice = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const terminal = terminalProductViewerState.product;
    const [isAnnual, setIsAnnual] = React.useState(true);

    const getAvailablePrice = () => {
      if (terminal.price) return terminal.price;
      if (terminal.tieredPrice) return terminal.tieredPrice;
      if (terminal.totalFirmPrice) return terminal.totalFirmPrice;
      return undefined;
    };
    const availablePrice = getAvailablePrice();

    if (!availablePrice) {
      return (
        <DataproducteWikiPlaceholder message="No price information available." />
      );
    }

    const getDisplayPrice = () => {
      const priceStr = String(availablePrice || '0');
      const annualPrice = parseFloat(priceStr.replace(/[^0-9.-]+/g, '')) || 0;

      const currencyMatch = priceStr.match(/[^0-9.-]+/);
      const currency = currencyMatch ? currencyMatch[0] : '';

      if (isAnnual) {
        return `${currency}${annualPrice.toFixed(2)}`;
      } else {
        const monthlyPrice = (annualPrice / 12).toFixed(2);
        return `${currency}${monthlyPrice}`;
      }
    };

    const handlePricingToggle = () => {
      setIsAnnual((prev) => !prev);
    };

    return (
      <div
        className="data-space__viewer__wiki__section__pricing"
        onClick={handlePricingToggle}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {getDisplayPrice()} {isAnnual ? 'annually' : 'monthly'} per license
      </div>
    );
  },
);

export const TerminalProductWiki = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;

    useEffect(() => {
      if (
        terminalProductViewerState.layoutState.wikiPageNavigationCommand &&
        terminalProductViewerState.layoutState.isWikiPageFullyRendered
      ) {
        terminalProductViewerState.layoutState.navigateWikiPageAnchor();
      }
    }, [
      terminalProductViewerState,
      terminalProductViewerState.layoutState.wikiPageNavigationCommand,
      terminalProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    useEffect(() => {
      if (terminalProductViewerState.layoutState.isWikiPageFullyRendered) {
        terminalProductViewerState.layoutState.registerWikiPageScrollObserver();
      }
      return () =>
        terminalProductViewerState.layoutState.unregisterWikiPageScrollObserver();
    }, [
      terminalProductViewerState,
      terminalProductViewerState.layoutState.isWikiPageFullyRendered,
    ]);

    return (
      <div className="data-space__viewer__wiki">
        <TerminalProductPrice
          terminalProductViewerState={terminalProductViewerState}
        />
        <TerminalProductDescription
          terminalProductViewerState={terminalProductViewerState}
        />
      </div>
    );
  },
);
