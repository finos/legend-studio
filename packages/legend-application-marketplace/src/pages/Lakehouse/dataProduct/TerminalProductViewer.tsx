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
import type { TerminalProductViewerState } from '../../../stores/lakehouse/TerminalProductViewerState.ts';
import { useEffect, useRef, useState } from 'react';
import { CaretUpIcon, clsx } from '@finos/legend-art';
import { TerminalProductWiki } from './TerminalProductWiki.js';
import { Divider } from '@mui/material';
import type { $mobx } from 'mobx';

const TerminalProductHeader = observer(
  (props: {
    terminalProductViewerState: TerminalProductViewerState;
    showFullHeader: boolean;
  }) => {
    const { terminalProductViewerState, showFullHeader } = props;
    const headerRef = useRef<HTMLDivElement>(null);
    const terminalProduct = terminalProductViewerState.product;

    useEffect(() => {
      if (headerRef.current) {
        terminalProductViewerState.layoutState.header = headerRef.current;
      }
    }, [terminalProductViewerState]);

    return (
      <div
        ref={headerRef}
        className={clsx('data-space__viewer__header', {
          'data-space__viewer__header--floating': showFullHeader,
        })}
      >
        <div
          className={clsx('data-space__viewer__header__content', {
            'data-space__viewer__header__content--expanded':
              terminalProductViewerState.layoutState.isExpandedModeEnabled,
          })}
        >
          <div
            className="data-space__viewer__header__title"
            title={`${terminalProduct.productName} - ${terminalProduct.providerName}`}
          >
            <div className="data-space__viewer__header__title__label">
              {terminalProduct.productName
                ? terminalProduct.productName
                : terminalProduct.applicationName}
            </div>
            <Divider
              className="data-space__viewer__header__title__divider"
              sx={{
                marginTop: '8px',
                width: '100%',
                borderColor: '#1E88E5',
              }}
            />
          </div>
          <div className="data-space__viewer__header__type"></div>
        </div>
      </div>
    );
  },
);

export const TerminalProductNavigationSections = observer(
  (props: { terminalProductViewerState: TerminalProductViewerState }) => {
    const { terminalProductViewerState } = props;
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
      { id: 'overview', label: 'OVERVIEW' },
      { id: 'access', label: 'ACCESS' },
      { id: 'support', label: 'SUPPORT' },
    ];

    const handleTabClick = (tabId: string) => {
      setActiveTab(tabId);
      terminalProductViewerState.layoutState.setCurrentNavigationZone(tabId);
    };

    return (
      <div className="terminal-header-tabs">
        <div className="terminal-header-tabs__container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`terminal-header-tabs__tab ${
                activeTab === tab.id ? 'terminal-header-tabs__tab--active' : ''
              }`}
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

export const TerminalProductViewer = observer(
  (props: { dataSpaceViewerState: TerminalProductViewerState }) => {
    const { dataSpaceViewerState } = props;
    const frame = useRef<HTMLDivElement>(null);
    const [showFullHeader, setShowFullHeader] = useState(false);
    const [scrollPercentage, setScrollPercentage] = useState(0);

    const onScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
      const scrollTop = event.currentTarget.scrollTop;
      setShowFullHeader(scrollTop > 0);
      dataSpaceViewerState.layoutState.setTopScrollerVisible(scrollTop > 0);
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
      if (dataSpaceViewerState.layoutState.frame) {
        dataSpaceViewerState.layoutState.frame.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    };

    useEffect(() => {
      if (frame.current) {
        dataSpaceViewerState.layoutState.setFrame(frame.current);
      } else {
      }
    }, [dataSpaceViewerState]);

    return (
      <div className="data-space__viewer">
        <div
          ref={frame}
          className="data-space__viewer__body"
          onScroll={onScroll}
        >
          <TerminalProductHeader
            terminalProductViewerState={dataSpaceViewerState}
            showFullHeader={showFullHeader}
          />
          {dataSpaceViewerState.layoutState.isTopScrollerVisible && (
            <div className="data-space__viewer__scroller">
              <button
                className="data-space__viewer__scroller__btn btn--dark"
                tabIndex={-1}
                title="Scroll to top"
                disabled={!dataSpaceViewerState.layoutState.frame}
                onClick={scrollToTop}
              >
                <CaretUpIcon />
              </button>
              <div className="data-space__viewer__scroller__percentage">
                {scrollPercentage}%
              </div>
            </div>
          )}
          <div
            className={clsx(
              'data-space__viewer__frame data-space__viewer__frame--boundless',
              {
                'data-space__viewer__frame--expanded':
                  dataSpaceViewerState.layoutState.isExpandedModeEnabled,
              },
            )}
          >
            <div className="data-space__viewer__content">
              <TerminalProductWiki
                terminalProductViewerState={dataSpaceViewerState}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
