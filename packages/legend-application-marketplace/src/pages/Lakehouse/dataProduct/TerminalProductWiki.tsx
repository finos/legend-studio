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
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(
      TERMINAL_PRODUCT_VIEWER_SECTION.PRICE,
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

    const terminal = terminalProductViewerState.product;

    const priceData = [
      {
        label: 'Price',
        value: terminal.price ?? 'Not Specified',
        field: 'price',
      },
      {
        label: 'Tiered Price',
        value: terminal.tieredPrice ?? 'Not Specified',
        field: 'tieredPrice',
      },
      {
        label: 'Total Firm Price',
        value: terminal.totalFirmPrice ?? 'Not Specified',
        field: 'totalFirmPrice',
      },
    ];

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Pricing
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
          <div className="data-space__viewer__price-section">
            <div className="data-space__viewer__price-table">
              {priceData.map((item) => (
                <div key={item.field} className="data-space__viewer__price-row">
                  <div className="data-space__viewer__price-label">
                    {item.label}:
                  </div>
                  <div className="data-space__viewer__price-value">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
        <TerminalProductDescription
          terminalProductViewerState={terminalProductViewerState}
        />

        <TerminalProductPrice
          terminalProductViewerState={terminalProductViewerState}
        />
      </div>
    );
  },
);
